import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, Briefcase, Users, CheckSquare, 
  DollarSign, Sun, Moon, LogOut, ChevronLeft, ChevronRight, 
  Search, ShieldCheck, Bell, Settings, Command
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { SearchModal } from './SearchModal'

interface SidebarLayoutProps {
  children: React.ReactNode
}

export const SidebarLayout: React.FC<SidebarLayoutProps> = ({ children }) => {
  const { user, tenant, role, userTenants, switchTenant, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [collapsed, setCollapsed] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  // Listen to Cmd+K to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, role: ['owner', 'admin', 'lawyer', 'assistant'] },
    { name: 'Processos', path: '/cases', icon: Briefcase, role: ['owner', 'admin', 'lawyer', 'assistant'] },
    { name: 'Clientes (CRM)', path: '/clients', icon: Users, role: ['owner', 'admin', 'lawyer', 'assistant'] },
    { name: 'Tarefas', path: '/tasks', icon: CheckSquare, role: ['owner', 'admin', 'lawyer', 'assistant'] },
    { name: 'Financeiro', path: '/financials', icon: DollarSign, role: ['owner', 'admin'] },
  ]

  // Filter items by user role
  const filteredNavItems = navItems.filter(item => !role || item.role.includes(role))

  const handleNavigateFromSearch = (type: 'case' | 'client' | 'task', id: string) => {
    if (type === 'case') navigate(`/cases?id=${id}`)
    if (type === 'client') navigate(`/clients?id=${id}`)
    if (type === 'task') navigate(`/tasks?id=${id}`)
  }

  // If loading or no user, just render children directly (e.g. login screen)
  if (!user) {
    return <div className="min-h-screen bg-background text-foreground transition-colors duration-300">{children}</div>
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-card transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border">
          {!collapsed ? (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
                A+
              </div>
              <span className="font-semibold text-sm tracking-tight text-primary dark:text-sky-400">
                ADVOGADOS PLUS
              </span>
            </div>
          ) : (
            <div className="flex h-8 w-8 mx-auto items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              A+
            </div>
          )}
          
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex h-6 w-6 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Tenant Selector */}
        {!collapsed && userTenants.length > 0 && (
          <div className="p-3 border-b border-border">
            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">
              Escritório Ativo
            </label>
            <select
              value={tenant?.id || ''}
              onChange={(e) => switchTenant(e.target.value)}
              className="w-full rounded-md border border-border bg-accent/50 px-2 py-1 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              {userTenants.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
          {/* Quick Search Button */}
          <button
            onClick={() => setSearchOpen(true)}
            className={`flex w-full items-center rounded-md px-3 py-2 text-sm font-medium transition-colors text-muted-foreground hover:bg-secondary hover:text-foreground ${
              collapsed ? 'justify-center' : 'justify-start'
            }`}
          >
            <Search className="h-4 w-4" />
            {!collapsed && (
              <span className="ml-3 flex-1 text-left flex items-center justify-between">
                <span>Buscar</span>
                <span className="text-[10px] border border-border rounded px-1 flex items-center gap-0.5">
                  <Command size={8} /> K
                </span>
              </span>
            )}
          </button>

          {filteredNavItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                } ${collapsed ? 'justify-center' : 'justify-start'}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="ml-3">{item.name}</span>}
              </Link>
            );
          })}

          <div className="border-t border-border my-2 pt-2" />

          {/* Client Portal Simulation Link */}
          <Link
            to="/client-portal"
            className={`flex items-center rounded-md px-3 py-2 text-sm font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors ${
              location.pathname === '/client-portal' ? 'bg-amber-100 dark:bg-amber-950/30' : ''
            } ${collapsed ? 'justify-center' : 'justify-start'}`}
          >
            <ShieldCheck className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="ml-3">Portal do Cliente</span>}
          </Link>
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-border p-2 space-y-1">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors ${
              collapsed ? 'justify-center' : 'justify-start'
            }`}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            {!collapsed && <span className="ml-3">{theme === 'light' ? 'Tema Escuro' : 'Tema Claro'}</span>}
          </button>

          {/* Logout */}
          <button
            onClick={signOut}
            className={`flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors ${
              collapsed ? 'justify-center' : 'justify-start'
            }`}
          >
            <LogOut size={16} />
            {!collapsed && <span className="ml-3">Sair</span>}
          </button>

          {/* Active Profile Info */}
          {!collapsed && (
            <div className="flex items-center gap-3 p-2 mt-2 border-t border-border rounded-lg bg-accent/30">
              {user.avatar_url ? (
                <img 
                  src={user.avatar_url} 
                  alt={user.first_name} 
                  className="h-8 w-8 rounded-full object-cover border border-border"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                  {user.first_name[0]}{user.last_name[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  {user.first_name} {user.last_name}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {role === 'owner' ? 'Sócio Fundador' : role === 'lawyer' ? 'Advogado Pleno' : 'Cliente'}
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex flex-1 flex-col transition-all duration-300 ${collapsed ? 'pl-16' : 'pl-64'}`}>
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/85 backdrop-blur-md px-6 shadow-xs">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              {location.pathname === '/dashboard' && 'Dashboard Executivo'}
              {location.pathname === '/cases' && 'Gestão de Processos'}
              {location.pathname === '/clients' && 'CRM - Clientes'}
              {location.pathname === '/tasks' && 'Quadro de Tarefas'}
              {location.pathname === '/financials' && 'Fluxo Financeiro'}
              {location.pathname === '/client-portal' && 'Portal do Cliente'}
            </h1>
            {tenant && (
              <span className="hidden sm:inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary dark:text-sky-400">
                {tenant.plan_type.toUpperCase()} PLAN
              </span>
            )}
          </div>

          {/* Quick Widgets */}
          <div className="flex items-center gap-3">
            {/* Quick Search shortcut reminder */}
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden md:flex items-center gap-2 rounded-lg border border-border bg-accent/40 px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent/80 hover:text-foreground"
            >
              <Search size={14} />
              <span>Pesquisar...</span>
              <kbd className="pointer-events-none rounded border border-border bg-card px-1 font-mono text-[9px]">Ctrl+K</kbd>
            </button>

            {/* Notifications */}
            <button className="relative p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent/50">
              <Bell size={16} />
              <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-red-500" />
            </button>
            
            <button className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent/50">
              <Settings size={16} />
            </button>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Global Search Modal */}
      {searchOpen && (
        <SearchModal 
          isOpen={searchOpen} 
          onClose={() => setSearchOpen(false)}
          onNavigate={handleNavigateFromSearch}
        />
      )}
    </div>
  )
}
