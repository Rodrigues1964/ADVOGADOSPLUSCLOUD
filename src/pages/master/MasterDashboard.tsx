import React, { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { 
  Users, Building2, CreditCard, AlertTriangle, 
  TrendingUp, TrendingDown, Server
} from 'lucide-react'

export const MasterDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    api.get('/master/dashboard')
      .then(res => setStats(res.data))
      .catch(console.error)
  }, [])

  if (!stats) return <div className="text-white">Carregando métricas...</div>

  const StatCard = ({ title, value, icon: Icon, trend, trendValue, color }: any) => (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
          <h3 className="text-3xl font-extrabold text-white">{value}</h3>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center text-xs">
          {trend === 'up' ? (
            <TrendingUp size={14} className="text-green-500 mr-1" />
          ) : (
            <TrendingDown size={14} className="text-red-500 mr-1" />
          )}
          <span className={trend === 'up' ? 'text-green-500' : 'text-red-500'}>
            {trendValue}
          </span>
          <span className="text-slate-500 ml-2">vs. mês passado</span>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Dashboard Geral do Sistema</h2>
        <p className="text-slate-400 text-sm">Visão global sobre todos os tenants (escritórios) hospedados no Advogados Plus.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard 
          title="Escritórios Ativos" 
          value={stats.active_clients} 
          icon={Building2} 
          color="bg-blue-500/80 shadow-blue-500/20 shadow-lg"
          trend="up"
          trendValue="+12%"
        />
        <StatCard 
          title="Escritórios Bloqueados" 
          value={stats.blocked_clients} 
          icon={AlertTriangle} 
          color="bg-red-500/80 shadow-red-500/20 shadow-lg"
          trend="down"
          trendValue="-2%"
        />
        <StatCard 
          title="Receita Mensal (MRR)" 
          value={`R$ ${(stats.monthly_revenue).toLocaleString('pt-BR')}`} 
          icon={CreditCard} 
          color="bg-emerald-500/80 shadow-emerald-500/20 shadow-lg"
          trend="up"
          trendValue="+5.4%"
        />
        <StatCard 
          title="Total de Usuários Globais" 
          value={stats.total_users} 
          icon={Users} 
          color="bg-purple-500/80 shadow-purple-500/20 shadow-lg"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <Server size={18} className="text-rose-500" /> 
            Consumo de Infraestrutura Mock (Geral)
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Armazenamento S3 (Documentos)</span>
                <span className="text-white font-bold">450 GB / 2 TB</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '22%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Banco de Dados (Linhas Globais)</span>
                <span className="text-white font-bold">{stats.total_cases + stats.total_users} de 1.000.000</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '15%' }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
          <h3 className="text-white font-bold mb-4">Avisos do Sistema</h3>
          <ul className="space-y-3">
            <li className="flex gap-3 text-sm">
              <div className="mt-0.5 text-amber-500"><AlertTriangle size={16} /></div>
              <div>
                <p className="text-slate-200 font-bold">Backup mensal não concluído</p>
                <p className="text-slate-500 text-xs">A rotina de backup em cold-storage falhou ontem. Necessário retentar.</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
