import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/Spinner'
import { Trophy, HelpCircle, CheckCircle2, RefreshCw, Sparkles, TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function PointsTable() {
  const [isSimulatorMode, setIsSimulatorMode] = useState(false)
  const [simulatedResults, setSimulatedResults] = useState({}) // { [matchId]: winnerId }

  // 1. Fetch real-time standings
  const { data: standings, isLoading: isLoadingStandings } = useQuery({
    queryKey: ['points_table_standings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('view_points_table')
        .select('*')
      if (error) throw error
      return data || []
    }
  })

  // 2. Fetch upcoming fixtures for the simulator
  const { data: fixtures, isLoading: isLoadingFixtures } = useQuery({
    queryKey: ['points_table_fixtures'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id,
          team1_id,
          team2_id,
          match_date,
          match_time,
          venue,
          team1:team1_id (id, name, short_name, logo_url),
          team2:team2_id (id, name, short_name, logo_url)
        `)
        .eq('status', 'upcoming')
        .order('match_date', { ascending: true })
      if (error) throw error
      return data || []
    }
  })

  // 3. Compute original rank index map for comparison
  const originalRanks = {}
  if (standings) {
    standings.forEach((team, index) => {
      originalRanks[team.team_id] = index + 1
    })
  }

  // 4. Compute Simulated Standings
  const getSimulatedStandings = () => {
    if (!standings) return []
    
    // Deep clone standings and cast metrics to numbers
    const nextStandings = standings.map((team) => ({
      ...team,
      played: Number(team.played),
      won: Number(team.won),
      lost: Number(team.lost),
      no_result: Number(team.no_result),
      points: Number(team.points)
    }))

    // Apply each simulated match result prediction
    Object.entries(simulatedResults).forEach(([matchId, winnerId]) => {
      const match = fixtures?.find((m) => m.id === matchId)
      if (!match) return

      const t1Id = match.team1_id
      const t2Id = match.team2_id

      const team1 = nextStandings.find((t) => t.team_id === t1Id)
      const team2 = nextStandings.find((t) => t.team_id === t2Id)

      if (!team1 || !team2) return

      team1.played += 1
      team2.played += 1

      if (winnerId === t1Id) {
        team1.won += 1
        team1.points += 2
        team2.lost += 1
      } else if (winnerId === t2Id) {
        team2.won += 1
        team2.points += 2
        team1.lost += 1
      } else if (winnerId === 'tie') {
        team1.no_result += 1
        team1.points += 1
        team2.no_result += 1
        team2.points += 1
      }
    })

    // Sort: points (desc), net_run_rate (desc)
    return [...nextStandings].sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points
      }
      return b.net_run_rate - a.net_run_rate
    })
  }

  const simulatedStandings = getSimulatedStandings()
  const activeStandings = isSimulatorMode ? simulatedStandings : (standings || [])

  const handlePredictWinner = (matchId, winnerId) => {
    setSimulatedResults((prev) => {
      if (prev[matchId] === winnerId) {
        const copy = { ...prev }
        delete copy[matchId]
        return copy
      }
      return {
        ...prev,
        [matchId]: winnerId
      }
    })
  }

  const handleResetSimulation = () => {
    setSimulatedResults({})
  }

  const isLoading = isLoadingStandings || isLoadingFixtures

  return (
    <div className="space-y-8">
      {/* Title Header Row */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase leading-none mb-1">Points Table</h1>
            <p className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">Real-time team standings and qualification rankings</p>
          </div>
        </div>

        {/* Dynamic Simulator Toggle Control */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[10px] text-slate-400 uppercase font-black font-mono tracking-wider">
            Simulator mode
          </span>
          <button
            onClick={() => setIsSimulatorMode(!isSimulatorMode)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isSimulatorMode ? 'bg-cyan-500' : 'bg-slate-800'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isSimulatorMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Simulator Warning/Info Banner */}
      {isSimulatorMode && (
        <div className="bg-cyan-500/10 border-2 border-cyan-500 p-4 rounded-xl flex items-center justify-between animate-fadeIn text-xs">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-spin-slow shrink-0" />
            <div>
              <span className="text-cyan-400 font-black uppercase font-mono block">Simulation Mode Active</span>
              <p className="text-slate-300">
                You are viewing simulated standings based on predicted matches. Standings change dynamically as you mark winner predictions below.
              </p>
            </div>
          </div>
          <button
            onClick={handleResetSimulation}
            className="px-3 py-1.5 bg-cyan-950 border border-cyan-500 text-cyan-400 font-mono font-black uppercase text-[10px] rounded hover:bg-cyan-900 transition-colors shrink-0"
          >
            Reset Predictions
          </button>
        </div>
      )}

      {isLoading ? (
        <Spinner message="Computing team standings & fixtures..." />
      ) : activeStandings.length > 0 ? (
        <div className="space-y-6">
          {/* Main Standings Table */}
          <div className="bento-card overflow-hidden border border-white/5!">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                <thead>
                  <tr className="bg-slate-950/40 text-slate-400 font-extrabold uppercase tracking-widest text-[10px] border-b border-white/5">
                    <th className="py-4 px-4 text-center w-20">Rank</th>
                    <th className="py-4 px-2">Team</th>
                    <th className="py-4 px-3 text-center">Played</th>
                    <th className="py-4 px-3 text-center">Won</th>
                    <th className="py-4 px-3 text-center">Lost</th>
                    <th className="py-4 px-3 text-center">N/R</th>
                    <th className="py-4 px-3 text-center font-black text-white">Points</th>
                    <th className="py-4 px-5 text-right w-28">NRR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {activeStandings.map((team, index) => {
                    const currentRank = index + 1
                    const originalRank = originalRanks[team.team_id] || currentRank
                    const rankDiff = originalRank - currentRank // positive = up, negative = down

                    const isTop4 = index < 4
                    const totalTeams = activeStandings.length
                    const isEliminated = totalTeams > 4 && index >= totalTeams - 2

                    return (
                      <tr
                        key={team.team_id}
                        className={`transition-colors hover:bg-white/[0.02] ${
                          isTop4
                            ? 'bg-emerald-500/[0.01] border-l-2 border-l-emerald-500'
                            : isEliminated
                            ? 'bg-slate-900/10 text-slate-500 border-l-2 border-l-slate-700'
                            : 'border-l-2 border-l-transparent'
                        }`}
                      >
                        {/* Rank + Difference Indicators */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-extrabold ${
                                index === 0
                                  ? 'bg-amber-500/10 text-amber-400 text-xs border border-amber-500/20'
                                  : isTop4
                                  ? 'bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20'
                                  : 'text-slate-400 bg-slate-900/60 border border-white/5'
                              }`}
                            >
                              {currentRank}
                            </span>
                            
                            {/* Simulator Trend Indicators */}
                            {isSimulatorMode && (
                              <span className="flex items-center shrink-0 w-8">
                                {rankDiff > 0 ? (
                                  <span className="text-[10px] text-emerald-400 font-bold flex items-center font-mono">
                                    <TrendingUp className="w-3 h-3 mr-0.5 shrink-0" /> {rankDiff}
                                  </span>
                                ) : rankDiff < 0 ? (
                                  <span className="text-[10px] text-red-400 font-bold flex items-center font-mono">
                                    <TrendingDown className="w-3 h-3 mr-0.5 shrink-0" /> {Math.abs(rankDiff)}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-550 font-bold flex items-center font-mono justify-center w-full">
                                    <Minus className="w-3 h-3" />
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Team Logo & Name */}
                        <td className="py-4 px-2 font-bold text-slate-200">
                          <Link
                            to={`/team/${team.team_id}`}
                            className="hover:text-emerald-400 flex items-center gap-3 transition-colors group"
                          >
                            <img
                              src={team.logo_url || 'https://placehold.co/100x100/1e293b/ffffff?text=' + encodeURIComponent(team.short_name || 'T')}
                              alt={team.name}
                              className="w-7 h-7 rounded-full object-cover border border-white/10 bg-slate-950 shrink-0"
                            />
                            <div className="leading-tight">
                              <span className="block text-slate-100 group-hover:text-white font-extrabold tracking-wide text-xs">
                                {team.name}
                              </span>
                            </div>
                          </Link>
                        </td>

                        {/* Matches Played */}
                        <td className="py-4 px-3 text-center text-slate-355 font-medium font-mono">
                          {team.played}
                        </td>

                        {/* Won */}
                        <td className="py-4 px-3 text-center text-emerald-400 font-bold font-mono">
                          {team.won}
                        </td>

                        {/* Lost */}
                        <td className="py-4 px-3 text-center text-red-400 font-medium font-mono">
                          {team.lost}
                        </td>

                        {/* No Result */}
                        <td className="py-4 px-3 text-center text-slate-400 font-medium font-mono">
                          {team.no_result}
                        </td>

                        {/* Points */}
                        <td className="py-4 px-3 text-center font-black text-white text-base font-mono">
                          {team.points}
                        </td>

                        {/* Net Run Rate */}
                        <td
                          className={`py-4 px-5 text-right font-black font-mono ${
                            team.net_run_rate >= 0 ? 'text-emerald-400' : 'text-slate-400'
                          }`}
                        >
                          {team.net_run_rate >= 0 ? `+${team.net_run_rate.toFixed(3)}` : team.net_run_rate.toFixed(3)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive Simulation Fixture Selector Panel */}
          {isSimulatorMode && (
            <div className="glass-panel p-6 rounded-2xl space-y-4 animate-scaleUp">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <h3 className="font-extrabold text-white uppercase tracking-widest text-[11px] font-mono">
                    🤖 Upcoming Match Predictor
                  </h3>
                  <p className="text-[9px] text-slate-400 mt-0.5">
                    Select predicted winners to see how they climb the table
                  </p>
                </div>
                <button
                  onClick={handleResetSimulation}
                  className="text-[9.5px] text-cyan-400 hover:text-cyan-300 font-black font-mono uppercase flex items-center gap-1 shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Clear All
                </button>
              </div>

              {fixtures && fixtures.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fixtures.map((fixture) => {
                    const prediction = simulatedResults[fixture.id]
                    return (
                      <div
                        key={fixture.id}
                        className="bg-slate-950/40 border border-white/5 p-4 rounded-xl flex flex-col justify-between space-y-3"
                      >
                        {/* Fixture Venue & Info */}
                        <div className="flex justify-between items-center text-[9px] text-slate-400 font-mono uppercase border-b border-white/5 pb-1.5">
                          <span>{fixture.match_date} • {fixture.venue}</span>
                          {prediction && (
                            <span className="text-cyan-400 font-black tracking-wider animate-pulse flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> Predicted
                            </span>
                          )}
                        </div>

                        {/* Interactive Selector Buttons Row */}
                        <div className="grid grid-cols-3 gap-2">
                          {/* Team 1 Selector */}
                          <button
                            type="button"
                            onClick={() => handlePredictWinner(fixture.id, fixture.team1_id)}
                            className={`py-2 px-2.5 rounded-lg border-2 text-xs font-black transition-all flex flex-col items-center justify-center space-y-1.5 ${
                              prediction === fixture.team1_id
                                ? 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                                : 'bg-slate-900 border-black text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <img
                              src={fixture.team1?.logo_url || 'https://placehold.co/80x80/1e293b/ffffff?text=T1'}
                              alt={fixture.team1?.name}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                            <span className="truncate max-w-full uppercase font-mono tracking-wider text-[9px]">
                              {fixture.team1?.short_name}
                            </span>
                          </button>

                          {/* Draw / Tie Selector */}
                          <button
                            type="button"
                            onClick={() => handlePredictWinner(fixture.id, 'tie')}
                            className={`py-2 px-1 rounded-lg border-2 text-xs font-mono font-black tracking-wider uppercase transition-all flex flex-col items-center justify-center ${
                              prediction === 'tie'
                                ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                                : 'bg-slate-900 border-black text-slate-400 hover:bg-slate-800'
                            }`}
                          >
                            <span>NO RESULT</span>
                            <span className="text-[8px] text-slate-500 font-normal mt-0.5 font-sans lowercase">
                              (1 pt each)
                            </span>
                          </button>

                          {/* Team 2 Selector */}
                          <button
                            type="button"
                            onClick={() => handlePredictWinner(fixture.id, fixture.team2_id)}
                            className={`py-2 px-2.5 rounded-lg border-2 text-xs font-black transition-all flex flex-col items-center justify-center space-y-1.5 ${
                              prediction === fixture.team2_id
                                ? 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                                : 'bg-slate-900 border-black text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <img
                              src={fixture.team2?.logo_url || 'https://placehold.co/80x80/1e293b/ffffff?text=T2'}
                              alt={fixture.team2?.name}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                            <span className="truncate max-w-full uppercase font-mono tracking-wider text-[9px]">
                              {fixture.team2?.short_name}
                            </span>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="bg-slate-900/40 p-6 rounded-xl border border-white/5 text-center text-slate-400 text-xs">
                  No upcoming league scheduled matches left to simulate! Standing simulator will display when fixtures are created.
                </div>
              )}
            </div>
          )}

          {/* Guidelines / Help indicators (Bento Style) */}
          <div className="bento-card p-6 space-y-4 text-xs text-slate-400">
            <h3 className="font-extrabold text-white flex items-center gap-1.5 uppercase tracking-widest text-[11px] border-b border-white/5 pb-2.5">
              <HelpCircle className="w-4 h-4 text-emerald-400" /> Standings Rules & Guidelines
            </h3>
            <ul className="space-y-3 leading-relaxed">
              <li className="flex gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-300">Points allocation</strong>: Teams receive <strong className="text-emerald-400">2 points</strong> for a win, <strong className="text-amber-400">1 point</strong> for a tie/abandoned match, and <strong className="text-red-400">0 points</strong> for a loss.
                </span>
              </li>
              <li className="flex gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-300">Qualification criteria</strong>: The top <strong className="text-emerald-400">4 teams</strong> at the end of the league stage qualify for the tournament playoffs (Semifinals and Finals).
                </span>
              </li>
              <li className="flex gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-300">Tie Breakers</strong>: If teams are level on points, they are separated by their <strong className="text-white">Net Run Rate (NRR)</strong>. NRR is computed as `(Runs Scored / Overs Faced) - (Runs Conceded / Overs Bowled)`.
                </span>
              </li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="bento-card p-16 text-center text-slate-400">
          <Trophy className="w-10 h-10 mx-auto text-slate-500 mb-2" />
          <p className="text-sm font-semibold">No standings registered yet.</p>
          <p className="text-xs text-slate-600 mt-1">
            Standings records will populate dynamically as soon as scorers submit completed match scores.
          </p>
        </div>
      )}
    </div>
  )
}
