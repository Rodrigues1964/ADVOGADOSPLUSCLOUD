import React, { useState, useEffect, useRef } from 'react'
import { 
  ShieldCheck, Upload, Send, CheckCircle, MessageSquare
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import type { Case, Document } from '../lib/database'
import { validateUploadedFile } from '../lib/uploadSecurity'

export const ClientPortal: React.FC = () => {
  const { user, tenant, role } = useAuth()
  const [selectedCase, setSelectedCase] = useState<Case | null>(null)
  const [cases, setCases] = useState<Case[]>([])
  const [docs, setDocs] = useState<Document[]>([])
  
  // Simulated Client target details (Eduardo Santos u-3 / c-2)
  const isLawyer = role === 'owner' || role === 'lawyer' || role === 'admin'
  const mockClientId = 'c-2' // Eduardo Santos Client ID
  const mockClientName = 'Eduardo Santos'

  // Chat/Support Simulation
  const [chatMessage, setChatMessage] = useState('')
  const [chatHistory, setChatHistory] = useState<{ sender: 'client' | 'lawyer', text: string, time: string }[]>([
    { sender: 'lawyer', text: 'Olá Eduardo, por favor envie o comprovante de residência atualizado para anexarmos ao processo.', time: 'Ontem, 14:05' }
  ])

  // Document upload simulation
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadData = React.useCallback(async () => {
    if (!tenant) return

    try {
      const [casesRes, docsRes] = await Promise.all([
        api.get('/cases'),
        api.get('/documents')
      ]).catch(() => [{data:[]}, {data:[]}])

      // If lawyer is simulating, load cases for mockClientId. Otherwise load for user's mapped client profile.
      let targetClientId = ''
      if (isLawyer) {
        targetClientId = mockClientId
      } else if (user) {
        // We'd ideally need a /clients api call here if we really want to check email match,
        // but for now let's just assume the user is the client or the backend scopes it.
        const clientsRes = await api.get('/clients').catch(() => ({data:[]}))
        const clientRecord = (clientsRes.data || []).find((c: any) => c.email?.toLowerCase() === user.email.toLowerCase())
        targetClientId = clientRecord ? clientRecord.id : ''
      }

      const clientCases = targetClientId 
        ? (casesRes.data || []).filter((c: any) => c.client_id === targetClientId)
        : []
      setCases(clientCases)
      
      if (clientCases.length > 0) {
        const activeCase = clientCases[0]
        setSelectedCase(activeCase)
        setDocs((docsRes.data || []).filter((d: any) => d.case_id === activeCase.id))
      } else {
        setSelectedCase(null)
        setDocs([])
      }
    } catch (err) {
      console.error(err)
    }
  }, [tenant, isLawyer, user])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData()
    }, 0)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant, role])

  const selectCase = async (c: Case) => {
    if (!tenant) return
    setSelectedCase(c)
    try {
      const docsRes = await api.get('/documents')
      setDocs((docsRes.data || []).filter((d: any) => d.case_id === c.id))
    } catch(err) {}
  }

  // Simulated upload
  const handleClientUpload = async (e: React.FormEvent) => {
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

      setTimeout(async () => {
        const sanitizedName = validation.sanitizedName || selectedFile.name
        
        try {
          await api.post('/documents', {
            case_id: selectedCase.id,
            name: `[CLIENTE]_${sanitizedName}`,
            file_path: `documents/${tenant.id}/${selectedCase.id}/${sanitizedName}`,
            file_size: selectedFile.size,
            mime_type: selectedFile.type,
            uploaded_by: isLawyer ? 'u-3' : user?.id // Uploaded by client
          })

          // Add to chat history too for simulated confirmation
          setChatHistory(prev => [
            ...prev,
            { sender: 'client', text: `Enviei o documento solicitado: ${sanitizedName}`, time: 'Agora mesmo' }
          ])

          // Reload
          const docsRes = await api.get('/documents')
          setDocs((docsRes.data || []).filter((d: any) => d.case_id === selectedCase.id))
          
          setSelectedFile(null)
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
          setUploading(false)
        } catch(err) {
          alert('Erro ao enviar documento')
          setUploading(false)
        }
      }, 700)
    } catch {
      alert('Erro inesperado durante a validação do arquivo.')
      setUploading(false)
    }
  }

  // Chat message send
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatMessage.trim()) return

    setChatHistory(prev => [
      ...prev,
      { sender: 'client', text: chatMessage, time: 'Agora mesmo' }
    ])
    setChatMessage('')

    // Simulating instant reply from lawyer assistant after 1.5 seconds!
    setTimeout(() => {
      setChatHistory(prev => [
        ...prev,
        { sender: 'lawyer', text: 'Recebemos a sua mensagem. Nossa equipe de advocacia irá analisar e te responderemos o mais breve possível.', time: 'Agora mesmo' }
      ])
    }, 1500)
  }

  // Case Stage progress timeline
  const getStageTimeline = (currentInstance: string) => {
    const stages = [
      { id: 1, name: 'Peticionamento Inicial', desc: 'Advogado redige e distribui a ação em juízo.' },
      { id: 2, name: 'Citação & Resposta', desc: 'O réu é notificado para apresentar contestação.' },
      { id: 3, name: 'Instrução & Provas', desc: 'Produção de provas e audiências de depoimentos.' },
      { id: 4, name: 'Fase de Sentença', desc: 'O juiz profere a decisão e julga o caso.' },
      { id: 5, name: 'Fase Recursal', desc: 'O caso sobe ao Tribunal para análise dos recursos.' },
      { id: 6, name: 'Execução de Sentença', desc: 'Fase de cobrança dos valores e recebimento.' }
    ]

    const activeIndex = stages.findIndex(s => s.name === currentInstance)
    
    return stages.map(s => {
      const idx = stages.indexOf(s)
      let state: 'completed' | 'current' | 'pending' = 'pending'
      if (idx < activeIndex) state = 'completed'
      else if (idx === activeIndex) state = 'current'
      return { ...s, state }
    })
  }

  if (!tenant) return <div className="text-center py-10">Nenhum escritório ativo.</div>

  return (
    <div className="space-y-6">
      
      {/* Lawyer Simulation Bar */}
      {isLawyer && (
        <div className="flex items-center justify-between p-3.5 rounded-lg border border-amber-500/20 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-amber-600 shrink-0" />
            <span>
              <strong>Modo de Simulação Ativo:</strong> Visualizando como o cliente <strong>{mockClientName}</strong>. 
              Use este portal para verificar o status dos processos, uploads de arquivos e histórico de conversas do cliente.
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* 1. Left Side: Client Cases Directory & Overview */}
        <div className="space-y-4">
          <div className="border border-border rounded-xl bg-card p-4 shadow-xs">
            <h3 className="text-xs font-bold text-foreground border-b border-border pb-3 mb-3 uppercase tracking-wider text-muted-foreground">
              Seus Processos ({cases.length})
            </h3>
            
            <div className="space-y-2">
              {cases.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  Nenhum processo em andamento para a sua conta.
                </div>
              ) : (
                cases.map(c => {
                  const isActive = selectedCase?.id === c.id
                  return (
                    <button
                      key={c.id}
                      onClick={() => selectCase(c)}
                      className={`w-full text-left p-3.5 rounded-lg border transition-colors flex flex-col gap-1 ${
                        isActive 
                          ? 'border-primary bg-primary/5 dark:bg-primary/10' 
                          : 'border-border bg-accent/20 hover:bg-accent/40'
                      }`}
                    >
                      <span className="text-xs font-bold text-foreground block truncate">{c.title}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">CNJ: {c.number}</span>
                      <span className="text-[9px] text-muted-foreground mt-1">Status: {c.status.toUpperCase()}</span>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Help desk card */}
          <div className="border border-border rounded-xl bg-card p-4 shadow-xs">
            <h3 className="text-xs font-bold text-foreground border-b border-border pb-3 mb-3 uppercase tracking-wider text-muted-foreground">
              Suporte Jurídico
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Precisa falar com o advogado responsável? Escreva no chat ao lado ou nos envie os documentos pendentes abaixo.
            </p>
            <div className="mt-3 p-3 bg-accent/40 border border-border rounded-lg text-[10px] text-muted-foreground space-y-1.5">
              <div className="font-bold text-foreground">Horário de Atendimento</div>
              <div>Segunda a Sexta: 09h às 18h</div>
              <div>Telefone: (11) 98765-4321</div>
            </div>
          </div>
        </div>

        {/* 2. Middle Column: Timeline progression & Document Upload */}
        <div className="lg:col-span-2 space-y-6">
          {selectedCase ? (
            <>
              {/* Timeline Card */}
              <div className="border border-border rounded-xl bg-card p-6 shadow-xs">
                <div>
                  <span className="text-[9px] uppercase tracking-wider font-bold bg-accent/80 text-muted-foreground px-2 py-0.5 rounded-md border border-border">
                    Acompanhamento de Linha do Tempo
                  </span>
                  <h3 className="text-base font-bold text-foreground mt-2">{selectedCase.title}</h3>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">CNJ: {selectedCase.number}</p>
                </div>

                {/* Vertical Timeline Steps */}
                <div className="mt-8 space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
                  {getStageTimeline(selectedCase.instance).map(step => (
                    <div key={step.id} className="flex gap-4 relative">
                      {/* Circle Dot */}
                      <div className={`h-6.5 w-6.5 rounded-full flex items-center justify-center border-2 shrink-0 z-10 transition-colors ${
                        step.state === 'completed' 
                          ? 'bg-emerald-500 border-emerald-500 text-white' 
                          : step.state === 'current'
                          ? 'bg-blue-500 border-blue-500 text-white pulse-glow'
                          : 'bg-card border-border text-muted-foreground'
                      }`}>
                        {step.state === 'completed' ? (
                          <CheckCircle size={14} />
                        ) : (
                          <span className="text-[10px] font-bold">{step.id}</span>
                        )}
                      </div>

                      {/* Detail text */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-xs font-bold ${
                            step.state === 'pending' ? 'text-muted-foreground' : 'text-foreground'
                          }`}>
                            {step.name}
                          </h4>
                          {step.state === 'current' && (
                            <span className="text-[8px] uppercase tracking-wider font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                              Etapa Atual
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat & Document Upload grid split */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Upload Request files */}
                <div className="border border-border rounded-xl bg-card p-5 shadow-xs flex flex-col h-[300px]">
                  <h4 className="text-xs font-bold text-foreground border-b border-border pb-3 mb-3 flex items-center gap-2">
                    <Upload size={14} className="text-primary dark:text-sky-400" />
                    Enviar Documentos Solicitados
                  </h4>

                  <form onSubmit={handleClientUpload} className="flex gap-2 mb-3">
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
                      {uploading ? 'Enviando...' : 'Enviar'}
                    </button>
                  </form>

                  <div className="flex-1 overflow-y-auto space-y-2">
                    {docs.length === 0 ? (
                      <div className="text-center py-10 text-xs text-muted-foreground">
                        Nenhum documento enviado ainda.
                      </div>
                    ) : (
                      docs.map(d => (
                        <div key={d.id} className="p-2 flex justify-between items-center rounded-lg border border-border/50 bg-accent/20">
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-foreground truncate block">{d.name}</span>
                            <span className="text-[8px] text-muted-foreground">
                              {(Number(d.file_size) / 1024).toFixed(0)} KB • {d.mime_type?.split('/')[1]?.toUpperCase() || 'PDF'}
                            </span>
                          </div>
                          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md font-semibold">
                            Recebido
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Live Chat simulator */}
                <div className="border border-border rounded-xl bg-card p-5 shadow-xs flex flex-col h-[300px]">
                  <h4 className="text-xs font-bold text-foreground border-b border-border pb-3 mb-3 flex items-center gap-2">
                    <MessageSquare size={14} className="text-primary dark:text-sky-400" />
                    Central de Atendimento
                  </h4>

                  {/* Messages box */}
                  <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1 text-xs">
                    {chatHistory.map((chat, idx) => {
                      const isMe = chat.sender === 'client'
                      return (
                        <div 
                          key={idx} 
                          className={`flex flex-col max-w-[80%] rounded-lg p-2.5 ${
                            isMe 
                              ? 'bg-primary text-primary-foreground ml-auto' 
                              : 'bg-accent border border-border text-foreground mr-auto'
                          }`}
                        >
                          <p className="leading-relaxed">{chat.text}</p>
                          <span className={`text-[8px] mt-1 text-right block ${
                            isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}>
                            {chat.time}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Send chat form */}
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Escreva sua mensagem ou dúvida..."
                      className="flex-1 bg-accent/40 rounded-lg border border-border px-3 py-1.5 text-xs focus:outline-hidden"
                      value={chatMessage}
                      onChange={e => setChatMessage(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="bg-primary text-primary-foreground p-1.5 rounded-lg hover:opacity-90 transition-opacity shrink-0"
                    >
                      <Send size={14} />
                    </button>
                  </form>
                </div>

              </div>
            </>
          ) : (
            <div className="text-center py-24 border border-border border-dashed rounded-xl bg-card">
              Nenhum processo selecionado para ver a linha do tempo.
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
