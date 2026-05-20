import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/Spinner'
import { Trophy, Calendar, Users, Eye, Play, ArrowLeft, Image, Shield, MessageCircle } from 'lucide-react'

export default function MatchDetail() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('live') // 'live', 'scorecard1', 'scorecard2', 'gallery'
  const [lightboxImg, setLightboxImg] = useState(null)

  // 1. Fetch Match Details
  const { data: match, isLoading: loadingMatch, refetch: refetchMatch } = useQuery({
    queryKey: ['match_details_view', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          team1:team1_id (*),
          team2:team2_id (*),
          man_of_the_match:man_of_the_match_id (*)
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    refetchInterval: (query) => {
      return query?.state?.data?.status === 'live' ? 5000 : false
    }
  })

  // 2. Fetch Innings Details
  const { data: innings, refetch: refetchInnings } = useQuery({
    queryKey: ['match_innings_view', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('innings')
        .select('*')
        .eq('match_id', id)
        .order('innings_number', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!match,
    refetchInterval: () => {
      return match?.status === 'live' ? 5000 : false
    }
  })

  // 3. Fetch Match Squad Players (Playing XI lookup)
  const { data: squads } = useQuery({
    queryKey: ['match_squads_players', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('match_squads')
        .select(`
          *,
          player:player_id (*)
        `)
        .eq('match_id', id)
      if (error) throw error
      return data || []
    },
    enabled: !!match
  })

  // 4. Fetch All Balls in this Match
  const { data: balls, refetch: refetchBalls } = useQuery({
    queryKey: ['match_balls_view', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('balls')
        .select(`
          *,
          batsman:batsman_id (name, jersey_number),
          bowler:bowler_id (name, jersey_number),
          fielder:fielder_id (name)
        `)
        .in('innings_id', innings?.map((i) => i.id) || [])
        .order('created_at', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!innings && innings.length > 0,
    refetchInterval: () => {
      return match?.status === 'live' ? 5000 : false
    }
  })

  // 5. Fetch Match Gallery Photos
  const { data: photos } = useQuery({
    queryKey: ['match_gallery_photos', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gallery')
        .select('*')
        .eq('match_id', id)
      if (error) throw error
      return data || []
    },
    enabled: !!match
  })

  // Realtime Postgres Change Listening on balls
  useEffect(() => {
    if (!id) return

    // Set up channel for ball-by-ball real-time scoring
    const channel = supabase
      .channel(`match-balls-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'balls'
        },
        (payload) => {
          // Invalidate and refetch all related match data instantly
          queryClient.invalidateQueries({ queryKey: ['match_details_view', id] })
          queryClient.invalidateQueries({ queryKey: ['match_innings_view', id] })
          queryClient.invalidateQueries({ queryKey: ['match_balls_view', id] })
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'innings'
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['match_innings_view', id] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id, queryClient])

  if (loadingMatch) return <Spinner message="Connecting to live scoreboard..." />
  if (!match) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
        <Shield className="w-10 h-10 mx-auto text-red-500 mb-2 animate-pulse" />
        <p className="font-bold">Match Scorecard Not Found</p>
        <Link to="/" className="text-emerald-400 font-semibold mt-4 block hover:underline">
          &larr; Back to Tournament Home
        </Link>
      </div>
    )
  }

  // Prepping Innings helper details
  const innings1 = innings?.find((i) => i.innings_number === 1)
  const innings2 = innings?.find((i) => i.innings_number === 2)
  const currentInnings = innings?.find((i) => i.innings_number === match.current_innings) || innings1

  const currentBalls = balls?.filter((b) => b.innings_id === currentInnings?.id) || []
  const inn1Balls = balls?.filter((b) => b.innings_id === innings1?.id) || []
  const inn2Balls = balls?.filter((b) => b.innings_id === innings2?.id) || []

  // Fair balls count
  const getFairBallsCount = (ballList) => {
    return ballList.filter((b) => b.extra_type !== 'wide' && b.extra_type !== 'no_ball').length
  }

  // Format overs string (e.g. 15.2 overs)
  const getOversString = (ballList) => {
    const fairBalls = getFairBallsCount(ballList)
    return `${Math.floor(fairBalls / 6)}.${fairBalls % 6}`
  }

  // Run rates calculations
  const calculateRunRate = (runs, ballList) => {
    const fairBalls = getFairBallsCount(ballList)
    if (fairBalls === 0) return '0.00'
    return ((runs * 6) / fairBalls).toFixed(2)
  }

  const currentCRR = currentInnings ? calculateRunRate(currentInnings.runs, currentBalls) : '0.00'

  // Required Run Rate (RRR)
  let requiredRRR = null
  if (match.status === 'live' && match.current_innings === 2 && innings1) {
    const target = innings1.runs + 1
    const runsNeeded = target - (innings2?.runs || 0)
    const oversLimit = match.overs_limit
    const totalMaxBalls = oversLimit * 6
    const fairBallsBowled = getFairBallsCount(inn2Balls)
    const ballsRemaining = totalMaxBalls - fairBallsBowled
    
    if (ballsRemaining > 0 && runsNeeded > 0) {
      requiredRRR = ((runsNeeded * 6) / ballsRemaining).toFixed(2)
    } else if (runsNeeded <= 0) {
      requiredRRR = '0.00'
    } else {
      requiredRRR = '∞'
    }
  }

  // Active batter stats computation
  const getBatsmanListStats = (ballList, battingTeamId) => {
    const batters = {}
    const playersInTeam = (squads || []).filter((s) => s.team_id === battingTeamId).map((s) => s.player)

    playersInTeam.forEach((p) => {
      batters[p.id] = {
        id: p.id,
        name: p.name,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        out: false,
        dismissalText: 'DNB'
      }
    })

    // Walk through balls to compute
    ballList.forEach((b) => {
      if (batters[b.batsman_id]) {
        batters[b.batsman_id].runs += b.runs_batsman
        if (b.extra_type !== 'wide') batters[b.batsman_id].balls += 1
        if (b.runs_batsman === 4) batters[b.batsman_id].fours += 1
        if (b.runs_batsman === 6) batters[b.batsman_id].sixes += 1
      }
      
      // Dismissal Text
      if (b.is_wicket && batters[b.wicket_player_id]) {
        batters[b.wicket_player_id].out = true
        let text = ''
        if (b.wicket_type === 'bowled') text = `b ${b.bowler?.name}`
        else if (b.wicket_type === 'lbw') text = `lbw b ${b.bowler?.name}`
        else if (b.wicket_type === 'caught') text = `c ${b.fielder?.name || 'fielder'} b ${b.bowler?.name}`
        else if (b.wicket_type === 'stumped') text = `st ${b.fielder?.name || 'fielder'} b ${b.bowler?.name}`
        else if (b.wicket_type === 'run_out') text = `run out (${b.fielder?.name || 'fielder'})`
        else if (b.wicket_type === 'retired_hurt') text = `retired hurt`
        else text = `out`
        
        batters[b.wicket_player_id].dismissalText = text
      }
    })

    // Separate active batsmen from out or did not bat
    const facedBallsSet = new Set(ballList.map((b) => b.batsman_id).concat(ballList.map((b) => b.non_striker_id)))
    
    return Object.values(batters).map((b) => {
      const faced = facedBallsSet.has(b.id)
      if (faced && !b.out) {
        b.dismissalText = 'batting'
      }
      return b
    })
  }

  // Active Bowlers list computation
  const getBowlerListStats = (ballList, bowlingTeamId) => {
    const bowlers = {}
    const playersInTeam = (squads || []).filter((s) => s.team_id === bowlingTeamId).map((s) => s.player)

    playersInTeam.forEach((p) => {
      bowlers[p.id] = {
        id: p.id,
        name: p.name,
        ballsBowled: 0,
        runsConceded: 0,
        wickets: 0,
        maidens: 0,
        overs: '0.0'
      }
    })

    // Group balls by over number per bowler
    const bowlerOvers = {}
    ballList.forEach((b) => {
      if (!bowlers[b.bowler_id]) return
      
      const bowler = bowlers[b.bowler_id]
      
      // Fair delivery check
      const isFair = b.extra_type !== 'wide' && b.extra_type !== 'no_ball'
      if (isFair) {
        bowler.ballsBowled += 1
      }
      
      // Runs conceded (batsman runs + wide/noball extras)
      let runs = b.runs_batsman
      if (b.extra_type === 'wide' || b.extra_type === 'no_ball') {
        runs += b.runs_extras
      }
      bowler.runsConceded += runs

      // Bowler wicket count (no credit for runout/retired hurt)
      if (b.is_wicket && ['bowled', 'caught', 'lbw', 'stumped', 'hit_wicket'].includes(b.wicket_type)) {
        bowler.wickets += 1
      }

      // Track runs conceded in this specific over
      const key = `${b.bowler_id}-${b.over_number}`
      if (!bowlerOvers[key]) {
        bowlerOvers[key] = { runs: 0, balls: 0 }
      }
      bowlerOvers[key].runs += runs
      if (isFair) bowlerOvers[key].balls += 1
    })

    // Compute maidens (overs with 6 fair balls and 0 runs conceded)
    Object.entries(bowlerOvers).forEach(([key, value]) => {
      const bId = key.split('-')[0]
      if (value.balls === 6 && value.runs === 0 && bowlers[bId]) {
        bowlers[bId].maidens += 1
      }
    })

    return Object.values(bowlers).map((b) => {
      b.overs = `${Math.floor(b.ballsBowled / 6)}.${b.ballsBowled % 6}`
      return b
    }).filter((b) => b.ballsBowled > 0)
  }

  const currentBatsmen = currentInnings ? getBatsmanListStats(currentBalls, currentInnings.batting_team_id).filter((b) => b.dismissalText === 'batting') : []
  const currentBowlersList = currentInnings ? getBowlerListStats(currentBalls, currentInnings.bowling_team_id) : []
  
  // Find current active bowler (who bowled the last ball)
  const lastBall = currentBalls[currentBalls.length - 1]
  const activeBowler = lastBall ? currentBowlersList.find((b) => b.id === lastBall.bowler_id) : null

  // Fall of wickets list
  const getFallOfWickets = (ballList, battingTeamId) => {
    const wickets = []
    let cumulativeRuns = 0
    let wicketsCount = 0
    let fairBalls = 0

    ballList.forEach((b) => {
      const isFair = b.extra_type !== 'wide' && b.extra_type !== 'no_ball'
      if (isFair) fairBalls += 1

      let runs = b.runs_batsman + b.runs_extras
      cumulativeRuns += runs

      if (b.is_wicket && b.wicket_type !== 'retired_hurt') {
        wicketsCount += 1
        const over = `${Math.floor(fairBalls / 6)}.${fairBalls % 6}`
        wickets.push({
          number: wicketsCount,
          score: cumulativeRuns,
          balls: fairBalls,
          over,
          batsmanName: b.wicket_player_id === b.batsman_id ? b.batsman?.name : b.non_striker_id === b.wicket_player_id ? 'Non Striker' : 'Batsman'
        })
      }
    })

    return wickets
  }

  const currentFOW = currentInnings ? getFallOfWickets(currentBalls, currentInnings.batting_team_id) : []

  // Dynamic Commentary Feed generation
  const generateCommentaryFeed = () => {
    if (!currentBalls || currentBalls.length === 0) return []

    // Last 10 balls, reversed so latest is top
    return [...currentBalls]
      .slice(-10)
      .reverse()
      .map((ball, idx) => {
        const fairBalls = currentBalls.slice(0, currentBalls.indexOf(ball) + 1).filter((b) => b.extra_type !== 'wide' && b.extra_type !== 'no_ball').length
        const overVal = `${Math.floor((fairBalls - 1) / 6)}.${((fairBalls - 1) % 6) + 1}`
        
        let eventText = ''
        let bgClass = 'bg-slate-900 border-slate-800'
        let borderClass = 'border-l-slate-600'

        if (ball.is_wicket) {
          eventText = `OUT! ${ball.wicket_type.toUpperCase()}! ${ball.batsman?.name} departs.`
          bgClass = 'bg-red-500/5 border-red-500/20'
          borderClass = 'border-l-red-500'
        } else if (ball.extra_type !== 'none') {
          eventText = `${ball.extra_type.toUpperCase()}! ${ball.runs_extras} extra runs conceded.`
          bgClass = 'bg-amber-500/5 border-amber-500/20'
          borderClass = 'border-l-amber-500'
        } else if (ball.runs_batsman === 4) {
          eventText = `FOUR runs! Terrific shot by ${ball.batsman?.name} off ${ball.bowler?.name}. Cracking boundary.`
          bgClass = 'bg-blue-500/5 border-blue-500/20'
          borderClass = 'border-l-blue-500'
        } else if (ball.runs_batsman === 6) {
          eventText = `SIX runs! High in the air and clearing the ropes! Spectacular maximum from ${ball.batsman?.name}.`
          bgClass = 'bg-purple-500/5 border-purple-500/20'
          borderClass = 'border-l-purple-500'
        } else if (ball.runs_batsman === 0) {
          eventText = `Dot ball. Bowled tidy length by ${ball.bowler?.name}.`
        } else {
          eventText = `${ball.runs_batsman} run(s) taken. Tucked away gently into the gap.`
          bgClass = 'bg-emerald-500/5 border-emerald-500/20'
          borderClass = 'border-l-emerald-500'
        }

        return {
          id: ball.id,
          over: overVal,
          text: `Over ${overVal}: ${ball.bowler?.name} to ${ball.batsman?.name}. ${eventText}`,
          bgClass,
          borderClass
        }
      })
  }

  const commentaryFeed = generateCommentaryFeed()

  // Ball tracker dot render helper
  const getBallTrackerColorClass = (ball) => {
    if (ball.is_wicket) return 'bg-red-900 border-red-800 text-red-200' // wicket
    if (ball.extra_type === 'wide' || ball.extra_type === 'no_ball') return 'bg-amber-900 border-amber-800 text-amber-200' // extras
    if (ball.runs_batsman === 4) return 'bg-blue-900 border-blue-800 text-blue-200' // boundary 4
    if (ball.runs_batsman === 6) return 'bg-purple-900 border-purple-800 text-purple-200' // boundary 6
    if (ball.runs_batsman > 0) return 'bg-emerald-900 border-emerald-800 text-emerald-200' // 1-3 runs
    return 'bg-slate-800 border-slate-700 text-slate-400' // dot ball
  }

  const getBallText = (ball) => {
    if (ball.is_wicket) return 'W'
    if (ball.extra_type === 'wide') return `${ball.runs_extras}Wd`
    if (ball.extra_type === 'no_ball') return `${ball.runs_batsman + ball.runs_extras}Nb`
    if (ball.extra_type === 'bye') return `${ball.runs_extras}B`
    if (ball.extra_type === 'leg_bye') return `${ball.runs_extras}Lb`
    return `${ball.runs_batsman}`
  }

  // Recent balls from current over
  const getRecentBalls = () => {
    if (!currentBalls || currentBalls.length === 0) return []
    // Group balls of the latest over number
    const lastBallItem = currentBalls[currentBalls.length - 1]
    const latestOverNum = lastBallItem.over_number
    return currentBalls.filter((b) => b.over_number === latestOverNum)
  }

  const recentOverBalls = getRecentBalls()

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <Link to="/fixtures" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Match Schedules
      </Link>

      {/* 1. TOP DYNAMIC SCORE HEADER HEADER */}
      <section className="bg-slate-900 border border-slate-800 shadow-2xl rounded-3xl overflow-hidden">
        {/* Pulsing state bar */}
        <div className="bg-emerald-600 px-6 py-2 flex items-center justify-between text-white font-extrabold text-[10px] tracking-widest uppercase">
          <span>{match.stage} • {match.venue}</span>
          {match.status === 'live' ? (
            <span className="flex items-center gap-1.5 animate-pulse bg-red-600 px-2 py-0.5 rounded border border-red-500">
              <span className="w-1.5 h-1.5 bg-white rounded-full"></span> Live Live Ticker
            </span>
          ) : match.status === 'completed' ? (
            <span className="bg-emerald-900 px-2 py-0.5 rounded">Match Completed</span>
          ) : (
            <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded">Upcoming Scheduled</span>
          )}
        </div>

        {/* Center Teams Score Row */}
        <div className="p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-12 bg-gradient-to-b from-slate-900 to-slate-950">
          {/* Team 1 Bio */}
          <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left flex-1">
            <img
              src={match.team1?.logo_url || 'https://placehold.co/120x120/1e293b/ffffff?text=' + encodeURIComponent(match.team1?.short_name || 'T1')}
              alt={match.team1?.name}
              className="w-16 h-16 rounded-full object-cover border border-slate-800 bg-slate-950 shadow-lg"
            />
            <div>
              <h2 className="font-extrabold text-lg text-white leading-tight">{match.team1?.name}</h2>
              <span className="text-[10px] text-slate-500 font-extrabold uppercase mt-0.5 tracking-wider block">
                {match.team1?.short_name}
              </span>
              {innings1 ? (
                <div className="mt-1.5">
                  <span className="text-xl md:text-2xl font-black text-white">{innings1.runs}/{innings1.wickets}</span>
                  <span className="text-xs text-slate-400 font-semibold ml-1.5">
                    ({getOversString(inn1Balls)} ov)
                  </span>
                </div>
              ) : (
                <span className="text-xs text-slate-500 italic block mt-1">Yet to bat</span>
              )}
            </div>
          </div>

          {/* VS Ticker */}
          <div className="flex flex-col items-center shrink-0">
            <span className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center font-extrabold text-slate-500 text-xs shadow-inner">
              VS
            </span>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-2 tracking-widest">{match.overs_limit} Overs Match</p>
          </div>

          {/* Team 2 Bio */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-4 text-center md:text-right flex-1">
            <img
              src={match.team2?.logo_url || 'https://placehold.co/120x120/1e293b/ffffff?text=' + encodeURIComponent(match.team2?.short_name || 'T2')}
              alt={match.team2?.name}
              className="w-16 h-16 rounded-full object-cover border border-slate-800 bg-slate-950 shadow-lg"
            />
            <div>
              <h2 className="font-extrabold text-lg text-white leading-tight">{match.team2?.name}</h2>
              <span className="text-[10px] text-slate-500 font-extrabold uppercase mt-0.5 tracking-wider block">
                {match.team2?.short_name}
              </span>
              {innings2 ? (
                <div className="mt-1.5">
                  <span className="text-xl md:text-2xl font-black text-white">{innings2.runs}/{innings2.wickets}</span>
                  <span className="text-xs text-slate-400 font-semibold mr-1.5">
                    ({getOversString(inn2Balls)} ov)
                  </span>
                </div>
              ) : innings1 ? (
                <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-lg block mt-1.5 uppercase tracking-wider animate-pulse">
                  Batting Next
                </span>
              ) : (
                <span className="text-xs text-slate-500 italic block mt-1">Yet to bat</span>
              )}
            </div>
          </div>
        </div>

        {/* Result margin banner if complete */}
        {match.status === 'completed' && (
          <div className="bg-emerald-500/10 border-t border-slate-800 px-6 py-4 text-center">
            <h3 className="text-emerald-400 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2">
              🏆 {match.result_margin || 'Match Concluded Successfully'}
            </h3>
            {match.man_of_the_match && (
              <p className="text-slate-400 text-xs mt-1.5 font-medium">
                🌟 Man of the Match:{' '}
                <strong className="text-slate-200">{match.man_of_the_match.name}</strong> (Jersey {match.man_of_the_match.jersey_number})
              </p>
            )}
          </div>
        )}
      </section>

      {/* 2. REALTIME LIVE STATS BAR (Only if match is currently live) */}
      {match.status === 'live' && currentInnings && (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest block">Innings {match.current_innings} Scorecard</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-white">{currentInnings.runs}/{currentInnings.wickets}</span>
                <span className="text-slate-400 font-semibold text-sm">
                  ({getOversString(currentBalls)} / {match.overs_limit} ov)
                </span>
              </div>
            </div>

            <div className="flex gap-6 text-center">
              <div>
                <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">Run Rate (CRR)</span>
                <span className="text-lg font-black text-white mt-0.5 block">{currentCRR}</span>
              </div>
              {requiredRRR && (
                <div>
                  <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">Req Rate (RRR)</span>
                  <span className="text-lg font-black text-amber-400 mt-0.5 block">{requiredRRR}</span>
                </div>
              )}
            </div>
          </div>

          {/* Active Batsmen & Bowlers details row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Batters */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Batting</h3>
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
                {currentBatsmen.length > 0 ? (
                  currentBatsmen.map((b) => (
                    <div key={b.id} className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-200 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> {b.name}
                      </span>
                      <div className="text-slate-300 font-medium">
                        <strong className="text-white text-sm font-extrabold mr-1">{b.runs}</strong>
                        <span>({b.balls}b, {b.fours}x4, {b.sixes}x6)</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic">Determining active batsmen...</p>
                )}
              </div>
            </div>

            {/* Bowlers */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Bowling</h3>
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
                {activeBowler ? (
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> {activeBowler.name}
                    </span>
                    <div className="text-slate-300 font-medium">
                      <strong className="text-white text-sm font-extrabold mr-1">{activeBowler.wickets}</strong>
                      <span>wickets for {activeBowler.runsConceded} runs ({activeBowler.overs} ov)</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">Bowler selection pending...</p>
                )}
              </div>
            </div>
          </div>

          {/* Recent balls visual */}
          {recentOverBalls.length > 0 && (
            <div className="pt-2 space-y-2 border-t border-slate-800/40">
              <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">This Over</span>
              <div className="flex gap-2 flex-wrap items-center">
                {recentOverBalls.map((ball) => (
                  <span
                    key={ball.id}
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-full border text-xs font-extrabold shadow-sm ${getBallTrackerColorClass(
                      ball
                    )}`}
                  >
                    {getBallText(ball)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* 3. TABS SELECTOR */}
      <section className="space-y-6">
        <div className="border-b border-slate-800 flex gap-4 md:gap-6 overflow-x-auto whitespace-nowrap">
          <button
            onClick={() => setActiveTab('live')}
            className={`py-3 text-xs md:text-sm font-semibold tracking-wider uppercase border-b-2 px-1 relative transition-colors ${
              activeTab === 'live'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            📋 Match Center
          </button>
          {innings1 && (
            <button
              onClick={() => setActiveTab('scorecard1')}
              className={`py-3 text-xs md:text-sm font-semibold tracking-wider uppercase border-b-2 px-1 relative transition-colors ${
                activeTab === 'scorecard1'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              🏏 {match.team1?.short_name} Scorecard
            </button>
          )}
          {innings2 && (
            <button
              onClick={() => setActiveTab('scorecard2')}
              className={`py-3 text-xs md:text-sm font-semibold tracking-wider uppercase border-b-2 px-1 relative transition-colors ${
                activeTab === 'scorecard2'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              🏏 {match.team2?.short_name} Scorecard
            </button>
          )}
          <button
            onClick={() => setActiveTab('gallery')}
            className={`py-3 text-xs md:text-sm font-semibold tracking-wider uppercase border-b-2 px-1 relative transition-colors ${
              activeTab === 'gallery'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            🖼️ Match Gallery ({photos?.length || 0})
          </button>
        </div>

        {/* Tab 1: Match Center (Live commentary / feed) */}
        {activeTab === 'live' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Commentary Feed (Last 10 balls) */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-emerald-400" /> Commentary Feed
              </h3>

              {commentaryFeed.length > 0 ? (
                <div className="space-y-3">
                  {commentaryFeed.map((feed) => (
                    <div
                      key={feed.id}
                      className={`p-4 rounded-xl border border-l-4 shadow-sm flex items-start gap-4 transition-all duration-200 ${feed.bgClass} ${feed.borderClass}`}
                    >
                      <span className="px-2 py-1 bg-slate-950 border border-slate-800 text-[10px] text-slate-400 font-extrabold rounded shadow shrink-0">
                        {feed.over}
                      </span>
                      <p className="text-xs md:text-sm font-medium text-slate-200 mt-0.5 leading-relaxed">
                        {feed.text}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 text-center text-slate-500">
                  <MessageCircle className="w-8 h-8 mx-auto text-slate-700 mb-2" />
                  <p className="text-xs font-semibold">Commentary details will stream live here as soon as scorers start recording balls.</p>
                </div>
              )}
            </div>

            {/* FOW & Partnership aggregates */}
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-lg">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest border-b border-slate-800 pb-2">
                  Fall of Wickets
                </h3>
                {currentFOW.length > 0 ? (
                  <div className="space-y-2.5">
                    {currentFOW.map((wicket) => (
                      <div key={wicket.number} className="flex justify-between items-center text-xs text-slate-300">
                        <span className="font-semibold text-slate-400">
                          {wicket.number} - {wicket.score} ({wicket.batsmanName})
                        </span>
                        <span className="font-bold text-slate-500">Over {wicket.over}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No wickets fallen in this innings.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Innings 1 Full Scorecard */}
        {activeTab === 'scorecard1' && innings1 && (
          <div className="space-y-6">
            {/* Batting Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="px-5 py-3.5 bg-slate-950/40 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Batting</h3>
                <span className="text-xs font-extrabold text-white">
                  {innings1.runs}/{innings1.wickets} ({getOversString(inn1Balls)} ov)
                </span>
              </div>
              <table className="w-full text-left text-xs md:text-sm">
                <thead>
                  <tr className="bg-slate-950/20 text-slate-400 uppercase tracking-widest text-[9px] border-b border-slate-800">
                    <th className="py-2.5 px-5">Batsman</th>
                    <th className="py-2.5 px-2">Dismissal</th>
                    <th className="py-2.5 px-2 text-center w-14">Runs</th>
                    <th className="py-2.5 px-2 text-center w-14">Balls</th>
                    <th className="py-2.5 px-2 text-center w-12">4s</th>
                    <th className="py-2.5 px-2 text-center w-12">6s</th>
                    <th className="py-2.5 px-5 text-right w-20">SR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {getBatsmanListStats(inn1Balls, innings1.batting_team_id).map((b) => (
                    <tr key={b.id} className="hover:bg-slate-950/10">
                      <td className="py-3 px-5 font-bold text-slate-200">{b.name}</td>
                      <td className="py-3 px-2 text-slate-500 text-xs italic">{b.dismissalText}</td>
                      <td className="py-3 px-2 text-center font-extrabold text-white">{b.runs}</td>
                      <td className="py-3 px-2 text-center text-slate-300">{b.balls}</td>
                      <td className="py-3 px-2 text-center text-slate-400">{b.fours}</td>
                      <td className="py-3 px-2 text-center text-slate-400">{b.sixes}</td>
                      <td className="py-3 px-5 text-right font-semibold text-slate-400">
                        {b.balls > 0 ? ((b.runs * 100) / b.balls).toFixed(1) : '0.0'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bowling Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="px-5 py-3.5 bg-slate-950/40 border-b border-slate-800">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Bowling</h3>
              </div>
              <table className="w-full text-left text-xs md:text-sm">
                <thead>
                  <tr className="bg-slate-950/20 text-slate-400 uppercase tracking-widest text-[9px] border-b border-slate-800">
                    <th className="py-2.5 px-5">Bowler</th>
                    <th className="py-2.5 px-2 text-center w-14">Overs</th>
                    <th className="py-2.5 px-2 text-center w-14">Maidens</th>
                    <th className="py-2.5 px-2 text-center w-14">Runs</th>
                    <th className="py-2.5 px-2 text-center w-14 font-bold text-slate-200">Wickets</th>
                    <th className="py-2.5 px-5 text-right w-20">Economy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {getBowlerListStats(inn1Balls, innings1.bowling_team_id).map((b) => (
                    <tr key={b.id} className="hover:bg-slate-950/10">
                      <td className="py-3 px-5 font-bold text-slate-200">{b.name}</td>
                      <td className="py-3 px-2 text-center text-slate-300 font-semibold">{b.overs}</td>
                      <td className="py-3 px-2 text-center text-slate-400">{b.maidens}</td>
                      <td className="py-3 px-2 text-center text-slate-300">{b.runsConceded}</td>
                      <td className="py-3 px-2 text-center font-extrabold text-emerald-400 text-sm">{b.wickets}</td>
                      <td className="py-3 px-5 text-right font-semibold text-slate-400">
                        {b.ballsBowled > 0 ? ((b.runsConceded * 6) / b.ballsBowled).toFixed(2) : '0.00'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Innings 2 Full Scorecard */}
        {activeTab === 'scorecard2' && innings2 && (
          <div className="space-y-6">
            {/* Batting Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="px-5 py-3.5 bg-slate-950/40 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Batting</h3>
                <span className="text-xs font-extrabold text-white">
                  {innings2.runs}/{innings2.wickets} ({getOversString(inn2Balls)} ov)
                </span>
              </div>
              <table className="w-full text-left text-xs md:text-sm">
                <thead>
                  <tr className="bg-slate-950/20 text-slate-400 uppercase tracking-widest text-[9px] border-b border-slate-800">
                    <th className="py-2.5 px-5">Batsman</th>
                    <th className="py-2.5 px-2">Dismissal</th>
                    <th className="py-2.5 px-2 text-center w-14">Runs</th>
                    <th className="py-2.5 px-2 text-center w-14">Balls</th>
                    <th className="py-2.5 px-2 text-center w-12">4s</th>
                    <th className="py-2.5 px-2 text-center w-12">6s</th>
                    <th className="py-2.5 px-5 text-right w-20">SR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {getBatsmanListStats(inn2Balls, innings2.batting_team_id).map((b) => (
                    <tr key={b.id} className="hover:bg-slate-950/10">
                      <td className="py-3 px-5 font-bold text-slate-200">{b.name}</td>
                      <td className="py-3 px-2 text-slate-500 text-xs italic">{b.dismissalText}</td>
                      <td className="py-3 px-2 text-center font-extrabold text-white">{b.runs}</td>
                      <td className="py-3 px-2 text-center text-slate-300">{b.balls}</td>
                      <td className="py-3 px-2 text-center text-slate-400">{b.fours}</td>
                      <td className="py-3 px-2 text-center text-slate-400">{b.sixes}</td>
                      <td className="py-3 px-5 text-right font-semibold text-slate-400">
                        {b.balls > 0 ? ((b.runs * 100) / b.balls).toFixed(1) : '0.0'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bowling Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="px-5 py-3.5 bg-slate-950/40 border-b border-slate-800">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Bowling</h3>
              </div>
              <table className="w-full text-left text-xs md:text-sm">
                <thead>
                  <tr className="bg-slate-950/20 text-slate-400 uppercase tracking-widest text-[9px] border-b border-slate-800">
                    <th className="py-2.5 px-5">Bowler</th>
                    <th className="py-2.5 px-2 text-center w-14">Overs</th>
                    <th className="py-2.5 px-2 text-center w-14">Maidens</th>
                    <th className="py-2.5 px-2 text-center w-14">Runs</th>
                    <th className="py-2.5 px-2 text-center w-14 font-bold text-slate-200">Wickets</th>
                    <th className="py-2.5 px-5 text-right w-20">Economy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {getBowlerListStats(inn2Balls, innings2.bowling_team_id).map((b) => (
                    <tr key={b.id} className="hover:bg-slate-950/10">
                      <td className="py-3 px-5 font-bold text-slate-200">{b.name}</td>
                      <td className="py-3 px-2 text-center text-slate-300 font-semibold">{b.overs}</td>
                      <td className="py-3 px-2 text-center text-slate-400">{b.maidens}</td>
                      <td className="py-3 px-2 text-center text-slate-300">{b.runsConceded}</td>
                      <td className="py-3 px-2 text-center font-extrabold text-emerald-400 text-sm">{b.wickets}</td>
                      <td className="py-3 px-5 text-right font-semibold text-slate-400">
                        {b.ballsBowled > 0 ? ((b.runsConceded * 6) / b.ballsBowled).toFixed(2) : '0.00'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Match Gallery */}
        {activeTab === 'gallery' && (
          <div>
            {photos && photos.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    onClick={() => setLightboxImg(photo.image_url)}
                    className="bg-slate-900 border border-slate-800/80 rounded-xl overflow-hidden shadow-md cursor-pointer hover:border-emerald-500/30 transition-all group relative aspect-video"
                  >
                    <img
                      src={photo.image_url}
                      alt={photo.caption}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="bg-emerald-500 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow">
                        <Eye className="w-4 h-4" /> View Full
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-500">
                <Image className="w-10 h-10 mx-auto text-slate-700 mb-2" />
                <p className="text-sm font-semibold">No photos from this match yet.</p>
                <p className="text-xs text-slate-600 mt-1">
                  Admins can upload and tag photos to this match in the Admin Panel gallery tab.
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Lightbox Modal */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxImg(null)}
        >
          <img
            src={lightboxImg}
            alt="Gallery Lightbox"
            className="max-w-full max-h-[85vh] rounded-2xl border border-slate-800 shadow-2xl object-contain animate-fadeIn"
          />
        </div>
      )}
    </div>
  )
}
