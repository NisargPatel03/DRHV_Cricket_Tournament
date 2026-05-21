import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/Spinner'
import { BarChart3, User, Award, Shield } from 'lucide-react'

export default function Players() {
  const [activeTab, setActiveTab] = useState('batting')

  // 1. Fetch Batting Stats (from view_batting_stats)
  const { data: battingStats, isLoading: loadingBatting } = useQuery({
    queryKey: ['batting_leaderboard_stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('view_batting_stats')
        .select('*')
        .order('runs', { ascending: false })
      if (error) throw error
      return data || []
    }
  })

  // 2. Fetch Bowling Stats (from view_bowling_stats)
  const { data: bowlingStats, isLoading: loadingBowling } = useQuery({
    queryKey: ['bowling_leaderboard_stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('view_bowling_stats')
        .select('*')
        .order('wickets', { ascending: false })
      if (error) throw error
      return data || []
    }
  })

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-center text-emerald-450">
          <BarChart3 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">Player Statistics</h1>
          <p className="text-slate-400 text-xs font-semibold">Analyze individual tournament performance leaderboards</p>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="border-b border-white/5 flex gap-6 pb-0.5">
        <button
          onClick={() => setActiveTab('batting')}
          className={`py-3 text-xs font-black tracking-widest uppercase border-b-2 px-1 relative transition-colors ${
            activeTab === 'batting'
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-slate-450 hover:text-white'
          }`}
        >
          🏏 Batting Stats
        </button>
        <button
          onClick={() => setActiveTab('bowling')}
          className={`py-3 text-xs font-black tracking-widest uppercase border-b-2 px-1 relative transition-colors ${
            activeTab === 'bowling'
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-slate-450 hover:text-white'
          }`}
        >
          🥎 Bowling Stats
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'batting' ? (
        <div>
          {loadingBatting ? (
            <Spinner message="Compiling batting leaderboards..." />
          ) : battingStats && battingStats.length > 0 ? (
            <div className="bento-card overflow-hidden p-0! border border-white/5!">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs md:text-sm">
                  <thead>
                    <tr className="bg-slate-950/40 text-slate-400 font-extrabold uppercase tracking-widest text-[9px] border-b border-white/5">
                      <th className="py-3.5 px-4 text-center w-14">Rank</th>
                      <th className="py-3.5 px-2">Player</th>
                      <th className="py-3.5 px-2">Team</th>
                      <th className="py-3.5 px-2 text-center">Mat</th>
                      <th className="py-3.5 px-3 text-center font-black text-slate-200">Runs</th>
                      <th className="py-3.5 px-2 text-center">HS</th>
                      <th className="py-3.5 px-2 text-center">Avg</th>
                      <th className="py-3.5 px-2 text-center">SR</th>
                      <th className="py-3.5 px-2 text-center">50s</th>
                      <th className="py-3.5 px-2 text-center">100s</th>
                      <th className="py-3.5 px-2 text-center">4s</th>
                      <th className="py-3.5 px-4 text-center">6s</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {battingStats.map((player, index) => (
                      <tr
                        key={player.player_id}
                        className={`hover:bg-white/[0.01] transition-colors ${
                          index === 0 ? 'bg-amber-500/[0.02]' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 text-center font-extrabold text-slate-400">
                          {index + 1}
                        </td>
                        <td className="py-3.5 px-2 font-extrabold text-slate-200 hover:text-emerald-400 transition-colors">
                          <Link to={`/player/${player.player_id}`} className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-500 shrink-0" />
                            <span>{player.player_name}</span>
                          </Link>
                        </td>
                        <td className="py-3.5 px-2 text-slate-400 font-semibold">
                          {player.team_name ? (
                            <Link to={`/team/${player.team_id}`} className="hover:underline">
                              {player.team_short}
                            </Link>
                          ) : (
                            <span className="text-slate-655">Free Agent</span>
                          )}
                        </td>
                        <td className="py-3.5 px-2 text-center text-slate-300 font-semibold">
                          {player.matches}
                        </td>
                        <td className="py-3.5 px-3 text-center font-black text-emerald-450 text-base">
                          {player.runs}
                        </td>
                        <td className="py-3.5 px-2 text-center text-slate-300 font-black">
                          {player.high_score}
                        </td>
                        <td className="py-3.5 px-2 text-center text-slate-300 font-semibold">
                          {player.batting_average}
                        </td>
                        <td className="py-3.5 px-2 text-center text-slate-300 font-semibold">
                          {player.strike_rate}
                        </td>
                        <td className="py-3.5 px-2 text-center text-amber-500 font-black">
                          {player.fifties}
                        </td>
                        <td className="py-3.5 px-2 text-center text-amber-500 font-black">
                          {player.hundreds}
                        </td>
                        <td className="py-3.5 px-2 text-center text-slate-450">
                          {player.fours}
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-450">
                          {player.sixes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bento-card p-12 text-center text-slate-450 border border-white/5!">
              <Award className="w-10 h-10 mx-auto text-slate-650 mb-2" />
              <p className="text-sm font-semibold">No batting stats logged yet.</p>
              <p className="text-xs text-slate-555 mt-1">
                Batting stats will aggregate here as soon as runs are scored.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div>
          {loadingBowling ? (
            <Spinner message="Compiling bowling leaderboards..." />
          ) : bowlingStats && bowlingStats.length > 0 ? (
            <div className="bento-card overflow-hidden p-0! border border-white/5!">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs md:text-sm">
                  <thead>
                    <tr className="bg-slate-950/40 text-slate-400 font-extrabold uppercase tracking-widest text-[9px] border-b border-white/5">
                      <th className="py-3.5 px-4 text-center w-14">Rank</th>
                      <th className="py-3.5 px-2">Player</th>
                      <th className="py-3.5 px-2">Team</th>
                      <th className="py-3.5 px-2 text-center">Mat</th>
                      <th className="py-3.5 px-3 text-center font-black text-slate-200">Wickets</th>
                      <th className="py-3.5 px-2 text-center">Overs</th>
                      <th className="py-3.5 px-2 text-center">Runs</th>
                      <th className="py-3.5 px-2 text-center">Avg</th>
                      <th className="py-3.5 px-2 text-center">Econ</th>
                      <th className="py-3.5 px-4 text-right w-24">Best</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {bowlingStats.map((player, index) => (
                      <tr
                        key={player.player_id}
                        className={`hover:bg-white/[0.01] transition-colors ${
                          index === 0 ? 'bg-purple-500/[0.02]' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 text-center font-extrabold text-slate-400">
                          {index + 1}
                        </td>
                        <td className="py-3.5 px-2 font-extrabold text-slate-200 hover:text-emerald-400 transition-colors">
                          <Link to={`/player/${player.player_id}`} className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-500 shrink-0" />
                            <span>{player.player_name}</span>
                          </Link>
                        </td>
                        <td className="py-3.5 px-2 text-slate-400 font-semibold">
                          {player.team_name ? (
                            <Link to={`/team/${player.team_id}`} className="hover:underline">
                              {player.team_short}
                            </Link>
                          ) : (
                            <span className="text-slate-655">Free Agent</span>
                          )}
                        </td>
                        <td className="py-3.5 px-2 text-center text-slate-300 font-semibold">
                          {player.matches}
                        </td>
                        <td className="py-3.5 px-3 text-center font-black text-purple-400 text-base">
                          {player.wickets}
                        </td>
                        <td className="py-3.5 px-2 text-center text-slate-300 font-semibold">
                          {player.overs}
                        </td>
                        <td className="py-3.5 px-2 text-center text-slate-300">
                          {player.runs_conceded}
                        </td>
                        <td className="py-3.5 px-2 text-center text-slate-300">
                          {player.bowling_average}
                        </td>
                        <td className="py-3.5 px-2 text-center text-slate-300 font-black">
                          {player.economy_rate}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-200 font-black">
                          {player.best_bowling}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bento-card p-12 text-center text-slate-450 border border-white/5!">
              <Award className="w-10 h-10 mx-auto text-slate-650 mb-2" />
              <p className="text-sm font-semibold">No bowling stats logged yet.</p>
              <p className="text-xs text-slate-555 mt-1">
                Bowling stats will populate dynamically once wickets are recorded by scorers.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
