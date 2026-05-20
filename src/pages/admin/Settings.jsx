import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/Spinner'
import { Settings, Save, ShieldCheck, Trophy, Sparkles } from 'lucide-react'

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const [tournamentName, setTournamentName] = useState('DRHV Premier League')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [logoUrl, setLogoUrl] = useState('')

  // 1. Fetch current settings (limit 1)
  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin_tournament_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournament_settings')
        .select('*')
        .limit(1)
      if (error) throw error
      return data?.[0] || null
    }
  })

  // Synchronize local states when settings load
  useEffect(() => {
    if (settings) {
      setTournamentName(settings.tournament_name || 'DRHV Premier League')
      setStartDate(settings.start_date || '')
      setEndDate(settings.end_date || '')
      setLogoUrl(settings.logo_url || '')
    }
  }, [settings])

  const [alertConfig, setAlertConfig] = useState(null)

  const showAlert = (message, type = 'info') => {
    setAlertConfig({ message, type })
    setTimeout(() => {
      setAlertConfig((prev) => prev?.message === message ? null : prev)
    }, 6000)
  }

  // 2. Save settings mutation (UPSERT operation)
  const saveSettingsMutation = useMutation({
    mutationFn: async (settingsData) => {
      let query
      if (settings?.id) {
        // Update existing row
        query = supabase
          .from('tournament_settings')
          .update(settingsData)
          .eq('id', settings.id)
      } else {
        // Insert new row
        query = supabase
          .from('tournament_settings')
          .insert([settingsData])
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_tournament_settings'] })
      showAlert('Tournament settings saved successfully!', 'success')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    saveSettingsMutation.mutate({
      tournament_name: tournamentName,
      start_date: startDate || null,
      end_date: endDate || null,
      logo_url: logoUrl || null
    })
  }

  return (
    <div className="space-y-8 relative">
      {/* Premium Toast Notification Banner */}
      {alertConfig && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4 animate-scaleUp">
          <div className={`flex items-start gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-350 ${
            alertConfig.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700' 
              : alertConfig.type === 'error' 
              ? 'bg-red-500/10 border-red-500/20 text-red-700' 
              : 'bg-amber-500/10 border-amber-500/20 text-amber-700'
          }`}>
            <span className="text-lg">
              {alertConfig.type === 'success' ? '✅' : alertConfig.type === 'error' ? '❌' : '⚠️'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider mb-0.5">
                {alertConfig.type === 'success' ? 'Success' : alertConfig.type === 'error' ? 'Error' : 'Notification'}
              </p>
              <p className="text-xs font-semibold leading-relaxed break-words">{alertConfig.message}</p>
            </div>
            <button 
              type="button"
              onClick={() => setAlertConfig(null)}
              className="text-xs font-bold hover:opacity-75 shrink-0 pl-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {/* Title Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Tournament Settings</h1>
        <p className="text-slate-500 text-xs">Configure central brand branding and season scheduler limits</p>
      </div>

      {isLoading ? (
        <Spinner message="Loading system settings..." />
      ) : (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm max-w-2xl">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-emerald-500" /> Tournament Identity
          </h2>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Tournament Name / App Title
              </label>
              <input
                type="text"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
              />
            </div>

            {/* Date rows */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Tournament Start Date
                </label>
                <input
                  type="date"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Tournament End Date
                </label>
                <input
                  type="date"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Logo URL */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Tournament Logo Image URL
              </label>
              <input
                type="url"
                placeholder="https://..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
              />
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 flex-wrap gap-4">
            <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Branding applies tournament-wide
            </span>
            
            <button
              type="submit"
              disabled={saveSettingsMutation.isPending}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider py-3 px-6 rounded-xl shadow shadow-emerald-500/10 flex items-center gap-1.5 transition-all"
            >
              <Save className="w-4 h-4" />
              {saveSettingsMutation.isPending ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
