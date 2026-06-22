import React, { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { ShieldCheck, Search, Filter } from 'lucide-react'

export const MasterAudit: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/master/audit')
      .then(res => setLogs(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Auditoria de Segurança</h2>
          <p className="text-slate-400 text-sm">Registro imutável de todas as ações críticas executadas na plataforma.</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-rose-500" />
            <h3 className="text-white font-bold">Trilha de Ações (Últimos 100 registros)</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="Buscar logs..." 
                className="bg-slate-950 border border-slate-800 text-white text-sm rounded-lg pl-9 pr-4 py-1.5 focus:outline-none focus:border-rose-500 w-64"
              />
            </div>
            <button className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800">
              <Filter size={16} />
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-slate-400">Carregando logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-400">Nenhum log registrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/50 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3 font-medium">Data / Hora</th>
                  <th className="px-6 py-3 font-medium">Ação</th>
                  <th className="px-6 py-3 font-medium">Recurso</th>
                  <th className="px-6 py-3 font-medium">Usuário ID</th>
                  <th className="px-6 py-3 font-medium">Tenant ID</th>
                  <th className="px-6 py-3 font-medium">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs">
                      {log.resource}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400">
                      {log.user_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400">
                      {log.tenant_id || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      {log.ip}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
