import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/Spinner'
import { BarChart3, User, Award, Plus, X, Star, Sparkles, UserCheck } from 'lucide-react'
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip
} from 'recharts'

export default function Players() {
  const [activeTab, setActiveTab] = useState('batting') // 'batting', 'bowling', 'compare', 'dream11'
  
  // Selection states for player comparison
  const [playerAId, setPlayerAId] = useState('')
  const [playerBId, setPlayerBId] = useState('')

  // Dream XI selection states
  const [dreamXI, setDreamXI] = useState(() => {
    const saved = localStorage.getItem('drhv_dream_xi')
    return saved ? JSON.parse(saved) : {
      batsmen: [null, null, null, null],
      allrounders: [null, null],
      wicketkeeper: [null],
      bowlers: [null, null, null, null]
    }
  })

  // Save Dream XI to localStorage
  useEffect(() => {
    localStorage.setItem('drhv_dream_xi', JSON.stringify(dreamXI))
  }, [dreamXI])

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

  // 3. Fetch All Players for squad constructor & dropdowns
  const { data: allPlayers, isLoading: loadingAll } = useQuery({
    queryKey: ['stats_all_players_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select(`
          *,
          team:team_id (*)
        `)
        .order('name', { ascending: true })
      if (error) throw error
      return data || []
    }
  })

  if (loadingBatting || loadingBowling || loadingAll) {
    return <Spinner message="Assembling tournament statistics center..." />
  }

  // Identify Cap holders (Rank 1)
  const orangeCapHolder = battingStats?.[0]
  const purpleCapHolder = bowlingStats?.[0]

  // Setup comparison players
  const playerALookup = allPlayers?.find((p) => p.id === playerAId)
  const playerBLookup = allPlayers?.find((p) => p.id === playerBId)

  // Find their stats from database views
  const playerABatting = battingStats?.find((s) => s.player_id === playerAId)
  const playerBBatting = battingStats?.find((s) => s.player_id === playerBId)
  const playerABowling = bowlingStats?.find((s) => s.player_id === playerAId)
  const playerBBowling = bowlingStats?.find((s) => s.player_id === playerBId)

  // Format Radar Compare Data
  const getRadarData = () => {
    if (!playerALookup || !playerBLookup) return []

    // Compile dynamic normalized scores
    const runsA = playerABatting?.runs || 0
    const runsB = playerBBatting?.runs || 0
    const maxRuns = Math.max(runsA, runsB, 150)

    const srA = playerABatting?.strike_rate || 0
    const srB = playerBBatting?.strike_rate || 0
    const maxSR = Math.max(srA, srB, 150)

    const avgA = playerABatting?.batting_average || 0
    const avgB = playerBBatting?.batting_average || 0
    const maxAvg = Math.max(avgA, avgB, 40)

    const wicketsA = playerABowling?.wickets || 0
    const wicketsB = playerBBowling?.wickets || 0
    const maxWkts = Math.max(wicketsA, wicketsB, 10)

    // Economy is inverted (lower econ = better score points)
    const econA = playerABowling?.economy_rate || 8
    const econB = playerBBowling?.economy_rate || 8
    const scoreEconA = Math.max(12 - econA, 0)
    const scoreEconB = Math.max(12 - econB, 0)
    const maxEcon = Math.max(scoreEconA, scoreEconB, 4)

    return [
      { subject: 'Runs', A: Math.round((runsA / maxRuns) * 100), B: Math.round((runsB / maxRuns) * 100) },
      { subject: 'Strike Rate', A: Math.round((srA / maxSR) * 100), B: Math.round((srB / maxSR) * 100) },
      { subject: 'Average', A: Math.round((avgA / maxAvg) * 100), B: Math.round((avgB / maxAvg) * 100) },
      { subject: 'Wickets', A: Math.round((wicketsA / maxWkts) * 100), B: Math.round((wicketsB / maxWkts) * 100) },
      { subject: 'Economy', A: Math.round((scoreEconA / maxEcon) * 100), B: Math.round((scoreEconB / maxEcon) * 100) }
    ]
  }

  const radarData = getRadarData()

  // Handle Dream XI Assign
  const handleAssignDreamPlayer = (role, idx, playerId) => {
    if (!playerId) {
      setDreamXI((prev) => {
        const copy = { ...prev }
        copy[role][idx] = null
        return copy
      })
      return
    }

    const matched = allPlayers?.find((p) => p.id === playerId)
    if (!matched) return

    setDreamXI((prev) => {
      const copy = { ...prev }
      copy[role][idx] = matched
      return copy
    })
  }

  // Check if player is already selected in Dream XI
  const isPlayerInDreamXI = (playerId) => {
    return Object.values(dreamXI).some((arr) => arr.some((p) => p?.id === playerId))
  }

  return (
    <div className="space-y-8">
      {/* 1. HEADER TITLE BAR */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/5 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-center text-emerald-450">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase">Tournament Stats Hub</h1>
            <p className="text-slate-400 text-xs font-semibold">Examine premium roster stats, caps leaderboards, and fantasy lineups</p>
          </div>
        </div>
      </div>

      {/* 2. ORANGE & PURPLE CAP HERO HIGHLIGHTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Orange Cap Card */}
        {orangeCapHolder ? (
          <div className="bento-card relative border-orange-500/20! bg-gradient-to-br from-slate-950 via-[#1c1208] to-[#040814] overflow-hidden flex items-center gap-5 p-5 shadow-lg">
            {/* Ambient cap backing glow */}
            <div className="absolute w-24 h-24 rounded-full bg-orange-500/10 filter blur-xl -top-6 -right-6"></div>
            {/* Glowing Orange Badge */}
            <div className="w-14 h-14 rounded-full bg-orange-500 border border-orange-400 flex flex-col items-center justify-center shrink-0 shadow-lg shadow-orange-500/20 animate-pulse">
              <span className="text-[10px] font-black text-slate-950 tracking-wide uppercase leading-none">ORANGE</span>
              <span className="text-[9px] font-black text-slate-900 leading-none mt-0.5">CAP</span>
            </div>
            <div className="flex-1 space-y-1">
              <span className="text-[9px] text-orange-400 font-black uppercase tracking-wider block">Leading Run Scorer</span>
              <h3 className="text-lg font-black text-white leading-tight">
                <Link to={`/player/${orangeCapHolder.player_id}`} className="hover:underline">
                  {orangeCapHolder.player_name}
                </Link>
              </h3>
              <p className="text-slate-400 text-xs font-bold">{orangeCapHolder.team_name} ({orangeCapHolder.team_short})</p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-3xl font-black text-orange-400">{orangeCapHolder.runs}</div>
              <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider">Runs Scored</span>
            </div>
          </div>
        ) : (
          <div className="bento-card p-5 text-center text-slate-400 border border-white/5!">Orange Cap details will stream here soon.</div>
        )}

        {/* Purple Cap Card */}
        {purpleCapHolder ? (
          <div className="bento-card relative border-purple-500/20! bg-gradient-to-br from-slate-950 via-[#180a22] to-[#040814] overflow-hidden flex items-center gap-5 p-5 shadow-lg">
            <div className="absolute w-24 h-24 rounded-full bg-purple-500/10 filter blur-xl -top-6 -right-6"></div>
            {/* Glowing Purple Badge */}
            <div className="w-14 h-14 rounded-full bg-purple-500 border border-purple-400 flex flex-col items-center justify-center shrink-0 shadow-lg shadow-purple-500/20 animate-pulse">
              <span className="text-[10px] font-black text-slate-950 tracking-wide uppercase leading-none">PURPLE</span>
              <span className="text-[9px] font-black text-slate-900 leading-none mt-0.5">CAP</span>
            </div>
            <div className="flex-1 space-y-1">
              <span className="text-[9px] text-purple-400 font-black uppercase tracking-wider block">Leading Wicket Taker</span>
              <h3 className="text-lg font-black text-white leading-tight">
                <Link to={`/player/${purpleCapHolder.player_id}`} className="hover:underline">
                  {purpleCapHolder.player_name}
                </Link>
              </h3>
              <p className="text-slate-400 text-xs font-bold">{purpleCapHolder.team_name} ({purpleCapHolder.team_short})</p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-3xl font-black text-purple-400">{purpleCapHolder.wickets}</div>
              <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider">Wickets Taken</span>
            </div>
          </div>
        ) : (
          <div className="bento-card p-5 text-center text-slate-400 border border-white/5!">Purple Cap details will stream here soon.</div>
        )}
      </div>

      {/* 3. TABS SELECTOR */}
      <div className="border-b border-white/5 flex gap-4 md:gap-6 overflow-x-auto whitespace-nowrap scrollbar-none pb-0.5">
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
        <button
          onClick={() => setActiveTab('compare')}
          className={`py-3 text-xs font-black tracking-widest uppercase border-b-2 px-1 relative transition-colors ${
            activeTab === 'compare'
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-slate-450 hover:text-white'
          }`}
        >
          📊 Head-to-Head Compare
        </button>
        <button
          onClick={() => setActiveTab('dream11')}
          className={`py-3 text-xs font-black tracking-widest uppercase border-b-2 px-1 relative transition-colors ${
            activeTab === 'dream11'
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-slate-450 hover:text-white'
          }`}
        >
          ⭐ Fantasy Dream XI
        </button>
      </div>

      {/* 4. TAB CONTENTS */}
      {/* Batting Tab */}
      {activeTab === 'batting' && (
        <div className="animate-scaleUp">
          {battingStats && battingStats.length > 0 ? (
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
                          index === 0 ? 'bg-orange-500/[0.02]' : ''
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
                            <span className="text-slate-600">Free Agent</span>
                          )}
                        </td>
                        <td className="py-3.5 px-2 text-center text-slate-355 font-semibold">
                          {player.matches}
                        </td>
                        <td className="py-3.5 px-3 text-center font-black text-orange-400 text-base">
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
                        <td className="py-3.5 px-2 text-center text-orange-450 font-black">
                          {player.fifties}
                        </td>
                        <td className="py-3.5 px-2 text-center text-orange-450 font-black">
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
            </div>
          )}
        </div>
      )}

      {/* Bowling Tab */}
      {activeTab === 'bowling' && (
        <div className="animate-scaleUp">
          {bowlingStats && bowlingStats.length > 0 ? (
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
                            <span className="text-slate-600">Free Agent</span>
                          )}
                        </td>
                        <td className="py-3.5 px-2 text-center text-slate-355 font-semibold">
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
                        <td className="py-3.5 px-4 text-right text-slate-250 font-black">
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
            </div>
          )}
        </div>
      )}

      {/* Compare Tab */}
      {activeTab === 'compare' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-scaleUp">
          {/* Controls Side */}
          <div className="bento-card p-5 space-y-6 border border-white/5!">
            <h3 className="text-xs font-black text-white uppercase tracking-widest border-b border-white/5 pb-2">
              Select Contestants
            </h3>

            {/* Select Player A */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Player A</label>
              <select
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
                value={playerAId}
                onChange={(e) => setPlayerAId(e.target.value)}
              >
                <option value="">-- Choose Player A --</option>
                {allPlayers?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.team?.short_name || 'Free Agent'})
                  </option>
                ))}
              </select>
            </div>

            {/* Select Player B */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Player B</label>
              <select
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
                value={playerBId}
                onChange={(e) => setPlayerBId(e.target.value)}
              >
                <option value="">-- Choose Player B --</option>
                {allPlayers?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.team?.short_name || 'Free Agent'})
                  </option>
                ))}
              </select>
            </div>

            {/* Visual Quick Bio Card */}
            {playerALookup && playerBLookup && (
              <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 space-y-3 text-xs">
                <div className="flex justify-between border-b border-white/5 pb-2 text-[10px] text-slate-400 font-black uppercase">
                  <span>Player Bio</span>
                  <span>Team</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-emerald-450 font-bold">{playerALookup.name}</span>
                  <span className="text-slate-300">{playerALookup.team?.short_name || 'FA'}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-yellow-500 font-bold">{playerBLookup.name}</span>
                  <span className="text-slate-300">{playerBLookup.team?.short_name || 'FA'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Results Side */}
          <div className="lg:col-span-2 space-y-6">
            {playerALookup && playerBLookup ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. STATS TABLE COMPARISON */}
                <div className="bento-card p-5 space-y-4 border border-white/5!">
                  <h3 className="text-xs font-black text-white uppercase tracking-widest border-b border-white/5 pb-2">
                    Diagnostic Telemetry
                  </h3>
                  
                  <div className="space-y-3 text-xs">
                    {/* Runs */}
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-emerald-400 font-black text-sm w-12 text-left">{playerABatting?.runs || 0}</span>
                      <span className="text-[10px] text-slate-500 font-black uppercase">Runs</span>
                      <span className="text-yellow-500 font-black text-sm w-12 text-right">{playerBBatting?.runs || 0}</span>
                    </div>

                    {/* Average */}
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-emerald-400 font-bold w-12 text-left">{playerABatting?.batting_average || '0.00'}</span>
                      <span className="text-[10px] text-slate-500 font-black uppercase">Batting Avg</span>
                      <span className="text-yellow-500 font-bold w-12 text-right">{playerBBatting?.batting_average || '0.00'}</span>
                    </div>

                    {/* Strike Rate */}
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-emerald-400 font-bold w-12 text-left">{playerABatting?.strike_rate || '0.00'}</span>
                      <span className="text-[10px] text-slate-500 font-black uppercase">Strike Rate</span>
                      <span className="text-yellow-500 font-bold w-12 text-right">{playerBBatting?.strike_rate || '0.00'}</span>
                    </div>

                    {/* Wickets */}
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-emerald-400 font-black text-sm w-12 text-left">{playerABowling?.wickets || 0}</span>
                      <span className="text-[10px] text-slate-500 font-black uppercase">Wickets</span>
                      <span className="text-yellow-500 font-black text-sm w-12 text-right">{playerBBowling?.wickets || 0}</span>
                    </div>

                    {/* Economy */}
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-emerald-400 font-bold w-12 text-left">{playerABowling?.economy_rate || '0.00'}</span>
                      <span className="text-[10px] text-slate-500 font-black uppercase">Economy</span>
                      <span className="text-yellow-500 font-bold w-12 text-right">{playerBBowling?.economy_rate || '0.00'}</span>
                    </div>

                    {/* boundaries */}
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-400 font-bold w-12 text-left">
                        {((playerABatting?.fours || 0) + (playerABatting?.sixes || 0))}
                      </span>
                      <span className="text-[10px] text-slate-500 font-black uppercase">Boundaries</span>
                      <span className="text-yellow-500 font-bold w-12 text-right">
                        {((playerBBatting?.fours || 0) + (playerBBatting?.sixes || 0))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. RECHARTS RADAR PLOT */}
                <div className="bento-card p-5 border border-white/5! flex flex-col justify-between">
                  <h3 className="text-xs font-black text-white uppercase tracking-widest border-b border-white/5 pb-2">
                    Comparative Radar
                  </h3>

                  <div className="w-full aspect-square max-w-[240px] mx-auto pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                        <PolarGrid stroke="#334155" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#475569' }} />
                        <Radar name={playerALookup.name} dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.25} />
                        <Radar name={playerBLookup.name} dataKey="B" stroke="#eab308" fill="#eab308" fillOpacity={0.25} />
                        <Tooltip contentStyle={{ backgroundColor: '#090d16', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bento-card p-16 text-center text-slate-450 border border-white/5!">
                <Sparkles className="w-10 h-10 mx-auto text-slate-650 mb-2 animate-bounce" />
                <p className="text-sm font-semibold">Ready to Diagnostic Compare</p>
                <p className="text-xs text-slate-550 mt-1">Select two players from the dropdown selectors to display dynamic comparison radar telemetry overlays.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dream XI Constructor */}
      {activeTab === 'dream11' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-scaleUp">
          {/* Lineup Builder Panels */}
          <div className="bento-card p-5 space-y-6 border border-white/5! lg:col-span-1">
            <div className="space-y-1">
              <h3 className="text-xs font-black text-white uppercase tracking-widest border-b border-white/5 pb-2">
                Dream XI Builder
              </h3>
              <p className="text-[9px] text-slate-500 font-semibold">Select 11 stars to construct your dream fantasy unit.</p>
            </div>

            {/* Selection forms */}
            <div className="space-y-4 text-xs">
              {/* Batsmen slots */}
              <div className="space-y-2">
                <span className="block text-[9px] text-orange-400 font-black uppercase tracking-wider">Batsmen (4 Required)</span>
                <div className="grid grid-cols-1 gap-2">
                  {dreamXI.batsmen.map((current, idx) => (
                    <select
                      key={`bat-${idx}`}
                      className="bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
                      value={current?.id || ''}
                      onChange={(e) => handleAssignDreamPlayer('batsmen', idx, e.target.value)}
                    >
                      <option value="">-- Choose Batsman {idx + 1} --</option>
                      {allPlayers?.map((p) => (
                        <option
                          key={p.id}
                          value={p.id}
                          disabled={isPlayerInDreamXI(p.id) && current?.id !== p.id}
                        >
                          {p.name} ({p.team?.short_name || 'FA'})
                        </option>
                      ))}
                    </select>
                  ))}
                </div>
              </div>

              {/* All-rounders */}
              <div className="space-y-2">
                <span className="block text-[9px] text-emerald-450 font-black uppercase tracking-wider">All-Rounders (2 Required)</span>
                <div className="grid grid-cols-1 gap-2">
                  {dreamXI.allrounders.map((current, idx) => (
                    <select
                      key={`ar-${idx}`}
                      className="bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
                      value={current?.id || ''}
                      onChange={(e) => handleAssignDreamPlayer('allrounders', idx, e.target.value)}
                    >
                      <option value="">-- Choose All-Rounder {idx + 1} --</option>
                      {allPlayers?.map((p) => (
                        <option
                          key={p.id}
                          value={p.id}
                          disabled={isPlayerInDreamXI(p.id) && current?.id !== p.id}
                        >
                          {p.name} ({p.team?.short_name || 'FA'})
                        </option>
                      ))}
                    </select>
                  ))}
                </div>
              </div>

              {/* Wicketkeeper */}
              <div className="space-y-2">
                <span className="block text-[9px] text-yellow-400 font-black uppercase tracking-wider">Wicket-Keeper (1 Required)</span>
                <select
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
                  value={dreamXI.wicketkeeper[0]?.id || ''}
                  onChange={(e) => handleAssignDreamPlayer('wicketkeeper', 0, e.target.value)}
                >
                  <option value="">-- Choose Wicketkeeper --</option>
                  {allPlayers?.map((p) => (
                    <option
                      key={p.id}
                      value={p.id}
                      disabled={isPlayerInDreamXI(p.id) && dreamXI.wicketkeeper[0]?.id !== p.id}
                    >
                      {p.name} ({p.team?.short_name || 'FA'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Bowlers */}
              <div className="space-y-2">
                <span className="block text-[9px] text-purple-400 font-black uppercase tracking-wider">Bowlers (4 Required)</span>
                <div className="grid grid-cols-1 gap-2">
                  {dreamXI.bowlers.map((current, idx) => (
                    <select
                      key={`bowl-${idx}`}
                      className="bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
                      value={current?.id || ''}
                      onChange={(e) => handleAssignDreamPlayer('bowlers', idx, e.target.value)}
                    >
                      <option value="">-- Choose Bowler {idx + 1} --</option>
                      {allPlayers?.map((p) => (
                        <option
                          key={p.id}
                          value={p.id}
                          disabled={isPlayerInDreamXI(p.id) && current?.id !== p.id}
                        >
                          {p.name} ({p.team?.short_name || 'FA'})
                        </option>
                      ))}
                    </select>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Visual Field Display Overlay */}
          <div className="bento-card p-5 border border-white/5! lg:col-span-2 relative overflow-hidden flex flex-col justify-between min-h-[500px]">
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-widest border-b border-white/5 pb-2">
                Dream XI Stadium Lineup
              </h3>
              <p className="text-[9px] text-slate-500 font-semibold mt-0.5">Visual representation of your saved playing eleven</p>
            </div>

            {/* Field Green Overlay Box */}
            <div className="flex-1 mt-4 relative bg-slate-950 border border-emerald-500/20 rounded-2xl overflow-hidden aspect-[4/5] max-w-[340px] mx-auto p-4 flex flex-col justify-between">
              {/* SVG Stadium Field Boundaries Lines overlay */}
              <div className="absolute inset-2 border border-dashed border-emerald-500/10 rounded-xl pointer-events-none"></div>
              <div className="absolute top-[25%] bottom-[25%] left-0 right-0 border-y border-dashed border-emerald-500/5 pointer-events-none"></div>

              {/* 1. BATSMEN ROW */}
              <div className="flex justify-around gap-2 z-10">
                {dreamXI.batsmen.map((p, idx) => (
                  <div key={`field-bat-${idx}`} className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full bg-orange-950/80 border border-orange-500/40 flex items-center justify-center font-black text-orange-400 text-xs shadow-md">
                      {p ? p.name.substring(0, 2).toUpperCase() : '?'}
                    </div>
                    <span className="text-[8px] font-black text-slate-300 truncate max-w-[65px] bg-slate-950 px-1 py-0.5 rounded border border-white/5">
                      {p ? p.name.split(' ')[0] : `Batsman ${idx + 1}`}
                    </span>
                  </div>
                ))}
              </div>

              {/* 2. WICKETKEEPER (Close to Center Crease) */}
              <div className="flex justify-center z-10">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-full bg-yellow-950/80 border border-yellow-500/40 flex items-center justify-center font-black text-yellow-400 text-xs shadow-md animate-pulse">
                    {dreamXI.wicketkeeper[0] ? dreamXI.wicketkeeper[0].name.substring(0, 2).toUpperCase() : '?'}
                  </div>
                  <span className="text-[8px] font-black text-slate-300 bg-slate-950 px-1 py-0.5 rounded border border-white/5">
                    {dreamXI.wicketkeeper[0] ? dreamXI.wicketkeeper[0].name.split(' ')[0] : 'Keeper'}
                  </span>
                </div>
              </div>

              {/* 3. ALL-ROUNDERS ROW */}
              <div className="flex justify-around gap-8 z-10">
                {dreamXI.allrounders.map((p, idx) => (
                  <div key={`field-ar-${idx}`} className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center font-black text-emerald-400 text-xs shadow-md">
                      {p ? p.name.substring(0, 2).toUpperCase() : '?'}
                    </div>
                    <span className="text-[8px] font-black text-slate-300 truncate max-w-[65px] bg-slate-950 px-1 py-0.5 rounded border border-white/5">
                      {p ? p.name.split(' ')[0] : `All-Rounder ${idx + 1}`}
                    </span>
                  </div>
                ))}
              </div>

              {/* 4. BOWLERS ROW */}
              <div className="flex justify-around gap-2 z-10">
                {dreamXI.bowlers.map((p, idx) => (
                  <div key={`field-bowl-${idx}`} className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full bg-purple-950/80 border border-purple-500/40 flex items-center justify-center font-black text-purple-400 text-xs shadow-md">
                      {p ? p.name.substring(0, 2).toUpperCase() : '?'}
                    </div>
                    <span className="text-[8px] font-black text-slate-300 truncate max-w-[65px] bg-slate-950 px-1 py-0.5 rounded border border-white/5">
                      {p ? p.name.split(' ')[0] : `Bowler ${idx + 1}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Clear Button */}
            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  setDreamXI({
                    batsmen: [null, null, null, null],
                    allrounders: [null, null],
                    wicketkeeper: [null],
                    bowlers: [null, null, null, null]
                  })
                }}
                className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-extrabold text-[10px] px-4 py-2 rounded-xl transition-all uppercase tracking-wider"
              >
                Clear Lineup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
