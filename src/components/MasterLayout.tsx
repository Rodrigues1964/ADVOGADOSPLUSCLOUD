import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, Users, CreditCard, ShieldCheck,
  LogOut, Settings, Bell, Server, DatabaseBackup, ChevronLeft, ChevronRight, Activity, Mail
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface MasterLayoutProps {
  children: React.ReactNode
}

export const MasterLayout: React.FC<MasterLayoutProps> = ({ children }) => {
  const { user, signOut } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const navItems = [
    { name: 'Visão Geral', path: '/master/dashboard', icon: LayoutDashboard },
    { name: 'Clientes (Escritórios)', path: '/master/clients', icon: Users },
    { name: 'Assinaturas & Licenças', path: '/master/licenses', icon: CreditCard },
    { name: 'Comunicação', path: '/master/communications', icon: Mail },
    { name: 'Auditoria de Segurança', path: '/master/audit', icon: ShieldCheck },
    { name: 'Monitoramento', path: '/master/monitoring', icon: Activity },
    { name: 'Backups', path: '/master/backup', icon: DatabaseBackup },
    { name: 'Configurações Globais', path: '/master/settings', icon: Settings },
  ]

  // Enforce isolation visually
  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200 selection:bg-rose-500/30">
      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-800 bg-slate-950 transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-72'
        }`}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800">
          {!collapsed ? (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600 text-white font-bold shadow-lg shadow-rose-500/20">
                <Server size={18} />
              </div>
              <span className="font-bold text-sm tracking-tight text-rose-500 uppercase">
                ADMIN MASTER
              </span>
            </div>
          ) : (
            <div className="flex h-8 w-8 mx-auto items-center justify-center rounded-lg bg-rose-600 text-white font-bold">
              <Server size={18} />
            </div>
          )}
          
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex h-6 w-6 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-slate-400 hover:text-white"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname.startsWith(item.path)
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-rose-600/10 text-rose-500 border border-rose-500/20' 
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
                } ${collapsed ? 'justify-center' : 'justify-start'}`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-rose-500' : ''}`} />
                {!collapsed && <span className="ml-3">{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-slate-800 p-3 space-y-2">
          <button
            onClick={() => {
              signOut()
              navigate('/')
            }}
            className={`flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-900 hover:text-white transition-colors ${
              collapsed ? 'justify-center' : 'justify-start'
            }`}
          >
            <LogOut size={16} />
            {!collapsed && <span className="ml-3">Sair do Painel</span>}
          </button>

          {!collapsed && user && (
            <div className="flex items-center gap-3 p-2 mt-2 rounded-lg bg-slate-900 border border-slate-800">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/10 text-rose-500 font-bold text-xs">
                {user.first_name[0]}{user.last_name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-200 truncate">
                  {user.first_name} {user.last_name}
                </p>
                <p className="text-[10px] text-rose-500/80 truncate uppercase font-semibold">
                  Acesso Restrito
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>

      <div className={`flex flex-1 flex-col transition-all duration-300 ${collapsed ? 'pl-16' : 'pl-72'}`}>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-8">
          <h1 className="text-lg font-semibold tracking-tight text-white">
            Painel de Controle Central
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-[10px] uppercase tracking-wider font-bold text-green-500">Sistema Online</span>
            </div>
            <button className="relative p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900">
              <Bell size={16} />
            </button>
          </div>
        </header>
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
