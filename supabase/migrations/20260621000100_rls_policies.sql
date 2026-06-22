-- Enable Row Level Security (RLS) on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE hearings ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if the user is member of a tenant
CREATE OR REPLACE FUNCTION is_member_of_tenant(tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM tenant_members
        WHERE tenant_members.tenant_id = is_member_of_tenant.tenant_id
          AND tenant_members.profile_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Profiles Policies
CREATE POLICY "Allow select on profiles" ON profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow update on own profile" ON profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 2. Tenants Policies
CREATE POLICY "Allow select on tenants user belongs to" ON tenants
    FOR SELECT TO authenticated USING (is_member_of_tenant(id));

CREATE POLICY "Allow update on tenants for owners" ON tenants
    FOR UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM tenant_members
            WHERE tenant_members.tenant_id = tenants.id
              AND tenant_members.profile_id = auth.uid()
              AND tenant_members.role IN ('owner', 'admin')
        )
    );

-- 3. Tenant Members Policies
CREATE POLICY "Allow select on members of same tenant" ON tenant_members
    FOR SELECT TO authenticated USING (is_member_of_tenant(tenant_id));

CREATE POLICY "Allow write on members for owners" ON tenant_members
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM tenant_members
            WHERE tenant_members.tenant_id = tenant_members.tenant_id
              AND tenant_members.profile_id = auth.uid()
              AND tenant_members.role = 'owner'
        )
    );

-- 4. Clients Policies
CREATE POLICY "Clients tenant isolation select" ON clients
    FOR SELECT TO authenticated USING (is_member_of_tenant(tenant_id));

CREATE POLICY "Clients tenant isolation insert" ON clients
    FOR INSERT TO authenticated WITH CHECK (is_member_of_tenant(tenant_id));

CREATE POLICY "Clients tenant isolation update" ON clients
    FOR UPDATE TO authenticated USING (is_member_of_tenant(tenant_id));

CREATE POLICY "Clients tenant isolation delete" ON clients
    FOR DELETE TO authenticated USING (is_member_of_tenant(tenant_id));

-- 5. Cases Policies
CREATE POLICY "Cases tenant isolation select" ON cases
    FOR SELECT TO authenticated USING (is_member_of_tenant(tenant_id));

CREATE POLICY "Cases tenant isolation insert" ON cases
    FOR INSERT TO authenticated WITH CHECK (is_member_of_tenant(tenant_id));

CREATE POLICY "Cases tenant isolation update" ON cases
    FOR UPDATE TO authenticated USING (is_member_of_tenant(tenant_id));

CREATE POLICY "Cases tenant isolation delete" ON cases
    FOR DELETE TO authenticated USING (is_member_of_tenant(tenant_id));

-- 6. Tasks Policies
CREATE POLICY "Tasks tenant isolation select" ON tasks
    FOR SELECT TO authenticated USING (is_member_of_tenant(tenant_id));

CREATE POLICY "Tasks tenant isolation insert" ON tasks
    FOR INSERT TO authenticated WITH CHECK (is_member_of_tenant(tenant_id));

CREATE POLICY "Tasks tenant isolation update" ON tasks
    FOR UPDATE TO authenticated USING (is_member_of_tenant(tenant_id));

CREATE POLICY "Tasks tenant isolation delete" ON tasks
    FOR DELETE TO authenticated USING (is_member_of_tenant(tenant_id));

-- 7. Hearings Policies
CREATE POLICY "Hearings tenant isolation select" ON hearings
    FOR SELECT TO authenticated USING (is_member_of_tenant(tenant_id));

CREATE POLICY "Hearings tenant isolation insert" ON hearings
    FOR INSERT TO authenticated WITH CHECK (is_member_of_tenant(tenant_id));

CREATE POLICY "Hearings tenant isolation update" ON hearings
    FOR UPDATE TO authenticated USING (is_member_of_tenant(tenant_id));

CREATE POLICY "Hearings tenant isolation delete" ON hearings
    FOR DELETE TO authenticated USING (is_member_of_tenant(tenant_id));

-- 8. Documents Policies
CREATE POLICY "Documents tenant isolation select" ON documents
    FOR SELECT TO authenticated USING (is_member_of_tenant(tenant_id));

CREATE POLICY "Documents tenant isolation insert" ON documents
    FOR INSERT TO authenticated WITH CHECK (is_member_of_tenant(tenant_id));

CREATE POLICY "Documents tenant isolation update" ON documents
    FOR UPDATE TO authenticated USING (is_member_of_tenant(tenant_id));

CREATE POLICY "Documents tenant isolation delete" ON documents
    FOR DELETE TO authenticated USING (is_member_of_tenant(tenant_id));

-- 9. Financial Transactions Policies
CREATE POLICY "Financials tenant isolation select" ON financial_transactions
    FOR SELECT TO authenticated USING (is_member_of_tenant(tenant_id));

CREATE POLICY "Financials tenant isolation insert" ON financial_transactions
    FOR INSERT TO authenticated WITH CHECK (is_member_of_tenant(tenant_id));

CREATE POLICY "Financials tenant isolation update" ON financial_transactions
    FOR UPDATE TO authenticated USING (is_member_of_tenant(tenant_id));

CREATE POLICY "Financials tenant isolation delete" ON financial_transactions
    FOR DELETE TO authenticated USING (is_member_of_tenant(tenant_id));

-- 10. WhatsApp Logs Policies
CREATE POLICY "WhatsApp logs tenant isolation select" ON whatsapp_logs
    FOR SELECT TO authenticated USING (is_member_of_tenant(tenant_id));

CREATE POLICY "WhatsApp logs tenant isolation insert" ON whatsapp_logs
    FOR INSERT TO authenticated WITH CHECK (is_member_of_tenant(tenant_id));
