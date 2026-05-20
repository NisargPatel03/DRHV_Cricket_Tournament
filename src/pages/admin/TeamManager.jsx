import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/Spinner'
import { Shield, Plus, Edit2, Trash2, Check, X, ShieldAlert, Award } from 'lucide-react'

export default function TeamManager() {
  const queryClient = useQueryClient()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingTeam, setEditingTeam] = useState(null)
  
  // New Team state
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')

  // 1. Fetch All Teams
  const { data: teams, isLoading } = useQuery({
    queryKey: ['admin_all_teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('name', { ascending: true })
      if (error) throw error
      return data || []
    }
  })

  // 2. Add Team Mutation
  const createTeamMutation = useMutation({
    mutationFn: async (teamData) => {
      const { data, error } = await supabase
        .from('teams')
        .insert([teamData])
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_all_teams'] })
      queryClient.invalidateQueries({ queryKey: ['admin_dashboard_metrics'] })
      setShowAddForm(false)
      setName('')
      setShortName('')
      setLogoUrl('')
    }
  })

  // 3. Edit Team Mutation
  const updateTeamMutation = useMutation({
    mutationFn: async ({ id, teamData }) => {
      const { data, error } = await supabase
        .from('teams')
        .update(teamData)
        .eq('id', id)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_all_teams'] })
      setEditingTeam(null)
    }
  })

  // 4. Delete Team Mutation
  const deleteTeamMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_all_teams'] })
      queryClient.invalidateQueries({ queryKey: ['admin_dashboard_metrics'] })
    }
  })

  const handleAddSubmit = (e) => {
    e.preventDefault()
    createTeamMutation.mutate({
      name,
      short_name: shortName.toUpperCase(),
      logo_url: logoUrl || null,
      status: 'approved' // Admin created teams are pre-approved
    })
  }

  const handleEditSubmit = (e) => {
    e.preventDefault()
    updateTeamMutation.mutate({
      id: editingTeam.id,
      teamData: {
        name: editingTeam.name,
        short_name: editingTeam.short_name.toUpperCase(),
        logo_url: editingTeam.logo_url
      }
    })
  }

  const handleApproveReject = (id, newStatus) => {
    updateTeamMutation.mutate({
      id,
      teamData: { status: newStatus }
    })
  }

  const getStatusBadge = (status) => {
    if (status === 'approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (status === 'pending') return 'bg-amber-50 text-amber-700 border-amber-200'
    return 'bg-red-50 text-red-700 border-red-200'
  }

  return (
    <div className="space-y-8">
      {/* Header Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Teams Management</h1>
          <p className="text-slate-500 text-xs">Register, review, and modify tournament participating blocks</p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider py-3 px-5 rounded-xl shadow shadow-emerald-500/10 flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" /> Register New Team
        </button>
      </div>

      {/* Add Team Panel (Conditional overlay) */}
      {showAddForm && (
        <form onSubmit={handleAddSubmit} className="bg-white border border-slate-200 p-6 rounded-2xl space-y-4 shadow-md">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-widest border-b border-slate-100 pb-2">
            Register New Team
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Full Team Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. A-Wing Avengers"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Acronym Short Name
              </label>
              <input
                type="text"
                required
                maxLength={4}
                placeholder="e.g. AWA"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Logo URL (Optional)
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
              disabled={createTeamMutation.isPending}
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold uppercase py-2 px-5 rounded-xl shadow shadow-emerald-500/10"
            >
              {createTeamMutation.isPending ? 'Registering...' : 'Register'}
            </button>
          </div>
        </form>
      )}

      {/* Editing Modal */}
      {editingTeam && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleEditSubmit} className="bg-white border border-slate-200 p-6 rounded-2xl w-full max-w-lg space-y-4 shadow-2xl animate-scaleUp">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-widest border-b border-slate-100 pb-2">
              Edit Team Details
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Full Team Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                  value={editingTeam.name}
                  onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Acronym Short Name
                </label>
                <input
                  type="text"
                  required
                  maxLength={4}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                  value={editingTeam.short_name}
                  onChange={(e) => setEditingTeam({ ...editingTeam, short_name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Logo URL
                </label>
                <input
                  type="url"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                  value={editingTeam.logo_url || ''}
                  onChange={(e) => setEditingTeam({ ...editingTeam, logo_url: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingTeam(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs font-bold uppercase py-2 px-4 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold uppercase py-2 px-5 rounded-xl"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Teams List */}
      {isLoading ? (
        <Spinner message="Loading participating team roster..." />
      ) : teams && teams.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase tracking-widest text-[9px] border-b border-slate-200">
                  <th className="py-3.5 px-5">Team details</th>
                  <th className="py-3.5 px-2">Short Name</th>
                  <th className="py-3.5 px-2 text-center">Status</th>
                  <th className="py-3.5 px-5 text-right w-44">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teams.map((team) => (
                  <tr key={team.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Team bio */}
                    <td className="py-4 px-5 font-bold text-slate-700">
                      <div className="flex items-center gap-3">
                        <img
                          src={team.logo_url || 'https://placehold.co/100x100/e2e8f0/64748b?text=T'}
                          alt={team.name}
                          className="w-8 h-8 rounded-full object-cover bg-slate-100 border border-slate-200 shrink-0"
                        />
                        <span>{team.name}</span>
                      </div>
                    </td>

                    {/* Acronym */}
                    <td className="py-4 px-2 font-extrabold text-emerald-600 uppercase">
                      {team.short_name}
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-2 text-center">
                      <span className={`inline-block px-2.5 py-0.5 border rounded-full font-bold uppercase text-[9px] tracking-wider ${getStatusBadge(team.status)}`}>
                        {team.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-right">
                      <div className="flex gap-2 justify-end">
                        {/* Status approval triggers for pending items */}
                        {team.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveReject(team.id, 'approved')}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg"
                              title="Approve Team"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleApproveReject(team.id, 'rejected')}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg"
                              title="Reject Team"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        
                        {/* Standard Edit Delete */}
                        <button
                          onClick={() => setEditingTeam(team)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg"
                          title="Edit Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you absolutely sure you want to delete ${team.name}? All players and matches associated will be deleted!`)) {
                              deleteTeamMutation.mutate(team.id)
                            }
                          }}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg"
                          title="Delete Team"
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
          <ShieldAlert className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-semibold">No teams registered in the system.</p>
          <p className="text-xs text-slate-500 mt-1">
            Click the "Register New Team" button above to register the first team in the tournament.
          </p>
        </div>
      )}
    </div>
  )
}
