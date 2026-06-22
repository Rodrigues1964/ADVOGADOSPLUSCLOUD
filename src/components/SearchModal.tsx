import React, { useState, useEffect, useRef } from 'react'
import { Search, Briefcase, User, CheckSquare } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  onNavigate: (type: 'case' | 'client' | 'task', id: string) => void
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const { tenant } = useAuth()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(timer)
  }, [])

  const [results, setResults] = useState<{cases: any[], clients: any[], tasks: any[]}>({cases: [], clients: [], tasks: []})

  // Calculate results on the fly from query and tenant
  useEffect(() => {
    if (!tenant || !query.trim()) {
      setResults({ cases: [], clients: [], tasks: [] })
      return
    }

    const q = query.toLowerCase()
    
    // In a real app we'd debounce this and call a /search endpoint. 
    // Here we'll just fetch all and filter locally for simplicity to match previous behavior, 
    // or better yet, we can do a quick Promise.all
    const delayDebounceFn = setTimeout(() => {
      Promise.all([
        api.get('/cases'),
        api.get('/clients'),
        api.get('/tasks')
      ]).then(([casesRes, clientsRes, tasksRes]) => {
        const allCases = casesRes.data || []
        const allClients = clientsRes.data || []
        const allTasks = tasksRes.data || []

        const filteredCases = allCases.filter((c: any) => 
          c.title.toLowerCase().includes(q) || c.number.toLowerCase().includes(q)
        )
        const filteredClients = allClients.filter((c: any) => 
          c.name.toLowerCase().includes(q) || (c.document && c.document.includes(q))
        )
        const filteredTasks = allTasks.filter((t: any) => 
          t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q))
        )

        setResults({
          cases: filteredCases.slice(0, 5),
          clients: filteredClients.slice(0, 5),
          tasks: filteredTasks.slice(0, 5)
        })
      }).catch(console.error)
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [query, tenant])

  // Get flattened list of items for keyboard navigation
  const flatResults = React.useMemo(() => [
    ...results.cases.map(c => ({ type: 'case' as const, id: c.id, label: c.title, subLabel: c.number, icon: Briefcase })),
    ...results.clients.map(c => ({ type: 'client' as const, id: c.id, label: c.name, subLabel: c.email || c.document || '', icon: User })),
    ...results.tasks.map(t => ({ type: 'task' as const, id: t.id, label: t.title, subLabel: t.status, icon: CheckSquare }))
  ], [results])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % Math.max(1, flatResults.length))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + flatResults.length) % Math.max(1, flatResults.length))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (flatResults[selectedIndex]) {
          const item = flatResults[selectedIndex]
          onNavigate(item.type, item.id)
          onClose()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, flatResults, selectedIndex, onClose, onNavigate])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Card */}
      <div className="relative w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl transition-all duration-300">
        {/* Search Input */}
        <div className="flex items-center border-b border-border px-4 py-3">
          <Search className="mr-3 h-5 w-5 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            className="h-8 w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-hidden sm:text-sm"
            placeholder="Digite para buscar processos, clientes ou tarefas... (Esc para fechar)"
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
          />
        </div>

        {/* Results */}
        <div className="max-h-[350px] overflow-y-auto p-2">
          {flatResults.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {query ? 'Nenhum resultado encontrado.' : 'Comece a digitar para pesquisar no escritório.'}
            </div>
          ) : (
            <div className="space-y-1">
              {flatResults.map((item, index) => {
                const Icon = item.icon
                const isSelected = index === selectedIndex
                return (
                  <button
                    key={`${item.type}-${item.id}`}
                    className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                      isSelected 
                        ? 'bg-primary text-primary-foreground' 
                        : 'text-foreground hover:bg-muted'
                    }`}
                    onClick={() => {
                      onNavigate(item.type, item.id)
                      onClose()
                    }}
                  >
                    <Icon className={`mr-3 h-4 w-4 shrink-0 ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                    <div className="flex-1 overflow-hidden">
                      <div className="font-medium truncate">{item.label}</div>
                      <div className={`text-xs truncate ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                        {item.subLabel}
                      </div>
                    </div>
                    <span className={`ml-auto text-xs shrink-0 rounded px-1.5 py-0.5 border ${
                      isSelected ? 'border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground' : 'border-border bg-accent text-muted-foreground'
                    }`}>
                      {item.type === 'case' ? 'Processo' : item.type === 'client' ? 'Cliente' : 'Tarefa'}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border bg-accent/50 px-4 py-2 text-[10px] text-muted-foreground">
          <div>
            Navegue com <kbd className="rounded border border-border bg-card px-1 font-mono text-[9px]">↓↑</kbd> e selecione com <kbd className="rounded border border-border bg-card px-1 font-mono text-[9px]">Enter</kbd>
          </div>
          <div>
            Pressione <kbd className="rounded border border-border bg-card px-1 font-mono text-[9px]">Esc</kbd> para fechar
          </div>
        </div>
      </div>
    </div>
  )
}
