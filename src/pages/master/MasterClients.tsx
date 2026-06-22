import React, { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import type { Tenant } from '../../lib/database'
import { Lock, Unlock, Search, Building2, Settings } from 'lucide-react'

export const MasterClients: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadTenants()
  }, [])

  const loadTenants = async () => {
    try {
      const res = await api.get('/master/clients')
      setTenants(res.data || [])
    } catch (e) {
      console.error(e)
    }
  }

  const handleToggleStatus = async (id: string) => {
    if (window.confirm('Tem certeza que deseja alterar o status (bloqueio/desbloqueio) deste escritório? Ele perderá imediatamente o acesso ao sistema caso seja bloqueado.')) {
      try {
        await api.put(`/master/clients/${id}/status`)
        await loadTenants() // reload
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Erro ao alterar status')
      }
    }
  }

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.slug.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Gestão de Escritórios (Tenants)</h2>
          <p className="text-slate-400 text-sm">Gerencie o acesso global de todos os clientes da plataforma.</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-800 flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text"
              placeholder="Buscar por nome ou slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-rose-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-950/50 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4 rounded-tl-lg">Escritório</th>
                <th className="px-6 py-4">Domínio / Slug</th>
                <th className="px-6 py-4">Plano Atual</th>
                <th className="px-6 py-4">Faturamento</th>
                <th className="px-6 py-4">Status de Acesso</th>
                <th className="px-6 py-4 rounded-tr-lg text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Nenhum escritório encontrado.
                  </td>
                </tr>
              ) : (
                filteredTenants.map(tenant => (
                  <tr key={tenant.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                          <Building2 size={16} />
                        </div>
                        <div>
                          <p className="text-white font-semibold">{tenant.name}</p>
                          <p className="text-xs text-slate-500">ID: {tenant.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300 font-mono text-xs">{tenant.slug}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full border border-blue-500/20 bg-blue-500/10 text-[10px] uppercase font-bold text-blue-400">
                        {tenant.plan_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full border text-[10px] uppercase font-bold ${
                        tenant.subscription_status === 'active' ? 'border-green-500/20 bg-green-500/10 text-green-400' :
                        tenant.subscription_status === 'past_due' ? 'border-amber-500/20 bg-amber-500/10 text-amber-400' :
                        tenant.subscription_status === 'trialing' ? 'border-sky-500/20 bg-sky-500/10 text-sky-400' :
                        'border-red-500/20 bg-red-500/10 text-red-400'
                      }`}>
                        {tenant.subscription_status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex w-fit items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] uppercase font-bold ${
                        tenant.status === 'blocked' ? 'border-red-500/20 bg-red-500/10 text-red-400' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {tenant.status === 'blocked' ? <Lock size={12} /> : <Unlock size={12} />}
                        {tenant.status === 'blocked' ? 'BLOQUEADO' : 'ATIVO'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleToggleStatus(tenant.id)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                          title={tenant.status === 'blocked' ? 'Desbloquear Acesso' : 'Bloquear Acesso'}
                        >
                          {tenant.status === 'blocked' ? <Unlock size={16} className="text-emerald-500" /> : <Lock size={16} className="text-red-500" />}
                        </button>
                        <button className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors">
                          <Settings size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
