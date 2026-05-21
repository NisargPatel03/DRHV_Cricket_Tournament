import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/Spinner'
import { Calendar, Filter, Users } from 'lucide-react'

export default function Fixtures() {
  const [selectedTeam, setSelectedTeam] = useState('all')
  const [selectedStage, setSelectedStage] = useState('all')

  // 1. Fetch All Approved Teams (for filtering dropdown)
  const { data: teams } = useQuery({
    queryKey: ['approved_teams_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, short_name')
        .eq('status', 'approved')
      if (error) throw error
      return data || []
    }
  })

  // 2. Fetch All Matches
  const { data: matches, isLoading } = useQuery({
    queryKey: ['all_matches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          team1:team1_id (id, name, short_name, logo_url),
          team2:team2_id (id, name, short_name, logo_url),
          innings (*)
        `)
        .order('match_date', { ascending: true })
        .order('match_time', { ascending: true })
      if (error) throw error
      return data || []
    }
  })

  // Filter Logic
  const filteredMatches = matches?.filter((match) => {
    const matchTeamFilter =
      selectedTeam === 'all' ||
      match.team1_id === selectedTeam ||
      match.team2_id === selectedTeam
    const matchStageFilter = selectedStage === 'all' || match.stage === selectedStage
    return matchTeamFilter && matchStageFilter
  })

  // Grouping by Stage for rendering
  const matchesByStage = {
    final: filteredMatches?.filter((m) => m.stage === 'final') || [],
    semifinal: filteredMatches?.filter((m) => m.stage === 'semifinal') || [],
    league: filteredMatches?.filter((m) => m.stage === 'league') || [],
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (timeStr) => {
    return timeStr.substring(0, 5) // Return HH:MM
  }

  const renderMatchCard = (match) => {
    const innings1 = match.innings?.find((i) => i.innings_number === 1)
    const innings2 = match.innings?.find((i) => i.innings_number === 2)

    return (
      <Link
        key={match.id}
        to={`/match/${match.id}`}
        className="bento-card bento-card-interactive p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white/5! group relative overflow-hidden pl-7!"
      >
        {/* Match status left border highlights */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl ${
            match.status === 'live'
              ? 'bg-red-500 animate-pulse'
              : match.status === 'completed'
              ? 'bg-emerald-500'
              : 'bg-slate-700'
          }`}
        ></div>

        <div className="flex-1 space-y-3">
          {/* Header Info */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] bg-slate-950/50 border border-white/5 text-slate-400 font-black uppercase tracking-widest px-2 py-0.5 rounded-lg">
              {match.stage}
            </span>
            <span className="text-slate-600 text-xs">•</span>
            <span className="text-slate-400 text-xs font-semibold">
              {formatDate(match.match_date)} at {formatTime(match.match_time)}
            </span>
            <span className="text-slate-600 text-xs">•</span>
            <span className="text-slate-400 text-xs font-extrabold">{match.venue}</span>
          </div>

          {/* Teams and Score line */}
          <div className="space-y-2.5">
            {/* Team 1 */}
            <div className="flex items-center gap-3">
              <img
                src={match.team1?.logo_url || 'https://placehold.co/100x100/1e293b/ffffff?text=T1'}
                alt={match.team1?.name}
                className="w-6 h-6 rounded-full border border-white/5 object-cover bg-slate-950"
              />
              <span className="font-extrabold text-sm text-slate-200 group-hover:text-white transition-colors">
                {match.team1?.name}
              </span>
              {innings1 && (
                <span className="font-black text-xs text-white ml-auto">
                  {innings1.runs}/{innings1.wickets}
                  <span className="text-[10px] text-slate-405 font-bold ml-1">
                    ({Math.floor(innings1.total_balls / 6)}.{innings1.total_balls % 6} ov)
                  </span>
                </span>
              )}
            </div>

            {/* Team 2 */}
            <div className="flex items-center gap-3">
              <img
                src={match.team2?.logo_url || 'https://placehold.co/100x100/1e293b/ffffff?text=T2'}
                alt={match.team2?.name}
                className="w-6 h-6 rounded-full border border-white/5 object-cover bg-slate-950"
              />
              <span className="font-extrabold text-sm text-slate-200 group-hover:text-white transition-colors">
                {match.team2?.name}
              </span>
              {innings2 && (
                <span className="font-black text-xs text-white ml-auto">
                  {innings2.runs}/{innings2.wickets}
                  <span className="text-[10px] text-slate-405 font-bold ml-1">
                    ({Math.floor(innings2.total_balls / 6)}.{innings2.total_balls % 6} ov)
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status indicator / result */}
        <div className="flex items-center justify-between md:flex-col md:items-end justify-center gap-2 shrink-0 pt-3 md:pt-0 border-t border-white/5 md:border-none">
          {match.status === 'live' ? (
            <div className="px-3 py-1 bg-red-650/15 border border-red-500/20 rounded-xl text-red-450 font-black text-[10px] tracking-wider flex items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse-red"></span> Live
            </div>
          ) : match.status === 'completed' ? (
            <div className="text-right">
              <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-455 font-black text-[10px] tracking-wider inline-block">
                Completed
              </div>
              {match.result_margin && (
                <p className="text-[10px] text-emerald-450 font-black uppercase mt-1.5 tracking-wider">
                  {match.result_margin}
                </p>
              )}
            </div>
          ) : match.status === 'abandoned' ? (
            <div className="px-3 py-1 bg-slate-900 border border-white/5 rounded-xl text-slate-400 font-black text-[10px] tracking-wider">
              Abandoned
            </div>
          ) : (
            <div className="px-3 py-1 bg-slate-950/40 border border-white/5 rounded-xl text-slate-450 font-black text-[10px] tracking-wider uppercase">
              Upcoming
            </div>
          )}

          <span className="text-emerald-450 text-xs font-black group-hover:underline md:mt-auto flex items-center gap-1 uppercase tracking-wider text-[10px]">
            {match.status === 'live' ? 'Scorecard' : 'Match Center'} &rarr;
          </span>
        </div>
      </Link>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-center text-emerald-450">
          <Calendar className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">Tournament Fixtures</h1>
          <p className="text-slate-400 text-xs font-semibold">Follow scheduled league matches and knockout rounds</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bento-card p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between border border-white/5!">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
          <Filter className="w-4 h-4 text-emerald-450" /> Filter Fixtures
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Team Filter */}
          <div className="flex-1 sm:w-48">
            <select
              className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-xs text-slate-105 font-bold focus:outline-none focus:border-emerald-500/30 hover:border-emerald-500/20 transition-colors"
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
            >
              <option value="all">All Teams</option>
              {teams?.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name} ({team.short_name})
                </option>
              ))}
            </select>
          </div>

          {/* Stage Filter */}
          <div className="flex-1 sm:w-40">
            <select
              className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 px-3 text-xs text-slate-105 font-bold focus:outline-none focus:border-emerald-500/30 hover:border-emerald-500/20 transition-colors"
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
            >
              <option value="all">All Stages</option>
              <option value="league">League Stage</option>
              <option value="semifinal">Semifinals</option>
              <option value="final">Grand Final</option>
            </select>
          </div>
        </div>
      </div>

      {/* Fixtures List */}
      {isLoading ? (
        <Spinner message="Loading match schedules..." />
      ) : filteredMatches && filteredMatches.length > 0 ? (
        <div className="space-y-8">
          {/* Grand Final Stage */}
          {matchesByStage.final.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-base font-black text-amber-450 tracking-widest uppercase border-b border-amber-500/20 pb-2 flex items-center gap-2">
                👑 Grand Final
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {matchesByStage.final.map(renderMatchCard)}
              </div>
            </div>
          )}

          {/* Semifinals Stage */}
          {matchesByStage.semifinal.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-base font-black text-purple-400 tracking-widest uppercase border-b border-purple-500/20 pb-2 flex items-center gap-2">
                🏆 Semifinals
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {matchesByStage.semifinal.map(renderMatchCard)}
              </div>
            </div>
          )}

          {/* League Stage */}
          {matchesByStage.league.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-base font-black text-emerald-450 tracking-widest uppercase border-b border-emerald-500/20 pb-2">
                🏏 League Stage
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {matchesByStage.league.map(renderMatchCard)}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bento-card p-12 text-center text-slate-450 border border-white/5!">
          <Users className="w-10 h-10 mx-auto text-slate-655 mb-2" />
          <p className="text-sm font-semibold">No fixtures match your search criteria.</p>
          <p className="text-xs text-slate-550 mt-1">Try switching filters above to see other fixtures.</p>
        </div>
      )}
    </div>
  )
}
