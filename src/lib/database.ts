export interface Tenant {
  id: string
  name: string
  slug: string
  plan_type: 'free' | 'standard' | 'premium'
  subscription_status: 'trialing' | 'active' | 'past_due' | 'canceled'
  status?: 'active' | 'blocked'
  billing_email?: string
  created_at?: string
  updated_at?: string
}

export interface AuditLog {
  id: string
  timestamp: string
  user_id: string
  action: string
  resource: string
  details: string
  ip: string
}

export interface Profile {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  avatar_url?: string
  password_hash: string // Secure Bcrypt Hash
  created_at?: string
  updated_at?: string
}

export interface TenantMember {
  id: string
  tenant_id: string
  profile_id: string
  role: 'owner' | 'admin' | 'lawyer' | 'assistant' | 'client' | 'master'
  created_at?: string
  updated_at?: string
}

export interface Client {
  id: string
  tenant_id: string
  type: 'individual' | 'corporate'
  name: string
  email?: string
  phone?: string
  document?: string // CPF or CNPJ
  rg_ie?: string
  address_street?: string
  address_number?: string
  address_complement?: string
  address_neighborhood?: string
  address_city?: string
  address_state?: string
  address_zipcode?: string
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface Case {
  id: string
  tenant_id: string
  client_id?: string
  title: string
  number: string // CNJ Standard
  court: string // TJSP, TRF3, etc.
  instance: string
  distribution_date?: string
  value: number
  status: 'active' | 'suspended' | 'archived' | 'settled'
  description?: string
  responsible_lawyer_id?: string
  created_at?: string
  updated_at?: string
}

export interface Task {
  id: string
  tenant_id: string
  case_id?: string
  title: string
  description?: string
  due_date?: string
  status: 'todo' | 'in_progress' | 'completed' | 'waiting'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assigned_to?: string
  created_at?: string
  updated_at?: string
}

export interface Hearing {
  id: string
  tenant_id: string
  case_id?: string
  date: string
  location: string
  status: 'scheduled' | 'completed' | 'canceled'
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface Document {
  id: string
  tenant_id: string
  case_id?: string
  name: string
  file_path: string
  file_size?: number
  mime_type?: string
  uploaded_by?: string
  created_at?: string
}

export interface FinancialTransaction {
  id: string
  tenant_id: string
  case_id?: string
  client_id?: string
  type: 'income' | 'expense'
  category: 'honorarios' | 'custas' | 'despesas' | 'aluguel' | 'salarios' | 'outros'
  amount: number
  due_date: string
  payment_date?: string
  status: 'pending' | 'paid' | 'overdue' | 'canceled'
  description?: string
  created_at?: string
  updated_at?: string
}

export interface WhatsAppLog {
  id: string
  tenant_id: string
  client_id?: string
  phone: string
  message_text: string
  status: 'pending' | 'sent' | 'failed'
  sent_at?: string
}
