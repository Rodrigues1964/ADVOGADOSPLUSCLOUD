import React, { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { Mail, Send, Activity } from 'lucide-react'

export const MasterCommunications: React.FC = () => {
  const [queue, setQueue] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [testEmail, setTestEmail] = useState('')
  const [sendingTest, setSendingTest] = useState(false)

  const fetchData = async () => {
    try {
      const [queueRes, logsRes] = await Promise.all([
        api.get('/master/communications/email-queue'),
        api.get('/master/communications/logs')
      ])
      setQueue(queueRes.data)
      setLogs(logsRes.data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleTestEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testEmail) return
    try {
      setSendingTest(true)
      await api.post('/master/communications/email/test', { to_email: testEmail })
      alert('Email de teste enviado e registrado no log!')
      setTestEmail('')
      fetchData()
    } catch (error) {
      alert('Falha ao enviar email')
    } finally {
      setSendingTest(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Comunicação e Notificações</h2>
        <p className="text-slate-400 text-sm">Gerenciamento de integrações SMTP, filas de envio e logs de email do sistema.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <Mail size={18} className="text-blue-500" /> 
            Testar Conexão SMTP
          </h3>
          <form onSubmit={handleTestEmail} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Email de Destino</label>
              <input
                type="email"
                required
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                placeholder="exemplo@advogados.com"
              />
            </div>
            <button
              type="submit"
              disabled={sendingTest}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-bold transition-colors disabled:opacity-50"
            >
              <Send size={16} />
              {sendingTest ? 'Enviando...' : 'Disparar Email de Teste'}
            </button>
          </form>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg flex flex-col">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <Activity size={18} className="text-emerald-500" /> 
            Status da Fila (Queue)
          </h3>
          <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-lg p-6">
            <div className="text-4xl font-black text-white mb-2">{queue.length}</div>
            <p className="text-slate-400 text-sm">Emails aguardando processamento</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-white font-bold">Histórico de Envios (Logs)</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400">Carregando logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-400">Nenhum email enviado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/50 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3 font-medium">Data / Hora</th>
                  <th className="px-6 py-3 font-medium">Destinatário</th>
                  <th className="px-6 py-3 font-medium">Assunto</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(log.sent_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-200">
                      {log.to_email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.subject}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        log.status === 'sent' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                      }`}>
                        {log.status === 'sent' ? 'Enviado' : 'Falha'}
                      </span>
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
