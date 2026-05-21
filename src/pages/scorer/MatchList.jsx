import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/useAuthStore'
import Spinner from '../../components/Spinner'
import { CalendarDays, Play, ShieldAlert, Award, Calendar } from 'lucide-react'

export default function MatchList() {
  const { user, profile } = useAuthStore()

  // 1. Fetch Matches assigned to this scorer (or all matches if admin)
  const { data: matches, isLoading } = useQuery({
    queryKey: ['scorer_assigned_matches', user?.id, profile?.role],
    queryFn: async () => {
      let query = supabase
        .from('matches')
        .select(`
          *,
          team1:team1_id (id, name, short_name, logo_url),
          team2:team2_id (id, name, short_name, logo_url)
        `)
        .order('match_date', { ascending: false })

      // Filter by scorer ID if not admin
      if (profile?.role === 'scorer') {
        query = query.eq('scorer_id', user.id)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!user && !!profile
  })

  const getStatusBadge = (status) => {
    if (status === 'completed') return 'bg-emerald-500 text-black border-2 border-black shadow-[2px_2px_0_#000]'
    if (status === 'live') return 'bg-red-600 text-white border-2 border-black shadow-[2px_2px_0_#000] animate-pulse'
    if (status === 'abandoned') return 'bg-slate-800 text-slate-300 border-2 border-black shadow-[2px_2px_0_#000]'
    return 'bg-blue-500 text-black border-2 border-black shadow-[2px_2px_0_#000]'
  }

  const getCardStyle = (status) => {
    if (status === 'live') return 'neo-brutalist-card-red'
    if (status === 'completed') return 'neo-brutalist-card-emerald'
    return 'neo-brutalist-card'
  }

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight uppercase">Assigned Matches</h1>
        <p className="text-slate-400 text-xs font-mono">Select a scheduled fixture below to configure lineups and score ball by ball</p>
      </div>

      {isLoading ? (
        <Spinner message="Fetching assigned schedules..." />
      ) : matches && matches.length > 0 ? (
        <div className="space-y-6">
          {matches.map((match) => (
            <div
              key={match.id}
              className={`${getCardStyle(match.status)} p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden`}
            >
              {/* Left Column: Stage, Date, Venue, Overs Limit */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
                {/* Status Badges & Stage details */}
                <div className="flex sm:flex-col items-center sm:items-start justify-between sm:justify-center gap-2 sm:min-w-[110px]">
                  <span className="text-[9px] bg-slate-800 text-slate-200 font-black px-2 py-0.5 border border-black uppercase tracking-wider shrink-0 shadow-[1px_1px_0_#000] font-mono">
                    {match.stage}
                  </span>
                  <span className={`px-2 py-0.5 border font-black uppercase text-[9px] tracking-wider shrink-0 ${getStatusBadge(match.status)}`}>
                    {match.status}
                  </span>
                </div>

                {/* Matchup strip: Team 1 VS Team 2 */}
                <div className="flex items-center justify-center gap-4 py-2 flex-1 w-full bg-black/35 border-2 border-black/40 p-3">
                  {/* Team 1 */}
                  <div className="flex items-center gap-3 flex-1 justify-end text-right min-w-0">
                    <span className="font-black text-xs text-white leading-tight truncate" title={match.team1?.name}>
                      {match.team1?.short_name || match.team1?.name}
                    </span>
                    <img
                      src={match.team1?.logo_url || 'https://placehold.co/100x100/1e293b/ffffff?text=T1'}
                      alt={match.team1?.name}
                      className="w-9 h-9 rounded-none object-cover border-2 border-black bg-slate-900 shadow-[2px_2px_0_#000] shrink-0"
                    />
                  </div>

                  <span className="font-black text-[10px] text-yellow-400 bg-black px-2.5 py-1 border-2 border-yellow-400 shrink-0">VS</span>

                  {/* Team 2 */}
                  <div className="flex items-center gap-3 flex-1 justify-start text-left min-w-0">
                    <img
                      src={match.team2?.logo_url || 'https://placehold.co/100x100/1e293b/ffffff?text=T2'}
                      alt={match.team2?.name}
                      className="w-9 h-9 rounded-none object-cover border-2 border-black bg-slate-900 shadow-[2px_2px_0_#000] shrink-0"
                    />
                    <span className="font-black text-xs text-white leading-tight truncate" title={match.team2?.name}>
                      {match.team2?.short_name || match.team2?.name}
                    </span>
                  </div>
                </div>

                {/* Venue and Date metadata */}
                <div className="flex flex-row sm:flex-col items-center sm:items-start justify-between sm:justify-center gap-2 text-[11px] text-slate-300 font-black font-mono sm:border-l-2 sm:border-black sm:pl-4 w-full sm:w-auto sm:min-w-[150px]">
                  <span className="flex items-center gap-1 shrink-0">📅 {new Date(match.match_date).toLocaleDateString('en-US')}</span>
                  <span className="flex items-center gap-1 truncate max-w-[180px] text-yellow-400" title={match.venue}>📍 {match.venue}</span>
                </div>
              </div>

              {/* Right Column: Overs Limit & Actions */}
              <div className="flex items-center justify-between sm:justify-end gap-4 border-t-2 sm:border-t-0 border-black pt-3 sm:pt-0 sm:pl-4 sm:border-l-2 sm:border-black w-full sm:w-auto sm:min-w-[140px]">
                <span className="text-[10px] text-slate-400 font-bold uppercase font-mono">
                  {match.overs_limit} Overs
                </span>

                {match.status === 'completed' || match.status === 'abandoned' ? (
                  <span className="bg-slate-800 text-slate-500 font-black text-[9px] uppercase tracking-wider px-3.5 py-2 border-2 border-black cursor-not-allowed shrink-0 shadow-[2px_2px_0_#000]">
                    Scoring Closed
                  </span>
                ) : (
                  <Link
                    to={`/scorer/match/${match.id}`}
                    className="bg-emerald-500 hover:bg-emerald-600 text-black font-black text-[10px] uppercase tracking-wider px-4 py-2.5 transition-all flex items-center gap-1.5 shrink-0 neo-brutalist-btn shadow-[3px_3px_0_#000]"
                  >
                    <Play className="w-3.5 h-3.5 fill-current stroke-[3]" /> Score
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="neo-brutalist-card-black p-16 text-center text-slate-400 shadow-[8px_8px_0_#ef4444]">
          <Calendar className="w-12 h-12 mx-auto text-yellow-400 mb-4 stroke-[2.5]" />
          <p className="text-base font-black text-white uppercase">No matches assigned to your profile.</p>
          <p className="text-xs text-slate-400 mt-2 font-mono">
            Matches must be scheduled and assigned to your username in the Admin dashboard scheduler tab.
          </p>
        </div>
      )}
    </div>
  )
}
