import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/Spinner'
import { Trophy, Users, Shield, Calendar, BarChart2, Star, Sparkles } from 'lucide-react'

export default function TeamProfile() {
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState('squad')

  // 1. Fetch Team Details
  const { data: team, isLoading: loadingTeam } = useQuery({
    queryKey: ['team_details', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    }
  })

  // 2. Fetch Team Standings Details (from view_points_table)
  const { data: standings } = useQuery({
    queryKey: ['team_standings_detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('view_points_table')
        .select('*')
        .eq('team_id', id)
      if (error) throw error
      return data?.[0] || null
    },
    enabled: !!team
  })

  // 3. Fetch Team Squad (from players)
  const { data: squad, isLoading: loadingSquad } = useQuery({
    queryKey: ['team_squad', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', id)
        .order('is_captain', { ascending: false })
        .order('is_vice_captain', { ascending: false })
        .order('name', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!team
  })

  // 4. Fetch Highest and Lowest Scores (from innings)
  const { data: scoreStats } = useQuery({
    queryKey: ['team_score_stats', id],
    queryFn: async () => {
      const { data: highData, error: highErr } = await supabase
        .from('innings')
        .select('runs')
        .eq('batting_team_id', id)
        .order('runs', { ascending: false })
        .limit(1)

      const { data: lowData, error: lowErr } = await supabase
        .from('innings')
        .select('runs')
        .eq('batting_team_id', id)
        .order('runs', { ascending: true })
        .limit(1)

      if (highErr || lowErr) throw highErr || lowErr

      return {
        highest: highData?.[0]?.runs || '-',
        lowest: lowData?.[0]?.runs || '-'
      }
    },
    enabled: !!team
  })

  // 5. Fetch Team Matches (History & Scheduled)
  const { data: matchHistory, isLoading: loadingMatches } = useQuery({
    queryKey: ['team_matches_history', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          team1:team1_id (name, short_name, logo_url),
          team2:team2_id (name, short_name, logo_url),
          innings (*)
        `)
        .or(`team1_id.eq.${id},team2_id.eq.${id}`)
        .order('match_date', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!team
  })

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loadingTeam) return <Spinner message="Loading team profile..." />
  if (!team) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
        <Shield className="w-10 h-10 mx-auto text-red-500 mb-2 animate-pulse" />
        <p className="font-bold">Team Not Found</p>
        <Link to="/teams" className="text-emerald-400 font-semibold mt-4 block hover:underline">
          &larr; Back to Teams Catalog
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* 1. HERO BANNER PROFILE */}
      <section className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl p-6 md:p-10 flex flex-col md:flex-row items-center gap-8">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/[0.03] to-transparent pointer-events-none"></div>

        {/* Logo Shield */}
        <div className="w-28 h-28 rounded-full border border-slate-800 p-1.5 bg-slate-950 flex items-center justify-center shrink-0 shadow-lg relative overflow-hidden">
          <img
            src={team.logo_url || 'https://placehold.co/150x150/1e293b/ffffff?text=' + encodeURIComponent(team.short_name)}
            alt={team.name}
            className="w-full h-full rounded-full object-cover bg-slate-950"
          />
        </div>

        {/* Details text */}
        <div className="text-center md:text-left space-y-2.5">
          <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/15 px-3 py-1 rounded-full inline-block">
            {team.short_name} Member Squad
          </span>
          <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
            {team.name}
          </h1>
          <p className="text-slate-400 text-xs md:text-sm max-w-xl leading-relaxed">
            Registered participant of the society league. View our squad details, match performance records, and high-low scoreboard limits.
          </p>
        </div>
      </section>

      {/* 2. STATS OVERVIEW CARDS */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Matches */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-4 shadow-md">
          <div className="w-10 h-10 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-center text-emerald-400 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Matches</span>
            <span className="text-lg font-extrabold text-white">{standings?.played || 0}</span>
          </div>
        </div>

        {/* Wins */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-4 shadow-md">
          <div className="w-10 h-10 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-center text-emerald-400 shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Won</span>
            <span className="text-lg font-extrabold text-white">{standings?.won || 0}</span>
          </div>
        </div>

        {/* Highest Score */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-4 shadow-md">
          <div className="w-10 h-10 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-center text-amber-500 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Highest Runs</span>
            <span className="text-lg font-extrabold text-white">{scoreStats?.highest}</span>
          </div>
        </div>

        {/* Lowest Score */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-4 shadow-md">
          <div className="w-10 h-10 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-center text-slate-500 shrink-0">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Lowest Runs</span>
            <span className="text-lg font-extrabold text-white">{scoreStats?.lowest}</span>
          </div>
        </div>
      </section>

      {/* 3. TABS TRIGGER */}
      <section className="space-y-6">
        <div className="border-b border-slate-800 flex gap-6">
          <button
            onClick={() => setActiveTab('squad')}
            className={`py-3 text-sm font-semibold tracking-wider uppercase border-b-2 px-1 relative transition-colors ${
              activeTab === 'squad'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            👥 Playing Squad
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={`py-3 text-sm font-semibold tracking-wider uppercase border-b-2 px-1 relative transition-colors ${
              activeTab === 'matches'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            🏏 Match Logs ({matchHistory?.length || 0})
          </button>
        </div>

        {/* Tab 1: Squad Listing */}
        {activeTab === 'squad' && (
          <div>
            {loadingSquad ? (
              <Spinner message="Loading squad roster..." />
            ) : squad && squad.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {squad.map((player) => (
                  <Link
                    key={player.id}
                    to={`/player/${player.id}`}
                    className="bg-slate-900 hover:bg-slate-900/90 border border-slate-800/80 rounded-xl p-5 flex items-center justify-between gap-4 transition-all duration-150 hover:-translate-y-0.5 group"
                  >
                    <div className="space-y-1">
                      <h3 className="font-bold text-sm text-slate-100 group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                        {player.name}
                        {player.is_captain && (
                          <span className="p-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] font-black uppercase tracking-wider rounded">
                            C
                          </span>
                        )}
                        {player.is_vice_captain && (
                          <span className="p-0.5 bg-slate-500/20 text-slate-400 border border-slate-700 text-[9px] font-black uppercase tracking-wider rounded">
                            VC
                          </span>
                        )}
                      </h3>
                      <span className="block text-[10px] text-slate-500 font-extrabold uppercase tracking-widest mt-0.5">
                        {player.role.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 font-black text-slate-400 text-sm">
                        {player.jersey_number || '-'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-500">
                <Users className="w-10 h-10 mx-auto text-slate-700 mb-2" />
                <p className="text-sm font-semibold">No players registered in this team yet.</p>
                <p className="text-xs text-slate-600 mt-1">
                  Team players must be assigned by the administrator panel.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Match History */}
        {activeTab === 'matches' && (
          <div>
            {loadingMatches ? (
              <Spinner message="Loading match records..." />
            ) : matchHistory && matchHistory.length > 0 ? (
              <div className="space-y-4">
                {matchHistory.map((match) => {
                  const innings1 = match.innings?.find((i) => i.innings_number === 1)
                  const innings2 = match.innings?.find((i) => i.innings_number === 2)
                  const isTeam1 = match.team1_id === id
                  const opponent = isTeam1 ? match.team2 : match.team1
                  const isWinner = match.winner_id === id
                  const isLoser = match.winner_id && match.winner_id !== id

                  return (
                    <Link
                      key={match.id}
                      to={`/match/${match.id}`}
                      className="bg-slate-900 hover:bg-slate-900/90 border border-slate-800/80 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all group"
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                          <span>{match.stage}</span>
                          <span>•</span>
                          <span>{formatDate(match.match_date)}</span>
                          <span>•</span>
                          <span>{match.venue}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <img
                            src={opponent?.logo_url || 'https://placehold.co/100x100/1e293b/ffffff?text=Opp'}
                            alt={opponent?.name}
                            className="w-7 h-7 rounded-full object-cover border border-slate-800 bg-slate-950"
                          />
                          <span className="font-extrabold text-sm text-slate-200 group-hover:text-white">
                            vs {opponent?.name}
                          </span>
                        </div>

                        {/* Innings score breakdown */}
                        <div className="flex gap-4 text-xs text-slate-400 font-medium">
                          {innings1 && (
                            <span>
                              {match.team1?.short_name}: {innings1.runs}/{innings1.wickets}
                            </span>
                          )}
                          {innings2 && (
                            <span>
                              {match.team2?.short_name}: {innings2.runs}/{innings2.wickets}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:flex-col sm:items-end justify-center shrink-0 border-t border-slate-800 sm:border-none pt-3 sm:pt-0">
                        {match.status === 'live' ? (
                          <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 font-extrabold text-[10px] tracking-wider rounded uppercase animate-pulse">
                            Live
                          </span>
                        ) : match.status === 'completed' ? (
                          <div className="sm:text-right space-y-1">
                            <span
                              className={`px-2 py-0.5 font-extrabold text-[10px] tracking-wider rounded uppercase ${
                                isWinner
                                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                  : isLoser
                                  ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {isWinner ? 'Won' : isLoser ? 'Lost' : 'Tie'}
                            </span>
                            {match.result_margin && (
                              <p className="text-[10px] text-slate-500 font-semibold">
                                {match.result_margin}
                              </p>
                            )}
                          </div>
                        ) : match.status === 'abandoned' ? (
                          <span className="px-2 py-0.5 bg-slate-800 text-slate-400 font-extrabold text-[10px] tracking-wider rounded uppercase">
                            Abandoned
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 text-slate-400 font-extrabold text-[10px] tracking-wider rounded uppercase">
                            Upcoming
                          </span>
                        )}

                        <span className="text-emerald-400 font-bold text-xs mt-2 group-hover:underline">
                          View details &rarr;
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-500">
                <Calendar className="w-10 h-10 mx-auto text-slate-700 mb-2" />
                <p className="text-sm font-semibold">No matches recorded for this team.</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
