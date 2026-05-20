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
        className="bg-slate-900 hover:bg-slate-900/90 border border-slate-800/80 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200 group relative overflow-hidden"
      >
        {/* Match status left border highlights */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-1.5 ${
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
            <span className="text-[10px] bg-slate-950 border border-slate-800 text-slate-400 font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">
              {match.stage}
            </span>
            <span className="text-slate-500 text-xs">•</span>
            <span className="text-slate-400 text-xs font-medium">
              {formatDate(match.match_date)} at {formatTime(match.match_time)}
            </span>
            <span className="text-slate-500 text-xs">•</span>
            <span className="text-slate-400 text-xs font-semibold">{match.venue}</span>
          </div>

          {/* Teams and Score line */}
          <div className="space-y-2">
            {/* Team 1 */}
            <div className="flex items-center gap-3">
              <img
                src={match.team1?.logo_url || 'https://placehold.co/100x100/1e293b/ffffff?text=T1'}
                alt={match.team1?.name}
                className="w-6 h-6 rounded-full border border-slate-800 object-cover bg-slate-950"
              />
              <span className="font-semibold text-sm text-slate-200 group-hover:text-white transition-colors">
                {match.team1?.name}
              </span>
              {innings1 && (
                <span className="font-bold text-xs text-white ml-auto">
                  {innings1.runs}/{innings1.wickets}
                  <span className="text-[10px] text-slate-400 font-medium ml-1">
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
                className="w-6 h-6 rounded-full border border-slate-800 object-cover bg-slate-950"
              />
              <span className="font-semibold text-sm text-slate-200 group-hover:text-white transition-colors">
                {match.team2?.name}
              </span>
              {innings2 && (
                <span className="font-bold text-xs text-white ml-auto">
                  {innings2.runs}/{innings2.wickets}
                  <span className="text-[10px] text-slate-400 font-medium ml-1">
                    ({Math.floor(innings2.total_balls / 6)}.{innings2.total_balls % 6} ov)
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status indicator / result */}
        <div className="flex items-center justify-between md:flex-col md:items-end justify-center gap-2 shrink-0 pt-3 md:pt-0 border-t border-slate-800 md:border-none">
          {match.status === 'live' ? (
            <div className="px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 font-bold text-xs flex items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse-red"></span> Live
            </div>
          ) : match.status === 'completed' ? (
            <div className="text-right">
              <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 font-bold text-xs inline-block">
                Completed
              </div>
              {match.result_margin && (
                <p className="text-[10px] text-emerald-400 font-extrabold uppercase mt-1.5 tracking-wider">
                  {match.result_margin}
                </p>
              )}
            </div>
          ) : match.status === 'abandoned' ? (
            <div className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 font-bold text-xs">
              Abandoned
            </div>
          ) : (
            <div className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 font-bold text-xs uppercase tracking-wider">
              Upcoming
            </div>
          )}

          <span className="text-emerald-400 text-xs font-semibold group-hover:underline md:mt-auto">
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
        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-500">
          <Calendar className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight uppercase">Tournament Fixtures</h1>
          <p className="text-slate-400 text-xs">Follow scheduled league matches and knockout rounds</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
          <Filter className="w-4 h-4 text-emerald-500" /> Filter Fixtures
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Team Filter */}
          <div className="flex-1 sm:w-48">
            <select
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500/50"
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
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500/50"
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
              <h2 className="text-base font-extrabold text-amber-400 tracking-widest uppercase border-b border-amber-500/10 pb-2 flex items-center gap-2">
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
              <h2 className="text-base font-extrabold text-purple-400 tracking-widest uppercase border-b border-purple-500/10 pb-2 flex items-center gap-2">
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
              <h2 className="text-base font-extrabold text-emerald-400 tracking-widest uppercase border-b border-emerald-500/10 pb-2">
                🏏 League Stage
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {matchesByStage.league.map(renderMatchCard)}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-500">
          <Users className="w-10 h-10 mx-auto text-slate-700 mb-2" />
          <p className="text-sm font-semibold">No fixtures match your search criteria.</p>
          <p className="text-xs text-slate-600 mt-1">Try switching filters above to see other fixtures.</p>
        </div>
      )}
    </div>
  )
}
