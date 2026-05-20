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
        .order('match_date', { ascending: true })

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {matches.map((match) => (
            <div
              key={match.id}
              className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between gap-6 shadow-sm hover:shadow transition-shadow relative overflow-hidden"
            >
              {/* Top info */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-[9px] bg-slate-100 text-slate-500 font-extrabold px-2 py-0.5 rounded border border-slate-200 uppercase tracking-widest">
                    {match.stage}
                  </span>
                  <span className={`px-2 py-0.5 border rounded-full font-bold uppercase text-[9px] tracking-wider ${getStatusBadge(match.status)}`}>
                    {match.status}
                  </span>
                </div>

                {/* Teams block */}
                <div className="flex items-center justify-between gap-4">
                  {/* Team 1 */}
                  <div className="flex flex-col items-center gap-1.5 flex-1 text-center">
                    <img
                      src={match.team1?.logo_url || 'https://placehold.co/100x100/e2e8f0/64748b?text=T1'}
                      alt={match.team1?.name}
                      className="w-12 h-12 rounded-full object-cover border border-slate-200 bg-slate-50 shadow-inner"
                    />
                    <span className="font-extrabold text-xs text-slate-700 leading-tight">
                      {match.team1?.name}
                    </span>
                  </div>

                  <span className="font-bold text-xs text-slate-400">VS</span>

                  {/* Team 2 */}
                  <div className="flex flex-col items-center gap-1.5 flex-1 text-center">
                    <img
                      src={match.team2?.logo_url || 'https://placehold.co/100x100/e2e8f0/64748b?text=T2'}
                      alt={match.team2?.name}
                      className="w-12 h-12 rounded-full object-cover border border-slate-200 bg-slate-50 shadow-inner"
                    />
                    <span className="font-extrabold text-xs text-slate-700 leading-tight">
                      {match.team2?.name}
                    </span>
                  </div>
                </div>

                {/* Metadata */}
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>📅 {new Date(match.match_date).toLocaleDateString('en-US')}</span>
                  <span>📍 {match.venue}</span>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase">
                  Overs limit: {match.overs_limit}
                </span>

                <Link
                  to={`/scorer/match/${match.id}`}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] uppercase tracking-wider px-4.5 py-2.5 rounded-xl shadow-md shadow-emerald-600/10 flex items-center gap-1.5 transition-colors border border-emerald-600"
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> Start Scoring
                </Link>
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
