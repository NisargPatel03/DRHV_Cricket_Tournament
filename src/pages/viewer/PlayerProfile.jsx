import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/Spinner'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { User, Shield, BarChart3, Trophy, Medal, Sparkles, TrendingUp, Cpu } from 'lucide-react'
const parseInlineMarkdown = (text) => {
  if (!text) return "";
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-extrabold text-white">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index} className="italic text-slate-100">{part.slice(1, -1)}</em>;
    }
    return part;
  });
};

export default function PlayerProfile() {
  const { id } = useParams()
  
  // AI Insight States
  const [playerInsights, setPlayerInsights] = useState('')
  const [loadingInsights, setLoadingInsights] = useState(false)

  // 1. Fetch Player and Team Details
  const { data: player, isLoading: loadingPlayer } = useQuery({
    queryKey: ['player_profile_details', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select(`
          *,
          team:team_id (*)
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    }
  })

  // 2. Fetch Batting Stats Summary (from view_batting_stats)
  const { data: battingStats } = useQuery({
    queryKey: ['player_batting_stats', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('view_batting_stats')
        .select('*')
        .eq('player_id', id)
      if (error) throw error
      return data?.[0] || null
    },
    enabled: !!player
  })

  // 3. Fetch Bowling Stats Summary (from view_bowling_stats)
  const { data: bowlingStats } = useQuery({
    queryKey: ['player_bowling_stats', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('view_bowling_stats')
        .select('*')
        .eq('player_id', id)
      if (error) throw error
      return data?.[0] || null
    },
    enabled: !!player
  })

  // 4. Fetch All Balls for Match-by-Match aggregates
  const { data: matchLog, isLoading: loadingLogs } = useQuery({
    queryKey: ['player_match_logs_aggregate', id],
    queryFn: async () => {
      // Fetch balls where this player is batsman
      const { data: battingBalls, error: batError } = await supabase
        .from('balls')
        .select(`
          runs_batsman,
          extra_type,
          is_wicket,
          wicket_player_id,
          wicket_type,
          innings:innings_id (
            id,
            match:match_id (
              id,
              match_date,
              team1:team1_id (name, short_name),
              team2:team2_id (name, short_name)
            )
          )
        `)
        .eq('batsman_id', id)

      // Fetch balls where this player is bowler
      const { data: bowlingBalls, error: bowlError } = await supabase
        .from('balls')
        .select(`
          runs_batsman,
          runs_extras,
          extra_type,
          is_wicket,
          wicket_type,
          innings:innings_id (
            id,
            match:match_id (
              id,
              match_date,
              team1:team1_id (name, short_name),
              team2:team2_id (name, short_name)
            )
          )
        `)
        .eq('bowler_id', id)

      if (batError || bowlError) throw batError || bowlError

      // Group Batting by Match
      const batMatches = {}
      battingBalls?.forEach((ball) => {
        const match = ball.innings?.match
        if (!match) return
        if (!batMatches[match.id]) {
          batMatches[match.id] = {
            matchId: match.id,
            date: match.match_date,
            opponent: match.team1.short_name === player?.team?.short_name ? match.team2.short_name : match.team1.short_name,
            runs: 0,
            ballsFaced: 0,
            fours: 0,
            sixes: 0,
            out: false
          }
        }
        batMatches[match.id].runs += ball.runs_batsman
        if (ball.extra_type !== 'wide') batMatches[match.id].ballsFaced += 1
        if (ball.runs_batsman === 4) batMatches[match.id].fours += 1
        if (ball.runs_batsman === 6) batMatches[match.id].sixes += 1
        if (ball.is_wicket && ball.wicket_player_id === id && ball.wicket_type !== 'retired_hurt') {
          batMatches[match.id].out = true
        }
      })

      // Group Bowling by Match
      const bowlMatches = {}
      bowlingBalls?.forEach((ball) => {
        const match = ball.innings?.match
        if (!match) return
        if (!bowlMatches[match.id]) {
          bowlMatches[match.id] = {
            matchId: match.id,
            date: match.match_date,
            opponent: match.team1.short_name === player?.team?.short_name ? match.team2.short_name : match.team1.short_name,
            ballsBowled: 0,
            runsConceded: 0,
            wickets: 0
          }
        }
        
        // Fair delivery calculation
        if (ball.extra_type !== 'wide' && ball.extra_type !== 'no_ball') {
          bowlMatches[match.id].ballsBowled += 1
        }
        
        // Bowler runs conceded (batsman runs + wide + noball)
        let runsConceded = ball.runs_batsman
        if (ball.extra_type === 'wide' || ball.extra_type === 'no_ball') {
          runsConceded += ball.runs_extras
        }
        bowlMatches[match.id].runsConceded += runsConceded

        // Bowler Wickets
        if (ball.is_wicket && ['bowled', 'caught', 'lbw', 'stumped', 'hit_wicket'].includes(ball.wicket_type)) {
          bowlMatches[match.id].wickets += 1
        }
      })

      // Convert to chronological array list
      const combined = {}
      const allMatchIds = new Set([...Object.keys(batMatches), ...Object.keys(bowlMatches)])
      allMatchIds.forEach((mId) => {
        const batInfo = batMatches[mId]
        const bowlInfo = bowlMatches[mId]
        const date = batInfo?.date || bowlInfo?.date
        const opponent = batInfo?.opponent || bowlInfo?.opponent

        combined[mId] = {
          matchId: mId,
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          rawDate: date,
          opponent,
          batRuns: batInfo?.runs ?? null,
          batBalls: batInfo?.ballsFaced ?? null,
          batOutStatus: batInfo ? (batInfo.out ? 'Out' : 'Not Out') : '',
          bowlOvers: bowlInfo ? `${Math.floor(bowlInfo.ballsBowled / 6)}.${bowlInfo.ballsBowled % 6}` : null,
          bowlRunsConceded: bowlInfo?.runsConceded ?? null,
          bowlWickets: bowlInfo?.wickets ?? null
        }
      })

      return Object.values(combined).sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate))
    },
    enabled: !!player
  })

  // Read cache on mount/change
  useEffect(() => {
    if (!id) return
    const cacheKey = `player_insights_${id}`
    const cached = localStorage.getItem(cacheKey)
    if (cached && !cached.startsWith("Error generating AI analysis") && !cached.startsWith("AI insights are currently unavailable")) {
      setPlayerInsights(cached)
    } else {
      setPlayerInsights('')
    }
  }, [id])

  const handleGenerateInsights = async () => {
    if (!player || !matchLog) return
    
    setLoadingInsights(true)
    try {
      const result = await generatePlayerInsights(player, battingStats, bowlingStats, matchLog)
      setPlayerInsights(result)
      if (result && !result.startsWith("Error generating AI analysis") && !result.startsWith("AI insights are currently unavailable")) {
        localStorage.setItem(`player_insights_${id}`, result)
      }
    } catch (err) {
      console.error("AI insights error:", err)
      setPlayerInsights("Error generating AI analysis. Please check your network connection and API quotas.")
    } finally {
      setLoadingInsights(false)
    }
  }

  if (loadingPlayer) return <Spinner message="Loading player dashboard..." />
  if (!player) {
    return (
      <div className="bento-card border border-white/5! p-12 text-center text-slate-450">
        <User className="w-10 h-10 mx-auto text-red-500 mb-2 animate-pulse" />
        <p className="font-extrabold text-white">Player Record Not Found</p>
        <Link to="/players" className="text-emerald-450 font-black mt-4 block hover:underline">
          &larr; Back to Standings leaderboards
        </Link>
      </div>
    )
  }

  // Prepping Recharts details
  const chartData = matchLog
    ? matchLog
        .filter((log) => log.batRuns !== null)
        .map((log) => ({
          match: `${log.date} vs ${log.opponent}`,
          runs: log.batRuns
        }))
    : []

  return (
    <div className="space-y-8">
      {/* 1. PROFILE HEADER CARD */}
      <section className="bento-card relative overflow-hidden border border-white/5! p-6 md:p-10 flex flex-col md:flex-row items-center gap-8">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/[0.02] to-transparent pointer-events-none"></div>

        {/* Big jersey avatar */}
        <div className="w-24 h-24 rounded-2xl bg-slate-950/45 border border-white/5 flex flex-col items-center justify-center shrink-0 shadow-lg relative overflow-hidden text-center group">
          <span className="block text-[10px] text-slate-500 font-extrabold uppercase tracking-widest mt-1">Jersey</span>
          <span className="block text-3xl font-black text-emerald-400 leading-none my-1">
            {player.jersey_number || '#'}
          </span>
          {player.is_captain && (
            <span className="absolute bottom-0 inset-x-0 bg-amber-500 text-slate-950 font-black text-[9px] py-0.5 tracking-wider uppercase">
              Captain
            </span>
          )}
          {player.is_vice_captain && !player.is_captain && (
            <span className="absolute bottom-0 inset-x-0 bg-slate-805 text-slate-400 font-black text-[9px] py-0.5 tracking-wider uppercase">
              Vice Capt
            </span>
          )}
        </div>

        {/* Bio */}
        <div className="text-center md:text-left space-y-2">
          <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight leading-tight">
            {player.name}
          </h1>
          
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
            {player.team ? (
              <Link
                to={`/team/${player.team_id}`}
                className="inline-flex items-center gap-1.5 text-xs text-emerald-445 font-black hover:underline"
              >
                <Shield className="w-4 h-4 shrink-0" />
                <span>
                  {player.team.name} ({player.team.short_name})
                </span>
              </Link>
            ) : (
              <span className="text-slate-550 text-xs font-black">Unassigned Free Agent</span>
            )}
            <span className="text-slate-700 text-sm hidden sm:inline">•</span>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">
              {player.role.replace('_', ' ')}
            </span>
          </div>
        </div>
      </section>

      {/* 2. STATS SUMMARIES GRID */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Batting Card */}
        <div className="bento-card border border-white/5! p-6 space-y-4">
          <h2 className="text-sm font-black text-white uppercase tracking-widest border-b border-white/5 pb-2 flex items-center gap-2">
            🏏 Batting Stats
          </h2>
          {battingStats ? (
            <div className="grid grid-cols-3 gap-y-4 gap-x-2 text-center">
              <div>
                <span className="block text-[10px] text-slate-500 font-black uppercase tracking-widest">Matches</span>
                <span className="text-base font-black text-white">{battingStats.matches}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 font-black uppercase tracking-widest">Total Runs</span>
                <span className="text-base font-black text-white">{battingStats.runs}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 font-black uppercase tracking-widest">High Score</span>
                <span className="text-base font-black text-amber-450">{battingStats.high_score}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 font-black uppercase tracking-widest">Average</span>
                <span className="text-base font-black text-white">{battingStats.batting_average}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 font-black uppercase tracking-widest">Strike Rate</span>
                <span className="text-base font-black text-white">{battingStats.strike_rate}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 font-black uppercase tracking-widest">50s / 100s</span>
                <span className="text-base font-black text-amber-500">
                  {battingStats.fifties} / {battingStats.hundreds}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-550 py-4 text-center">No batting statistics logged</p>
          )}
        </div>

        {/* Bowling Card */}
        <div className="bento-card border border-white/5! p-6 space-y-4">
          <h2 className="text-sm font-black text-white uppercase tracking-widest border-b border-white/5 pb-2 flex items-center gap-2">
            🥎 Bowling Stats
          </h2>
          {bowlingStats ? (
            <div className="grid grid-cols-3 gap-y-4 gap-x-2 text-center">
              <div>
                <span className="block text-[10px] text-slate-500 font-black uppercase tracking-widest">Matches</span>
                <span className="text-base font-black text-white">{bowlingStats.matches}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 font-black uppercase tracking-widest">Wickets</span>
                <span className="text-base font-black text-purple-400">{bowlingStats.wickets}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 font-black uppercase tracking-widest">Overs</span>
                <span className="text-base font-black text-white">{bowlingStats.overs}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 font-black uppercase tracking-widest">Conceded</span>
                <span className="text-base font-black text-white">{bowlingStats.runs_conceded}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 font-black uppercase tracking-widest">Economy</span>
                <span className="text-base font-black text-white">{bowlingStats.economy_rate}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 font-black uppercase tracking-widest">Best Bowl</span>
                <span className="text-base font-black text-purple-400">{bowlingStats.best_bowling}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-550 py-4 text-center">No bowling statistics logged</p>
          )}
        </div>
      </section>

      {/* AI Coach Analysis & Scouting Insights */}
      <section className="bento-card relative overflow-hidden border border-white/5! p-6 md:p-8 space-y-6">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl animate-pulse"></div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-4 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Cpu className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <span className="text-[10px] text-emerald-450 font-black uppercase tracking-widest font-mono block">
                Google Gemini AI Coach
              </span>
              <h2 className="text-sm font-extrabold text-white uppercase tracking-wider mt-0.5">
                AI Scouting & Tactical Insights
              </h2>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-950/80 border border-white/5 rounded-lg text-[9px] font-black font-mono uppercase text-slate-400">
            <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" /> Advanced Player Assessment
          </span>
        </div>

        {loadingInsights ? (
          <div className="py-8 text-center space-y-3">
            <Spinner message="AI Coach is studying batsman strike rates, bowling economies, and match history logs..." />
            <p className="text-[9px] text-slate-555 uppercase tracking-widest animate-pulse max-w-md mx-auto font-semibold">
              Drafting professional coaching recommendations and strengths analysis...
            </p>
          </div>
        ) : playerInsights ? (
          <div className="space-y-4">
            <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-6 md:p-8 shadow-inner relative space-y-4">
              <span className="absolute top-4 right-6 text-7xl font-serif text-white/5 select-none pointer-events-none">”</span>
              <div className="space-y-3">
                {playerInsights.split('\n').map((para, idx) => {
                  const trimmed = para.trim()
                  if (!trimmed) return null
                  
                  // Custom light Markdown render rules
                  if (trimmed.startsWith('# ') || trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
                    return (
                      <h3 key={idx} className="text-xs md:text-sm font-black text-emerald-400 mt-5 mb-2.5 tracking-wider uppercase font-mono">
                        {trimmed.replace(/^[#]+\s+/, '')}
                      </h3>
                    )
                  }
                  if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
                    return (
                      <li key={idx} className="text-xs md:text-sm text-slate-200 font-semibold list-disc list-inside ml-2 py-1 leading-relaxed">
                        {parseInlineMarkdown(trimmed.replace(/^[\*\-]\s+/, ''))}
                      </li>
                    )
                  }
                  return (
                    <p key={idx} className="text-xs md:text-sm text-slate-300 font-medium leading-relaxed my-2">
                      {parseInlineMarkdown(trimmed)}
                    </p>
                  )
                })}
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleGenerateInsights}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase rounded-lg tracking-wider transition-all active:scale-95 cursor-pointer border border-white/5"
              >
                <Sparkles className="w-3 h-3 text-emerald-400" /> Regenerate Scouting Report
              </button>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center space-y-5 border border-dashed border-white/5 rounded-2xl bg-slate-950/20">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center text-emerald-450 mx-auto animate-pulse">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1 px-4">
              <h3 className="text-xs font-black text-white uppercase tracking-wider">AI Tactical Scouting Ready</h3>
              <p className="text-[10px] text-slate-500 max-w-sm mx-auto leading-relaxed font-semibold">
                Let Google Gemini AI analyze strike rates, bowling economies, and match metrics to compile professional coaching plans.
              </p>
            </div>
            <button
              onClick={handleGenerateInsights}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all text-slate-950 text-xs font-black uppercase rounded-xl tracking-wider cursor-pointer shadow-lg shadow-emerald-500/15"
            >
              <Cpu className="w-3.5 h-3.5" /> Analyze Player Performance
            </button>
          </div>
        )}
      </section>

      {/* 3. RECHARTS RUN PROGRESSION LINE GRAPH */}
      {chartData.length > 1 && (
        <section className="bento-card border border-white/5! p-6 space-y-4">
          <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-445" /> Runs Progression Chart
          </h2>
          
          <div className="w-full h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                <defs>
                  <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#10b981" floodOpacity="0.6" />
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="match" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '16px', backdropFilter: 'blur(8px)' }}
                  labelStyle={{ fontWeight: 'black', color: '#fff', fontSize: '12px' }}
                  itemStyle={{ color: '#10b981', fontSize: '12px' }}
                />
                <Line
                  type="monotone"
                  dataKey="runs"
                  stroke="#10b981"
                  strokeWidth={3}
                  filter="url(#neon-glow)"
                  activeDot={{ r: 6 }}
                  dot={{ stroke: '#10b981', strokeWidth: 2, r: 4, fill: '#0a0f1d' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* 4. MATCH-BY-MATCH DETAILED LOG */}
      <section className="space-y-4">
        <h2 className="text-base font-black text-white uppercase tracking-widest flex items-center gap-1.5">
          <BarChart3 className="w-4 h-4 text-emerald-445" /> Match logs
        </h2>

        {loadingLogs ? (
          <Spinner message="Summing playing log totals..." />
        ) : matchLog && matchLog.length > 0 ? (
          <div className="bento-card overflow-hidden p-0! border border-white/5!">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                <thead>
                  <tr className="bg-slate-950/40 text-slate-400 font-extrabold uppercase tracking-widest text-[9px] border-b border-white/5">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-2">Opponent</th>
                    <th className="py-3 px-2 text-center border-l border-white/5">Bat Runs</th>
                    <th className="py-3 px-2 text-center">Balls</th>
                    <th className="py-3 px-2 text-center">Dismissal</th>
                    <th className="py-3 px-2 text-center border-l border-white/5">Overs</th>
                    <th className="py-3 px-2 text-center">Runs Conc</th>
                    <th className="py-3 px-4 text-center">Wickets</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {matchLog.map((log) => (
                    <tr key={log.matchId} className="hover:bg-white/[0.01] transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-400">{log.date}</td>
                      <td className="py-3 px-2 font-black text-slate-200 uppercase">vs {log.opponent}</td>
                      
                      {/* Batting log */}
                      <td className="py-3 px-2 text-center font-extrabold text-emerald-450 border-l border-white/5">
                        {log.batRuns !== null ? log.batRuns : '-'}
                      </td>
                      <td className="py-3 px-2 text-center text-slate-350 font-bold">
                        {log.batBalls !== null ? log.batBalls : '-'}
                      </td>
                      <td className="py-3 px-2 text-center text-slate-450 font-semibold text-xs">
                        {log.batOutStatus || '-'}
                      </td>
 
                      {/* Bowling log */}
                      <td className="py-3 px-2 text-center font-bold text-slate-300 border-l border-white/5">
                        {log.bowlOvers !== null ? log.bowlOvers : '-'}
                      </td>
                      <td className="py-3 px-2 text-center text-slate-350">
                        {log.bowlRunsConceded !== null ? log.bowlRunsConceded : '-'}
                      </td>
                      <td className="py-3 px-4 text-center font-black text-purple-400">
                        {log.bowlWickets !== null ? log.bowlWickets : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bento-card border border-white/5! p-8 text-center text-slate-450">
            <BarChart3 className="w-8 h-8 mx-auto text-slate-655 mb-2" />
            <p className="text-xs font-semibold">No tournament match logs available for this player.</p>
          </div>
        )}
      </section>
    </div>
  )
}
