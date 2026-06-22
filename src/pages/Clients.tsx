import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { 
  Users, UserPlus, Phone, Mail, Search, FileText, 
  MessageCircle, Trash2, MapPin, X, Check, Clipboard
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import type { Client, Case, WhatsAppLog } from '../lib/database'

export const Clients: React.FC = () => {
  const { tenant, role } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedClientId = searchParams.get('id')

  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [clientCases, setClientCases] = useState<Case[]>([])
  const [whatsappLogs, setWhatsappLogs] = useState<WhatsAppLog[]>([])

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'individual' | 'corporate'>('all')

  // Forms Modals
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [waModalOpen, setWaModalOpen] = useState(false)
  
  // New Client Form State
  const [newClient, setNewClient] = useState({
    type: 'individual' as 'individual' | 'corporate',
    name: '',
    email: '',
    phone: '',
    document: '',
    rg_ie: '',
    address_street: '',
    address_number: '',
    address_complement: '',
    address_neighborhood: '',
    address_city: '',
    address_state: '',
    address_zipcode: '',
    notes: ''
  })

  // WhatsApp Message State
  const [waMessage, setWaMessage] = useState('')
  const [waTemplate, setWaTemplate] = useState('custom')

  // Load clients list
  const loadClients = React.useCallback(async () => {
    if (!tenant) return
    try {
      const [clientsRes, casesRes, waRes] = await Promise.all([
        api.get('/clients'),
        api.get('/cases'),
        api.get('/whatsapp') // Assuming this endpoint exists or mock it
      ]).catch(() => [{data:[]}, {data:[]}, {data:[]}])

      const data = clientsRes.data || []
      setClients(data)
      
      // Set selected client details if present in query param
      if (selectedClientId) {
        const client = data.find((c: any) => c.id === selectedClientId)
        if (client) {
          setSelectedClient(client)
          const cases = (casesRes.data || []).filter((c: any) => c.client_id === client.id)
          setClientCases(cases)
          const logs = (waRes.data || []).filter((w: any) => w.client_id === client.id)
          setWhatsappLogs(logs)
        }
      } else if (data.length > 0 && !selectedClient) {
        // Default to select first client
        const first = data[0]
        setSelectedClient(first)
        const cases = (casesRes.data || []).filter((c: any) => c.client_id === first.id)
        setClientCases(cases)
        const logs = (waRes.data || []).filter((w: any) => w.client_id === first.id)
        setWhatsappLogs(logs)
      }
    } catch (err) {
      console.error(err)
    }
  }, [tenant, selectedClientId, selectedClient])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadClients()
    }, 0)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant, selectedClientId])

  const selectClient = async (client: Client) => {
    setSearchParams({ id: client.id })
    setSelectedClient(client)
    if (tenant) {
      try {
        const [casesRes, waRes] = await Promise.all([
          api.get('/cases'),
          api.get('/whatsapp')
        ]).catch(() => [{data:[]}, {data:[]}])
        
        const cases = (casesRes.data || []).filter((c: any) => c.client_id === client.id)
        setClientCases(cases)
        const logs = (waRes.data || []).filter((w: any) => w.client_id === client.id)
        setWhatsappLogs(logs)
      } catch(err) {}
    }
  }

  // Handle Add Client Submit
  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant) return
    
    try {
      const { data: added } = await api.post('/clients', newClient)
      await loadClients()
      selectClient(added)
      setAddModalOpen(false)
      setNewClient({
        type: 'individual',
        name: '',
        email: '',
        phone: '',
        document: '',
        rg_ie: '',
        address_street: '',
        address_number: '',
        address_complement: '',
        address_neighborhood: '',
        address_city: '',
        address_state: '',
        address_zipcode: '',
        notes: ''
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao cadastrar cliente.'
      alert(msg)
    }
  }

  // Handle WhatsApp Template Change
  const applyWaTemplate = (templateName: string, clientName: string) => {
    setWaTemplate(templateName)
    if (templateName === 'welcome') {
      setWaMessage(`Olá ${clientName}, seja muito bem-vindo ao Advogados Plus Cloud! Nós do escritório passamos a acompanhar a sua assessoria jurídica de forma digital. Qualquer dúvida nos chame aqui.`)
    } else if (templateName === 'update') {
      setWaMessage(`Prezado(a) ${clientName}, informamos que houve uma nova movimentação importante no seu processo. Acesse o portal do cliente para verificar o status ou fale conosco para mais detalhes.`)
    } else if (templateName === 'hearing') {
      setWaMessage(`Aviso de Audiência: Olá ${clientName}, gostaríamos de lembrá-lo(a) que a sua audiência está agendada para os próximos dias. Por favor, entre em contato para alinhar os detalhes da instrução.`)
    } else {
      setWaMessage('')
    }
  }

  // Simulated WhatsApp Send
  const handleSendWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant || !selectedClient) return
    
    try {
      await api.post('/whatsapp', {
        client_id: selectedClient.id,
        phone: selectedClient.phone || 'N/A',
        message_text: waMessage,
        status: 'sent'
      }).catch(() => {})

      // Reload WhatsApp logs
      const waRes = await api.get('/whatsapp').catch(() => ({data:[]}))
      const logs = (waRes.data || []).filter((w: any) => w.client_id === selectedClient.id)
      setWhatsappLogs(logs)
      setWaModalOpen(false)
      setWaMessage('')
    } catch(err) {}
  }

  const handleDeleteClient = async (id: string) => {
    if (!confirm('Deseja realmente excluir este cliente? Todos os vínculos associados permanecerão no acervo como indefinidos.')) return
    try {
      await api.delete(`/clients/${id}`)
      setSearchParams({})
      setSelectedClient(null)
      await loadClients()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir cliente.'
      alert(msg)
    }
  }

  // Filtered Clients Array
  const filteredClients = clients.filter(c => {
    const query = searchQuery.toLowerCase()
    const matchesSearch = c.name.toLowerCase().includes(query) || 
      (c.phone && c.phone.includes(query)) || 
      (c.document && c.document.includes(query)) ||
      (c.email && c.email.toLowerCase().includes(query))
    
    const matchesType = filterType === 'all' ? true : c.type === filterType
    return matchesSearch && matchesType
  })

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 h-[calc(100vh-8rem)]">
      
      {/* 1. Left Column: Clients List */}
      <div className="flex flex-col border border-border rounded-xl bg-card overflow-hidden h-full shadow-xs">
        {/* Header toolbar */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Users size={16} className="text-primary dark:text-sky-400" />
              Diretório ({filteredClients.length})
            </h3>
            {role !== 'assistant' && role !== 'client' && (
              <button
                onClick={() => setAddModalOpen(true)}
                className="flex items-center gap-1 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
              >
                <UserPlus size={14} /> Novo
              </button>
            )}
          </div>
          
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF/CNPJ..."
              className="w-full bg-accent/40 rounded-lg border border-border pl-8 pr-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Type filters */}
          <div className="flex gap-1.5">
            {(['all', 'individual', 'corporate'] as const).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`text-[10px] font-semibold px-2 py-1 rounded-md border ${
                  filterType === type 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'bg-accent/40 text-muted-foreground border-border hover:bg-accent'
                }`}
              >
                {type === 'all' && 'Todos'}
                {type === 'individual' && 'Pessoa Física'}
                {type === 'corporate' && 'Pessoa Jurídica'}
              </button>
            ))}
          </div>
        </div>

        {/* Directory List Container */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/60">
          {filteredClients.length === 0 ? (
            <div className="text-center py-12 text-xs text-muted-foreground">
              Nenhum cliente cadastrado ou encontrado.
            </div>
          ) : (
            filteredClients.map(client => (
              <button
                key={client.id}
                onClick={() => selectClient(client)}
                className={`w-full text-left p-3.5 flex flex-col gap-1 transition-colors ${
                  selectedClient?.id === client.id 
                    ? 'bg-primary/5 dark:bg-primary/10 border-l-4 border-primary' 
                    : 'hover:bg-accent/30'
                }`}
              >
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-bold text-foreground truncate max-w-[70%]">
                    {client.name}
                  </h4>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    client.type === 'corporate' 
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                  }`}>
                    {client.type === 'corporate' ? 'PJ' : 'PF'}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono">{client.document || 'Sem documento'}</p>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1">
                  {client.phone && <span className="flex items-center gap-1"><Phone size={10} /> {client.phone}</span>}
                  {client.email && <span className="flex items-center gap-1"><Mail size={10} className="shrink-0" /> <span className="truncate max-w-[80px]">{client.email}</span></span>}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* 2. Middle & Right Columns: Selected Client Details & Integrations */}
      <div className="lg:col-span-2 flex flex-col gap-6 h-full overflow-y-auto pr-1">
        {selectedClient ? (
          <>
            {/* Card: Client Profile */}
            <div className="border border-border rounded-xl bg-card p-6 shadow-xs relative">
              <div className="absolute right-6 top-6 flex items-center gap-2">
                <button
                  onClick={() => setWaModalOpen(true)}
                  className="flex items-center gap-1 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-colors"
                >
                  <MessageCircle size={14} /> WhatsApp
                </button>
                {(role === 'owner' || role === 'admin') && (
                  <button
                    onClick={() => handleDeleteClient(selectedClient.id)}
                    className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 p-2 rounded-lg transition-colors border border-border"
                    title="Excluir Cliente"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
                  {selectedClient.name[0]}
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">{selectedClient.name}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    {selectedClient.type === 'corporate' ? 'Pessoa Jurídica' : 'Pessoa Física'} • {selectedClient.document}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-border/60">
                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-3">
                    <Mail size={14} className="text-muted-foreground" />
                    <div>
                      <span className="text-muted-foreground block text-[9px] uppercase font-semibold">E-mail</span>
                      <a href={`mailto:${selectedClient.email}`} className="text-foreground hover:underline font-medium">
                        {selectedClient.email || 'Não informado'}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Phone size={14} className="text-muted-foreground" />
                    <div>
                      <span className="text-muted-foreground block text-[9px] uppercase font-semibold">Telefone</span>
                      <a href={`tel:${selectedClient.phone}`} className="text-foreground hover:underline font-medium">
                        {selectedClient.phone || 'Não informado'}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Clipboard size={14} className="text-muted-foreground" />
                    <div>
                      <span className="text-muted-foreground block text-[9px] uppercase font-semibold">RG / Inscrição Estadual</span>
                      <span className="text-foreground font-medium">{selectedClient.rg_ie || 'Não informado'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-start gap-3">
                    <MapPin size={14} className="text-muted-foreground mt-0.5" />
                    <div>
                      <span className="text-muted-foreground block text-[9px] uppercase font-semibold">Endereço</span>
                      <span className="text-foreground font-medium leading-relaxed block">
                        {selectedClient.address_street ? (
                          <>
                            {selectedClient.address_street}, nº {selectedClient.address_number}
                            {selectedClient.address_complement && ` - ${selectedClient.address_complement}`}
                            <br />
                            {selectedClient.address_neighborhood} - {selectedClient.address_city}/{selectedClient.address_state}
                            <br />
                            CEP: {selectedClient.address_zipcode}
                          </>
                        ) : (
                          'Não informado'
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedClient.notes && (
                <div className="mt-5 p-4 rounded-lg bg-accent/40 border border-border/40 text-xs">
                  <span className="text-muted-foreground block text-[9px] uppercase font-bold tracking-wider mb-1">
                    Observações Internas
                  </span>
                  <p className="text-foreground leading-relaxed font-medium">{selectedClient.notes}</p>
                </div>
              )}
            </div>

            {/* Cases and WhatsApp History Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Cases Linked */}
              <div className="border border-border rounded-xl bg-card p-5 shadow-xs flex flex-col h-[280px]">
                <h4 className="text-xs font-bold text-foreground border-b border-border pb-3 mb-3 flex items-center gap-2">
                  <FileText size={14} className="text-primary dark:text-sky-400" />
                  Processos Vinculados ({clientCases.length})
                </h4>
                <div className="flex-1 overflow-y-auto space-y-2.5">
                  {clientCases.length === 0 ? (
                    <div className="text-center py-10 text-xs text-muted-foreground">
                      Nenhum processo vinculado a este cliente.
                    </div>
                  ) : (
                    clientCases.map(c => (
                      <div key={c.id} className="p-2.5 rounded-lg border border-border/50 bg-accent/20 flex flex-col gap-0.5">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-foreground truncate max-w-[70%]">{c.title}</span>
                          <span className={`text-[8px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded-full ${
                            c.status === 'active' ? 'bg-blue-500/10 text-blue-600' : 'bg-emerald-500/10 text-emerald-600'
                          }`}>
                            {c.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono">{c.number}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">{c.court} • {c.instance}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* WhatsApp History */}
              <div className="border border-border rounded-xl bg-card p-5 shadow-xs flex flex-col h-[280px]">
                <h4 className="text-xs font-bold text-foreground border-b border-border pb-3 mb-3 flex items-center gap-2">
                  <MessageCircle size={14} className="text-emerald-500" />
                  Histórico de Mensagens WhatsApp ({whatsappLogs.length})
                </h4>
                <div className="flex-1 overflow-y-auto space-y-2.5">
                  {whatsappLogs.length === 0 ? (
                    <div className="text-center py-10 text-xs text-muted-foreground">
                      Nenhuma mensagem enviada por este painel.
                    </div>
                  ) : (
                    whatsappLogs.map(w => (
                      <div key={w.id} className="p-2.5 rounded-lg border border-border/50 bg-accent/20 text-xs relative">
                        <p className="text-foreground leading-relaxed pr-8">{w.message_text}</p>
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-border/40 text-[9px] text-muted-foreground">
                          <span>Para: {w.phone}</span>
                          <span>{new Date(w.sent_at || '').toLocaleString('pt-BR')}</span>
                        </div>
                        <span className="absolute top-2 right-2 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center border border-border border-dashed rounded-xl bg-card shadow-xs">
            <Users className="h-10 w-10 text-muted-foreground animate-bounce mb-3" />
            <h3 className="text-sm font-bold text-foreground">Nenhum cliente selecionado</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Selecione um cliente no diretório esquerdo ou cadastre um novo cliente.
            </p>
          </div>
        )}
      </div>

      {/* MODAL 1: Add Client */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setAddModalOpen(false)} />
          <div className="relative w-full max-w-2xl bg-card rounded-xl border border-border shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-border pb-3 mb-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <UserPlus size={16} className="text-primary dark:text-sky-400" />
                Cadastrar Novo Cliente
              </h3>
              <button onClick={() => setAddModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleAddClient} className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Tipo de Cliente</label>
                  <select
                    value={newClient.type}
                    onChange={e => setNewClient(prev => ({ ...prev, type: e.target.value as 'individual' | 'corporate' }))}
                    className="w-full mt-1 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                  >
                    <option value="individual">Pessoa Física (PF)</option>
                    <option value="corporate">Pessoa Jurídica (PJ)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Nome Completo / Razão Social</label>
                  <input
                    type="text"
                    required
                    className="w-full mt-1 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                    placeholder="Ex: Construtora Alfa Ltda"
                    value={newClient.name}
                    onChange={e => setNewClient(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">E-mail</label>
                  <input
                    type="email"
                    className="w-full mt-1 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                    placeholder="Ex: financeiro@alfa.com"
                    value={newClient.email}
                    onChange={e => setNewClient(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Telefone</label>
                  <input
                    type="text"
                    className="w-full mt-1 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                    placeholder="Ex: (11) 98765-4321"
                    value={newClient.phone}
                    onChange={e => setNewClient(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">CPF ou CNPJ</label>
                  <input
                    type="text"
                    className="w-full mt-1 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                    placeholder="Ex: 12.345.678/0001-90"
                    value={newClient.document}
                    onChange={e => setNewClient(prev => ({ ...prev, document: e.target.value }))}
                  />
                </div>
              </div>

              <div className="border-t border-border/60 my-4 pt-3">
                <h4 className="text-[11px] font-bold text-muted-foreground mb-3">Endereço de Correspondência</h4>
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-2">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Logradouro / Rua</label>
                    <input
                      type="text"
                      className="w-full mt-1 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                      placeholder="Ex: Av. Paulista"
                      value={newClient.address_street}
                      onChange={e => setNewClient(prev => ({ ...prev, address_street: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Número</label>
                    <input
                      type="text"
                      className="w-full mt-1 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                      placeholder="Ex: 1000"
                      value={newClient.address_number}
                      onChange={e => setNewClient(prev => ({ ...prev, address_number: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Complemento</label>
                    <input
                      type="text"
                      className="w-full mt-1 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                      placeholder="Ex: Sala 402"
                      value={newClient.address_complement}
                      onChange={e => setNewClient(prev => ({ ...prev, address_complement: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mt-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Bairro</label>
                    <input
                      type="text"
                      className="w-full mt-1 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                      placeholder="Ex: Bela Vista"
                      value={newClient.address_neighborhood}
                      onChange={e => setNewClient(prev => ({ ...prev, address_neighborhood: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Cidade</label>
                    <input
                      type="text"
                      className="w-full mt-1 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                      placeholder="Ex: São Paulo"
                      value={newClient.address_city}
                      onChange={e => setNewClient(prev => ({ ...prev, address_city: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Estado</label>
                    <input
                      type="text"
                      className="w-full mt-1 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                      placeholder="Ex: SP"
                      value={newClient.address_state}
                      onChange={e => setNewClient(prev => ({ ...prev, address_state: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">CEP</label>
                    <input
                      type="text"
                      className="w-full mt-1 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                      placeholder="Ex: 01310-100"
                      value={newClient.address_zipcode}
                      onChange={e => setNewClient(prev => ({ ...prev, address_zipcode: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Observações / Histórico Geral</label>
                <textarea
                  rows={3}
                  className="w-full mt-1 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                  placeholder="Informações adicionais do cliente, histórico de contatos, contratos assinados..."
                  value={newClient.notes}
                  onChange={e => setNewClient(prev => ({ ...prev, notes: e.target.value }))}
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
                  Salvar Cadastro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: WhatsApp Simulator */}
      {waModalOpen && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setWaModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-card rounded-xl border border-border shadow-2xl p-6 overflow-hidden">
            <div className="flex justify-between items-center border-b border-border pb-3 mb-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <MessageCircle size={16} className="text-emerald-500" />
                Simulador de Envio WhatsApp (Notificação)
              </h3>
              <button onClick={() => setWaModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSendWhatsApp} className="space-y-4">
              <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-xs text-emerald-800 dark:text-emerald-300">
                Esta ação simula a API de integração do WhatsApp. O envio gerará uma notificação simulada e registrará o log da mensagem no histórico.
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Destinatário</label>
                <input
                  type="text"
                  disabled
                  className="w-full mt-1 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs font-medium"
                  value={`${selectedClient.name} (${selectedClient.phone})`}
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Modelo de Notificação</label>
                <select
                  value={waTemplate}
                  onChange={e => applyWaTemplate(e.target.value, selectedClient.name)}
                  className="w-full mt-1 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                >
                  <option value="custom">Mensagem Personalizada (Em branco)</option>
                  <option value="welcome">Apresentação / Boas-vindas</option>
                  <option value="update">Movimentação Processual</option>
                  <option value="hearing">Lembrete de Audiência</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Corpo da Mensagem</label>
                <textarea
                  rows={5}
                  required
                  className="w-full mt-1 rounded-md border border-border bg-accent/40 px-3 py-2 text-xs focus:ring-1 focus:ring-primary leading-relaxed"
                  placeholder="Escreva a mensagem..."
                  value={waMessage}
                  onChange={e => setWaMessage(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setWaModalOpen(false)}
                  className="px-4 py-2 border border-border rounded-lg text-xs font-semibold text-muted-foreground hover:bg-accent"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 flex items-center gap-1.5"
                >
                  <Check size={14} /> Confirmar Envio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
