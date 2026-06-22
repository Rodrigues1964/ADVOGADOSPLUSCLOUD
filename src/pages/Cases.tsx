import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { validateUploadedFile } from '../lib/uploadSecurity'
import { 
  Briefcase, Search, Plus, Trash2, 
  FileText, CheckSquare, Upload, AlertCircle, X, Check, User
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import type { Case, Client, Document, Task } from '../lib/database'

const CASE_STAGES = [
  'Peticionamento Inicial',
  'Citação & Resposta',
  'Instrução & Provas',
  'Fase de Sentença',
  'Fase Recursal',
  'Execução de Sentença'
]

export const Cases: React.FC = () => {
  const { tenant, user, role } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedCaseId = searchParams.get('id')

  const [cases, setCases] = useState<Case[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [selectedCase, setSelectedCase] = useState<Case | null>(null)
  
  // Linked items
  const [caseClient, setCaseClient] = useState<Client | null>(null)
  const [caseDocuments, setCaseDocuments] = useState<Document[]>([])
  const [caseTasks, setCaseTasks] = useState<Task[]>([])

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'suspended' | 'settled' | 'archived'>('all')

  // Modals / Form State
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [validationError, setValidationError] = useState('')
  
  const [newCase, setNewCase] = useState({
    title: '',
    number: '',
    court: 'TJSP',
    instance: '1ª Instância',
    distribution_date: '',
    value: 0,
    client_id: '',
    description: '',
    status: 'active' as const
  })

  // Simulated upload state
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadCases = React.useCallback(async () => {
    if (!tenant) return
    try {
      const [casesRes, clientsRes, docsRes, tasksRes] = await Promise.all([
        api.get('/cases'),
        api.get('/clients'),
        api.get('/documents'),
        api.get('/tasks')
      ])
      
      const allCases = casesRes.data
      setCases(allCases)
      setClients(clientsRes.data)

      if (selectedCaseId) {
        const caseObj = allCases.find((c: any) => c.id === selectedCaseId)
        if (caseObj) {
          setSelectedCase(caseObj)
          const cli = clientsRes.data.find((c: any) => c.id === caseObj.client_id)
          setCaseClient(cli || null)
          setCaseDocuments(docsRes.data.filter((d: any) => d.case_id === caseObj.id))
          setCaseTasks(tasksRes.data.filter((t: any) => t.case_id === caseObj.id))
        }
      } else if (allCases.length > 0 && !selectedCase) {
        const first = allCases[0]
        setSelectedCase(first)
        const cli = clientsRes.data.find((c: any) => c.id === first.client_id)
        setCaseClient(cli || null)
        setCaseDocuments(docsRes.data.filter((d: any) => d.case_id === first.id))
        setCaseTasks(tasksRes.data.filter((t: any) => t.case_id === first.id))
      }
    } catch (err) {
      console.error(err)
    }
  }, [tenant, selectedCaseId, selectedCase])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCases()
    }, 0)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant, selectedCaseId])

  const selectCase = async (caseObj: Case) => {
    setSearchParams({ id: caseObj.id })
    setSelectedCase(caseObj)
    if (tenant) {
      const cli = clients.find(c => c.id === caseObj.client_id)
      setCaseClient(cli || null)
      try {
        const [docsRes, tasksRes] = await Promise.all([
          api.get('/documents'),
          api.get('/tasks')
        ])
        setCaseDocuments(docsRes.data.filter((d: any) => d.case_id === caseObj.id))
        setCaseTasks(tasksRes.data.filter((t: any) => t.case_id === caseObj.id))
      } catch (err) {}
    }
  }

  // Validate CNJ standard format: NNNNNNN-DD.AAAA.J.TR.OOOO
  // E.g., 0001234-56.2026.8.26.0100
  const validateCNJ = (num: string): boolean => {
    const regex = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/
    return regex.test(num)
  }

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant) return

    // Clean check
    if (!validateCNJ(newCase.number)) {
      setValidationError('Número CNJ Inválido! Formato esperado: 0000000-00.0000.0.00.0000')
      return
    }

    setValidationError('')
    try {
      const { data: created } = await api.post('/cases', {
        ...newCase,
        value: Number(newCase.value),
        responsible_lawyer_id: user?.id
      })

      await loadCases()
      selectCase(created)
      setAddModalOpen(false)
      setNewCase({
        title: '',
        number: '',
        court: 'TJSP',
        instance: '1ª Instância',
        distribution_date: '',
        value: 0,
        client_id: '',
        description: '',
        status: 'active'
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar caso.'
      setValidationError(msg)
    }
  }

  // Update Instance/Status step in database
  const handleUpdateInstance = async (stageName: string) => {
    if (!selectedCase) return
    try {
      const { data: updated } = await api.put(`/cases/${selectedCase.id}`, { instance: stageName })
      setSelectedCase(updated)
      await loadCases()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar fase.'
      alert(msg)
    }
  }

  const handleDeleteCase = async (id: string) => {
    if (!confirm('Deseja realmente excluir este processo do acervo?')) return
    try {
      await api.delete(`/cases/${id}`)
      setSearchParams({})
      setSelectedCase(null)
      await loadCases()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir caso.'
      alert(msg)
    }
  }

  // Handle Secure File Upload
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant || !selectedCase || !selectedFile) return

    setUploading(true)
    
    try {
      const validation = await validateUploadedFile(selectedFile)
      if (!validation.isValid) {
        alert(validation.error || 'Erro ao validar o arquivo.')
        setUploading(false)
        return
      }

      await api.post('/documents', {
        case_id: selectedCase.id,
        name: validation.sanitizedName || selectedFile.name,
        file_path: `documents/${tenant.id}/${selectedCase.id}/${validation.sanitizedName}`,
        file_size: selectedFile.size,
        mime_type: selectedFile.type,
        uploaded_by: user?.id
      })

      const { data: docs } = await api.get('/documents')
      setCaseDocuments(docs.filter((d: any) => d.case_id === selectedCase.id))
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar documento.'
      alert(msg)
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteDoc = async (docId: string) => {
    if (!tenant || !selectedCase) return
    try {
      await api.delete(`/documents/${docId}`)
      const { data: docs } = await api.get('/documents')
      setCaseDocuments(docs.filter((d: any) => d.case_id === selectedCase.id))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir documento.'
      alert(msg)
    }
  }

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    if (!tenant || !selectedCase) return
    const nextStatus = currentStatus === 'completed' ? 'todo' : 'completed'
    try {
      await api.put(`/tasks/${taskId}`, { status: nextStatus })
      const { data: tasks } = await api.get('/tasks')
      setCaseTasks(tasks.filter((t: any) => t.case_id === selectedCase.id))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar tarefa.'
      alert(msg)
    }
  }

  // Filtered cases
  const filteredCases = cases.filter(c => {
    const q = searchQuery.toLowerCase()
    const matchesSearch = c.title.toLowerCase().includes(q) || c.number.includes(q)
    const matchesStatus = filterStatus === 'all' ? true : c.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 h-[calc(100vh-8rem)]">
      
      {/* 1. Left Column: Cases list */}
      <div className="flex flex-col border border-border rounded-xl bg-card overflow-hidden h-full shadow-xs">
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Briefcase size={16} className="text-primary dark:text-sky-400" />
              Processos ({filteredCases.length})
            </h3>
            {role !== 'assistant' && role !== 'client' && (
              <button
                onClick={() => setAddModalOpen(true)}
                className="flex items-center gap-1 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
              >
                <Plus size={14} /> Novo
              </button>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar título, CNJ..."
              className="w-full bg-accent/40 rounded-lg border border-border pl-8 pr-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Status filters */}
          <div className="flex flex-wrap gap-1">
            {(['all', 'active', 'suspended', 'settled'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`text-[9px] font-semibold px-2 py-0.5 rounded-md border ${
                  filterStatus === status 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'bg-accent/40 text-muted-foreground border-border hover:bg-accent'
                }`}
              >
                {status === 'all' && 'Todos'}
                {status === 'active' && 'Ativos'}
                {status === 'suspended' && 'Suspensos'}
                {status === 'settled' && 'Acordo'}
              </button>
            ))}
          </div>
        </div>

        {/* Scroll list */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/60">
          {filteredCases.length === 0 ? (
            <div className="text-center py-12 text-xs text-muted-foreground">
              Nenhum processo no acervo ou encontrado.
            </div>
          ) : (
            filteredCases.map(c => (
              <button
                key={c.id}
                onClick={() => selectCase(c)}
                className={`w-full text-left p-3.5 flex flex-col gap-1 transition-colors ${
                  selectedCase?.id === c.id 
                    ? 'bg-primary/5 dark:bg-primary/10 border-l-4 border-primary' 
                    : 'hover:bg-accent/30'
                }`}
              >
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-bold text-foreground truncate max-w-[75%]">{c.title}</h4>
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                    c.status === 'active' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                    c.status === 'suspended' ? 'bg-amber-500/10 text-amber-600' :
                    'bg-emerald-500/10 text-emerald-600'
                  }`}>
                    {c.status === 'active' ? 'Ativo' : c.status === 'suspended' ? 'Suspenso' : 'Resolvido'}
                  </span>
                </div>
                <p className="text-[10px] font-mono text-muted-foreground">{c.number}</p>
                <div className="flex items-center justify-between text-[9px] text-muted-foreground mt-1">
                  <span>Tribunal: {c.court}</span>
                  <span className="font-semibold">{c.instance}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* 2. Middle & Right Columns: Selected Case Detail View */}
      <div className="lg:col-span-2 flex flex-col gap-6 h-full overflow-y-auto pr-1">
        {selectedCase ? (
          <>
            {/* Header info */}
            <div className="border border-border rounded-xl bg-card p-6 shadow-xs relative">
              {(role === 'owner' || role === 'admin') && (
                <button
                  onClick={() => handleDeleteCase(selectedCase.id)}
                  className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 p-2 rounded-lg transition-colors border border-border"
                  title="Excluir Processo"
                >
                  <Trash2 size={15} />
                </button>
              )}

              <div>
                <span className="text-[9px] uppercase tracking-wider font-bold bg-accent/80 text-muted-foreground px-2 py-0.5 rounded-md border border-border">
                  Tribunal: {selectedCase.court}
                </span>
                <h3 className="text-base font-bold text-foreground mt-2">{selectedCase.title}</h3>
                <p className="text-xs font-mono text-muted-foreground mt-1">CNJ: {selectedCase.number}</p>
              </div>

              {/* Step Tracker (ClickUp/Pipe style steps) */}
              <div className="mt-6 pt-5 border-t border-border">
                <span className="text-[9px] uppercase font-bold text-muted-foreground block mb-3">
                  Etapa / Fase Atual do Processo
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1 border border-border bg-accent/30 rounded-lg p-1 overflow-hidden">
                  {CASE_STAGES.map((stage) => {
                    const isCurrent = selectedCase.instance === stage
                    return (
                      <button
                        key={stage}
                        onClick={() => handleUpdateInstance(stage)}
                        className={`text-[9px] font-semibold py-2 px-1 text-center rounded-md transition-all ${
                          isCurrent 
                            ? 'bg-primary text-primary-foreground shadow-xs scale-105' 
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        {stage}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Case details summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-5 border-t border-border/60 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[9px] uppercase font-semibold">Valor da Causa</span>
                  <span className="text-foreground font-bold text-sm block mt-0.5">
                    {formatCurrency(selectedCase.value)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[9px] uppercase font-semibold">Distribuição</span>
                  <span className="text-foreground font-medium block mt-0.5">
                    {selectedCase.distribution_date ? new Date(selectedCase.distribution_date).toLocaleDateString('pt-BR') : 'Não distribuído'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[9px] uppercase font-semibold">Cliente Autor/Réu</span>
                  {caseClient ? (
                    <Link to={`/clients?id=${caseClient.id}`} className="text-primary dark:text-sky-400 hover:underline font-bold block mt-0.5 flex items-center gap-0.5">
                      <User size={12} /> {caseClient.name}
                    </Link>
                  ) : (
                    <span className="text-foreground font-medium block mt-0.5">Sem vínculo</span>
                  )}
                </div>
              </div>

              {selectedCase.description && (
                <div className="mt-4 p-4 rounded-lg bg-accent/40 border border-border/40 text-xs">
                  <span className="text-muted-foreground block text-[9px] uppercase font-bold tracking-wider mb-1">
                    Descrição do Litígio
                  </span>
                  <p className="text-foreground leading-relaxed font-medium">{selectedCase.description}</p>
                </div>
              )}
            </div>

            {/* Documents & Action list grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Document Manager */}
              <div className="border border-border rounded-xl bg-card p-5 shadow-xs flex flex-col h-[320px]">
                <h4 className="text-xs font-bold text-foreground border-b border-border pb-3 mb-3 flex items-center gap-2">
                  <FileText size={14} className="text-primary dark:text-sky-400" />
                  Ged - Documentos e Anexos ({caseDocuments.length})
                </h4>
                
                {/* Upload Form */}
                <form onSubmit={handleFileUpload} className="flex gap-2 mb-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    required
                    accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx"
                    className="flex-1 bg-accent/40 rounded-lg border border-border px-2 py-1 text-[10px] focus:outline-hidden text-foreground file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[9px] file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90 cursor-pointer"
                    onChange={e => {
                      const files = e.target.files
                      if (files && files.length > 0) {
                        setSelectedFile(files[0])
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={uploading || !selectedFile}
                    className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 flex items-center gap-1 shrink-0 disabled:opacity-50"
                  >
                    <Upload size={12} /> {uploading ? 'Aguarde...' : 'Anexar'}
                  </button>
                </form>

                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {caseDocuments.length === 0 ? (
                    <div className="text-center py-10 text-xs text-muted-foreground">
                      Nenhum documento anexado.
                    </div>
                  ) : (
                    caseDocuments.map(d => (
                      <div key={d.id} className="p-2 flex justify-between items-center rounded-lg border border-border/50 bg-accent/20 hover:bg-accent/40 transition-colors">
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-foreground truncate block">{d.name}</span>
                          <span className="text-[9px] text-muted-foreground">
                            {(Number(d.file_size) / 1024 / 1024).toFixed(2)} MB • {d.mime_type?.split('/')[1]?.toUpperCase() || 'PDF'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <a 
                            href="#" 
                            onClick={e => { e.preventDefault(); alert(`Simulação: Baixando arquivo ${d.name}...`) }} 
                            className="text-primary dark:text-sky-400 hover:underline text-[10px] font-semibold"
                          >
                            Visualizar
                          </a>
                          <button
                            onClick={() => handleDeleteDoc(d.id)}
                            className="text-red-500 hover:bg-red-50 p-1 rounded-md"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Tasks linked */}
              <div className="border border-border rounded-xl bg-card p-5 shadow-xs flex flex-col h-[320px]">
                <h4 className="text-xs font-bold text-foreground border-b border-border pb-3 mb-3 flex items-center gap-2">
                  <CheckSquare size={14} className="text-primary dark:text-sky-400" />
                  Prazos e Tarefas Vinculadas ({caseTasks.length})
                </h4>
                <div className="flex-1 overflow-y-auto space-y-2">
                  {caseTasks.length === 0 ? (
                    <div className="text-center py-10 text-xs text-muted-foreground">
                      Nenhuma tarefa vinculada a este caso.
                    </div>
                  ) : (
                    caseTasks.map(t => {
                      const isDone = t.status === 'completed'
                      return (
                        <div key={t.id} className="p-2.5 rounded-lg border border-border/50 bg-accent/20 flex items-center justify-between gap-3">
                          <div className="min-w-0 flex items-start gap-2.5">
                            <button
                              onClick={() => handleToggleTask(t.id, t.status)}
                              className={`mt-0.5 h-4 w-4 rounded-md border flex items-center justify-center shrink-0 ${
                                isDone 
                                  ? 'bg-emerald-500 border-emerald-500 text-white' 
                                  : 'border-border hover:border-primary bg-card'
                              }`}
                            >
                              {isDone && <Check size={10} />}
                            </button>
                            <div className="min-w-0">
                              <span className={`text-xs font-bold block ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                {t.title}
                              </span>
                              <span className="text-[9px] text-muted-foreground">
                                Prazo: {t.due_date ? new Date(t.due_date).toLocaleDateString('pt-BR') : 'Sem prazo'}
                              </span>
                            </div>
                          </div>
                          <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                            t.priority === 'urgent' ? 'bg-red-500/10 text-red-600' :
                            t.priority === 'high' ? 'bg-orange-500/10 text-orange-600' :
                            'bg-blue-500/10 text-blue-600'
                          }`}>
                            {t.priority}
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center border border-border border-dashed rounded-xl bg-card shadow-xs">
            <Briefcase className="h-10 w-10 text-muted-foreground animate-bounce mb-3" />
            <h3 className="text-sm font-bold text-foreground">Nenhum processo selecionado</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Selecione um processo na listagem esquerda ou registre um novo processo judicial.
            </p>
          </div>
        )}
      </div>

      {/* MODAL: Register New Case */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setAddModalOpen(false)} />
          <div className="relative w-full max-w-xl bg-card rounded-xl border border-border shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-border pb-3 mb-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Plus size={16} className="text-primary dark:text-sky-400" />
                Registrar Processo Judicial (CNJ)
              </h3>
              <button onClick={() => setAddModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="flex-1 overflow-y-auto space-y-4 pr-1">
              
              {validationError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-600 flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Título Resumido / Ação</label>
                <input
                  type="text"
                  required
                  className="w-full mt-1 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                  placeholder="Ex: Revisional de Juros de Contrato Bancário"
                  value={newCase.title}
                  onChange={e => setNewCase(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Número CNJ (Com máscara)</label>
                  <input
                    type="text"
                    required
                    className="w-full mt-1 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs font-mono focus:ring-1 focus:ring-primary"
                    placeholder="Ex: 5001234-56.2026.8.26.0100"
                    value={newCase.number}
                    onChange={e => setNewCase(prev => ({ ...prev, number: e.target.value }))}
                  />
                  <span className="text-[9px] text-muted-foreground mt-0.5 block">Insira exatamente com pontos e hífen.</span>
                </div>
                
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Cliente Associado</label>
                  <select
                    required
                    value={newCase.client_id}
                    onChange={e => setNewCase(prev => ({ ...prev, client_id: e.target.value }))}
                    className="w-full mt-1 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Selecione um cliente...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Foro / Tribunal</label>
                  <input
                    type="text"
                    required
                    className="w-full mt-1 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                    placeholder="Ex: TJSP / TRF3 / TRT2"
                    value={newCase.court}
                    onChange={e => setNewCase(prev => ({ ...prev, court: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Data de Distribuição</label>
                  <input
                    type="date"
                    required
                    className="w-full mt-1 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                    value={newCase.distribution_date}
                    onChange={e => setNewCase(prev => ({ ...prev, distribution_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Valor da Causa (R$)</label>
                  <input
                    type="number"
                    required
                    className="w-full mt-1 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                    placeholder="Ex: 50000"
                    value={newCase.value || ''}
                    onChange={e => setNewCase(prev => ({ ...prev, value: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Descrição Inicial da Demanda</label>
                <textarea
                  rows={3}
                  className="w-full mt-1 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs focus:ring-1 focus:ring-primary leading-relaxed"
                  placeholder="Explique resumidamente o objeto da ação judicial, pedidos iniciais e liminares..."
                  value={newCase.description}
                  onChange={e => setNewCase(prev => ({ ...prev, description: e.target.value }))}
                />
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
                  Salvar Processo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
