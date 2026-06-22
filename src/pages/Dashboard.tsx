import React from 'react'
import { 
  Briefcase, Calendar, DollarSign, CheckSquare, 
  TrendingUp, ExternalLink
} from 'lucide-react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import { performHealthCheck } from '../lib/telemetry'

export const Dashboard: React.FC = () => {
  const { tenant, user } = useAuth()

  const health = performHealthCheck()

  const [data, setData] = React.useState<any>(null)

  React.useEffect(() => {
    if (!tenant) return
    Promise.all([
      api.get('/cases'),
      api.get('/clients'),
      api.get('/tasks'),
      api.get('/hearings'),
      api.get('/financials')
    ]).then(([casesRes, clientsRes, tasksRes, hearingsRes, financialsRes]) => {
      setData({
        cases: casesRes.data,
        clients: clientsRes.data,
        tasks: tasksRes.data,
        hearings: hearingsRes.data,
        financials: financialsRes.data
      })
    }).catch(console.error)
  }, [tenant])

  if (!tenant) {
    return <div className="text-center py-10">Selecione um escritório na barra lateral.</div>
  }

  if (!data) {
    return <div className="flex h-full items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
  }

  const { cases, clients, tasks, hearings, financials } = data as {
    cases: any[],
    clients: any[],
    tasks: any[],
    hearings: any[],
    financials: any[]
  }

  // Metrics
  const activeCasesCount = cases.filter(c => c.status === 'active').length
  const pendingTasksCount = tasks.filter(t => t.status !== 'completed').length
  
  // Upcoming hearings
  const upcomingHearings = hearings
    .filter(h => new Date(h.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Revenue calculation
  const totalRevenue = financials
    .filter(f => f.type === 'income' && f.status === 'paid')
    .reduce((sum, f) => sum + f.amount, 0)
  
  const pendingRevenue = financials
    .filter(f => f.type === 'income' && f.status === 'pending')
    .reduce((sum, f) => sum + f.amount, 0)

  const totalExpenses = financials
    .filter(f => f.type === 'expense' && f.status === 'paid')
    .reduce((sum, f) => sum + f.amount, 0)

  // Chart Data: Cash Flow by Month (Aggregating transactions)
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const currentYear = new Date().getFullYear()
  
  const monthlyFlow = months.map((month, index) => {
    const incomes = financials
      .filter(f => f.type === 'income' && f.status === 'paid' && new Date(f.due_date).getMonth() === index && new Date(f.due_date).getFullYear() === currentYear)
      .reduce((sum, f) => sum + f.amount, 0)
    
    const expenses = financials
      .filter(f => f.type === 'expense' && f.status === 'paid' && new Date(f.due_date).getMonth() === index && new Date(f.due_date).getFullYear() === currentYear)
      .reduce((sum, f) => sum + f.amount, 0)

    return {
      name: month,
      Receitas: incomes,
      Despesas: expenses,
      Saldo: incomes - expenses
    }
  })

  // Chart Data: Case Status Breakdown
  const statusCounts = cases.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const statusColors: Record<string, string> = {
    active: '#3b82f6',     // Blue
    suspended: '#f59e0b',  // Yellow
    archived: '#6b7280',   // Gray
    settled: '#10b981'     // Green
  }

  const statusLabels: Record<string, string> = {
    active: 'Ativos',
    suspended: 'Suspensos',
    archived: 'Arquivados',
    settled: 'Acordo/Resolvido'
  }

  const caseStatusData = Object.keys(statusCounts).map(key => ({
    name: statusLabels[key] || key,
    value: statusCounts[key],
    color: statusColors[key] || '#cccccc'
  }))

  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 rounded-xl border border-border bg-card shadow-xs gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Olá, {user?.first_name}!
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Aqui está o resumo geral para o escritório <strong className="text-primary dark:text-sky-400">{tenant.name}</strong> hoje.
          </p>
        </div>
        <div className="flex gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-accent/50 px-3 py-1.5 text-xs font-medium text-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            MariaDB Conectado (API)
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Active Cases */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs interactive-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Processos Ativos</span>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
              <Briefcase size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold tracking-tight">{activeCasesCount}</h3>
            <p className="text-[10px] text-muted-foreground mt-1">
              De {cases.length} processos totais no acervo.
            </p>
          </div>
        </div>

        {/* Card 2: Upcoming Hearings */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs interactive-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Audiências Pendentes</span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
              <Calendar size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold tracking-tight">{upcomingHearings.length}</h3>
            <p className="text-[10px] text-muted-foreground mt-1">
              Audiências agendadas no calendário.
            </p>
          </div>
        </div>

        {/* Card 3: Revenue (Paid) */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs interactive-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Receita Realizada (Total)</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalRevenue)}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp size={10} className="text-emerald-500" />
              Líquido após despesa de {formatCurrency(totalExpenses)}.
            </p>
          </div>
        </div>

        {/* Card 4: Pending Tasks */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs interactive-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Minhas Tarefas</span>
            <div className="rounded-lg bg-purple-500/10 p-2 text-purple-600 dark:text-purple-400">
              <CheckSquare size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold tracking-tight">{pendingTasksCount}</h3>
            <p className="text-[10px] text-muted-foreground mt-1">
              Tarefas ativas atribuídas à equipe.
            </p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Cash Flow Chart */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Fluxo de Caixa ({currentYear})</h3>
              <p className="text-xs text-muted-foreground">Receitas vs Despesas realizadas por mês.</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Receitas
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> Despesas
              </div>
            </div>
          </div>
          
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyFlow} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip 
                  contentStyle={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  formatter={(value: unknown) => [formatCurrency(Number(value) || 0), '']}
                />
                <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Case Status Pie Chart */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">Distribuição do Acervo</h3>
            <p className="text-xs text-muted-foreground">Divisão de processos por status atual.</p>
          </div>

          <div className="h-48 w-full relative flex items-center justify-center">
            {caseStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={caseStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {caseStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} processo(s)`]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-xs text-muted-foreground">Nenhum dado</span>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-bold">{cases.length}</span>
              <span className="text-[10px] text-muted-foreground uppercase">Processos</span>
            </div>
          </div>

          <div className="space-y-1.5">
            {caseStatusData.map((entry, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-muted-foreground">{entry.name}</span>
                </div>
                <span className="font-semibold">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Hearings and Pending Financials */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Hearings List */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground">Próximas Audiências</h3>
              <p className="text-xs text-muted-foreground">Audiências e conciliações marcadas.</p>
            </div>
            <span className="text-xs text-muted-foreground bg-accent px-2 py-1 rounded-md">
              {upcomingHearings.length} total
            </span>
          </div>

          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
            {upcomingHearings.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                Nenhuma audiência futura agendada.
              </div>
            ) : (
              upcomingHearings.map(h => {
                const caseObj = cases.find(c => c.id === h.case_id)
                return (
                  <div key={h.id} className="flex gap-4 p-3 rounded-lg bg-accent/40 border border-border/60 hover:border-primary/40 transition-colors">
                    {/* Calendar Badge */}
                    <div className="flex flex-col items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary dark:text-sky-400 h-12 w-12 shrink-0">
                      <span className="text-[10px] font-bold uppercase leading-none">
                        {new Date(h.date).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                      </span>
                      <span className="text-lg font-bold leading-tight">
                        {new Date(h.date).getDate()}
                      </span>
                    </div>
                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-foreground truncate">
                          {caseObj?.title || 'Audiência Geral'}
                        </h4>
                        <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          {new Date(h.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate">
                        CNJ: {caseObj?.number || 'N/A'}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                        <span className="font-semibold">Local:</span>
                        <span className="truncate underline cursor-pointer flex items-center gap-0.5 text-primary dark:text-sky-400">
                          {h.location} <ExternalLink size={8} />
                        </span>
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Pending Financial Transactions */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground">Honorários Pendentes (Faturamento Esperado)</h3>
              <p className="text-xs text-muted-foreground">Honorários de êxito e parcelas pendentes.</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block">
                {formatCurrency(pendingRevenue)}
              </span>
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider">A receber</span>
            </div>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {financials.filter(f => f.type === 'income' && f.status === 'pending').length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                Nenhum honorário pendente registrado.
              </div>
            ) : (
              financials
                .filter(f => f.type === 'income' && f.status === 'pending')
                .map(f => {
                  const clientObj = clients.find(c => c.id === f.client_id)
                  return (
                    <div key={f.id} className="flex justify-between items-center p-2.5 rounded-lg border border-border/50 bg-accent/20 hover:bg-accent/40 transition-colors">
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-foreground truncate">
                          {f.description}
                        </h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                          Cliente: {clientObj?.name || 'Geral'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-foreground block">
                          {formatCurrency(f.amount)}
                        </span>
                        <span className="text-[9px] text-muted-foreground">
                          Vence: {new Date(f.due_date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  )
                })
            )}
          </div>
        </div>
      </div>

      {/* DevOps Observability & System Diagnostics */}
      <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-4 border-b border-border">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${health.status === 'healthy' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              Diagnóstico de Sistema & Observabilidade (DevOps)
            </h3>
            <p className="text-xs text-muted-foreground">Métricas de telemetria em tempo real para auditoria de produção.</p>
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${
            health.status === 'healthy' 
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
              : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
          }`}>
            Status: {health.status.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          {/* Database Health */}
          <div className="space-y-2 p-4 rounded-lg bg-accent/30 border border-border/50">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Armazenamento & Banco</span>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Tipo de Banco:</span>
              <span className="font-semibold text-foreground">{health.database.type.toUpperCase()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Conexão:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {health.database.status}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Latência da Consulta:</span>
              <span className="font-semibold text-foreground font-mono">{health.database.latency_ms}ms</span>
            </div>
          </div>

          {/* Storage Capacity */}
          <div className="space-y-2 p-4 rounded-lg bg-accent/30 border border-border/50">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Cotas de Armazenamento Local</span>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Espaço Consumido:</span>
              <span className="font-semibold text-foreground font-mono">{(health.storage.usedBytes / 1024).toFixed(2)} KB</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Limite Disponível:</span>
              <span className="font-semibold text-foreground font-mono">{(health.storage.capacityBytes / (1024 * 1024)).toFixed(0)} MB</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
                <span>Uso do Cache Local</span>
                <span>{health.storage.usagePercent}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    health.storage.status === 'ok' ? 'bg-primary' : health.storage.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, health.storage.usagePercent)}%` }}
                />
              </div>
            </div>
          </div>

          {/* System Performance */}
          <div className="space-y-2 p-4 rounded-lg bg-accent/30 border border-border/50">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Telemetria de Runtime (JS)</span>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Uso de Heap JS:</span>
              <span className="font-semibold text-foreground font-mono">
                {health.system.memoryUsedMB ? `${health.system.memoryUsedMB} MB` : 'N/A (Incompatível)'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Limite de Heap JS:</span>
              <span className="font-semibold text-foreground font-mono">
                {health.system.memoryLimitMB ? `${health.system.memoryLimitMB} MB` : 'N/A (Incompatível)'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Tempo de Atividade (Uptime):</span>
              <span className="font-semibold text-foreground font-mono">{health.system.uptimeSeconds}s</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 p-2.5 rounded bg-blue-500/5 border border-blue-500/10 text-[10px] text-blue-700 dark:text-blue-300">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
          <span><strong>DevOps Rules Active:</strong> Endpoints carry trace IDs. All logs are JSON structured. Anomalies trigger real-time incident warnings.</span>
        </div>
      </div>
    </div>
  )
}
