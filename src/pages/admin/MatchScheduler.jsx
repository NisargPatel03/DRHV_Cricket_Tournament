import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/Spinner'
import { Calendar, Plus, Edit2, Trash2, Shield, CalendarDays, CheckCircle2, UserCheck, ShieldAlert } from 'lucide-react'

export default function MatchScheduler() {
  const queryClient = useQueryClient()
  const [alertConfig, setAlertConfig] = useState(null)

  const showAlert = (message, type = 'info') => {
    setAlertConfig({ message, type })
    setTimeout(() => {
      setAlertConfig((prev) => prev?.message === message ? null : prev)
    }, 6000)
  }

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingMatch, setEditingMatch] = useState(null)

  // New Match Form states
  const [team1Id, setTeam1Id] = useState('')
  const [team2Id, setTeam2Id] = useState('')
  const [matchDate, setMatchDate] = useState('')
  const [matchTime, setMatchTime] = useState('')
  const [venue, setVenue] = useState('DRHV Community Grounds')
  const [stage, setStage] = useState('league')
  const [oversLimit, setOversLimit] = useState('20')
  const [assignedScorerId, setAssignedScorerId] = useState('')

  // 1. Fetch Approved Teams
  const { data: teams } = useQuery({
    queryKey: ['admin_scheduler_teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, short_name')
        .eq('status', 'approved')
        .order('name', { ascending: true })
      if (error) throw error
      return data || []
    }
  })

  // 2. Fetch Scorers (users registered with scorer or admin profiles)
  const { data: scorers } = useQuery({
    queryKey: ['admin_scorers_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .in('role', ['scorer', 'admin'])
        .order('full_name', { ascending: true })
      if (error) throw error
      return data || []
    }
  })

  // 3. Fetch All Matches
  const { data: matches, isLoading } = useQuery({
    queryKey: ['admin_all_matches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          team1:team1_id (id, name, short_name),
          team2:team2_id (id, name, short_name),
          scorer:scorer_id (id, full_name)
        `)
        .order('match_date', { ascending: true })
        .order('match_time', { ascending: true })
      if (error) throw error
      return data || []
    }
  })

  // 4. Create Match Mutation
  const createMatchMutation = useMutation({
    mutationFn: async (matchData) => {
      const { data, error } = await supabase
        .from('matches')
        .insert([matchData])
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_all_matches'] })
      queryClient.invalidateQueries({ queryKey: ['admin_dashboard_metrics'] })
      setShowAddForm(false)
      setTeam1Id('')
      setTeam2Id('')
      setMatchDate('')
      setMatchTime('')
      setVenue('DRHV Community Grounds')
      setStage('league')
      setOversLimit('20')
      setAssignedScorerId('')
    }
  })

  // 5. Update Match Mutation
  const updateMatchMutation = useMutation({
    mutationFn: async ({ id, matchData }) => {
      const { data, error } = await supabase
        .from('matches')
        .update(matchData)
        .eq('id', id)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_all_matches'] })
      setEditingMatch(null)
    }
  })

  // 6. Delete Match Mutation
  const deleteMatchMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_all_matches'] })
      queryClient.invalidateQueries({ queryKey: ['admin_dashboard_metrics'] })
    }
  })

  const handleAddSubmit = (e) => {
    e.preventDefault()
    if (team1Id === team2Id) {
      showAlert('Team 1 and Team 2 cannot be the same team!', 'warning')
      return
    }

    createMatchMutation.mutate({
      team1_id: team1Id,
      team2_id: team2Id,
      match_date: matchDate,
      match_time: matchTime + ':00',
      venue,
      stage,
      overs_limit: parseInt(oversLimit),
      scorer_id: assignedScorerId || null,
      status: 'upcoming'
    })
  }

  const handleEditSubmit = (e) => {
    e.preventDefault()
    if (editingMatch.team1_id === editingMatch.team2_id) {
      showAlert('Team 1 and Team 2 cannot be the same team!', 'warning')
      return
    }

    updateMatchMutation.mutate({
      id: editingMatch.id,
      matchData: {
        match_date: editingMatch.match_date,
        match_time: editingMatch.match_time,
        venue: editingMatch.venue,
        stage: editingMatch.stage,
        overs_limit: parseInt(editingMatch.overs_limit),
        scorer_id: editingMatch.scorer_id || null,
        status: editingMatch.status
      }
    })
  }

  const getStatusBadge = (status) => {
    if (status === 'completed') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (status === 'live') return 'bg-red-50 text-red-700 border-red-200 animate-pulse'
    if (status === 'abandoned') return 'bg-slate-100 text-slate-600 border-slate-200'
    return 'bg-blue-50 text-blue-700 border-blue-200'
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
      {/* Header Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Fixtures & Scheduling</h1>
          <p className="text-slate-500 text-xs">Configure match rules, stages, dates, and assign official scorers</p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider py-3 px-5 rounded-xl shadow shadow-emerald-500/10 flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" /> Schedule New Match
        </button>
      </div>

      {/* Add Match Panel */}
      {showAddForm && (
        <form onSubmit={handleAddSubmit} className="bg-white border border-slate-200 p-6 rounded-2xl space-y-4 shadow-md">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-widest border-b border-slate-100 pb-2">
            Schedule New Match
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Team 1 Select */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Select Team 1
              </label>
              <select
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                value={team1Id}
                onChange={(e) => setTeam1Id(e.target.value)}
              >
                <option value="">-- Choose Team 1 --</option>
                {teams?.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({team.short_name})
                  </option>
                ))}
              </select>
            </div>

            {/* Team 2 Select */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Select Team 2
              </label>
              <select
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                value={team2Id}
                onChange={(e) => setTeam2Id(e.target.value)}
              >
                <option value="">-- Choose Team 2 --</option>
                {teams?.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({team.short_name})
                  </option>
                ))}
              </select>
            </div>

            {/* Stage Select */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Tournament Stage
              </label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
              >
                <option value="league">League Match</option>
                <option value="semifinal">Semifinal</option>
                <option value="final">Grand Final</option>
              </select>
            </div>

            {/* Match Date */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Match Date
              </label>
              <input
                type="date"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
              />
            </div>

            {/* Match Time */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Match Time (Start)
              </label>
              <input
                type="time"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                value={matchTime}
                onChange={(e) => setMatchTime(e.target.value)}
              />
            </div>

            {/* Overs Limit */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Configure Match Overs Limit
              </label>
              <input
                type="number"
                required
                min={1}
                max={50}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                value={oversLimit}
                onChange={(e) => setOversLimit(e.target.value)}
              />
            </div>

            {/* Match Venue */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Match Venue Location
              </label>
              <input
                type="text"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
              />
            </div>

            {/* Assigned Scorer */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Assign Scorer Official
              </label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                value={assignedScorerId}
                onChange={(e) => setAssignedScorerId(e.target.value)}
              >
                <option value="">-- Choose Assigned Scorer --</option>
                {scorers?.map((scorer) => (
                  <option key={scorer.id} value={scorer.id}>
                    {scorer.full_name} ({scorer.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs font-bold uppercase py-2 px-4 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMatchMutation.isPending}
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold uppercase py-2 px-5 rounded-xl shadow"
            >
              {createMatchMutation.isPending ? 'Scheduling...' : 'Schedule Fixture'}
            </button>
          </div>
        </form>
      )}

      {/* Editing overlay modal */}
      {editingMatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleEditSubmit} className="bg-white border border-slate-200 p-6 rounded-2xl w-full max-w-lg space-y-4 shadow-2xl animate-scaleUp">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-widest border-b border-slate-100 pb-2">
              Edit Match Details
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Match Date
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                    value={editingMatch.match_date}
                    onChange={(e) => setEditingMatch({ ...editingMatch, match_date: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Match Time
                  </label>
                  <input
                    type="time"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                    value={editingMatch.match_time.substring(0, 5)}
                    onChange={(e) => setEditingMatch({ ...editingMatch, match_time: e.target.value + ':00' })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Overs Limit
                  </label>
                  <input
                    type="number"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                    value={editingMatch.overs_limit}
                    onChange={(e) => setEditingMatch({ ...editingMatch, overs_limit: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Status State
                  </label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                    value={editingMatch.status}
                    onChange={(e) => setEditingMatch({ ...editingMatch, status: e.target.value })}
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="live">Live</option>
                    <option value="completed">Completed</option>
                    <option value="abandoned">Abandoned</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Venue Location
                </label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                  value={editingMatch.venue}
                  onChange={(e) => setEditingMatch({ ...editingMatch, venue: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Assigned Scorer
                </label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                  value={editingMatch.scorer_id || ''}
                  onChange={(e) => setEditingMatch({ ...editingMatch, scorer_id: e.target.value })}
                >
                  <option value="">-- Choose Assigned Scorer --</option>
                  {scorers?.map((scorer) => (
                    <option key={scorer.id} value={scorer.id}>
                      {scorer.full_name} ({scorer.role})
                  </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingMatch(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs font-bold uppercase py-2 px-4 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold uppercase py-2 px-5 rounded-xl shadow"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Fixtures list table */}
      {isLoading ? (
        <Spinner message="Loading scheduled matches..." />
      ) : matches && matches.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase tracking-widest text-[9px] border-b border-slate-200">
                  <th className="py-3.5 px-5">Match fixture</th>
                  <th className="py-3.5 px-2">Stage</th>
                  <th className="py-3.5 px-2">Date & Time</th>
                  <th className="py-3.5 px-2">Venue</th>
                  <th className="py-3.5 px-2">Scorer assigned</th>
                  <th className="py-3.5 px-2 text-center">Status</th>
                  <th className="py-3.5 px-5 text-right w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matches.map((match) => (
                  <tr key={match.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Teams */}
                    <td className="py-4 px-5 font-bold text-slate-700">
                      {match.team1?.short_name} vs {match.team2?.short_name}
                    </td>

                    {/* Stage */}
                    <td className="py-4 px-2 font-bold text-slate-500 uppercase text-[9px] tracking-wider">
                      {match.stage}
                    </td>

                    {/* Date Time */}
                    <td className="py-4 px-2 text-slate-500">
                      {new Date(match.match_date).toLocaleDateString('en-US')} @ {match.match_time.substring(0, 5)}
                    </td>

                    {/* Venue */}
                    <td className="py-4 px-2 text-slate-500 font-medium truncate max-w-[120px]">
                      {match.venue}
                    </td>

                    {/* Scorer */}
                    <td className="py-4 px-2 font-semibold text-slate-600">
                      {match.scorer ? (
                        <span className="flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          {match.scorer.full_name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-2 text-center">
                      <span className={`inline-block px-2.5 py-0.5 border rounded-full font-bold uppercase text-[9px] tracking-wider ${getStatusBadge(match.status)}`}>
                        {match.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setEditingMatch(match)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg"
                          title="Edit Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you absolutely sure you want to delete this fixture?`)) {
                              deleteMatchMutation.mutate(match.id)
                            }
                          }}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg"
                          title="Delete Fixture"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-400 shadow-sm">
          <CalendarDays className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-semibold">No scheduled tournament fixtures.</p>
          <p className="text-xs text-slate-500 mt-1">
            Click "Schedule New Match" above to register the first match of the tournament.
          </p>
        </div>
      )}
    </div>
  )
}
