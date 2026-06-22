import React, { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../lib/api'

// Omit database imports, define minimal interfaces here
export interface Profile {
  id: string
  first_name: string
  last_name: string
  email: string
  theme?: string
  avatar_url?: string
}

export interface Tenant {
  id: string
  name: string
  slug: string
  status: string
  plan_type: string
}

interface AuthContextType {
  user: Profile | null
  tenant: Tenant | null
  role: 'owner' | 'admin' | 'lawyer' | 'assistant' | 'client' | 'master' | null
  userTenants: Tenant[]
  loading: boolean
  signIn: (email: string, password?: string) => Promise<boolean>
  signOut: () => Promise<void>
  switchTenant: (tenantId: string) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [role, setRole] = useState<any>(null)
  const [userTenants, setUserTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data } = await api.get('/auth/me')
        setUser(data.user)
        setTenant(data.tenant)
        setRole(data.user.role)
        setUserTenants(data.userTenants)
        
        // Setup initial axios header for tenant
        if (data.tenant) {
          api.defaults.headers.common['x-tenant-id'] = data.tenant.id
        }
      } catch (err) {
        setUser(null)
        setTenant(null)
      } finally {
        setLoading(false)
      }
    }

    fetchSession()
  }, [])

  const signIn = async (email: string, password?: string) => {
    try {
      setLoading(true)
      const { data } = await api.post('/auth/login', { email, password })
      
      setUser(data.user)
      setTenant(data.tenant)
      setRole(data.user.role)
      setUserTenants(data.userTenants)

      if (data.tenant) {
        api.defaults.headers.common['x-tenant-id'] = data.tenant.id
      }
      return true
    } catch (err) {
      console.error('Falha no login', err)
      return false
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      await api.post('/auth/logout')
    } catch (e) {
      // ignore
    }
    setUser(null)
    setTenant(null)
    setRole(null)
    setUserTenants([])
    delete api.defaults.headers.common['x-tenant-id']
  }

  const switchTenant = (tenantId: string) => {
    const selected = userTenants.find(t => t.id === tenantId)
    if (selected) {
      setTenant(selected)
      api.defaults.headers.common['x-tenant-id'] = selected.id
      // Optional: re-fetch /me by passing new tenant in header to get the correct role
    }
  }

  if (loading) {
    return <div className="flex h-screen w-screen items-center justify-center bg-gray-50 dark:bg-gray-900"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>
  }

  return (
    <AuthContext.Provider value={{ user, tenant, role, userTenants, loading, signIn, signOut, switchTenant }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
