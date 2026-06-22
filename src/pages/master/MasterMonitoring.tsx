import React, { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { Activity, Server, Database } from 'lucide-react'

export const MasterMonitoring: React.FC = () => {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    try {
      const res = await api.get('/master/monitoring')
      setData(res.data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 5000) // Poll every 5s
    return () => clearInterval(interval)
  }, [])

  if (loading && !data) return <div className="text-white">Carregando métricas em tempo real...</div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Monitoramento (Ao Vivo)</h2>
        <p className="text-slate-400 text-sm">Dados de uso de infraestrutura capturados diretamente do servidor Node.js e banco MariaDB.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Banco */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <Database size={18} className="text-blue-500" /> 
            MariaDB Status
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400 text-sm">Conexões Ativas</span>
              <span className="text-white font-bold">{data.database.active_connections}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400 text-sm">Tempo de Resposta</span>
              <span className="text-emerald-500 font-bold">{data.database.response_time_ms} ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Total Queries Hoje</span>
              <span className="text-white font-bold">{data.database.total_queries}</span>
            </div>
          </div>
        </div>

        {/* Sistema */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <Server size={18} className="text-rose-500" /> 
            Host (Servidor Node)
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400 text-sm">Núcleos CPU</span>
              <span className="text-white font-bold">{data.system.cpu_count} vCPUs</span>
            </div>
            <div className="flex flex-col border-b border-slate-800 pb-2">
              <div className="flex justify-between mb-1">
                <span className="text-slate-400 text-sm">Memória RAM</span>
                <span className="text-white font-bold">
                  {(data.system.memory_used / 1024 / 1024 / 1024).toFixed(2)} GB / {(data.system.memory_total / 1024 / 1024 / 1024).toFixed(2)} GB
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5">
                <div 
                  className="bg-rose-500 h-1.5 rounded-full" 
                  style={{ width: `${(data.system.memory_used / data.system.memory_total) * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Armazenamento (DB)</span>
              <span className="text-white font-bold">{(data.system.storage_used_bytes / 1024 / 1024).toFixed(2)} MB</span>
            </div>
          </div>
        </div>

        {/* Aplicação */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <Activity size={18} className="text-emerald-500" /> 
            Aplicação
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400 text-sm">Usuários Online</span>
              <span className="text-emerald-500 font-bold">{data.application.users_online}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400 text-sm">Tenants Ativos</span>
              <span className="text-white font-bold">{data.application.active_tenants}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Erros Registrados Hoje</span>
              <span className={data.application.errors_today > 0 ? "text-red-500 font-bold" : "text-white font-bold"}>
                {data.application.errors_today}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
