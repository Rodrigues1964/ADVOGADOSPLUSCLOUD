import React, { useState } from 'react'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { logger } from '../lib/telemetry'

export const Login: React.FC = () => {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState(import.meta.env.PROD ? '' : 'password123')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const loginLogger = logger.child({ action: 'login_form_submit', email })

    try {
      const success = await signIn(email, password)
      if (!success) {
        setError('E-mail ou senha incorretos. Tente novamente!')
        loginLogger.warn('Invalid login credentials provided')
      } else {
        loginLogger.info('User logged in successfully via credentials form')
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      loginLogger.error('Unhandled exception during login submission', errorObj)
      setError(errorObj.message || 'Ocorreu um erro no sistema ao tentar realizar o login. Por favor, tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickLogin = async (demoEmail: string) => {
    setError('')
    setLoading(true)
    setEmail(demoEmail)
    setPassword('password123')
    
    const demoLogger = logger.child({ action: 'quick_demo_login', email: demoEmail })
    
    try {
      const success = await signIn(demoEmail, 'password123')
      if (success) {
        demoLogger.info('Successful login via quick demo shortcut')
      } else {
        demoLogger.warn('Quick demo login shortcut failed')
        setError('Falha ao autenticar o usuário de demonstração.')
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      demoLogger.error('Unhandled exception during quick demo login', errorObj)
      setError('Erro de sistema durante login rápido.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden">
      {/* Abstract Glowing Shapes */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 overflow-hidden transition-all duration-300">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div 
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-extrabold text-xl shadow-lg shadow-primary/20 mb-4 cursor-pointer"
            title="ADVOGADOS PLUS"
          >
            A+
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">ADVOGADOS PLUS CLOUD</h2>
          <p className="text-xs text-slate-400 mt-1">Plataforma SaaS Jurídica Multi-tenant</p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Endereço de E-mail</label>
            <div className="relative mt-1">
              <Mail size={14} className="absolute left-3 top-3 text-slate-500" />
              <input
                type="email"
                required
                className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-10 pr-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-hidden focus:border-primary transition-colors"
                placeholder="Ex: carlos@rodrigues.adv.br"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Senha de Acesso</label>
            <div className="relative mt-1">
              <Lock size={14} className="absolute left-3 top-3 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-10 pr-10 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-hidden focus:border-primary transition-colors"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-500 hover:text-white"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold py-2.5 px-4 rounded-lg shadow-lg hover:shadow-primary/20 transition-all"
          >
            {loading ? 'Entrando...' : 'Entrar no Sistema'}
          </button>
        </form>

        {/* Quick Demo Accounts Selector (Aesthetic & highly useful) */}
        {!import.meta.env.PROD && (
          <div className="mt-8 border-t border-slate-800/80 pt-6">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block text-center mb-3">
              Acesso Rápido de Demonstração
            </span>
            <div className="space-y-2">
              
              {/* Owner */}
              <button
                onClick={() => handleQuickLogin('carlos@rodrigues.adv.br')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-800/60 bg-slate-950/40 hover:bg-slate-850/60 hover:border-slate-700 transition-all text-xs text-left"
              >
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-[10px]">
                    CR
                  </div>
                  <div>
                    <span className="text-slate-200 font-bold block">Dr. Carlos Rodrigues</span>
                    <span className="text-[9px] text-slate-500">carlos@rodrigues.adv.br • Sócio Fundador</span>
                  </div>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-blue-400">Owner</span>
              </button>

              {/* Lawyer */}
              <button
                onClick={() => handleQuickLogin('mariana@rodrigues.adv.br')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-800/60 bg-slate-950/40 hover:bg-slate-850/60 hover:border-slate-700 transition-all text-xs text-left"
              >
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-[10px]">
                    MS
                  </div>
                  <div>
                    <span className="text-slate-200 font-bold block">Dra. Mariana Silva</span>
                    <span className="text-[9px] text-slate-500">mariana@rodrigues.adv.br • Advogada Plena</span>
                  </div>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-purple-400">Lawyer</span>
              </button>

              {/* Client */}
              <button
                onClick={() => handleQuickLogin('eduardo@cliente.com.br')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-800/60 bg-slate-950/40 hover:bg-slate-850/60 hover:border-slate-700 transition-all text-xs text-left"
              >
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-[10px]">
                    ES
                  </div>
                  <div>
                    <span className="text-slate-200 font-bold block">Eduardo Santos</span>
                    <span className="text-[9px] text-slate-500">eduardo@cliente.com.br • Cliente do Escritório</span>
                  </div>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400">Client</span>
              </button>

            </div>
          </div>
        )}

      </div>
    </div>
  )
}
