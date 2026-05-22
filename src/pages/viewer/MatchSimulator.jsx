import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/Spinner'
import { Sparkles, Trophy, RotateCcw, Play, Pause, ChevronRight, BarChart2 } from 'lucide-react'

export default function MatchSimulator() {
  const [teamAId, setTeamAId] = useState('')
  const [teamBId, setTeamBId] = useState('')

  // Simulation states
  const [isSimulating, setIsSimulating] = useState(false)
  const [simComplete, setSimComplete] = useState(false)
  const [simSpeed, setSimSpeed] = useState(80) // ms per ball
  const [currentBallIdx, setCurrentBallIdx] = useState(0)

  // Simulation logs
  const [simLog, setSimLog] = useState([]) // list of all balls simulated
  const [inn1FinalScore, setInn1FinalScore] = useState(null)
  const [inn2FinalScore, setInn2FinalScore] = useState(null)
  const [winnerTeam, setWinnerTeam] = useState(null)
  const [marginText, setMarginText] = useState('')

  // Interval ref
  const simIntervalRef = useRef(null)
  const tickerEndRef = useRef(null)

  // 1. Fetch Teams List
  const { data: teams, isLoading: loadingTeams } = useQuery({
    queryKey: ['simulator_approved_teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('status', 'approved')
        .order('name', { ascending: true })
      if (error) throw error
      return data || []
    }
  })

  // 2. Fetch Matches to construct dynamic Win/Loss forms
  const { data: matches } = useQuery({
    queryKey: ['simulator_past_matches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('status', 'completed')
      if (error) throw error
      return data || []
    }
  })

  // Auto-scroll simulation ticker
  useEffect(() => {
    if (tickerEndRef.current) {
      tickerEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [currentBallIdx, isSimulating])

  // Cleanup interval on unmount
  useEffect(() => {
    return () => clearInterval(simIntervalRef.current)
  }, [])

  if (loadingTeams) {
    return <Spinner message="Booting up Monte Carlo diagnostic systems..." />
  }

  // Find Selected Team data
  const teamALookup = teams?.find((t) => t.id === teamAId)
  const teamBLookup = teams?.find((t) => t.id === teamBId)

  // Dynamic head-to-head calculations from historical database matches
  const getTeamStats = (teamId) => {
    if (!matches || !teamId) return { wins: 0, losses: 0, matches: 0, avgRuns: 145 }
    const teamMatches = matches.filter((m) => m.team1_id === teamId || m.team2_id === teamId)
    const wins = teamMatches.filter((m) => m.winner_id === teamId).length
    const losses = teamMatches.length - wins
    return {
      wins,
      losses,
      matches: teamMatches.length,
      avgRuns: wins > losses ? 158 : 142
    }
  }

  const statsA = getTeamStats(teamAId)
  const statsB = getTeamStats(teamBId)

  // Weighted outcome selector helper
  const getSimulatedBallOutcome = () => {
    const r = Math.random() * 100
    // Realistic T20 cricket weights:
    // Dot: 42%, 1 run: 37%, 2 runs: 6%, 3 runs: 1%, 4 runs: 8%, 6 runs: 3%, Wicket: 3%
    if (r < 42) return { runs: 0, text: 'No run.', type: 'dot' }
    if (r < 79) return { runs: 1, text: '1 run, worked away into the gap.', type: 'single' }
    if (r < 85) return { runs: 2, text: '2 runs, excellent running coming back for the second.', type: 'double' }
    if (r < 86) return { runs: 3, text: '3 runs, crunched straight down the ground, saved near boundary.', type: 'triple' }
    if (r < 94) return { runs: 4, text: 'FOUR! Beautifully struck past extra cover for a cracking boundary.', type: 'four' }
    if (r < 97) return { runs: 6, text: 'SIX! High and handsome! Clears the boundary rope by a mile!', type: 'six' }
    return { runs: 0, text: 'OUT! Clean bowled! Middle stump out of the ground! Spectacular wicket!', type: 'wicket' }
  }

  // Pre-generate full match simulation arrays
  const runSimulationEngine = () => {
    if (!teamALookup || !teamBLookup) return

    clearInterval(simIntervalRef.current)
    setIsSimulating(true)
    setSimComplete(false)
    setCurrentBallIdx(0)
    
    // Simulate Innings 1 (Team A batting)
    const inn1Logs = []
    let runs1 = 0
    let wkts1 = 0
    let totalFairBalls1 = 0
    
    for (let over = 0; over < 20; over++) {
      if (wkts1 >= 10) break
      for (let ball = 1; ball <= 6; ball++) {
        if (wkts1 >= 10) break
        totalFairBalls1++
        const outcome = getSimulatedBallOutcome()
        
        if (outcome.type === 'wicket') wkts1++
        else runs1 += outcome.runs

        const overStr = `${over}.${ball}`
        let desc = `Over ${overStr}: ${teamALookup.short_name} batting - ${outcome.text}`
        
        inn1Logs.push({
          innings: 1,
          ballNum: totalFairBalls1,
          overStr,
          runs: runs1,
          wickets: wkts1,
          outcome,
          desc
        })
      }
    }

    // Simulate Innings 2 (Team B chasing)
    const inn2Logs = []
    let runs2 = 0
    let wkts2 = 0
    let totalFairBalls2 = 0
    const target = runs1 + 1
    let chased = false
    
    for (let over = 0; over < 20; over++) {
      if (wkts2 >= 10 || runs2 >= target) break
      for (let ball = 1; ball <= 6; ball++) {
        if (wkts2 >= 10 || runs2 >= target) break
        totalFairBalls2++
        const outcome = getSimulatedBallOutcome()
        
        if (outcome.type === 'wicket') wkts2++
        else runs2 += outcome.runs

        const overStr = `${over}.${ball}`
        let desc = `Over ${overStr}: ${teamBLookup.short_name} chasing - ${outcome.text}`
        
        inn2Logs.push({
          innings: 2,
          ballNum: totalFairBalls2,
          overStr,
          runs: runs2,
          wickets: wkts2,
          outcome,
          desc
        })
        
        if (runs2 >= target) {
          chased = true
          break
        }
      }
    }

    // Combine logs
    const fullLogs = [...inn1Logs, ...inn2Logs]
    setSimLog(fullLogs)

    // Save outputs
    setInn1FinalScore({ runs: runs1, wickets: wkts1, overs: `${Math.floor(totalFairBalls1 / 6)}.${totalFairBalls1 % 6}` })
    setInn2FinalScore({ runs: runs2, wickets: wkts2, overs: `${Math.floor(totalFairBalls2 / 6)}.${totalFairBalls2 % 6}` })

    if (runs2 >= target) {
      setWinnerTeam(teamBLookup)
      setMarginText(`${teamBLookup.name} won by ${10 - wkts2} wickets!`)
    } else if (runs2 === runs1) {
      setWinnerTeam(null)
      setMarginText(`Match Tied! Exceptional contest.`)
    } else {
      setWinnerTeam(teamALookup)
      setMarginText(`${teamALookup.name} won by ${runs1 - runs2} runs!`)
    }

    // Set animation interval ticker
    let idx = 0
    simIntervalRef.current = setInterval(() => {
      idx++
      if (idx >= fullLogs.length) {
        clearInterval(simIntervalRef.current)
        setIsSimulating(false)
        setSimComplete(true)
      }
      setCurrentBallIdx(idx)
    }, simSpeed)
  }

  // Control options
  const handlePauseResume = () => {
    if (isSimulating) {
      clearInterval(simIntervalRef.current)
      setIsSimulating(false)
    } else if (simLog.length > 0 && currentBallIdx < simLog.length) {
      setIsSimulating(true)
      simIntervalRef.current = setInterval(() => {
        setCurrentBallIdx((prev) => {
          const next = prev + 1
          if (next >= simLog.length) {
            clearInterval(simIntervalRef.current)
            setIsSimulating(false)
            setSimComplete(true)
          }
          return next
        })
      }, simSpeed)
    }
  }

  const handleReset = () => {
    clearInterval(simIntervalRef.current)
    setIsSimulating(false)
    setSimComplete(false)
    setSimLog([])
    setCurrentBallIdx(0)
    setInn1FinalScore(null)
    setInn2FinalScore(null)
    setWinnerTeam(null)
    setMarginText('')
  }

  // Slice rolling balls for ticker visualization
  const activeTickerBalls = simLog.slice(0, currentBallIdx)

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/5 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-center text-emerald-450">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase">Monte Carlo Simulator</h1>
            <p className="text-slate-400 text-xs font-semibold">Simulate matchups ball-by-ball using statistical probability algorithms</p>
          </div>
        </div>
      </div>

      {/* 1. SELECT CONTESTANTS SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Team A Picker */}
        <div className="bento-card p-5 border border-white/5! flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full border border-white/10 p-1 bg-slate-950 flex items-center justify-center overflow-hidden">
            <img
              src={teamALookup?.logo_url || 'https://placehold.co/100x100/1e293b/ffffff?text=A'}
              alt={teamALookup?.name || 'Team A'}
              className="w-full h-full rounded-full object-cover"
            />
          </div>
          <div className="w-full space-y-1.5">
            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">Select Team A (Batting 1st)</label>
            <select
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold text-center"
              value={teamAId}
              onChange={(e) => {
                setTeamAId(e.target.value)
                handleReset()
              }}
              disabled={isSimulating}
            >
              <option value="">-- Choose Team A --</option>
              {teams?.map((t) => (
                <option key={t.id} value={t.id} disabled={t.id === teamBId}>
                  {t.name} ({t.short_name})
                </option>
              ))}
            </select>
          </div>

          {teamALookup && (
            <div className="grid grid-cols-2 gap-4 pt-2 text-xs w-full border-t border-white/5">
              <div>
                <span className="block text-[8px] text-slate-500 font-extrabold uppercase">Win Ratio</span>
                <span className="font-extrabold text-white">
                  {statsA.matches > 0 ? `${Math.round((statsA.wins / statsA.matches) * 100)}%` : '50%'}
                </span>
              </div>
              <div>
                <span className="block text-[8px] text-slate-500 font-extrabold uppercase">Avg Score</span>
                <span className="font-extrabold text-white">{statsA.avgRuns} runs</span>
              </div>
            </div>
          )}
        </div>

        {/* VS / ACTION HUB */}
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-10 h-10 rounded-full bg-slate-950 border border-white/5 flex items-center justify-center font-black text-slate-500 text-xs shadow-inner">
            VS
          </div>

          {teamALookup && teamBLookup ? (
            <div className="space-y-3 w-full max-w-[200px]">
              {simLog.length === 0 ? (
                <button
                  onClick={runSimulationEngine}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs py-3 px-5 rounded-xl shadow-lg hover:shadow-emerald-500/10 transition-all uppercase tracking-wider flex items-center justify-center gap-1.5"
                >
                  <Play className="w-4 h-4" /> Simulate Match
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handlePauseResume}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs py-2.5 rounded-xl border border-slate-750 transition-all uppercase tracking-wider flex items-center justify-center gap-1"
                  >
                    {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {isSimulating ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    onClick={handleReset}
                    className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-extrabold text-xs p-2.5 rounded-xl transition-all"
                    title="Reset Simulator"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[10px] text-slate-550 font-bold uppercase tracking-wider max-w-[150px]">
              Select two approved tournament teams to engage the simulator
            </p>
          )}
        </div>

        {/* Team B Picker */}
        <div className="bento-card p-5 border border-white/5! flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full border border-white/10 p-1 bg-slate-950 flex items-center justify-center overflow-hidden">
            <img
              src={teamBLookup?.logo_url || 'https://placehold.co/100x100/1e293b/ffffff?text=B'}
              alt={teamBLookup?.name || 'Team B'}
              className="w-full h-full rounded-full object-cover"
            />
          </div>
          <div className="w-full space-y-1.5">
            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">Select Team B (Batting 2nd)</label>
            <select
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold text-center"
              value={teamBId}
              onChange={(e) => {
                setTeamBId(e.target.value)
                handleReset()
              }}
              disabled={isSimulating}
            >
              <option value="">-- Choose Team B --</option>
              {teams?.map((t) => (
                <option key={t.id} value={t.id} disabled={t.id === teamAId}>
                  {t.name} ({t.short_name})
                </option>
              ))}
            </select>
          </div>

          {teamBLookup && (
            <div className="grid grid-cols-2 gap-4 pt-2 text-xs w-full border-t border-white/5">
              <div>
                <span className="block text-[8px] text-slate-500 font-extrabold uppercase">Win Ratio</span>
                <span className="font-extrabold text-white">
                  {statsB.matches > 0 ? `${Math.round((statsB.wins / statsB.matches) * 100)}%` : '50%'}
                </span>
              </div>
              <div>
                <span className="block text-[8px] text-slate-500 font-extrabold uppercase">Avg Score</span>
                <span className="font-extrabold text-white">{statsB.avgRuns} runs</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. REALTIME SIMULATION DASHBOARD */}
      {simLog.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-scaleUp">
          {/* Left 2 columns: Live Simulated Scorecard & Ticker */}
          <div className="lg:col-span-2 space-y-6">
            {/* Live Score Overview */}
            <div className="bento-card p-6 border border-white/5! space-y-6">
              <div className="grid grid-cols-2 gap-8 divide-x divide-white/5">
                {/* Innings 1 scorecard display */}
                <div className="space-y-2">
                  <span className="text-[10px] text-emerald-450 font-black uppercase tracking-wider block">
                    {teamALookup?.name} (Innings 1)
                  </span>
                  
                  {activeTickerBalls.length > 0 ? (
                    <div>
                      {/* Calculate runs at current tick */}
                      {(() => {
                        const inn1Balls = activeTickerBalls.filter((b) => b.innings === 1)
                        const lastBall = inn1Balls[inn1Balls.length - 1]
                        const runsVal = lastBall ? lastBall.runs : 0
                        const wktsVal = lastBall ? lastBall.wickets : 0
                        const oversVal = lastBall ? lastBall.overStr : '0.0'
                        return (
                          <div className="space-y-1">
                            <div className="text-3xl font-black text-white">{runsVal}/{wktsVal}</div>
                            <span className="text-xs text-slate-400 font-semibold uppercase">Overs: {oversVal}</span>
                          </div>
                        )
                      })()}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 italic block">Simulating details...</span>
                  )}
                </div>

                {/* Innings 2 scorecard display */}
                <div className="space-y-2 pl-8">
                  <span className="text-[10px] text-yellow-500 font-black uppercase tracking-wider block">
                    {teamBLookup?.name} (Innings 2)
                  </span>
                  
                  {activeTickerBalls.filter((b) => b.innings === 2).length > 0 ? (
                    <div>
                      {/* Calculate runs at current tick */}
                      {(() => {
                        const inn2Balls = activeTickerBalls.filter((b) => b.innings === 2)
                        const lastBall = inn2Balls[inn2Balls.length - 1]
                        const runsVal = lastBall ? lastBall.runs : 0
                        const wktsVal = lastBall ? lastBall.wickets : 0
                        const oversVal = lastBall ? lastBall.overStr : '0.0'
                        return (
                          <div className="space-y-1">
                            <div className="text-3xl font-black text-white">{runsVal}/{wktsVal}</div>
                            <span className="text-xs text-slate-400 font-semibold uppercase">Overs: {oversVal}</span>
                          </div>
                        )
                      })()}
                    </div>
                  ) : activeTickerBalls.filter((b) => b.innings === 1).length >= 100 || simComplete ? (
                    <div className="space-y-1">
                      <span className="text-xs text-emerald-450 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-black tracking-wider uppercase">
                        Chasing Target: {inn1FinalScore?.runs + 1}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 italic block">Yet to bat</span>
                  )}
                </div>
              </div>

              {/* Progress Indicator Slider bar */}
              <div className="space-y-1.5 border-t border-white/5 pt-4">
                <div className="flex justify-between text-[9px] text-slate-500 font-black uppercase">
                  <span>Match Simulation Progress</span>
                  <span>{currentBallIdx} / {simLog.length} Balls</span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full border border-white/5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all"
                    style={{ width: `${(currentBallIdx / simLog.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Simulated Live commentary scrolling timeline ticker */}
            <div className="bento-card p-5 space-y-4 border border-white/5! flex flex-col justify-between h-[360px]">
              <h3 className="text-xs font-black text-white uppercase tracking-widest border-b border-white/5 pb-2">
                Simulated Live Ticker
              </h3>

              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin max-h-[265px]">
                {activeTickerBalls.map((b, idx) => {
                  let borderClass = 'border-l-slate-700'
                  let bgClass = 'bg-white/[0.01]'
                  if (b.outcome.type === 'four') {
                    borderClass = 'border-l-blue-500'
                    bgClass = 'bg-blue-500/5'
                  } else if (b.outcome.type === 'six') {
                    borderClass = 'border-l-purple-500'
                    bgClass = 'bg-purple-500/5'
                  } else if (b.outcome.type === 'wicket') {
                    borderClass = 'border-l-red-500'
                    bgClass = 'bg-red-500/5'
                  }

                  return (
                    <div
                      key={`ticker-${idx}`}
                      className={`text-xs p-2.5 rounded-xl border border-white/5 border-l-4 flex items-start gap-3 ${borderClass} ${bgClass}`}
                    >
                      <span className="px-1.5 py-0.5 bg-slate-950 border border-white/5 text-[9px] font-black rounded shrink-0 h-fit">
                        {b.overStr}
                      </span>
                      <p className="text-slate-200 font-semibold leading-relaxed">{b.desc}</p>
                    </div>
                  )
                })}
                <div ref={tickerEndRef}></div>
              </div>
            </div>
          </div>

          {/* Right column: Simulation margins & Outcome highlights */}
          <div className="space-y-6 lg:col-span-1">
            {simComplete ? (
              <div className="bento-card p-6 border-emerald-500/30! bg-gradient-to-br from-slate-950 via-[#0a1c12] to-[#040814] text-center space-y-5 shadow-xl animate-scaleUp">
                <Trophy className="w-12 h-12 mx-auto text-emerald-400 animate-bounce" />
                <div className="space-y-1">
                  <span className="text-[10px] text-emerald-450 font-black uppercase tracking-wider block">Match Concluded</span>
                  <h3 className="text-xl font-black text-white leading-tight">Simulation Finalized</h3>
                </div>
                <div className="bg-slate-950/80 p-4 border border-white/5 rounded-2xl space-y-2 text-xs text-slate-350">
                  <div className="flex justify-between font-bold">
                    <span>{teamALookup?.short_name} Score:</span>
                    <span className="text-white font-black">{inn1FinalScore?.runs}/{inn1FinalScore?.wickets} ({inn1FinalScore?.overs} ov)</span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-2 font-bold">
                    <span>{teamBLookup?.short_name} Score:</span>
                    <span className="text-white font-black">{inn2FinalScore?.runs}/{inn2FinalScore?.wickets} ({inn2FinalScore?.overs} ov)</span>
                  </div>
                </div>
                <p className="text-sm font-black text-emerald-400 uppercase tracking-wide bg-emerald-500/10 py-2.5 px-4 rounded-xl border border-emerald-500/15">
                  🏆 {marginText}
                </p>
              </div>
            ) : (
              <div className="bento-card p-6 text-center text-slate-450 border border-white/5! flex flex-col justify-center h-full min-h-[300px]">
                <BarChart2 className="w-10 h-10 mx-auto text-slate-650 mb-2" />
                <p className="text-xs font-semibold">Diagnostic Report Pending</p>
                <p className="text-[10px] text-slate-550 mt-1">Outcome metrics and scorecard details will generate here once the Monte Carlo simulator finishes execution.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
