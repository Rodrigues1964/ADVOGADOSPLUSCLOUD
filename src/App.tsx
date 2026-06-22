import React from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { SidebarLayout } from './components/SidebarLayout'
import { MasterLayout } from './components/MasterLayout'
import { logger } from './lib/telemetry'

// Pages
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Cases } from './pages/Cases'
import { Clients } from './pages/Clients'
import { Tasks } from './pages/Tasks'
import { Financials } from './pages/Financials'
import { ClientPortal } from './pages/ClientPortal'

// Master Pages
import { MasterDashboard } from './pages/master/MasterDashboard'
import { MasterClients } from './pages/master/MasterClients'
import { MasterLicenses } from './pages/master/MasterLicenses'
import { MasterCommunications } from './pages/master/MasterCommunications'
import { MasterAudit } from './pages/master/MasterAudit'
import { MasterMonitoring } from './pages/master/MasterMonitoring'
import { MasterBackup } from './pages/master/MasterBackup'
import { MasterSettings } from './pages/master/MasterSettings'

const AppRoutes: React.FC = () => {
  const { user, role, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          <span className="text-xs text-slate-400">Carregando Advogados Plus...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    if (location.pathname !== '/login' && location.pathname !== '/') {
      return <Navigate to="/login" replace />
    }
    return <Login />
  }

  // Client routing redirect logic
  const defaultRedirect = role === 'master' ? '/master/dashboard' : role === 'client' ? '/client-portal' : '/dashboard'

  if (role === 'master' && location.pathname.startsWith('/master')) {
    return (
      <MasterLayout>
        <Routes>
          <Route path="/master/dashboard" element={<MasterDashboard />} />
          <Route path="/master/clients" element={<MasterClients />} />
          <Route path="/master/licenses" element={<MasterLicenses />} />
          <Route path="/master/communications" element={<MasterCommunications />} />
          <Route path="/master/audit" element={<MasterAudit />} />
          <Route path="/master/monitoring" element={<MasterMonitoring />} />
          <Route path="/master/backup" element={<MasterBackup />} />
          <Route path="/master/settings" element={<MasterSettings />} />
          <Route path="/master/*" element={<Navigate to="/master/dashboard" replace />} />
        </Routes>
      </MasterLayout>
    )
  }

  // Se for master e tentou ir para a raiz ou rotas antigas
  if (role === 'master') {
    return <Navigate to="/master/dashboard" replace />
  }

  // Impede rotas normais de acessarem /master (Security check)
  if (location.pathname.startsWith('/master')) {
    return <Navigate to="/" replace />
  }

  return (
    <SidebarLayout>
      <Routes>
        {role !== 'client' && (
          <>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/cases" element={<Cases />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/tasks" element={<Tasks />} />
            {(role === 'owner' || role === 'admin') && (
              <Route path="/financials" element={<Financials />} />
            )}
          </>
        )}
        <Route path="/client-portal" element={<ClientPortal />} />
        
        {/* Fallbacks */}
        <Route path="/" element={<Navigate to={defaultRedirect} replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SidebarLayout>
  )
}

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('Unhandled UI Exception caught by ErrorBoundary', error, {
      componentStack: errorInfo.componentStack || ''
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-6">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
            <h2 className="text-sm font-bold text-red-500 mb-2">Erro Crítico Ocorreu</h2>
            <p className="text-xs text-slate-400 mb-4">
              O aplicativo encontrou um erro crítico e não pôde continuar. O incidente foi reportado automaticamente ao DevOps.
            </p>
            {this.state.error && (
              <pre className="p-3 bg-slate-950 rounded border border-slate-800 text-[10px] text-red-400 overflow-x-auto max-h-[150px] font-mono leading-relaxed">
                {this.state.error.toString()}
                {"\n"}
                {this.state.error.stack}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-4 w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold py-2 rounded-lg transition-colors"
            >
              Recarregar Sistema
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <HashRouter>
            <AppRoutes />
          </HashRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
