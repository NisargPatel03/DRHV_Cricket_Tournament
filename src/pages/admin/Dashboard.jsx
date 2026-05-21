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
        <h1 className="text-2xl font-black text-white tracking-tight uppercase">Admin Dashboard</h1>
        <p className="text-slate-400 text-xs font-semibold">Overview tournament statistics and pending registrations</p>
      </div>

      {/* 1. METRICS GRID ROW */}
      {loadingMetrics ? (
        <Spinner message="Summing system statistics..." />
      ) : (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Teams */}
          <div className="telemetry-card p-6 flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-[10px] font-black text-slate-450 uppercase tracking-widest">Total Teams</span>
              <span className="text-2xl font-black text-white block mt-0.5">{metrics?.teams}</span>
            </div>
          </div>

          {/* Players */}
          <div className="telemetry-card p-6 flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-[10px] font-black text-slate-455 uppercase tracking-widest">Players</span>
              <span className="text-2xl font-black text-white block mt-0.5">{metrics?.players}</span>
            </div>
          </div>

          {/* Completed Matches */}
          <div className="telemetry-card p-6 flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-350 border border-white/10 flex items-center justify-center shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-[10px] font-black text-slate-450 uppercase tracking-widest">Completed</span>
              <span className="text-2xl font-black text-white block mt-0.5">{metrics?.matchesPlayed}</span>
            </div>
          </div>

          {/* Live Matches */}
          <div className="telemetry-card p-6 flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center shrink-0">
              <Play className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="block text-[10px] font-black text-slate-450 uppercase tracking-widest">Live Matches</span>
              <span className="text-2xl font-black text-red-400 block mt-0.5">{metrics?.liveMatches}</span>
            </div>
          </div>
        </section>
      )}

      {/* 2. SPLIT LAYOUT (Pending approvals & recent highlights) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Pending approvals table */}
        <section className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
            🔔 Awaiting Approval
          </h2>

          {loadingPending ? (
            <div className="h-40 telemetry-card animate-pulse"></div>
          ) : pendingTeams && pendingTeams.length > 0 ? (
            <div className="telemetry-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-white/5 text-slate-450 font-black uppercase tracking-widest text-[9px] border-b border-white/10">
                      <th className="py-3 px-4">Team Name</th>
                      <th className="py-3 px-2">Acronym</th>
                      <th className="py-3 px-2">Created At</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {pendingTeams.map((team) => (
                      <tr key={team.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 px-4 font-bold text-slate-200">
                          <div className="flex items-center gap-3">
                            <img
                              src={team.logo_url || 'https://placehold.co/100x100/1e293b/ffffff?text=T'}
                              alt={team.name}
                              className="w-7 h-7 rounded-full object-cover bg-slate-950 shrink-0 border border-white/10"
                            />
                            <span>{team.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-2 font-black text-emerald-450 uppercase tracking-wider">
                          {team.short_name}
                        </td>
                        <td className="py-4 px-2 text-slate-400 font-semibold">
                          {new Date(team.created_at).toLocaleDateString('en-US')}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleApproveReject(team.id, 'approved')}
                              className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-455 rounded-lg transition-colors border border-emerald-500/20 shadow-sm"
                              title="Approve Team"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleApproveReject(team.id, 'rejected')}
                              className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-red-500/20 shadow-sm"
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
            <div className="telemetry-card p-8 text-center text-slate-400">
              <ShieldCheck className="w-8 h-8 mx-auto text-emerald-450 mb-2" />
              <p className="text-sm font-semibold">No pending team approvals.</p>
              <p className="text-xs text-slate-500 mt-1 font-semibold">All registered teams are processed.</p>
            </div>
          )}
        </section>

        {/* Right Side: Quick Tips / System Guidelines */}
        <section className="space-y-4">
          <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
            💡 Quick Guide
          </h2>
          <div className="telemetry-card p-5 space-y-4 text-xs leading-relaxed text-slate-400">
            <h3 className="font-black text-white flex items-center gap-1.5 uppercase tracking-widest text-[10px]">
              <ShieldAlert className="w-4 h-4 text-emerald-450" /> Admin Capabilities
            </h3>
            
            <div className="space-y-3 font-semibold">
              <div>
                <strong className="text-slate-200 block font-bold">1. Team Approvals</strong>
                <span className="block mt-0.5 text-slate-450">Review and approve teams registered by players to allow squad management.</span>
              </div>
              <div>
                <strong className="text-slate-200 block font-bold">2. Match Scheduling</strong>
                <span className="block mt-0.5 text-slate-450">Use the scheduler to arrange league, semifinal, or final matches and assign scorers.</span>
              </div>
              <div>
                <strong className="text-slate-200 block font-bold">3. Score Override & Scorers</strong>
                <span className="block mt-0.5 text-slate-450">Only scorers assigned to a match (or you as admin) can enter the live score panel to record ball runs.</span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              <span>DRHV Tournament Admin</span>
              <Award className="w-4 h-4 text-amber-500" />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
