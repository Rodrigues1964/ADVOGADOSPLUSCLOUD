import React, { useState, useEffect } from 'react'
import { 
  DollarSign, TrendingUp, TrendingDown, Plus, Trash2, 
  X, Wallet, Receipt
} from 'lucide-react'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer 
} from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import type { FinancialTransaction, Case, Client } from '../lib/database'

export const Financials: React.FC = () => {
  const { tenant } = useAuth()
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([])
  const [cases, setCases] = useState<Case[]>([])
  const [clients, setClients] = useState<Client[]>([])

  // Search & Filter
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending'>('all')

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [newTrans, setNewTrans] = useState<{
    type: 'income' | 'expense'
    category: FinancialTransaction['category']
    amount: number
    due_date: string
    payment_date: string
    status: FinancialTransaction['status']
    description: string
    case_id: string
    client_id: string
  }>({
    type: 'income',
    category: 'honorarios',
    amount: 0,
    due_date: '',
    payment_date: '',
    status: 'pending',
    description: '',
    case_id: '',
    client_id: ''
  })

  const loadData = React.useCallback(async () => {
    if (!tenant) return
    try {
      const [finRes, casesRes, clientsRes] = await Promise.all([
        api.get('/financials'),
        api.get('/cases'),
        api.get('/clients')
      ]).catch(() => [{data:[]}, {data:[]}, {data:[]}])
      setTransactions(finRes.data || [])
      setCases(casesRes.data || [])
      setClients(clientsRes.data || [])
    } catch (err) {
      console.error(err)
    }
  }, [tenant])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData()
    }, 0)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant])

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant) return

    try {
      await api.post('/financials', {
        ...newTrans,
        amount: Number(newTrans.amount),
        payment_date: newTrans.status === 'paid' ? newTrans.payment_date || new Date().toISOString().split('T')[0] : undefined
      })

      await loadData()
      setAddModalOpen(false)
      setNewTrans({
        type: 'income',
        category: 'honorarios',
        amount: 0,
        due_date: '',
        payment_date: '',
        status: 'pending',
        description: '',
        case_id: '',
        client_id: ''
      })
    } catch(err) {
      alert('Erro ao registrar movimentação')
    }
  }

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Deseja realmente excluir este lançamento financeiro?')) return
    try {
      await api.delete(`/financials/${id}`)
      await loadData()
    } catch(err) {
      alert('Erro ao excluir')
    }
  }

  const handleMarkAsPaid = async (transId: string) => {
    if (!tenant) return
    try {
      await api.put(`/financials/${transId}`, { 
        status: 'paid',
        payment_date: new Date().toISOString().split('T')[0]
      })
      await loadData()
    } catch(err) {
      alert('Erro ao dar baixa')
    }
  }

  // Summary Metrics
  const totalRevenuesPaid = transactions
    .filter(t => t.type === 'income' && t.status === 'paid')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalRevenuesPending = transactions
    .filter(t => t.type === 'income' && t.status === 'pending')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpensesPaid = transactions
    .filter(t => t.type === 'expense' && t.status === 'paid')
    .reduce((sum, t) => sum + t.amount, 0)

  const netBalance = totalRevenuesPaid - totalExpensesPaid

  // Filters logic
  const filteredTransactions = transactions.filter(t => {
    const matchesType = filterType === 'all' ? true : t.type === filterType
    const matchesStatus = filterStatus === 'all' ? true : t.status === filterStatus
    return matchesType && matchesStatus
  }).sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())

  // Line Chart Monthly Flow Data
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const currentYear = new Date().getFullYear()

  const chartData = months.map((month, index) => {
    const revenue = transactions
      .filter(t => t.type === 'income' && t.status === 'paid' && new Date(t.due_date).getMonth() === index && new Date(t.due_date).getFullYear() === currentYear)
      .reduce((sum, t) => sum + t.amount, 0)

    const expense = transactions
      .filter(t => t.type === 'expense' && t.status === 'paid' && new Date(t.due_date).getMonth() === index && new Date(t.due_date).getFullYear() === currentYear)
      .reduce((sum, t) => sum + t.amount, 0)

    return {
      name: month,
      Receitas: revenue,
      Despesas: expense
    }
  })

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const categoryLabels: Record<string, string> = {
    honorarios: 'Honorários Advocatícios',
    custas: 'Custas Processuais',
    despesas: 'Despesas Gerais',
    aluguel: 'Aluguel Escritório',
    salarios: 'Salários e Comissões',
    outros: 'Outros Lançamentos'
  }

  return (
    <div className="space-y-6">
      
      {/* 1. Metrics Overview Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1 */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs interactive-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Recebido</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalRevenuesPaid)}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-1">Revolvente anual quitado.</p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs interactive-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">A Receber (Pendentes)</span>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
              <Receipt size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
              {formatCurrency(totalRevenuesPending)}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-1">Faturamento previsto em carteira.</p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs interactive-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Despesas Pagas</span>
            <div className="rounded-lg bg-rose-500/10 p-2 text-rose-600 dark:text-rose-400">
              <TrendingDown size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
              {formatCurrency(totalExpensesPaid)}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-1">Custos processuais e fixos quitados.</p>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs interactive-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Saldo Líquido</span>
            <div className="rounded-lg bg-violet-500/10 p-2 text-violet-600 dark:text-violet-400">
              <Wallet size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className={`text-2xl font-bold tracking-tight ${netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatCurrency(netBalance)}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-1">Caixa líquido consolidado.</p>
          </div>
        </div>
      </div>

      {/* 2. Monthly Trend Chart */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
        <h3 className="text-sm font-bold text-foreground mb-4">Evolução Mensal de Fluxo de Caixa ({currentYear})</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `R$${v}`} />
              <Tooltip 
                contentStyle={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                formatter={(val) => [formatCurrency(Number(val)), '']}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Line type="monotone" dataKey="Receitas" stroke="#10b981" strokeWidth={2} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="Despesas" stroke="#f43f5e" strokeWidth={2} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Ledger Table Section */}
      <div className="border border-border rounded-xl bg-card overflow-hidden shadow-xs flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-accent/10">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xs font-bold text-foreground">Livro Razão / Movimentações</h3>
            
            {/* Filters Type */}
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as 'all' | 'income' | 'expense')}
              className="rounded-lg border border-border bg-accent/40 px-2 py-1 text-xs text-foreground focus:outline-hidden"
            >
              <option value="all">Todas Operações</option>
              <option value="income">Receitas (+)</option>
              <option value="expense">Despesas (-)</option>
            </select>

            {/* Filters Status */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as 'all' | 'paid' | 'pending')}
              className="rounded-lg border border-border bg-accent/40 px-2 py-1 text-xs text-foreground focus:outline-hidden"
            >
              <option value="all">Todos Status</option>
              <option value="paid">Quitados</option>
              <option value="pending">Pendentes</option>
            </select>
          </div>

          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus size={14} /> Novo Lançamento
          </button>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-accent/40 text-muted-foreground uppercase text-[9px] font-bold border-b border-border">
              <tr>
                <th className="p-4">Descrição</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Categoria</th>
                <th className="p-4">Data Venc.</th>
                <th className="p-4">Valor</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-xs text-muted-foreground">
                    Nenhum lançamento financeiro registrado.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(t => {
                  const isIncome = t.type === 'income'
                  const isPaid = t.status === 'paid'
                  return (
                    <tr key={t.id} className="hover:bg-accent/20 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-foreground">{t.description}</div>
                        {t.case_id && (
                          <span className="text-[9px] text-muted-foreground font-mono">
                            Processo ID: {cases.find(c => c.id === t.case_id)?.number || 'Simulado'}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 font-bold text-[9px] uppercase ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isIncome ? 'Receita' : 'Despesa'}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-muted-foreground">
                        {categoryLabels[t.category] || t.category}
                      </td>
                      <td className="p-4 text-muted-foreground font-mono">
                        {new Date(t.due_date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className={`p-4 font-bold ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isIncome ? '+' : '-'} {formatCurrency(t.amount)}
                      </td>
                      <td className="p-4">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          isPaid ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                        }`}>
                          {isPaid ? 'Pago' : 'Pendente'}
                        </span>
                      </td>
                      <td className="p-4 flex items-center justify-center gap-2">
                        {!isPaid && (
                          <button
                            onClick={() => handleMarkAsPaid(t.id)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-md transition-colors"
                          >
                            Dar Baixa
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteTransaction(t.id)}
                          className="text-red-500 hover:bg-red-50 p-1.5 rounded-md"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Register New Transaction */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setAddModalOpen(false)} />
          <div className="relative w-full max-w-md bg-card rounded-xl border border-border shadow-2xl p-6 overflow-hidden">
            <div className="flex justify-between items-center border-b border-border pb-3 mb-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <DollarSign size={16} className="text-primary dark:text-sky-400" />
                Registrar Movimentação de Caixa
              </h3>
              <button onClick={() => setAddModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTransaction} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Tipo de Lançamento</label>
                  <select
                    value={newTrans.type}
                    onChange={e => setNewTrans(prev => ({ ...prev, type: e.target.value as 'income' | 'expense', category: e.target.value === 'income' ? 'honorarios' : 'despesas' }))}
                    className="w-full mt-1 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                  >
                    <option value="income">Receita (+)</option>
                    <option value="expense">Despesa (-)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Categoria</label>
                  <select
                    value={newTrans.category}
                    onChange={e => setNewTrans(prev => ({ ...prev, category: e.target.value as FinancialTransaction['category'] }))}
                    className="w-full mt-1 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                  >
                    {newTrans.type === 'income' ? (
                      <>
                        <option value="honorarios">Honorários Advocatícios</option>
                        <option value="outros">Outros Recebimentos</option>
                      </>
                    ) : (
                      <>
                        <option value="custas">Custas Processuais</option>
                        <option value="despesas">Despesas Gerais</option>
                        <option value="aluguel">Aluguel do Escritório</option>
                        <option value="salarios">Salários e Pró-Labore</option>
                        <option value="outros">Outros Custos</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Descrição do Lançamento</label>
                <input
                  type="text"
                  required
                  className="w-full mt-1 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                  placeholder="Ex: Honorários Iniciais Revisional - Alfa"
                  value={newTrans.description}
                  onChange={e => setNewTrans(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Valor do Lançamento (R$)</label>
                  <input
                    type="number"
                    required
                    className="w-full mt-1 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                    placeholder="Ex: 1500"
                    value={newTrans.amount || ''}
                    onChange={e => setNewTrans(prev => ({ ...prev, amount: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Data de Vencimento</label>
                  <input
                    type="date"
                    required
                    className="w-full mt-1 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                    value={newTrans.due_date}
                    onChange={e => setNewTrans(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Processo (Opcional)</label>
                  <select
                    value={newTrans.case_id}
                    onChange={e => setNewTrans(prev => ({ ...prev, case_id: e.target.value }))}
                    className="w-full mt-1 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Nenhum processo</option>
                    {cases.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Cliente (Opcional)</label>
                  <select
                    value={newTrans.client_id}
                    onChange={e => setNewTrans(prev => ({ ...prev, client_id: e.target.value }))}
                    className="w-full mt-1 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Nenhum cliente</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Status de Quitação</label>
                <select
                  value={newTrans.status}
                  onChange={e => setNewTrans(prev => ({ ...prev, status: e.target.value as FinancialTransaction['status'] }))}
                  className="w-full mt-1 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                >
                  <option value="pending">Pendente (Lançado a receber/pagar)</option>
                  <option value="paid">Quitado / Pago (Fazer baixa imediata)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 border border-border rounded-lg text-xs font-semibold text-muted-foreground hover:bg-accent"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90"
                >
                  Salvar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
