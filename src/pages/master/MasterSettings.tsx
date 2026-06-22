import React, { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { Settings, Save } from 'lucide-react'

export const MasterSettings: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchSettings = async () => {
    try {
      const res = await api.get('/master/settings')
      const mapped = res.data.reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value
        return acc
      }, {})
      setSettings(mapped)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const promises = Object.entries(settings).map(([key, value]) => 
        api.put('/master/settings', { key, value })
      )
      await Promise.all(promises)
      alert('Configurações salvas com sucesso!')
    } catch (error) {
      alert('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  const updateField = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  if (loading) return <div className="text-white">Carregando configurações...</div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Configurações Globais</h2>
        <p className="text-slate-400 text-sm">Parâmetros do sistema base gravados no MariaDB.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg max-w-2xl">
        <div className="p-4 border-b border-slate-800 flex items-center gap-2">
          <Settings size={18} className="text-purple-500" />
          <h3 className="text-white font-bold">Variáveis de Ambiente DB</h3>
        </div>
        
        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Nome do Sistema</label>
              <input
                type="text"
                value={settings['SYSTEM_NAME'] || 'Advogados Plus Cloud'}
                onChange={(e) => updateField('SYSTEM_NAME', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Retenção de Logs de Auditoria (Dias)</label>
              <input
                type="number"
                value={settings['AUDIT_RETENTION_DAYS'] || '90'}
                onChange={(e) => updateField('AUDIT_RETENTION_DAYS', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Limite Padrão de Armazenamento por Tenant (GB)</label>
              <input
                type="number"
                value={settings['DEFAULT_STORAGE_LIMIT_GB'] || '5'}
                onChange={(e) => updateField('DEFAULT_STORAGE_LIMIT_GB', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Backup Automático</label>
              <select
                value={settings['AUTO_BACKUP_FREQUENCY'] || 'daily'}
                onChange={(e) => updateField('AUTO_BACKUP_FREQUENCY', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
              >
                <option value="daily">Diário</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
                <option value="disabled">Desativado</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-bold transition-colors disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
