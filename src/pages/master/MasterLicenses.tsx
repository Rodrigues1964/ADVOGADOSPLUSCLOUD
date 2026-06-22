import React, { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { CreditCard, CheckCircle2, AlertCircle, XCircle } from 'lucide-react'

export const MasterLicenses: React.FC = () => {
  const [licenses, setLicenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/master/licenses')
      .then(res => setLicenses(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Assinaturas e Licenças</h2>
        <p className="text-slate-400 text-sm">Gerenciamento de planos, vigência e bloqueio automático de tenants.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 flex items-center gap-2">
          <CreditCard size={18} className="text-emerald-500" />
          <h3 className="text-white font-bold">Licenças Ativas e Expiradas</h3>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-slate-400">Carregando licenças...</div>
        ) : licenses.length === 0 ? (
          <div className="p-8 text-center text-slate-400">Nenhuma licença vinculada a tenant.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/50 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3 font-medium">Tenant ID</th>
                  <th className="px-6 py-3 font-medium">Plano</th>
                  <th className="px-6 py-3 font-medium">Início</th>
                  <th className="px-6 py-3 font-medium">Término</th>
                  <th className="px-6 py-3 font-medium">Status da Licença</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {licenses.map((lic: any) => {
                  const isExpired = new Date(lic.end_date) < new Date()
                  return (
                    <tr key={lic.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400 font-mono">
                        {lic.tenant_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-200">
                        {lic.plan?.name || 'Desconhecido'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(lic.start_date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={isExpired ? 'text-red-500 font-bold' : ''}>
                          {new Date(lic.end_date).toLocaleDateString('pt-BR')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">
                            <XCircle size={12} /> Expirada (Bloqueio Automático)
                          </span>
                        ) : lic.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            <CheckCircle2 size={12} /> Ativa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            <AlertCircle size={12} /> Suspensa
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
