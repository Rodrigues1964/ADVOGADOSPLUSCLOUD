import React, { useState, useEffect } from 'react'
import confetti from 'canvas-confetti'
import { 
  CheckSquare, Plus, Search, Trash2, Calendar, X, Briefcase
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import type { Task, Case, Profile } from '../lib/database'

const COLUMNS: { id: Task['status']; title: string; color: string }[] = [
  { id: 'todo', title: 'A Fazer', color: 'border-t-4 border-t-slate-400 dark:border-t-slate-600' },
  { id: 'in_progress', title: 'Em Andamento', color: 'border-t-4 border-t-blue-500' },
  { id: 'waiting', title: 'Em Espera', color: 'border-t-4 border-t-amber-500' },
  { id: 'completed', title: 'Concluído', color: 'border-t-4 border-t-emerald-500' }
]

export const Tasks: React.FC = () => {
  const { tenant } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [cases, setCases] = useState<Case[]>([])
  const [users, setUsers] = useState<Profile[]>([])

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'medium' | 'high' | 'urgent'>('all')

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    case_id: '',
    assigned_to: '',
    priority: 'medium' as Task['priority'],
    due_date: '',
    status: 'todo' as Task['status']
  })

  const loadData = React.useCallback(async () => {
    if (!tenant) return
    try {
      const [tasksRes, casesRes] = await Promise.all([
        api.get('/tasks'),
        api.get('/cases')
      ]).catch(() => [{data:[]}, {data:[]}])
      setTasks(tasksRes.data || [])
      setCases(casesRes.data || [])
      // We aren't fetching users right now from api since we don't have a /users endpoint
      // So we'll leave users empty or add a simple fallback
      setUsers([])
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

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant) return

    try {
      await api.post('/tasks', newTask)
      await loadData()
      setAddModalOpen(false)
      setNewTask({
        title: '',
        description: '',
        case_id: '',
        assigned_to: '',
        priority: 'medium',
        due_date: '',
        status: 'todo'
      })
    } catch (err) {
      alert('Erro ao criar tarefa')
    }
  }

  // Move task to next status or specific status
  const handleMoveStatus = async (taskId: string, nextStatus: Task['status']) => {
    try {
      await api.put(`/tasks/${taskId}`, { status: nextStatus })
      
      // Celebration triggers when a task is completed!
      if (nextStatus === 'completed') {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']
        })
      }
      
      await loadData()
    } catch (err) {
      alert('Erro ao atualizar tarefa')
    }
  }

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Deseja excluir esta tarefa definitivamente?')) return
    try {
      await api.delete(`/tasks/${id}`)
      await loadData()
    } catch (err) {
      alert('Erro ao excluir tarefa')
    }
  }

  // Filters
  const filteredTasks = tasks.filter(t => {
    const q = searchQuery.toLowerCase()
    const matchesSearch = t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q))
    const matchesPriority = filterPriority === 'all' ? true : t.priority === filterPriority
    return matchesSearch && matchesPriority
  })

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-8rem)]">
      
      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-border rounded-xl bg-card gap-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar tarefas..."
              className="w-full bg-accent/40 rounded-lg border border-border pl-8 pr-3 py-1.5 text-xs focus:outline-hidden"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Priority filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Prioridade:</span>
            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value as 'all' | Task['priority'])}
              className="rounded-lg border border-border bg-accent/40 px-2 py-1 text-xs text-foreground focus:outline-hidden"
            >
              <option value="all">Todas</option>
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => setAddModalOpen(true)}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity w-full sm:w-auto justify-center"
        >
          <Plus size={14} /> Nova Tarefa
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 overflow-hidden h-full">
        {COLUMNS.map(col => {
          const colTasks = filteredTasks.filter(t => t.status === col.id)
          return (
            <div 
              key={col.id}
              className={`flex flex-col rounded-xl border border-border bg-card p-4 overflow-hidden h-full shadow-xs ${col.color}`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
                <span className="text-xs font-bold text-foreground">{col.title}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent text-muted-foreground">
                  {colTasks.length}
                </span>
              </div>

              {/* Tasks List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {colTasks.length === 0 ? (
                  <div className="text-center py-12 text-[11px] text-muted-foreground border border-dashed border-border/60 rounded-lg bg-accent/10">
                    Nenhuma tarefa
                  </div>
                ) : (
                  colTasks.map(task => {
                    const caseObj = cases.find(c => c.id === task.case_id)
                    const assignedUser = users.find(u => u.id === task.assigned_to)
                    
                    return (
                      <div 
                        key={task.id}
                        className="p-3.5 rounded-lg border border-border/80 bg-card hover:border-primary/40 shadow-xs hover:shadow-md transition-all flex flex-col gap-2 relative group"
                      >
                        {/* Delete float button */}
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 p-1 rounded-md transition-opacity"
                        >
                          <Trash2 size={12} />
                        </button>

                        <div className="flex justify-between items-start pr-6">
                          <span className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-full ${
                            task.priority === 'urgent' ? 'bg-red-500/10 text-red-600' :
                            task.priority === 'high' ? 'bg-orange-500/10 text-orange-600' :
                            task.priority === 'medium' ? 'bg-blue-500/10 text-blue-600' :
                            'bg-slate-500/10 text-slate-600'
                          }`}>
                            {task.priority}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-foreground leading-normal">{task.title}</h4>

                        {task.description && (
                          <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        {/* Linked case badge */}
                        {caseObj && (
                          <div className="flex items-center gap-1.5 text-[9px] text-primary dark:text-sky-400 font-medium">
                            <Briefcase size={10} className="shrink-0" />
                            <span className="truncate max-w-[150px]">{caseObj.title}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between border-t border-border/40 mt-1 pt-2">
                          {/* Deadline */}
                          <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                            <Calendar size={10} />
                            <span>
                              {task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR') : 'Sem prazo'}
                            </span>
                          </div>

                          {/* Assignee & Actions */}
                          <div className="flex items-center gap-2">
                            {/* Quick move selector */}
                            <select
                              value={task.status}
                              onChange={e => handleMoveStatus(task.id, e.target.value as Task['status'])}
                              className="text-[9px] rounded-md border border-border bg-accent px-1.5 py-0.5 text-muted-foreground focus:outline-hidden"
                            >
                              <option value="todo">Mover: Fazer</option>
                              <option value="in_progress">Mover: Andamento</option>
                              <option value="waiting">Mover: Espera</option>
                              <option value="completed">Mover: Concluído</option>
                            </select>

                            {assignedUser ? (
                              <img 
                                src={assignedUser.avatar_url} 
                                alt={assignedUser.first_name} 
                                className="h-4 w-4 rounded-full object-cover"
                                title={`Atribuída para: ${assignedUser.first_name}`}
                              />
                            ) : (
                              <div className="h-4 w-4 rounded-full bg-accent flex items-center justify-center text-[8px] text-muted-foreground font-bold" title="Não atribuída">
                                U
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* MODAL: Register New Task */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setAddModalOpen(false)} />
          <div className="relative w-full max-w-md bg-card rounded-xl border border-border shadow-2xl p-6 overflow-hidden">
            <div className="flex justify-between items-center border-b border-border pb-3 mb-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <CheckSquare size={16} className="text-primary dark:text-sky-400" />
                Criar Nova Tarefa / Prazo
              </h3>
              <button onClick={() => setAddModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Título do Compromisso</label>
                <input
                  type="text"
                  required
                  className="w-full mt-1 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                  placeholder="Ex: Elaborar contestação do aluguel"
                  value={newTask.title}
                  onChange={e => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Descrição Detalhada</label>
                <textarea
                  rows={3}
                  className="w-full mt-1 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs focus:ring-1 focus:ring-primary leading-relaxed"
                  placeholder="Explique o que precisa ser feito..."
                  value={newTask.description}
                  onChange={e => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Processo Associado</label>
                  <select
                    value={newTask.case_id}
                    onChange={e => setNewTask(prev => ({ ...prev, case_id: e.target.value }))}
                    className="w-full mt-1 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Nenhum (Tarefa de Escritório)</option>
                    {cases.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Responsável</label>
                  <select
                    required
                    value={newTask.assigned_to}
                    onChange={e => setNewTask(prev => ({ ...prev, assigned_to: e.target.value }))}
                    className="w-full mt-1 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Selecione um advogado...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Prioridade</label>
                  <select
                    value={newTask.priority}
                    onChange={e => setNewTask(prev => ({ ...prev, priority: e.target.value as Task['priority'] }))}
                    className="w-full mt-1 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente / Fatal</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Data Limite (Prazo)</label>
                  <input
                    type="date"
                    required
                    className="w-full mt-1 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                    value={newTask.due_date}
                    onChange={e => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>
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
                  Criar Tarefa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
