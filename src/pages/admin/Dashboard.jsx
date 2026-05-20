import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/Spinner'
import { Shield, ShieldCheck, Users, Calendar, Play, ShieldAlert, Award, ArrowUpRight, Check, X } from 'lucide-react'

export default function Dashboard() {
  const queryClient = useQueryClient()

  // 1. Fetch Metrics counts
  const { data: metrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ['admin_dashboard_metrics'],
    queryFn: async () => {
      const { count: teamsCount } = await supabase.from('teams').select('*', { count: 'exact', head: true })
      const { count: completedMatches } = await supabase.from('matches').select('*', { count: 'exact', head: true }).eq('status', 'completed')
      const { count: liveMatches } = await supabase.from('matches').select('*', { count: 'exact', head: true }).eq('status', 'live')
      const { count: playersCount } = await supabase.from('players').select('*', { count: 'exact', head: true })

      return {
        teams: teamsCount || 0,
        matchesPlayed: completedMatches || 0,
        liveMatches: liveMatches || 0,
        players: playersCount || 0
      }
    }
  })

  // 2. Fetch Pending Teams (needing approval)
  const { data: pendingTeams, isLoading: loadingPending } = useQuery({
    queryKey: ['admin_pending_teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data || []
    }
  })

  // 3. Team Approval Mutation
  const approveTeamMutation = useMutation({
    mutationFn: async ({ id, newStatus }) => {
      const { data, error } = await supabase
        .from('teams')
        .update({ status: newStatus })
        .eq('id', id)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalidate query to trigger refresh
      queryClient.invalidateQueries({ queryKey: ['admin_dashboard_metrics'] })
      queryClient.invalidateQueries({ queryKey: ['admin_pending_teams'] })
    }
  })

  const handleApproveReject = (id, newStatus) => {
    approveTeamMutation.mutate({ id, newStatus })
  }

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Admin Dashboard</h1>
        <p className="text-slate-500 text-xs">Overview tournament statistics and pending registrations</p>
      </div>

      {/* 1. METRICS GRID ROW */}
      {loadingMetrics ? (
        <Spinner message="Summing system statistics..." />
      ) : (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Teams */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-5 shadow-sm hover:shadow transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Teams</span>
              <span className="text-2xl font-black text-slate-800 block mt-0.5">{metrics?.teams}</span>
            </div>
          </div>

          {/* Players */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-5 shadow-sm hover:shadow transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Players</span>
              <span className="text-2xl font-black text-slate-800 block mt-0.5">{metrics?.players}</span>
            </div>
          </div>

          {/* Completed Matches */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-5 shadow-sm hover:shadow transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-500 flex items-center justify-center shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Completed</span>
              <span className="text-2xl font-black text-slate-800 block mt-0.5">{metrics?.matchesPlayed}</span>
            </div>
          </div>

          {/* Live Matches */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-5 shadow-sm hover:shadow transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
              <Play className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Matches</span>
              <span className="text-2xl font-black text-red-600 block mt-0.5">{metrics?.liveMatches}</span>
            </div>
          </div>
        </section>
      )}

      {/* 2. SPLIT LAYOUT (Pending approvals & recent highlights) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Pending approvals table */}
        <section className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            🔔 Awaiting Approval
          </h2>

          {loadingPending ? (
            <div className="h-40 bg-white border border-slate-200 rounded-2xl animate-pulse"></div>
          ) : pendingTeams && pendingTeams.length > 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase tracking-widest text-[9px] border-b border-slate-200">
                      <th className="py-3 px-4">Team Name</th>
                      <th className="py-3 px-2">Acronym</th>
                      <th className="py-3 px-2">Created At</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingTeams.map((team) => (
                      <tr key={team.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-4 font-bold text-slate-700">
                          <div className="flex items-center gap-3">
                            <img
                              src={team.logo_url || 'https://placehold.co/100x100/e2e8f0/64748b?text=T'}
                              alt={team.name}
                              className="w-7 h-7 rounded-full object-cover bg-slate-100 shrink-0 border border-slate-200"
                            />
                            <span>{team.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-2 font-bold text-emerald-600 uppercase">
                          {team.short_name}
                        </td>
                        <td className="py-4 px-2 text-slate-400">
                          {new Date(team.created_at).toLocaleDateString('en-US')}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleApproveReject(team.id, 'approved')}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors shadow-sm"
                              title="Approve Team"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleApproveReject(team.id, 'rejected')}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors shadow-sm"
                              title="Reject Team"
                            >
                              <X className="w-4 h-4" />
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
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 shadow-sm">
              <ShieldCheck className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
              <p className="text-sm font-semibold">No pending team approvals.</p>
              <p className="text-xs text-slate-500 mt-1">All registered teams are processed.</p>
            </div>
          )}
        </section>

        {/* Right Side: Quick Tips / System Guidelines */}
        <section className="space-y-4">
          <h2 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            💡 Quick Guide
          </h2>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm text-xs leading-relaxed text-slate-500">
            <h3 className="font-extrabold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
              <ShieldAlert className="w-4 h-4 text-emerald-500" /> Admin Capabilities
            </h3>
            
            <div className="space-y-3">
              <div>
                <strong className="text-slate-700 block font-semibold">1. Team Approvals</strong>
                <span className="block mt-0.5">Review and approve teams registered by players to allow squad management.</span>
              </div>
              <div>
                <strong className="text-slate-700 block font-semibold">2. Match Scheduling</strong>
                <span className="block mt-0.5">Use the scheduler to arrange league, semifinal, or final matches and assign scorers.</span>
              </div>
              <div>
                <strong className="text-slate-700 block font-semibold">3. Score Override & Scorers</strong>
                <span className="block mt-0.5">Only scorers assigned to a match (or you as admin) can enter the live score panel to record ball runs.</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <span>DRHV Tournament Admin</span>
              <Award className="w-4 h-4 text-amber-500" />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
