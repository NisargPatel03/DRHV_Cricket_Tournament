import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/Spinner'
import { Plus, Edit2, Trash2, Shield, Users, Search, UserCheck } from 'lucide-react'

export default function PlayerManager() {
  const queryClient = useQueryClient()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState(null)
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('all')

  // New Player state
  const [name, setName] = useState('')
  const [role, setRole] = useState('batsman')
  const [jerseyNumber, setJerseyNumber] = useState('')
  const [teamId, setTeamId] = useState('')
  const [isCaptain, setIsCaptain] = useState(false)
  const [isViceCaptain, setIsViceCaptain] = useState(false)

  // 1. Fetch Approved Teams (for select dropdowns and filters)
  const { data: teams } = useQuery({
    queryKey: ['admin_approved_teams_select'],
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

  // 2. Fetch All Players
  const { data: players, isLoading } = useQuery({
    queryKey: ['admin_all_players'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select(`
          *,
          team:team_id (id, name, short_name)
        `)
        .order('name', { ascending: true })
      if (error) throw error
      return data || []
    }
  })

  // 3. Create Player Mutation
  const createPlayerMutation = useMutation({
    mutationFn: async (playerData) => {
      const { data, error } = await supabase
        .from('players')
        .insert([playerData])
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_all_players'] })
      queryClient.invalidateQueries({ queryKey: ['admin_dashboard_metrics'] })
      setShowAddForm(false)
      setName('')
      setRole('batsman')
      setJerseyNumber('')
      setTeamId('')
      setIsCaptain(false)
      setIsViceCaptain(false)
    }
  })

  // 4. Update Player Mutation
  const updatePlayerMutation = useMutation({
    mutationFn: async ({ id, playerData }) => {
      const { data, error } = await supabase
        .from('players')
        .update(playerData)
        .eq('id', id)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_all_players'] })
      setEditingPlayer(null)
    }
  })

  // 5. Delete Player Mutation
  const deletePlayerMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_all_players'] })
      queryClient.invalidateQueries({ queryKey: ['admin_dashboard_metrics'] })
    }
  })

  const handleAddSubmit = (e) => {
    e.preventDefault()
    createPlayerMutation.mutate({
      name,
      role,
      jersey_number: jerseyNumber ? parseInt(jerseyNumber) : null,
      team_id: teamId || null,
      is_captain: isCaptain,
      is_vice_captain: isViceCaptain
    })
  }

  const handleEditSubmit = (e) => {
    e.preventDefault()
    updatePlayerMutation.mutate({
      id: editingPlayer.id,
      playerData: {
        name: editingPlayer.name,
        role: editingPlayer.role,
        jersey_number: editingPlayer.jersey_number ? parseInt(editingPlayer.jersey_number) : null,
        team_id: editingPlayer.team_id || null,
        is_captain: editingPlayer.is_captain,
        is_vice_captain: editingPlayer.is_vice_captain
      }
    })
  }

  // Filter players based on team selection dropdown
  const filteredPlayers = players?.filter((p) => {
    return selectedTeamFilter === 'all' || p.team_id === selectedTeamFilter
  })

  return (
    <div className="space-y-8">
      {/* Header Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Players Management</h1>
          <p className="text-slate-500 text-xs">Assign squad rosters, roles, jersey numbers, and captaincies</p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider py-3 px-5 rounded-xl shadow shadow-emerald-500/10 flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" /> Add New Player
        </button>
      </div>

      {/* Add Player Panel Form */}
      {showAddForm && (
        <form onSubmit={handleAddSubmit} className="bg-white border border-slate-200 p-6 rounded-2xl space-y-4 shadow-md">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-widest border-b border-slate-100 pb-2">
            Add New Player
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Player Name */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Player Full Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Virat Kohli"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Jersey Number */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Jersey Number
              </label>
              <input
                type="number"
                placeholder="e.g. 18"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                value={jerseyNumber}
                onChange={(e) => setJerseyNumber(e.target.value)}
              />
            </div>

            {/* Playing Role */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Playing Role
              </label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="batsman">Batsman</option>
                <option value="bowler">Bowler</option>
                <option value="all_rounder">All Rounder</option>
                <option value="wicket_keeper">Wicket Keeper</option>
              </select>
            </div>

            {/* Assigned Team */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Assign Team
              </label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
              >
                <option value="">-- Free Agent (None) --</option>
                {teams?.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({team.short_name})
                  </option>
                ))}
              </select>
            </div>

            {/* Captain Switch */}
            <div className="flex items-center gap-4 sm:pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded text-emerald-500 focus:ring-emerald-500 bg-slate-50 border-slate-200 w-4 h-4"
                  checked={isCaptain}
                  onChange={(e) => {
                    setIsCaptain(e.target.checked)
                    if (e.target.checked) setIsViceCaptain(false) // Can't be both
                  }}
                />
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Is Captain</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded text-emerald-500 focus:ring-emerald-500 bg-slate-50 border-slate-200 w-4 h-4"
                  checked={isViceCaptain}
                  onChange={(e) => {
                    setIsViceCaptain(e.target.checked)
                    if (e.target.checked) setIsCaptain(false)
                  }}
                />
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Is Vice Captain</span>
              </label>
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
              disabled={createPlayerMutation.isPending}
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold uppercase py-2 px-5 rounded-xl shadow"
            >
              {createPlayerMutation.isPending ? 'Adding...' : 'Add Player'}
            </button>
          </div>
        </form>
      )}

      {/* Editing Overlay Modal */}
      {editingPlayer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleEditSubmit} className="bg-white border border-slate-200 p-6 rounded-2xl w-full max-w-lg space-y-4 shadow-2xl animate-scaleUp">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-widest border-b border-slate-100 pb-2">
              Edit Player Details
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Player Full Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                  value={editingPlayer.name}
                  onChange={(e) => setEditingPlayer({ ...editingPlayer, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Jersey Number
                  </label>
                  <input
                    type="number"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                    value={editingPlayer.jersey_number || ''}
                    onChange={(e) => setEditingPlayer({ ...editingPlayer, jersey_number: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Playing Role
                  </label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                    value={editingPlayer.role}
                    onChange={(e) => setEditingPlayer({ ...editingPlayer, role: e.target.value })}
                  >
                    <option value="batsman">Batsman</option>
                    <option value="bowler">Bowler</option>
                    <option value="all_rounder">All Rounder</option>
                    <option value="wicket_keeper">Wicket Keeper</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Assigned Team
                </label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                  value={editingPlayer.team_id || ''}
                  onChange={(e) => setEditingPlayer({ ...editingPlayer, team_id: e.target.value })}
                >
                  <option value="">-- Free Agent (None) --</option>
                  {teams?.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name} ({team.short_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded text-emerald-500 focus:ring-emerald-500 bg-slate-50 border-slate-200 w-4 h-4"
                    checked={editingPlayer.is_captain || false}
                    onChange={(e) => {
                      setEditingPlayer({
                        ...editingPlayer,
                        is_captain: e.target.checked,
                        is_vice_captain: e.target.checked ? false : editingPlayer.is_vice_captain
                      })
                    }}
                  />
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Is Captain</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded text-emerald-500 focus:ring-emerald-500 bg-slate-50 border-slate-200 w-4 h-4"
                    checked={editingPlayer.is_vice_captain || false}
                    onChange={(e) => {
                      setEditingPlayer({
                        ...editingPlayer,
                        is_vice_captain: e.target.checked,
                        is_captain: e.target.checked ? false : editingPlayer.is_captain
                      })
                    }}
                  />
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Is Vice Captain</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingPlayer(null)}
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

      {/* Filter Row card */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
          <Search className="w-4 h-4 text-emerald-500" /> Search Squads
        </div>

        <div className="w-full sm:w-64">
          <select
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
            value={selectedTeamFilter}
            onChange={(e) => setSelectedTeamFilter(e.target.value)}
          >
            <option value="all">All Teams</option>
            {teams?.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name} ({team.short_name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Players Categorized Grid */}
      {isLoading ? (
        <Spinner message="Loading player lists..." />
      ) : filteredPlayers && filteredPlayers.length > 0 ? (
        (() => {
          const batsmen = filteredPlayers.filter((p) => p.role === 'batsman')
          const keepers = filteredPlayers.filter((p) => p.role === 'wicket_keeper')
          const allRounders = filteredPlayers.filter((p) => p.role === 'all_rounder')
          const bowlers = filteredPlayers.filter((p) => p.role === 'bowler')

          const renderRoleCard = (title, emoji, list) => {
            return (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col h-full shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{emoji}</span>
                    <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">{title}</h3>
                  </div>
                  <span className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 text-[10px] text-slate-600 font-extrabold rounded-full">
                    {list.length}
                  </span>
                </div>

                {list.length > 0 ? (
                  <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[480px] pr-1">
                    {list.map((player) => (
                      <div
                        key={player.id}
                        className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-xl flex items-center justify-between gap-3 group transition-all duration-200"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-xs text-slate-800 truncate" title={player.name}>
                              {player.name}
                            </span>
                            {player.is_captain && (
                              <span className="inline-flex items-center px-1.5 py-0.2 bg-amber-50 border border-amber-200 text-amber-700 font-black uppercase text-[7px] tracking-wider rounded">
                                C
                              </span>
                            )}
                            {player.is_vice_captain && (
                              <span className="inline-flex items-center px-1.5 py-0.2 bg-slate-100 border border-slate-200 text-slate-500 font-black uppercase text-[7px] tracking-wider rounded">
                                VC
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1.5 text-[9px] font-bold">
                            {player.team ? (
                              <span className="text-emerald-700 uppercase bg-emerald-50 border border-emerald-100 px-1.5 py-0.2 rounded">
                                {player.team.short_name}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded">
                                Free Agent
                              </span>
                            )}
                            {player.jersey_number !== null && (
                              <span className="text-slate-500 font-black">
                                #{player.jersey_number}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Hover Actions */}
                        <div className="flex items-center gap-1 opacity-80 md:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            type="button"
                            onClick={() => setEditingPlayer(player)}
                            className="p-1 bg-white hover:bg-slate-200 border border-slate-200 text-slate-600 rounded-md transition-colors"
                            title="Edit Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to remove player ${player.name}?`)) {
                                deletePlayerMutation.mutate(player.id)
                              }
                            }}
                            className="p-1 bg-white hover:bg-red-50 border border-red-255 text-red-600 rounded-md transition-colors"
                            title="Delete Player"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-slate-400 border-2 border-dashed border-slate-150 rounded-2xl bg-slate-50/50">
                    <Users className="w-6 h-6 text-slate-350 mb-1" />
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-450">Empty Roster</p>
                  </div>
                )}
              </div>
            )
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {renderRoleCard('Batsmen', '🏏', batsmen)}
              {renderRoleCard('Wicket Keepers', '🧤', keepers)}
              {renderRoleCard('All Rounders', '🌟', allRounders)}
              {renderRoleCard('Bowlers', '🥎', bowlers)}
            </div>
          )
        })()
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-400 shadow-sm">
          <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-semibold">No players match the criteria.</p>
          <p className="text-xs text-slate-500 mt-1">
            Click "Add New Player" above to register the tournament squad players.
          </p>
        </div>
      )}
    </div>
  )
}
