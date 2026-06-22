import React, { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { DatabaseBackup, Play, CheckCircle2, XCircle } from 'lucide-react'

export const MasterBackup: React.FC = () => {
  const [backups, setBackups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)

  const fetchBackups = async () => {
    try {
      const res = await api.get('/master/backups')
      setBackups(res.data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBackups()
  }, [])

  const handleRunBackup = async () => {
    if (!window.confirm('Iniciar backup do MariaDB agora? Pode causar lentidão momentânea.')) return
    try {
      setRunning(true)
      await api.post('/master/backups/run')
      await fetchBackups()
      alert('Backup gerado com sucesso!')
    } catch (error) {
      alert('Falha ao gerar backup. Verifique os logs do servidor.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Gerenciamento de Backups</h2>
          <p className="text-slate-400 text-sm">Controle de snapshots do MariaDB utilizando mysqldump nativo.</p>
        </div>
        <button 
          onClick={handleRunBackup}
          disabled={running}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold transition-colors disabled:opacity-50"
        >
          {running ? (
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
          ) : (
            <Play size={18} />
          )}
          Gerar Backup Agora
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 flex items-center gap-2">
          <DatabaseBackup size={18} className="text-rose-500" />
          <h3 className="text-white font-bold">Histórico de Execuções</h3>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-slate-400">Carregando histórico...</div>
        ) : backups.length === 0 ? (
          <div className="p-8 text-center text-slate-400">Nenhum backup realizado ainda.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/50 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3 font-medium">Data / Hora</th>
                  <th className="px-6 py-3 font-medium">Tamanho</th>
                  <th className="px-6 py-3 font-medium">Caminho do Arquivo</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Executor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {backups.map((b: any) => (
                  <tr key={b.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(b.date).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(b.size_bytes / 1024).toFixed(2)} KB
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-500">
                      {b.file_path}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {b.status === 'success' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          <CheckCircle2 size={12} /> Sucesso
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">
                          <XCircle size={12} /> Falha
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap uppercase">
                      {b.user_id}
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
