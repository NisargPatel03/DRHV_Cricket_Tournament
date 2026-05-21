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
    if (status === 'completed') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (status === 'live') return 'bg-red-50 text-red-700 border-red-200 animate-pulse'
    if (status === 'abandoned') return 'bg-slate-100 text-slate-600 border-slate-200'
    return 'bg-blue-50 text-blue-700 border-blue-200'
  }

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Assigned Matches</h1>
        <p className="text-slate-500 text-xs">Select a scheduled fixture below to configure lineups and score ball by ball</p>
      </div>

      {isLoading ? (
        <Spinner message="Fetching assigned schedules..." />
      ) : matches && matches.length > 0 ? (
        <div className="space-y-4">
          {matches.map((match) => (
            <div
              key={match.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:shadow transition-shadow relative overflow-hidden"
            >
              {/* Left Column: Stage, Date, Venue, Overs Limit */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
                {/* Status Badges & Stage details */}
                <div className="flex sm:flex-col items-center sm:items-start justify-between sm:justify-center gap-1.5 sm:min-w-[100px]">
                  <span className="text-[9px] bg-slate-100 text-slate-500 font-extrabold px-2 py-0.5 rounded border border-slate-200 uppercase tracking-widest shrink-0">
                    {match.stage}
                  </span>
                  <span className={`px-2 py-0.5 border rounded-full font-bold uppercase text-[9px] tracking-wider shrink-0 ${getStatusBadge(match.status)}`}>
                    {match.status}
                  </span>
                </div>

                {/* Matchup strip: Team 1 VS Team 2 */}
                <div className="flex items-center justify-center gap-3 py-1 flex-1 w-full">
                  {/* Team 1 */}
                  <div className="flex items-center gap-2 flex-1 justify-end text-right min-w-0">
                    <span className="font-extrabold text-xs text-slate-700 leading-tight truncate" title={match.team1?.name}>
                      {match.team1?.short_name || match.team1?.name}
                    </span>
                    <img
                      src={match.team1?.logo_url || 'https://placehold.co/100x100/e2e8f0/64748b?text=T1'}
                      alt={match.team1?.name}
                      className="w-8 h-8 rounded-full object-cover border border-slate-200 bg-slate-50 shadow-inner shrink-0"
                    />
                  </div>

                  <span className="font-black text-[10px] text-slate-400 bg-slate-50 px-2 py-1 border border-slate-100 rounded-lg shrink-0">VS</span>

                  {/* Team 2 */}
                  <div className="flex items-center gap-2 flex-1 justify-start text-left min-w-0">
                    <img
                      src={match.team2?.logo_url || 'https://placehold.co/100x100/e2e8f0/64748b?text=T2'}
                      alt={match.team2?.name}
                      className="w-8 h-8 rounded-full object-cover border border-slate-200 bg-slate-50 shadow-inner shrink-0"
                    />
                    <span className="font-extrabold text-xs text-slate-700 leading-tight truncate" title={match.team2?.name}>
                      {match.team2?.short_name || match.team2?.name}
                    </span>
                  </div>
                </div>

                {/* Venue and Date metadata */}
                <div className="flex flex-row sm:flex-col items-center sm:items-start justify-between sm:justify-center gap-2 text-[11px] text-slate-400 font-medium sm:border-l sm:border-slate-100 sm:pl-4 w-full sm:w-auto sm:min-w-[150px]">
                  <span className="flex items-center gap-1 shrink-0">📅 {new Date(match.match_date).toLocaleDateString('en-US')}</span>
                  <span className="flex items-center gap-1 truncate max-w-[180px]" title={match.venue}>📍 {match.venue}</span>
                </div>
              </div>

              {/* Right Column: Overs Limit & Actions */}
              <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0 sm:pl-4 sm:border-l sm:border-slate-100 w-full sm:w-auto sm:min-w-[140px]">
                <span className="text-[10px] text-slate-400 font-bold uppercase">
                  {match.overs_limit} Overs
                </span>

                {match.status === 'completed' || match.status === 'abandoned' ? (
                  <span className="bg-slate-100 text-slate-400 font-extrabold text-[9px] uppercase tracking-wider px-3.5 py-2 rounded-xl border border-slate-200 cursor-not-allowed shrink-0">
                    Scoring Closed
                  </span>
                ) : (
                  <Link
                    to={`/scorer/match/${match.id}`}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[9px] uppercase tracking-wider px-3.5 py-2 rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-1 border border-emerald-600 shrink-0"
                  >
                    <Play className="w-3 h-3 fill-current" /> Score
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-400 shadow-sm">
          <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-semibold">No matches assigned to your profile.</p>
          <p className="text-xs text-slate-500 mt-1">
            Matches must be scheduled and assigned to your username in the Admin dashboard scheduler tab.
          </p>
        </div>
      )}
    </div>
  )
}
