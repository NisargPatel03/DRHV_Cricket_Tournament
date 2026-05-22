import { useState, useEffect, useRef } from 'react'
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

  // Inner live sub-tab states
  const [liveTab, setLiveTab] = useState('commentary') // 'commentary', 'analytics', 'predictor', 'soundboard'
  const [chatMessages, setChatMessages] = useState([])
  const [userName, setUserName] = useState('')
  const [chatInput, setChatInput] = useState('')
  const chatChannelRef = useRef(null)

  // 5B. Fetch Fan Chats
  const { data: initialChats } = useQuery({
    queryKey: ['match_fan_chats', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fan_chats')
        .select('*')
        .eq('match_id', id)
        .order('created_at', { ascending: true })
        .limit(40)
      if (error) {
        console.warn('fan_chats table might not exist yet, using local state.')
        return []
      }
      return data || []
    }
  })

  // Sync initial chats
  useEffect(() => {
    if (initialChats) {
      setChatMessages(initialChats)
    }
  }, [initialChats])

  // Deterministic SVG Wagon Wheel Coordinates
  const getBallHitCoordinates = (ball) => {
    let hash = 0
    const str = ball.id || ''
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    const angle = Math.abs(hash % 360)
    const rad = (angle * Math.PI) / 180

    let dist = 30 // single
    if (ball.runs_batsman === 0) dist = 8
    else if (ball.runs_batsman === 1) dist = 22
    else if (ball.runs_batsman === 2) dist = 35
    else if (ball.runs_batsman === 3) dist = 48
    else if (ball.runs_batsman === 4) dist = 60
    else if (ball.runs_batsman === 6) dist = 75 // clear boundary!

    const x = 100 + dist * Math.cos(rad)
    const y = 100 + dist * Math.sin(rad)
    return { x, y }
  }

  // Deterministic Pitch Landing Coordinates
  const getPitchLandingCoordinates = (ball) => {
    let hash = 0
    const str = ball.id || ''
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    
    let y = 50 // good length
    const typeHash = Math.abs(hash % 100)
    if (ball.runs_batsman >= 4) {
      y = typeHash > 50 ? 78 + (typeHash % 10) : 22 + (typeHash % 10)
    } else if (ball.runs_batsman === 0) {
      y = 48 + (typeHash % 15)
    } else {
      y = 15 + (typeHash % 70)
    }

    const x = 14 + (Math.abs(hash >> 2) % 12)
    return { x, y }
  }

  // Synthesize custom browser audio loops
  const playSynthesizedSound = (type) => {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()

    if (type === 'bat') {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(450, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.08)
      gain.gain.setValueAtTime(0.8, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08)
      osc.start()
      osc.stop(ctx.currentTime + 0.09)
    } else if (type === 'horn') {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(329.63, now)
      osc.frequency.setValueAtTime(392.00, now + 0.15)
      osc.frequency.setValueAtTime(523.25, now + 0.3)
      gain.gain.setValueAtTime(0.5, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6)
      osc.start()
      osc.stop(now + 0.6)
    } else if (type === 'crowd') {
      const bufferSize = ctx.sampleRate * 2
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1
      }
      const noise = ctx.createBufferSource()
      noise.buffer = buffer
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(300, ctx.currentTime)
      filter.frequency.exponentialRampToValueAtTime(1500, ctx.currentTime + 0.5)
      filter.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 2.0)
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.01, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.4)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2.0)
      noise.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)
      noise.start()
      noise.stop(ctx.currentTime + 2.1)
    } else if (type === 'whistle') {
      // dual oscillator whistle beating
      const now = ctx.currentTime
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()
      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)
      osc1.frequency.setValueAtTime(1200, now)
      osc2.frequency.setValueAtTime(1215, now) // beating effect
      gain.gain.setValueAtTime(0.3, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35)
      osc1.start()
      osc2.start()
      osc1.stop(now + 0.4)
      osc2.stop(now + 0.4)
    } else if (type === 'drum') {
      // Low stadium kick drum boom decay
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(150, now)
      osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.3)
      gain.gain.setValueAtTime(0.9, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4)
      osc.start()
      osc.stop(now + 0.4)
    } else if (type === 'siren') {
      // sweeping stadium siren
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(400, now)
      osc.frequency.linearRampToValueAtTime(700, now + 0.25)
      osc.frequency.linearRampToValueAtTime(400, now + 0.5)
      osc.frequency.linearRampToValueAtTime(700, now + 0.75)
      osc.frequency.linearRampToValueAtTime(400, now + 1.0)
      gain.gain.setValueAtTime(0.4, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.1)
      osc.start()
      osc.stop(now + 1.2)
    } else if (type === 'wicket') {
      playSynthesizedSound('bat')
      setTimeout(() => {
        playSynthesizedSound('crowd')
      }, 50)
    }
  }

  // Handle send message
  const handleSendChatMessage = async (e) => {
    e.preventDefault()
    if (!chatInput.trim()) return

    const finalName = userName.trim() || 'Anonymous Fan'
    const chatMsg = {
      id: Math.random().toString(),
      match_id: id,
      user_name: finalName,
      message: chatInput.trim(),
      created_at: new Date().toISOString()
    }

    // 1. Instantly append message locally so the sender sees it without delay
    setChatMessages((prev) => {
      if (prev.find((msg) => msg.id === chatMsg.id)) return prev
      return [...prev, chatMsg]
    })

    // 2. Broadcast the message to all other connected browsers instantly!
    if (chatChannelRef.current) {
      chatChannelRef.current.send({
        type: 'broadcast',
        event: 'chat',
        payload: chatMsg
      })
    }

    // 3. Try to save to Supabase database table in background for history persistence
    supabase
      .from('fan_chats')
      .insert([{
        match_id: id,
        user_name: finalName,
        message: chatInput.trim()
      }])
      .select()
      .then(({ data, error }) => {
        if (error) {
          console.warn('Could not persist to fan_chats database table. Live delivery is still active via Broadcast channel.')
        } else if (data && data.length > 0) {
          // Replace local random-id message with the actual database-persisted message
          setChatMessages((prev) =>
            prev.map((msg) => (msg.message === chatMsg.message && msg.user_name === chatMsg.user_name ? data[0] : msg))
          )
        }
      })

    setChatInput('')
  }

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

  // Realtime Postgres Change Listening on balls & chats
  useEffect(() => {
    if (!id) return

    // Set up channel for ball-by-ball real-time scoring and fan arena chat
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
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'fan_chats',
          filter: `match_id=eq.${id}`
        },
        (payload) => {
          setChatMessages((prev) => {
            if (prev.find((msg) => msg.id === payload.new.id)) return prev
            return [...prev, payload.new]
          })
        }
      )
      .on(
        'broadcast',
        { event: 'chat' },
        (payload) => {
          const newMsg = payload.payload
          setChatMessages((prev) => {
            if (prev.find((msg) => msg.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .on(
        'broadcast',
        { event: 'request_sync' },
        () => {
          // If we have existing chat messages, send them to the newly joined peer!
          setChatMessages((currentMsgs) => {
            if (currentMsgs.length > 0 && chatChannelRef.current) {
              chatChannelRef.current.send({
                type: 'broadcast',
                event: 'sync_response',
                payload: { messages: currentMsgs }
              })
            }
            return currentMsgs
          })
        }
      )
      .on(
        'broadcast',
        { event: 'sync_response' },
        (payload) => {
          const incoming = payload.payload?.messages || []
          setChatMessages((prev) => {
            // Only sync if incoming has more messages than our current list
            if (incoming.length > prev.length) {
              return incoming
            }
            return prev
          })
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Once successfully subscribed, request existing chat messages from any open screens
          setTimeout(() => {
            channel.send({
              type: 'broadcast',
              event: 'request_sync',
              payload: {}
            })
          }, 300)
        }
      })

    // Store channel reference for direct broadcast sends
    chatChannelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      chatChannelRef.current = null
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

  // Dynamic Win Predictor Probability
  const getWinProbability = () => {
    if (!match) return { team1: 50, team2: 50 }
    
    // If match is completed, 100% to winner
    if (match.status === 'completed') {
      if (match.winner_id === match.team1_id) return { team1: 100, team2: 0 }
      if (match.winner_id === match.team2_id) return { team1: 0, team2: 100 }
      return { team1: 50, team2: 50 }
    }

    // Default base probabilities
    let prob1 = 50
    
    if (match.current_innings === 1) {
      if (innings1) {
        const rr = parseFloat(calculateRunRate(innings1.runs, inn1Balls))
        const wkts = innings1.wickets
        prob1 = Math.min(Math.max(50 + (rr - 7.5) * 8 - wkts * 3, 20), 80)
      }
    } else if (match.current_innings === 2 && innings1) {
      const target = innings1.runs + 1
      const runsNeeded = target - (innings2?.runs || 0)
      const oversLimit = match.overs_limit
      const totalMaxBalls = oversLimit * 6
      const fairBallsBowled = getFairBallsCount(inn2Balls)
      const ballsRemaining = totalMaxBalls - fairBallsBowled
      
      if (runsNeeded <= 0) {
        prob1 = 0
      } else if (ballsRemaining <= 0 || (innings2?.wickets || 0) >= 10) {
        prob1 = 100
      } else {
        const reqRR = (runsNeeded * 6) / ballsRemaining
        const curRR = parseFloat(calculateRunRate(innings2?.runs || 0, inn2Balls)) || 6.0
        const wicketsLeft = 10 - (innings2?.wickets || 0)
        
        const rateDiff = reqRR - curRR
        prob1 = 50 + rateDiff * 10 - wicketsLeft * 4
        prob1 = Math.min(Math.max(prob1, 5), 95)
      }
    }

    prob1 = Math.round(prob1)
    return {
      team1: prob1,
      team2: 100 - prob1
    }
  }

  const winProbability = getWinProbability()

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

      {/* 1. TOP DYNAMIC SCORE HEADER */}
      <section className="bento-card overflow-hidden border border-white/5!">
        {/* Pulsing state bar */}
        <div className="bg-emerald-600 px-6 py-2 flex items-center justify-between text-white font-black text-[10px] tracking-widest uppercase shadow">
          <span>{match.stage} • {match.venue}</span>
          {match.status === 'live' ? (
            <span className="flex items-center gap-1.5 animate-pulse bg-red-650 px-2.5 py-0.5 rounded border border-red-500 text-[9px] font-black tracking-widest shadow">
              <span className="w-1.5 h-1.5 bg-white rounded-full"></span> Live Ticker
            </span>
          ) : match.status === 'completed' ? (
            <span className="bg-emerald-900 px-2.5 py-0.5 rounded text-[9px] font-black tracking-widest">Match Completed</span>
          ) : (
            <span className="bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded text-[9px] font-black tracking-widest">Upcoming Scheduled</span>
          )}
        </div>

        {/* Center Teams Score Row */}
        <div className="p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-12 bg-gradient-to-b from-slate-900/10 to-slate-950/20">
          {/* Team 1 Bio */}
          <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left flex-1">
            <img
              src={match.team1?.logo_url || 'https://placehold.co/120x120/1e293b/ffffff?text=' + encodeURIComponent(match.team1?.short_name || 'T1')}
              alt={match.team1?.name}
              className="w-16 h-16 rounded-full object-cover border border-white/10 bg-slate-950 shadow-lg"
            />
            <div>
              <h2 className="font-extrabold text-lg text-white leading-tight">{match.team1?.name}</h2>
              <span className="text-[10px] text-slate-500 font-black uppercase mt-0.5 tracking-widest block">
                {match.team1?.short_name}
              </span>
              {innings1 ? (
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-xl md:text-2xl font-black text-white">{innings1.runs}/{innings1.wickets}</span>
                  <span className="text-xs text-slate-400 font-bold tracking-wider">
                    ({getOversString(inn1Balls)} ov)
                  </span>
                </div>
              ) : (
                <span className="text-xs text-slate-500 italic block mt-2">Yet to bat</span>
              )}
            </div>
          </div>

          {/* VS Ticker */}
          <div className="flex flex-col items-center shrink-0">
            <span className="w-8 h-8 rounded-full bg-slate-950 border border-white/5 flex items-center justify-center font-black text-slate-400 text-xs shadow-inner">
              VS
            </span>
            <p className="text-[9px] text-slate-500 font-extrabold uppercase mt-2.5 tracking-widest">{match.overs_limit} Overs Match</p>
          </div>

          {/* Team 2 Bio */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-4 text-center md:text-right flex-1">
            <img
              src={match.team2?.logo_url || 'https://placehold.co/120x120/1e293b/ffffff?text=' + encodeURIComponent(match.team2?.short_name || 'T2')}
              alt={match.team2?.name}
              className="w-16 h-16 rounded-full object-cover border border-white/10 bg-slate-950 shadow-lg"
            />
            <div>
              <h2 className="font-extrabold text-lg text-white leading-tight">{match.team2?.name}</h2>
              <span className="text-[10px] text-slate-500 font-black uppercase mt-0.5 tracking-widest block">
                {match.team2?.short_name}
              </span>
              {innings2 ? (
                <div className="mt-2 flex items-baseline gap-1.5 justify-end">
                  <span className="text-xl md:text-2xl font-black text-white">{innings2.runs}/{innings2.wickets}</span>
                  <span className="text-xs text-slate-400 font-bold tracking-wider">
                    ({getOversString(inn2Balls)} ov)
                  </span>
                </div>
              ) : innings1 ? (
                <span className="text-xs text-emerald-450 font-black bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-lg block mt-2 uppercase tracking-wider animate-pulse">
                  Batting Next
                </span>
              ) : (
                <span className="text-xs text-slate-500 italic block mt-2">Yet to bat</span>
              )}
            </div>
          </div>
        </div>

        {/* Result margin banner if complete */}
        {match.status === 'completed' && (
          <div className="bg-emerald-500/[0.03] border-t border-white/5 px-6 py-4 text-center">
            <h3 className="text-emerald-450 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2">
              🏆 {match.result_margin || 'Match Concluded Successfully'}
            </h3>
            {match.man_of_the_match && (
              <p className="text-slate-400 text-xs mt-1.5 font-semibold">
                🌟 Man of the Match:{' '}
                <strong className="text-slate-200">{match.man_of_the_match.name}</strong> (Jersey {match.man_of_the_match.jersey_number})
              </p>
            )}
          </div>
        )}
      </section>

      {/* 2. REALTIME LIVE STATS BAR */}
      {match.status === 'live' && currentInnings && (
        <section className="bento-card p-6 shadow-xl space-y-6 border border-white/5!">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div>
              <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest block">Innings {match.current_innings} Scorecard</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-white">{currentInnings.runs}/{currentInnings.wickets}</span>
                <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">
                  ({getOversString(currentBalls)} / {match.overs_limit} ov)
                </span>
              </div>
            </div>

            <div className="flex gap-6 text-center">
              <div>
                <span className="block text-[9px] text-slate-500 font-black uppercase tracking-widest">Run Rate (CRR)</span>
                <span className="text-lg font-black text-white mt-0.5 block">{currentCRR}</span>
              </div>
              {requiredRRR && (
                <div>
                  <span className="block text-[9px] text-slate-500 font-black uppercase tracking-widest">Req Rate (RRR)</span>
                  <span className="text-lg font-black text-amber-450 mt-0.5 block">{requiredRRR}</span>
                </div>
              )}
            </div>
          </div>

          {/* Active Batter & Bowler row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Batting */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Batting</h3>
              <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4 space-y-3 shadow-inner">
                {currentBatsmen.length > 0 ? (
                  currentBatsmen.map((b) => (
                    <div key={b.id} className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-slate-200 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500"></span> {b.name}
                      </span>
                      <div className="text-slate-350 font-medium">
                        <strong className="text-white text-sm font-black mr-1">{b.runs}</strong>
                        <span>({b.balls}b, {b.fours}x4, {b.sixes}x6)</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-550 italic">Determining active batsmen...</p>
                )}
              </div>
            </div>

            {/* Bowling */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bowling</h3>
              <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4 space-y-3 shadow-inner">
                {activeBowler ? (
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-extrabold text-slate-200 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-sm shadow-purple-550"></span> {activeBowler.name}
                    </span>
                    <div className="text-slate-355 font-medium">
                      <strong className="text-white text-sm font-black mr-1">{activeBowler.wickets}</strong>
                      <span>wickets for {activeBowler.runsConceded} runs ({activeBowler.overs} ov)</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-550 italic">Bowler selection pending...</p>
                )}
              </div>
            </div>
          </div>

          {/* Recent balls visual */}
          {recentOverBalls.length > 0 && (
            <div className="pt-3 space-y-2 border-t border-white/5">
              <span className="block text-[10px] text-slate-500 font-black uppercase tracking-widest">This Over</span>
              <div className="flex gap-2 flex-wrap items-center">
                {recentOverBalls.map((ball) => (
                  <span
                    key={ball.id}
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-full border text-xs font-black shadow-sm ${getBallTrackerColorClass(
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
        <div className="border-b border-white/5 flex gap-4 md:gap-6 overflow-x-auto whitespace-nowrap scrollbar-none pb-0.5">
          <button
            onClick={() => setActiveTab('live')}
            className={`py-3 text-xs md:text-xs font-black tracking-widest uppercase border-b-2 px-1 relative transition-colors ${
              activeTab === 'live'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-450 hover:text-white'
            }`}
          >
            📋 Match Center
          </button>
          {innings1 && (
            <button
              onClick={() => setActiveTab('scorecard1')}
              className={`py-3 text-xs md:text-xs font-black tracking-widest uppercase border-b-2 px-1 relative transition-colors ${
                activeTab === 'scorecard1'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-slate-450 hover:text-white'
              }`}
            >
              🏏 {match.team1?.short_name} Scorecard
            </button>
          )}
          {innings2 && (
            <button
              onClick={() => setActiveTab('scorecard2')}
              className={`py-3 text-xs md:text-xs font-black tracking-widest uppercase border-b-2 px-1 relative transition-colors ${
                activeTab === 'scorecard2'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-slate-450 hover:text-white'
              }`}
            >
              🏏 {match.team2?.short_name} Scorecard
            </button>
          )}
          <button
            onClick={() => setActiveTab('gallery')}
            className={`py-3 text-xs md:text-xs font-black tracking-widest uppercase border-b-2 px-1 relative transition-colors ${
              activeTab === 'gallery'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-450 hover:text-white'
            }`}
          >
            🖼️ Match Gallery ({photos?.length || 0})
          </button>
        </div>

        {/* Tab 1: Match Center */}
        {activeTab === 'live' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2 columns: Mini Live Tabs */}
            <div className="lg:col-span-2 space-y-6">
              {/* Mini Sub-Tabs Selector */}
              <div className="flex gap-2 p-1 bg-slate-950/60 border border-white/5 rounded-xl overflow-x-auto whitespace-nowrap scrollbar-none">
                <button
                  onClick={() => setLiveTab('commentary')}
                  className={`px-3 py-2 text-[10px] font-black tracking-wider uppercase rounded-lg transition-all ${
                    liveTab === 'commentary'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  💬 Commentary & Chat
                </button>
                <button
                  onClick={() => setLiveTab('analytics')}
                  className={`px-3 py-2 text-[10px] font-black tracking-wider uppercase rounded-lg transition-all ${
                    liveTab === 'analytics'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🎯 Pitch & Wagon Wheel
                </button>
                <button
                  onClick={() => setLiveTab('predictor')}
                  className={`px-3 py-2 text-[10px] font-black tracking-wider uppercase rounded-lg transition-all ${
                    liveTab === 'predictor'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🔮 Win Predictor
                </button>
                <button
                  onClick={() => setLiveTab('soundboard')}
                  className={`px-3 py-2 text-[10px] font-black tracking-wider uppercase rounded-lg transition-all ${
                    liveTab === 'soundboard'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🔊 Stadium Soundboard
                </button>
              </div>

              {/* Sub-Tab 1: Commentary & Real-time Fan Chat */}
              {liveTab === 'commentary' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-scaleUp">
                  {/* Commentary Column */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1.5 border-b border-white/5 pb-2">
                      🎙️ Ball-by-Ball Feed
                    </h3>
                    {commentaryFeed.length > 0 ? (
                      <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1 scrollbar-thin">
                        {commentaryFeed.map((feed) => (
                          <div
                            key={feed.id}
                            className={`p-3 rounded-xl border border-white/5 border-l-4 bg-slate-900/15 flex gap-3 transition-all duration-200 ${feed.bgClass} ${feed.borderClass}`}
                          >
                            <span className="px-2 py-0.5 bg-slate-950 border border-white/5 text-[9px] font-black rounded h-fit shrink-0">
                              {feed.over}
                            </span>
                            <p className="text-xs font-semibold text-slate-200 leading-relaxed">
                              {feed.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bento-card p-8 text-center text-slate-450 border border-white/5!">
                        <p className="text-xs font-semibold">Match commentary will stream live here as soon as scorers start recording deliveries.</p>
                      </div>
                    )}
                  </div>

                  {/* Fan Chat Column */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1.5 border-b border-white/5 pb-2">
                      💬 Real-Time Fan Arena
                    </h3>
                    <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4 space-y-4 flex flex-col justify-between shadow-inner h-[480px]">
                      {/* Messages Box */}
                      <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin max-h-[360px]">
                        {chatMessages.length > 0 ? (
                          chatMessages.map((msg) => (
                            <div key={msg.id} className="text-xs bg-white/[0.02] border border-white/5 p-2.5 rounded-xl space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="font-extrabold text-emerald-450">{msg.user_name}</span>
                                <span className="text-[8px] text-slate-500 font-bold">
                                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-slate-200 font-medium leading-relaxed">{msg.message}</p>
                            </div>
                          ))
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-center text-slate-550 p-6">
                            <span className="text-lg">📣</span>
                            <p className="text-xs font-semibold mt-1">Be the first to rally support for your team in the arena!</p>
                          </div>
                        )}
                      </div>

                      {/* Message inputs */}
                      <form onSubmit={handleSendChatMessage} className="space-y-2 border-t border-white/5 pt-3">
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Your Nickname"
                            maxLength={15}
                            className="bg-slate-900/60 border border-white/10 rounded-lg py-1.5 px-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-semibold"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                          />
                          <span className="text-[9px] text-slate-400 font-bold self-center text-right pr-1 italic">
                            {userName.trim() ? `Active: ${userName}` : 'Posting anonymously'}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            required
                            placeholder="Cheer or message..."
                            maxLength={100}
                            className="flex-1 bg-slate-900/60 border border-white/10 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                          />
                          <button
                            type="submit"
                            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs px-4 rounded-lg shadow transition-colors"
                          >
                            Send
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-Tab 2: Pitch & Wagon Wheel */}
              {liveTab === 'analytics' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-scaleUp">
                  {/* Wagon Wheel */}
                  <div className="bento-card p-5 space-y-4 border border-white/5!">
                    <div>
                      <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Interactive Wagon Wheel</h4>
                      <p className="text-[9px] text-slate-500 font-semibold mt-0.5">Runs distribution scoring directions</p>
                    </div>

                    <div className="relative aspect-square max-w-[260px] mx-auto bg-slate-950 border border-white/5 rounded-full overflow-hidden flex items-center justify-center p-4">
                      {/* SVG Wagon Wheel */}
                      <svg viewBox="0 0 200 200" className="w-full h-full">
                        {/* Cricket Oval Boundary Ring */}
                        <circle cx="100" cy="100" r="90" fill="none" stroke="#16a34a" strokeWidth="2" strokeDasharray="3 3" />
                        <circle cx="100" cy="100" r="75" fill="none" stroke="#22c55e" strokeWidth="1" opacity="0.3" />
                        {/* 30 Yard Circle */}
                        <circle cx="100" cy="100" r="45" fill="none" stroke="#1e293b" strokeWidth="1.5" />
                        {/* Wickets Crease center representation */}
                        <rect x="97" y="85" width="6" height="30" fill="#facc15" opacity="0.3" rx="1" />
                        
                        {/* Plot hit vectors */}
                        {currentBalls.map((ball) => {
                          const coords = getBallHitCoordinates(ball)
                          let lineColor = '#94a3b8' // dot
                          if (ball.runs_batsman === 4) lineColor = '#3b82f6' // four
                          else if (ball.runs_batsman === 6) lineColor = '#a855f7' // six
                          else if (ball.runs_batsman > 0) lineColor = '#10b981' // runs
                          else if (ball.is_wicket) lineColor = '#ef4444' // wicket

                          return (
                            <line
                              key={ball.id}
                              x1="100"
                              y1="100"
                              x2={coords.x}
                              y2={coords.y}
                              stroke={lineColor}
                              strokeWidth={ball.runs_batsman >= 4 ? '1.8' : '1'}
                              opacity={ball.runs_batsman === 0 ? '0.2' : '0.8'}
                            />
                          )
                        })}
                        {/* Pitch center dot */}
                        <circle cx="100" cy="100" r="3" fill="#ffffff" />
                      </svg>

                      {/* Legend labels */}
                      <div className="absolute top-2 left-2 text-[8px] font-black text-slate-500 tracking-wider">OFF SIDE</div>
                      <div className="absolute top-2 right-2 text-[8px] font-black text-slate-500 tracking-wider">LEG SIDE</div>
                    </div>

                    {/* Wheel Legend */}
                    <div className="flex gap-3 justify-center text-[9px] font-black flex-wrap">
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> 6s</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> 4s</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> 1-3 Runs</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Wicket</span>
                    </div>
                  </div>

                  {/* Bowler Pitch Map */}
                  <div className="bento-card p-5 space-y-4 border border-white/5!">
                    <div>
                      <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Bowler Pitch Map</h4>
                      <p className="text-[9px] text-slate-500 font-semibold mt-0.5">Delivery landing length profiles</p>
                    </div>

                    <div className="relative w-full max-w-[150px] aspect-[1/2] mx-auto bg-slate-950 border-2 border-slate-900 overflow-hidden shadow-inner p-2">
                      {/* SVG Cricket Pitch (vertical) */}
                      <svg viewBox="0 0 40 100" className="w-full h-full">
                        {/* Creases */}
                        <line x1="5" y1="15" x2="35" y2="15" stroke="#334155" strokeWidth="1" />
                        <line x1="5" y1="85" x2="35" y2="85" stroke="#334155" strokeWidth="1" />
                        
                        {/* Wickets */}
                        <circle cx="18" cy="12" r="1" fill="#facc15" />
                        <circle cx="20" cy="12" r="1" fill="#facc15" />
                        <circle cx="22" cy="12" r="1" fill="#facc15" />
                        
                        <circle cx="18" cy="88" r="1" fill="#facc15" />
                        <circle cx="20" cy="88" r="1" fill="#facc15" />
                        <circle cx="22" cy="88" r="1" fill="#facc15" />

                        {/* Length zones */}
                        {/* Short: 15-35 */}
                        <rect x="0" y="15" width="40" height="20" fill="#ef4444" opacity="0.05" />
                        {/* Good Length: 35-65 */}
                        <rect x="0" y="35" width="40" height="30" fill="#22c55e" opacity="0.05" />
                        {/* Full: 65-85 */}
                        <rect x="0" y="65" width="40" height="20" fill="#eab308" opacity="0.05" />

                        {/* Plot landing dots */}
                        {currentBalls.map((ball) => {
                          const coords = getPitchLandingCoordinates(ball)
                          let dotColor = '#e2e8f0'
                          if (ball.runs_batsman === 0) dotColor = '#22c55e'
                          else if (ball.runs_batsman >= 4) dotColor = '#a855f7'
                          else if (ball.is_wicket) dotColor = '#ef4444'
                          else dotColor = '#3b82f6'

                          return (
                            <circle
                              key={ball.id}
                              cx={coords.x}
                              cy={coords.y}
                              r="1.8"
                              fill={dotColor}
                              stroke="#000000"
                              strokeWidth="0.3"
                              opacity="0.85"
                            />
                          )
                        })}
                      </svg>

                      {/* Visual overlays */}
                      <div className="absolute top-[20%] left-2 text-[7px] font-black text-red-500/60 uppercase">Short</div>
                      <div className="absolute top-[50%] left-2 text-[7px] font-black text-green-500/60 uppercase">Good</div>
                      <div className="absolute top-[75%] left-2 text-[7px] font-black text-yellow-500/60 uppercase">Full</div>
                    </div>

                    {/* Pitch Legend */}
                    <div className="flex gap-3 justify-center text-[9px] font-black flex-wrap">
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Dot</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> 1-3 R</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> Boundary</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Wicket</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-Tab 3: Win Predictor */}
              {liveTab === 'predictor' && (
                <div className="bento-card p-6 space-y-6 border border-white/5! animate-scaleUp">
                  <div className="text-center space-y-2">
                    <h3 className="text-[10px] font-black text-white uppercase tracking-widest">DRHV Live Win Predictor</h3>
                    <p className="text-xs text-slate-400 font-semibold max-w-sm mx-auto leading-relaxed">
                      Calculating probabilities in real time based on wickets remaining, target pressures, and current tournament forms.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-8 md:gap-16 py-4">
                    {/* Prob Team 1 */}
                    <div className="text-center space-y-1">
                      <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider">{match.team1?.short_name} Probability</span>
                      <div className="text-4xl font-black text-emerald-450">{winProbability.team1}%</div>
                    </div>

                    {/* Visual Probability Gauge Bar */}
                    <div className="flex-1 w-full max-w-xs h-6 bg-slate-900 border border-white/10 p-0.5 rounded-full flex overflow-hidden shadow-inner relative">
                      {/* Team 1 bar */}
                      <div
                        className="bg-emerald-500 transition-all duration-500 h-full"
                        style={{ width: `${winProbability.team1}%` }}
                      ></div>
                      {/* Team 2 bar */}
                      <div
                        className="bg-yellow-500 transition-all duration-500 h-full flex-1"
                      ></div>
                      
                      {/* Split divider indicator */}
                      <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-black opacity-30"></div>
                    </div>

                    {/* Prob Team 2 */}
                    <div className="text-center space-y-1">
                      <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider">{match.team2?.short_name} Probability</span>
                      <div className="text-4xl font-black text-yellow-500">{winProbability.team2}%</div>
                    </div>
                  </div>

                  {/* Context notes */}
                  <div className="bg-slate-950/40 border border-white/5 p-4 rounded-xl text-center text-[10px] font-semibold text-slate-400 leading-relaxed max-w-md mx-auto">
                    👉 {match.current_innings === 1
                      ? `Innings 1 is in progress. Predictor is weighing projected score against a historical par target of 160.`
                      : `Innings 2 is in progress. Defending ${innings1?.runs + 1} runs. Required run rate is ${requiredRRR} runs/over.`
                    }
                  </div>
                </div>
              )}

              {/* Sub-Tab 4: Stadium Soundboard */}
              {liveTab === 'soundboard' && (
                <div className="bento-card p-6 space-y-4 border border-white/5! animate-scaleUp">
                  <div>
                    <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Interactive Fan Soundboard</h3>
                    <p className="text-[9px] text-slate-500 font-semibold mt-0.5">Synthesize authentic stadium ambiance triggers dynamically in your browser</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                    <button
                      onClick={() => playSynthesizedSound('bat')}
                      className="p-4 bg-slate-900 hover:bg-slate-850 border border-white/5 rounded-2xl flex flex-col items-center gap-2 transition-all hover:scale-[1.02] shadow-sm text-center"
                    >
                      <span className="text-2xl">🏏</span>
                      <span className="text-[10px] font-black text-white uppercase tracking-wider">Willow Bat Crack</span>
                    </button>
                    
                    <button
                      onClick={() => playSynthesizedSound('horn')}
                      className="p-4 bg-slate-900 hover:bg-slate-850 border border-white/5 rounded-2xl flex flex-col items-center gap-2 transition-all hover:scale-[1.02] shadow-sm text-center"
                    >
                      <span className="text-2xl">📯</span>
                      <span className="text-[10px] font-black text-white uppercase tracking-wider">Boundary Horn</span>
                    </button>
                    
                    <button
                      onClick={() => playSynthesizedSound('crowd')}
                      className="p-4 bg-slate-900 hover:bg-slate-850 border border-white/5 rounded-2xl flex flex-col items-center gap-2 transition-all hover:scale-[1.02] shadow-sm text-center"
                    >
                      <span className="text-2xl">🏟️</span>
                      <span className="text-[10px] font-black text-white uppercase tracking-wider">Crowd Roar</span>
                    </button>
                    
                    <button
                      onClick={() => playSynthesizedSound('wicket')}
                      className="p-4 bg-slate-900 hover:bg-slate-850 border border-white/5 rounded-2xl flex flex-col items-center gap-2 transition-all hover:scale-[1.02] shadow-sm text-center"
                    >
                      <span className="text-2xl">⚡</span>
                      <span className="text-[10px] font-black text-white uppercase tracking-wider">Stumps Clash</span>
                    </button>

                    <button
                      onClick={() => playSynthesizedSound('whistle')}
                      className="p-4 bg-slate-900 hover:bg-slate-850 border border-white/5 rounded-2xl flex flex-col items-center gap-2 transition-all hover:scale-[1.02] shadow-sm text-center"
                    >
                      <span className="text-2xl">🌬️</span>
                      <span className="text-[10px] font-black text-white uppercase tracking-wider">Referee Whistle</span>
                    </button>

                    <button
                      onClick={() => playSynthesizedSound('siren')}
                      className="p-4 bg-slate-900 hover:bg-slate-850 border border-white/5 rounded-2xl flex flex-col items-center gap-2 transition-all hover:scale-[1.02] shadow-sm text-center"
                    >
                      <span className="text-2xl">🚨</span>
                      <span className="text-[10px] font-black text-white uppercase tracking-wider">Airhorn Siren</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right column: Fall of Wickets */}
            <div className="space-y-6">
              <div className="bento-card p-5 space-y-4 border border-white/5!">
                <h3 className="text-[10px] font-black text-white uppercase tracking-widest border-b border-white/5 pb-2">
                  Fall of Wickets
                </h3>
                {currentFOW.length > 0 ? (
                  <div className="space-y-3">
                    {currentFOW.map((wicket) => (
                      <div key={wicket.number} className="flex justify-between items-center text-xs text-slate-350">
                        <span className="font-semibold text-slate-400">
                          {wicket.number} - <strong className="text-white font-extrabold">{wicket.score}</strong> ({wicket.batsmanName})
                        </span>
                        <span className="font-extrabold text-[10px] text-slate-500 uppercase">Over {wicket.over}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-550 italic">No wickets fallen in this innings.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Innings 1 Scorecard */}
        {activeTab === 'scorecard1' && innings1 && (
          <div className="space-y-6">
            {/* Batting Card */}
            <div className="bento-card overflow-hidden p-0! border border-white/5!">
              <div className="px-5 py-4 bg-slate-950/40 border-b border-white/5 flex justify-between items-center">
                <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest">Batting</h3>
                <span className="text-xs font-black text-white">
                  {innings1.runs}/{innings1.wickets} ({getOversString(inn1Balls)} ov)
                </span>
              </div>
              <table className="w-full text-left text-xs md:text-sm">
                <thead>
                  <tr className="bg-slate-950/20 text-slate-400 uppercase tracking-widest text-[9px] border-b border-white/5">
                    <th className="py-3 px-5">Batsman</th>
                    <th className="py-3 px-2">Dismissal</th>
                    <th className="py-3 px-2 text-center w-14">Runs</th>
                    <th className="py-3 px-2 text-center w-14">Balls</th>
                    <th className="py-3 px-2 text-center w-12">4s</th>
                    <th className="py-3 px-2 text-center w-12">6s</th>
                    <th className="py-3 px-5 text-right w-20">SR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {getBatsmanListStats(inn1Balls, innings1.batting_team_id).map((b) => (
                    <tr key={b.id} className="hover:bg-white/[0.01]">
                      <td className="py-3.5 px-5 font-bold text-slate-200">{b.name}</td>
                      <td className="py-3.5 px-2 text-slate-500 text-xs italic">{b.dismissalText}</td>
                      <td className="py-3.5 px-2 text-center font-black text-white">{b.runs}</td>
                      <td className="py-3.5 px-2 text-center text-slate-300">{b.balls}</td>
                      <td className="py-3.5 px-2 text-center text-slate-400">{b.fours}</td>
                      <td className="py-3.5 px-2 text-center text-slate-400">{b.sixes}</td>
                      <td className="py-3.5 px-5 text-right font-extrabold text-slate-400">
                        {b.balls > 0 ? ((b.runs * 100) / b.balls).toFixed(1) : '0.0'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bowling Card */}
            <div className="bento-card overflow-hidden p-0! border border-white/5!">
              <div className="px-5 py-4 bg-slate-950/40 border-b border-white/5">
                <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest">Bowling</h3>
              </div>
              <table className="w-full text-left text-xs md:text-sm">
                <thead>
                  <tr className="bg-slate-950/20 text-slate-400 uppercase tracking-widest text-[9px] border-b border-white/5">
                    <th className="py-3 px-5">Bowler</th>
                    <th className="py-3 px-2 text-center w-14">Overs</th>
                    <th className="py-3 px-2 text-center w-14">Maidens</th>
                    <th className="py-3 px-2 text-center w-14">Runs</th>
                    <th className="py-3 px-2 text-center w-14 font-extrabold text-slate-250">Wickets</th>
                    <th className="py-3 px-5 text-right w-20">Economy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {getBowlerListStats(inn1Balls, innings1.bowling_team_id).map((b) => (
                    <tr key={b.id} className="hover:bg-white/[0.01]">
                      <td className="py-3.5 px-5 font-bold text-slate-200">{b.name}</td>
                      <td className="py-3.5 px-2 text-center text-slate-350 font-semibold">{b.overs}</td>
                      <td className="py-3.5 px-2 text-center text-slate-450">{b.maidens}</td>
                      <td className="py-3.5 px-2 text-center text-slate-300">{b.runsConceded}</td>
                      <td className="py-3.5 px-2 text-center font-black text-emerald-450 text-sm">{b.wickets}</td>
                      <td className="py-3.5 px-5 text-right font-extrabold text-slate-405">
                        {b.ballsBowled > 0 ? ((b.runsConceded * 6) / b.ballsBowled).toFixed(2) : '0.00'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Innings 2 Scorecard */}
        {activeTab === 'scorecard2' && innings2 && (
          <div className="space-y-6">
            {/* Batting Card */}
            <div className="bento-card overflow-hidden p-0! border border-white/5!">
              <div className="px-5 py-4 bg-slate-950/40 border-b border-white/5 flex justify-between items-center">
                <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest">Batting</h3>
                <span className="text-xs font-black text-white">
                  {innings2.runs}/{innings2.wickets} ({getOversString(inn2Balls)} ov)
                </span>
              </div>
              <table className="w-full text-left text-xs md:text-sm">
                <thead>
                  <tr className="bg-slate-950/20 text-slate-400 uppercase tracking-widest text-[9px] border-b border-white/5">
                    <th className="py-3 px-5">Batsman</th>
                    <th className="py-3 px-2">Dismissal</th>
                    <th className="py-3 px-2 text-center w-14">Runs</th>
                    <th className="py-3 px-2 text-center w-14">Balls</th>
                    <th className="py-3 px-2 text-center w-12">4s</th>
                    <th className="py-3 px-2 text-center w-12">6s</th>
                    <th className="py-3 px-5 text-right w-20">SR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {getBatsmanListStats(inn2Balls, innings2.batting_team_id).map((b) => (
                    <tr key={b.id} className="hover:bg-white/[0.01]">
                      <td className="py-3.5 px-5 font-bold text-slate-200">{b.name}</td>
                      <td className="py-3.5 px-2 text-slate-500 text-xs italic">{b.dismissalText}</td>
                      <td className="py-3.5 px-2 text-center font-black text-white">{b.runs}</td>
                      <td className="py-3.5 px-2 text-center text-slate-300">{b.balls}</td>
                      <td className="py-3.5 px-2 text-center text-slate-400">{b.fours}</td>
                      <td className="py-3.5 px-2 text-center text-slate-400">{b.sixes}</td>
                      <td className="py-3.5 px-5 text-right font-extrabold text-slate-400">
                        {b.balls > 0 ? ((b.runs * 100) / b.balls).toFixed(1) : '0.0'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bowling Card */}
            <div className="bento-card overflow-hidden p-0! border border-white/5!">
              <div className="px-5 py-4 bg-slate-950/40 border-b border-white/5">
                <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest">Bowling</h3>
              </div>
              <table className="w-full text-left text-xs md:text-sm">
                <thead>
                  <tr className="bg-slate-950/20 text-slate-400 uppercase tracking-widest text-[9px] border-b border-white/5">
                    <th className="py-3 px-5">Bowler</th>
                    <th className="py-3 px-2 text-center w-14">Overs</th>
                    <th className="py-3 px-2 text-center w-14">Maidens</th>
                    <th className="py-3 px-2 text-center w-14">Runs</th>
                    <th className="py-3 px-2 text-center w-14 font-extrabold text-slate-250">Wickets</th>
                    <th className="py-3 px-5 text-right w-20">Economy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {getBowlerListStats(inn2Balls, innings2.bowling_team_id).map((b) => (
                    <tr key={b.id} className="hover:bg-white/[0.01]">
                      <td className="py-3.5 px-5 font-bold text-slate-200">{b.name}</td>
                      <td className="py-3.5 px-2 text-center text-slate-350 font-semibold">{b.overs}</td>
                      <td className="py-3.5 px-2 text-center text-slate-455">{b.maidens}</td>
                      <td className="py-3.5 px-2 text-center text-slate-300">{b.runsConceded}</td>
                      <td className="py-3.5 px-2 text-center font-black text-emerald-450 text-sm">{b.wickets}</td>
                      <td className="py-3.5 px-5 text-right font-extrabold text-slate-405">
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    onClick={() => setLightboxImg(photo.image_url)}
                    className="bento-card overflow-hidden shadow-md cursor-pointer hover:border-emerald-500/20 transition-all hover:-translate-y-0.5 group relative aspect-video p-0! border border-white/5!"
                  >
                    <img
                      src={photo.image_url}
                      alt={photo.caption}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="bg-emerald-500 text-slate-950 font-black text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow">
                        <Eye className="w-4 h-4" /> View Full
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bento-card p-12 text-center text-slate-450 border border-white/5!">
                <Image className="w-10 h-10 mx-auto text-slate-650 mb-2" />
                <p className="text-sm font-semibold">No photos from this match yet.</p>
                <p className="text-xs text-slate-550 mt-1">
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
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxImg(null)}
        >
          <img
            src={lightboxImg}
            alt="Gallery Lightbox"
            className="max-w-full max-h-[85vh] rounded-3xl border border-white/5 shadow-2xl object-contain animate-fadeIn"
          />
        </div>
      )}
    </div>
  )
}
