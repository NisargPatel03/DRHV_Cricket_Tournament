import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/Spinner'
import { Play, RotateCcw, AlertTriangle, UserCheck, ShieldAlert, Award, AlertCircle, ArrowLeft, Check } from 'lucide-react'

export default function LiveScoring() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Modals / Selection states
  const [showWicketModal, setShowWicketModal] = useState(false)
  const [showBowlerSelect, setShowBowlerSelect] = useState(false)
  const [showBatsmanSelect, setShowBatsmanSelect] = useState(false)
  const [showManOfMatchSelect, setShowManOfMatchSelect] = useState(false)

  // Toss & Setup Form states
  const [battingFirstTeamId, setBattingFirstTeamId] = useState('')
  const [openingStrikerId, setOpeningStrikerId] = useState('')
  const [openingNonStrikerId, setOpeningNonStrikerId] = useState('')
  const [openingBowlerId, setOpeningBowlerId] = useState('')

  // Selected new batsman / bowler replacements
  const [selectedNewBatsmanId, setSelectedNewBatsmanId] = useState('')
  const [selectedNewBowlerId, setSelectedNewBowlerId] = useState('')
  const [selectedManOfMatchId, setSelectedManOfMatchId] = useState('')

  // Wicket dismissal form states
  const [wicketType, setWicketType] = useState('bowled')
  const [outBatsmanId, setOutBatsmanId] = useState('')
  const [fielderId, setFielderId] = useState('')

  // Extra type selector state (toggled when clicking wide/noball/etc)
  const [extraType, setExtraType] = useState('none') // 'none', 'wide', 'no_ball', 'bye', 'leg_bye'
  const [alertConfig, setAlertConfig] = useState(null) // { message, type }

  const showAlert = (message, type = 'info') => {
    setAlertConfig({ message, type })
    setTimeout(() => {
      setAlertConfig((prev) => prev?.message === message ? null : prev)
    }, 6000)
  }

  // 1. Fetch Match Details
  const { data: match, isLoading: loadingMatch } = useQuery({
    queryKey: ['scorer_match_details', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          team1:team1_id (*),
          team2:team2_id (*)
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    }
  })

  // 2. Fetch Innings details
  const { data: innings } = useQuery({
    queryKey: ['scorer_match_innings', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('innings')
        .select('*')
        .eq('match_id', id)
        .order('innings_number', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!match
  })

  // 3. Fetch players registered for both teams (squad selection)
  const { data: team1Players } = useQuery({
    queryKey: ['scorer_team1_players', match?.team1_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', match.team1_id)
        .order('name', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!match
  })

  const { data: team2Players } = useQuery({
    queryKey: ['scorer_team2_players', match?.team2_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', match.team2_id)
        .order('name', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!match
  })

  // 4. Fetch All Balls in current match
  const { data: balls } = useQuery({
    queryKey: ['scorer_match_balls', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('balls')
        .select(`
          *,
          batsman:batsman_id (name),
          bowler:bowler_id (name)
        `)
        .in('innings_id', innings?.map((i) => i.id) || [])
        .order('created_at', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!innings && innings.length > 0
  })

  const currentInnings = innings?.find((i) => i.innings_number === match?.current_innings)
  const currentBalls = balls?.filter((b) => b.innings_id === currentInnings?.id) || []
  
  // List of player IDs who have been dismissed in this innings
  const dismissedPlayerIds = currentBalls
    ?.filter((b) => b.is_wicket && b.wicket_player_id)
    ?.map((b) => b.wicket_player_id) || []

  // Prepping helper lists
  const battingTeamPlayers = currentInnings?.batting_team_id === match?.team1_id ? team1Players : team2Players
  const bowlingTeamPlayers = currentInnings?.bowling_team_id === match?.team1_id ? team1Players : team2Players

  // Innings and ball counts
  const getFairBallsCount = (ballList) => {
    return ballList.filter((b) => b.extra_type !== 'wide' && b.extra_type !== 'no_ball').length
  }
  const currentFairBalls = getFairBallsCount(currentBalls)

  // Board is only ready when innings has the required player columns populated
  const boardReady = !!(currentInnings?.striker_id && currentInnings?.bowler_id && currentInnings?.non_striker_id)

  // Helper: convert fair ball count to overs string e.g. 7 balls -> "1.1"
  const getOversString = (ballList) => {
    const fair = getFairBallsCount(ballList)
    const overs = Math.floor(fair / 6)
    const balls = fair % 6
    return `${overs}.${balls}`
  }

  // Current run rate
  const currentCRR = (() => {
    if (!currentInnings || currentFairBalls === 0) return '0.00'
    const oversDecimal = currentFairBalls / 6
    return (currentInnings.runs / oversDecimal).toFixed(2)
  })()

  // 5. UPDATE INNINGS MUTATION
  const updateInningsMutation = useMutation({
    mutationFn: async ({ inningsId, data }) => {
      const { error } = await supabase
        .from('innings')
        .update(data)
        .eq('id', inningsId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scorer_match_innings', id] })
    },
    onError: (err) => {
      showAlert('Innings update failed: ' + (err?.message || 'Unknown error. Check Supabase columns striker_id/non_striker_id/bowler_id exist on innings table.'), 'error')
    }
  })

  // 6. TOSS SETUP SUBMISSION (Starts Live Match Innings 1)
  const setupMatchMutation = useMutation({
    mutationFn: async ({ tossWinnerId, tossLoserId }) => {
      // 1. Set match status to live, current_innings = 1
      const { error: matchErr } = await supabase
        .from('matches')
        .update({
          status: 'live',
          current_innings: 1
        })
        .eq('id', id)

      if (matchErr) throw matchErr

      // 2. Insert Innings 1 record
      const { data: innData, error: innErr } = await supabase
        .from('innings')
        .insert([{
          match_id: id,
          innings_number: 1,
          batting_team_id: tossWinnerId,
          bowling_team_id: tossLoserId,
          runs: 0,
          wickets: 0,
          total_balls: 0,
          striker_id: openingStrikerId,
          non_striker_id: openingNonStrikerId,
          bowler_id: openingBowlerId
        }])
        .select()

      if (innErr) throw innErr

      // 3. Register players to match_squads (playing XI)
      const matchSquads = []
      team1Players.forEach((p) => {
        matchSquads.push({ match_id: id, team_id: match.team1_id, player_id: p.id })
      })
      team2Players.forEach((p) => {
        matchSquads.push({ match_id: id, team_id: match.team2_id, player_id: p.id })
      })

      const { error: squadErr } = await supabase
        .from('match_squads')
        .insert(matchSquads)

      if (squadErr) throw squadErr

      return innData
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scorer_match_details', id] })
      queryClient.invalidateQueries({ queryKey: ['scorer_match_innings', id] })
    }
  })

  // 7. RECORD BALL MUTATION
  const recordBallMutation = useMutation({
    mutationFn: async (ballData) => {
      // Guard: ensure innings columns exist
      if (!ballData.batsman_id || !ballData.bowler_id || !ballData.non_striker_id) {
        throw new Error('Missing batsman/bowler IDs. Ensure the innings table has striker_id, non_striker_id, bowler_id columns in Supabase. Run the ALTER TABLE SQL from supabase_schema.sql.')
      }
      // 1. Insert new ball
      const { data: ball, error: ballErr } = await supabase
        .from('balls')
        .insert([ballData])
      if (ballErr) throw ballErr

      // 2. Update runs and wickets count in Innings
      const isWideNoBall = ballData.extra_type === 'wide' || ballData.extra_type === 'no_ball'
      const isFair = !isWideNoBall
      
      let runsAdded = ballData.runs_batsman + ballData.runs_extras
      let wicketsAdded = ballData.is_wicket && ballData.wicket_type !== 'retired_hurt' ? 1 : 0
      let ballsAdded = isFair ? 1 : 0

      const newRuns = currentInnings.runs + runsAdded
      const newWickets = currentInnings.wickets + wicketsAdded
      const newTotalBalls = currentInnings.total_balls + ballsAdded

      // Strike rotation logic
      let newStrikerId = currentInnings.striker_id
      let newNonStrikerId = currentInnings.non_striker_id
      
      // Rotate strike on odd runs scored off bat (if no extra bye/legbye rotations)
      if (ballData.runs_batsman === 1 || ballData.runs_batsman === 3) {
        newStrikerId = currentInnings.non_striker_id
        newNonStrikerId = currentInnings.striker_id
      }

      // Rotate strike at end of over (6 fair balls)
      const currentFairDeliveriesInOver = (currentFairBalls + ballsAdded) % 6
      if (currentFairDeliveriesInOver === 0 && ballsAdded === 1) {
        // Swap strike
        const temp = newStrikerId
        newStrikerId = newNonStrikerId
        newNonStrikerId = temp
      }

      const updatePayload = {
        runs: newRuns,
        wickets: newWickets,
        total_balls: newTotalBalls,
        striker_id: newStrikerId,
        non_striker_id: newNonStrikerId
      }

      const { error: innErr } = await supabase
        .from('innings')
        .update(updatePayload)
        .eq('id', currentInnings.id)

      if (innErr) throw innErr

      return {
        overComplete: currentFairDeliveriesInOver === 0 && ballsAdded === 1,
        wicketsCount: newWickets,
        totalBallsCount: newTotalBalls
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['scorer_match_balls', id] })
      queryClient.invalidateQueries({ queryKey: ['scorer_match_innings', id] })
      
      // Auto triggers check
      const maxBalls = match.overs_limit * 6
      const totalBattingPlayers = battingTeamPlayers?.length || 11
      const allOut = result.wicketsCount >= 10 || result.wicketsCount >= (totalBattingPlayers - 1)
      const oversFinished = result.totalBallsCount >= maxBalls

      if (allOut || oversFinished) {
        handleInningsEnd()
      } else if (result.overComplete) {
        // Trigger bowler selection for next over!
        setShowBowlerSelect(true)
      }
    },
    onError: (err) => {
      showAlert('Ball record failed: ' + (err?.message || 'Unknown error.') + '. Verify Supabase database columns striker_id/non_striker_id/bowler_id on innings.', 'error')
    }
  })

  // 8. UNDO LAST BALL MUTATION
  const undoLastBallMutation = useMutation({
    mutationFn: async () => {
      if (currentBalls.length === 0) return

      const lastBall = currentBalls[currentBalls.length - 1]

      // 1. Delete last ball
      const { error: deleteErr } = await supabase
        .from('balls')
        .delete()
        .eq('id', lastBall.id)
      if (deleteErr) throw deleteErr

      // 2. Decrement values in innings
      const isFair = lastBall.extra_type !== 'wide' && lastBall.extra_type !== 'no_ball'
      let runsSubtracted = lastBall.runs_batsman + lastBall.runs_extras
      let wicketsSubtracted = lastBall.is_wicket && lastBall.wicket_type !== 'retired_hurt' ? 1 : 0
      let ballsSubtracted = isFair ? 1 : 0

      // Revert strike rotation if odd runs off bat
      let newStrikerId = currentInnings.striker_id
      let newNonStrikerId = currentInnings.non_striker_id
      if (lastBall.runs_batsman === 1 || lastBall.runs_batsman === 3) {
        newStrikerId = currentInnings.non_striker_id
        newNonStrikerId = currentInnings.striker_id
      }

      // Revert over-end strike rotation
      if (currentFairBalls % 6 === 0 && isFair) {
        const temp = newStrikerId
        newStrikerId = newNonStrikerId
        newNonStrikerId = temp
      }

      const { error: innErr } = await supabase
        .from('innings')
        .update({
          runs: Math.max(0, currentInnings.runs - runsSubtracted),
          wickets: Math.max(0, currentInnings.wickets - wicketsSubtracted),
          total_balls: Math.max(0, currentInnings.total_balls - ballsSubtracted),
          striker_id: newStrikerId,
          non_striker_id: newNonStrikerId
        })
        .eq('id', currentInnings.id)

      if (innErr) throw innErr
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scorer_match_balls', id] })
      queryClient.invalidateQueries({ queryKey: ['scorer_match_innings', id] })
    },
    onError: (err) => {
      showAlert('Undo failed: ' + (err?.message || 'Unknown error.'), 'error')
    }
  })

  // 9. INNINGS COMPLETE AND CONCLUDE MATCH MUTATION
  const finishMatchMutation = useMutation({
    mutationFn: async ({ winnerId, margin, manOfMatchId }) => {
      const { error } = await supabase
        .from('matches')
        .update({
          status: 'completed',
          winner_id: winnerId,
          result_margin: margin,
          man_of_the_match_id: manOfMatchId
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      showAlert('Match scored successfully! Redirecting...', 'success')
      setTimeout(() => navigate('/scorer'), 2000)
    }
  })

  const startSetupSubmit = (e) => {
    e.preventDefault()
    if (!battingFirstTeamId) return
    if (openingStrikerId === openingNonStrikerId) {
      showAlert('Striker and Non-striker must be different players!', 'warning')
      return
    }

    const tossWinnerId = battingFirstTeamId
    const tossLoserId = tossWinnerId === match.team1_id ? match.team2_id : match.team1_id

    setupMatchMutation.mutate({ tossWinnerId, tossLoserId })
  }

  // Innings Setup (Striker, Non-striker, Bowler) for active match (e.g. Innings 2 transition)
  const handleInningsSetupSubmit = async (e) => {
    e.preventDefault()
    if (!openingStrikerId || !openingNonStrikerId || !openingBowlerId) {
      showAlert('Please select all opening players!', 'warning')
      return
    }
    if (openingStrikerId === openingNonStrikerId) {
      showAlert('Striker and Non-striker must be different players!', 'warning')
      return
    }

    try {
      await updateInningsMutation.mutateAsync({
        inningsId: currentInnings.id,
        data: {
          striker_id: openingStrikerId,
          non_striker_id: openingNonStrikerId,
          bowler_id: openingBowlerId
        }
      })
      // Clear inputs
      setOpeningStrikerId('')
      setOpeningNonStrikerId('')
      setOpeningBowlerId('')
      setShowBatsmanSelect(false)
    } catch (err) {
      showAlert('Innings setup failed: ' + err.message, 'error')
    }
  }

  // Live Score event clicks
  const handleScoreRuns = (runs) => {
    let runsBatsman = runs
    let runsExtras = 0

    if (extraType === 'wide' || extraType === 'no_ball') {
      runsBatsman = 0 // runs don't count off bat unless it was a no_ball hit (handled separately)
      runsExtras = runs + 1 // includes the penalty run
    } else if (extraType === 'bye' || extraType === 'leg_bye') {
      runsBatsman = 0
      runsExtras = runs
    }

    const ballPayload = {
      innings_id: currentInnings.id,
      over_number: Math.floor(currentFairBalls / 6) + 1,
      ball_number: (currentFairBalls % 6) + 1,
      batsman_id: currentInnings.striker_id,
      non_striker_id: currentInnings.non_striker_id,
      bowler_id: currentInnings.bowler_id,
      runs_batsman: runsBatsman,
      runs_extras: runsExtras,
      extra_type: extraType,
      is_wicket: false
    }

    recordBallMutation.mutate(ballPayload)
    setExtraType('none') // Reset extras toggle
  }

  // Wicket Form submission
  const handleWicketSubmit = (e) => {
    e.preventDefault()
    if (!outBatsmanId) return

    const ballPayload = {
      innings_id: currentInnings.id,
      over_number: Math.floor(currentFairBalls / 6) + 1,
      ball_number: (currentFairBalls % 6) + 1,
      batsman_id: currentInnings.striker_id,
      non_striker_id: currentInnings.non_striker_id,
      bowler_id: currentInnings.bowler_id,
      runs_batsman: 0,
      runs_extras: 0,
      extra_type: 'none',
      is_wicket: true,
      wicket_type: wicketType,
      wicket_player_id: outBatsmanId,
      fielder_id: fielderId || null
    }

    recordBallMutation.mutate(ballPayload)
    setShowWicketModal(false)

    // Reset wicket form values
    setWicketType('bowled')
    setOutBatsmanId('')
    setFielderId('')

    // Prompt new batsman select if not all out
    const totalBattingPlayers = battingTeamPlayers?.length || 11
    const potentialWickets = currentInnings.wickets + 1
    const allOut = potentialWickets >= 10 || potentialWickets >= (totalBattingPlayers - 1)

    if (allOut) {
      showAlert('Team is all out! Next innings will start.', 'warning')
      setShowBatsmanSelect(false)
    } else {
      setShowBatsmanSelect(true)
    }
  }

  const handleInningsEnd = async () => {
    // End Innings 1 or Innings 2?
    if (match.current_innings === 1) {
      showAlert('Innings 1 complete! Configure Innings 2 Opening Batsmen and Bowler.', 'success')
      
      // Mark Innings 1 as complete
      await supabase
        .from('innings')
        .update({ is_complete: true })
        .eq('id', currentInnings.id)

      // Create Innings 2 record
      const tossLoserId = currentInnings.batting_team_id === match.team1_id ? match.team2_id : match.team1_id
      const tossWinnerId = currentInnings.bowling_team_id === match.team1_id ? match.team2_id : match.team1_id

      const { data: inn2, error } = await supabase
        .from('innings')
        .insert([{
          match_id: id,
          innings_number: 2,
          batting_team_id: tossLoserId,
          bowling_team_id: tossWinnerId,
          runs: 0,
          wickets: 0,
          total_balls: 0
        }])
        .select()

      if (error) {
        console.error(error)
        return
      }

      // Update match to innings 2
      await supabase
        .from('matches')
        .update({ current_innings: 2 })
        .eq('id', id)

      queryClient.invalidateQueries({ queryKey: ['scorer_match_details', id] })
      queryClient.invalidateQueries({ queryKey: ['scorer_match_innings', id] })
      
      // Clear opening selectors to prompt select again for Innings 2
      setOpeningStrikerId('')
      setOpeningNonStrikerId('')
      setOpeningBowlerId('')
      // Show setup for Innings 2 (opening selections)
      setShowBatsmanSelect(false)
    } else {
      // Innings 2 Complete -> Match Concluded decider
      showAlert('Innings 2 complete! Conclude match and choose Man of the Match.', 'success')
      setShowManOfMatchSelect(true)
    }
  }

  // Conclude match decider (Team winner margins calculations)
  const handleConcludeMatchSubmit = (e) => {
    e.preventDefault()
    if (!selectedManOfMatchId) return

    const inn1 = innings.find((i) => i.innings_number === 1)
    const inn2 = innings.find((i) => i.innings_number === 2)

    let winnerId = null
    let margin = ''

    if (inn2.runs > inn1.runs) {
      // Batting second team wins
      winnerId = inn2.batting_team_id
      const wicketsRemaining = 10 - inn2.wickets
      const winningTeamName = winnerId === match.team1_id ? match.team1.name : match.team2.name
      margin = `${winningTeamName} won by ${wicketsRemaining} wickets`
    } else if (inn1.runs > inn2.runs) {
      // Batting first team wins
      winnerId = inn1.batting_team_id
      const runsDiff = inn1.runs - inn2.runs
      const winningTeamName = winnerId === match.team1_id ? match.team1.name : match.team2.name
      margin = `${winningTeamName} won by ${runsDiff} runs`
    } else {
      margin = 'Match tied'
    }

    finishMatchMutation.mutate({
      winnerId,
      margin,
      manOfMatchId: selectedManOfMatchId
    })
  }

  // Swap batsman strike manually
  const handleSwapStrike = async () => {
    if (!currentInnings) return
    const temp = currentInnings.striker_id
    await supabase
      .from('innings')
      .update({
        striker_id: currentInnings.non_striker_id,
        non_striker_id: temp
      })
      .eq('id', currentInnings.id)
    queryClient.invalidateQueries({ queryKey: ['scorer_match_innings', id] })
  }

  if (loadingMatch) return <Spinner message="Configuring official scoreboard console..." />
  if (!match) return <Spinner message="Loading match data..." />

  // Lock Scoring for Completed or Abandoned matches
  if (match.status === 'completed' || match.status === 'abandoned') {
    return (
      <div className="space-y-6 relative max-w-xl mx-auto py-12">
        <Link to="/scorer" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors font-mono">
          <ArrowLeft className="w-4 h-4 stroke-[3]" /> Back to Assigned Roster
        </Link>

        <div className="neo-brutalist-card-black p-8 md:p-12 text-center space-y-6 shadow-[8px_8px_0_#eab308]">
          <div className="w-16 h-16 bg-slate-900 border-2 border-black flex items-center justify-center mx-auto shadow-[3px_3px_0_#000] text-2xl rounded-none">
            🔒
          </div>
          
          <div className="space-y-2">
            <span className="text-[10px] bg-slate-800 text-yellow-400 font-black px-2.5 py-1 border-2 border-black uppercase tracking-wider inline-block font-mono">
              Match {match.status}
            </span>
            <h1 className="text-xl font-black text-white uppercase tracking-tight mt-2">Scoring Console Locked</h1>
            <p className="text-slate-400 text-xs leading-relaxed max-w-sm mx-auto font-mono">
              This match has already been marked as <strong>{match.status}</strong>. The live scoring dashboard has been archived and is read-only.
            </p>
          </div>

          {match.result_margin && (
            <div className="bg-emerald-500 border-2 border-black text-xs font-black text-black py-3 px-4 flex items-center justify-center gap-2 max-w-sm mx-auto shadow-[3px_3px_0_#000]">
              <Award className="w-4 h-4 shrink-0 text-black stroke-[3]" />
              <span>{match.result_margin}</span>
            </div>
          )}

          <div className="pt-4 border-t-2 border-black">
            <Link
              to="/scorer"
              className="inline-flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-600 text-black font-black text-xs uppercase tracking-wider py-3 px-6 rounded-none transition-all neo-brutalist-btn"
            >
              Return to Assigned Roster
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // 1. SETUP UI STAGE (Status upcoming)
  if (match.status === 'upcoming') {
    return (
      <div className="space-y-6 relative">
        {/* Premium Toast Notification Banner */}
        {alertConfig && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4 animate-scaleUp">
            <div className={`flex items-start gap-3 p-4 rounded-none border-2 border-black shadow-[6px_6px_0_#000] backdrop-blur-md transition-all duration-350 ${
              alertConfig.type === 'success' 
                ? 'bg-emerald-500 text-black' 
                : alertConfig.type === 'error' 
                ? 'bg-red-600 text-white' 
                : 'bg-yellow-500 text-black'
            }`}>
              <span className="text-lg font-bold">
                {alertConfig.type === 'success' ? '✅' : alertConfig.type === 'error' ? '❌' : '⚠️'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider mb-0.5">
                  {alertConfig.type === 'success' ? 'Success' : alertConfig.type === 'error' ? 'Error' : 'Notification'}
                </p>
                <p className="text-xs font-bold leading-relaxed break-words font-mono">{alertConfig.message}</p>
              </div>
              <button 
                type="button"
                onClick={() => setAlertConfig(null)}
                className="text-xs font-black hover:opacity-75 shrink-0 pl-1"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        <Link to="/scorer" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors font-mono">
          <ArrowLeft className="w-4 h-4 stroke-[3]" /> Back to Assigned Roster
        </Link>

        <form onSubmit={startSetupSubmit} className="neo-brutalist-card p-6 md:p-8 space-y-6">
          <div className="border-b-2 border-black pb-3">
            <h1 className="text-xl font-black text-white uppercase tracking-tight">Match Scoring Setup</h1>
            <p className="text-slate-400 text-xs mt-0.5 font-mono">Configure Toss results and select opening partnerships to begin</p>
          </div>

          <div className="space-y-6">
            {/* Toss decision */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3 font-mono">
                Toss Decision (Team Batting First)
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setBattingFirstTeamId(match.team1_id)}
                  className={`p-4 border-2 border-black text-xs font-black uppercase tracking-wider flex flex-col items-center gap-3 transition-all rounded-none ${
                    battingFirstTeamId === match.team1_id
                      ? 'border-yellow-500 bg-yellow-500 text-black shadow-[4px_4px_0_#000]'
                      : 'border-black bg-slate-900 hover:bg-slate-800 text-white shadow-[4px_4px_0_#000]'
                  }`}
                >
                  <img
                    src={match.team1?.logo_url || 'https://placehold.co/100x100?text=T1'}
                    alt={match.team1?.name}
                    className="w-12 h-12 rounded-none object-cover border-2 border-black shadow-[2px_2px_0_#000]"
                  />
                  <span>{match.team1?.name}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBattingFirstTeamId(match.team2_id)}
                  className={`p-4 border-2 border-black text-xs font-black uppercase tracking-wider flex flex-col items-center gap-3 transition-all rounded-none ${
                    battingFirstTeamId === match.team2_id
                      ? 'border-yellow-500 bg-yellow-500 text-black shadow-[4px_4px_0_#000]'
                      : 'border-black bg-slate-900 hover:bg-slate-800 text-white shadow-[4px_4px_0_#000]'
                  }`}
                >
                  <img
                    src={match.team2?.logo_url || 'https://placehold.co/100x100?text=T2'}
                    alt={match.team2?.name}
                    className="w-12 h-12 rounded-none object-cover border-2 border-black shadow-[2px_2px_0_#000]"
                  />
                  <span>{match.team2?.name}</span>
                </button>
              </div>
            </div>

            {/* Batsmen & Bowler selections */}
            {battingFirstTeamId && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t-2 border-black pt-6">
                {/* Striker */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
                    Opening Batter (Striker)
                  </label>
                  <select
                    required
                    className="w-full neo-brutalist-select py-2.5 px-3 text-xs"
                    value={openingStrikerId}
                    onChange={(e) => setOpeningStrikerId(e.target.value)}
                  >
                    <option value="">-- Choose Striker --</option>
                    {(battingFirstTeamId === match.team1_id ? team1Players : team2Players)?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.role})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Non striker */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
                    Opening Batter (Non-Striker)
                  </label>
                  <select
                    required
                    className="w-full neo-brutalist-select py-2.5 px-3 text-xs"
                    value={openingNonStrikerId}
                    onChange={(e) => setOpeningNonStrikerId(e.target.value)}
                  >
                    <option value="">-- Choose Non-Striker --</option>
                    {(battingFirstTeamId === match.team1_id ? team1Players : team2Players)?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.role})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bowler */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
                    Opening Bowler
                  </label>
                  <select
                    required
                    className="w-full neo-brutalist-select py-2.5 px-3 text-xs"
                    value={openingBowlerId}
                    onChange={(e) => setOpeningBowlerId(e.target.value)}
                  >
                    <option value="">-- Choose Bowler --</option>
                    {(battingFirstTeamId === match.team1_id ? team2Players : team1Players)?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t-2 border-black">
            <button
              type="submit"
              disabled={setupMatchMutation.isPending || !battingFirstTeamId}
              className="bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs uppercase tracking-wider py-3 px-6 rounded-none flex items-center gap-1.5 transition-all neo-brutalist-btn shadow-[4px_4px_0_#000]"
            >
              <Play className="w-4 h-4 fill-current stroke-[3]" /> Start Live Scoring
            </button>
          </div>
        </form>
      </div>
    )
  }

  // Find active striker and non-striker names
  const activeStriker = battingTeamPlayers?.find((p) => p.id === currentInnings?.striker_id)
  const activeNonStriker = battingTeamPlayers?.find((p) => p.id === currentInnings?.non_striker_id)
  const activeBowlerData = bowlingTeamPlayers?.find((p) => p.id === currentInnings?.bowler_id)

  // Guard: if match is live but innings haven't loaded yet
  if (!currentInnings) return <Spinner message="Loading innings data..." />

  // 1B. INNINGS SETUP STAGE (If striker, non-striker or bowler is missing in current active innings)
  if (currentInnings && !boardReady) {
    return (
      <div className="space-y-6 relative">
        {/* Premium Toast Notification Banner */}
        {alertConfig && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4 animate-scaleUp">
            <div className={`flex items-start gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-350 ${
              alertConfig.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700' 
                : alertConfig.type === 'error' 
                ? 'bg-red-500/10 border-red-500/20 text-red-700' 
                : 'bg-amber-500/10 border-amber-500/20 text-amber-700'
            }`}>
              <span className="text-lg">
                {alertConfig.type === 'success' ? '✅' : alertConfig.type === 'error' ? '❌' : '⚠️'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider mb-0.5">
                  {alertConfig.type === 'success' ? 'Success' : alertConfig.type === 'error' ? 'Error' : 'Notification'}
                </p>
                <p className="text-xs font-semibold leading-relaxed break-words">{alertConfig.message}</p>
              </div>
              <button 
                type="button"
                onClick={() => setAlertConfig(null)}
                className="text-xs font-bold hover:opacity-75 shrink-0 pl-1"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        <Link to="/scorer" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Assigned Roster
        </Link>

        <form onSubmit={handleInningsSetupSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
          <div className="border-b border-slate-100 pb-3">
            <span className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-widest block leading-none">
              Innings {match.current_innings} Initial Setup
            </span>
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight mt-1">Configure Crease & Bowler</h1>
            <p className="text-slate-400 text-xs mt-0.5">Select the opening batters and opening bowler for this innings to begin scoring</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Striker */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Opening Batter (Striker)
              </label>
              <select
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                value={openingStrikerId}
                onChange={(e) => setOpeningStrikerId(e.target.value)}
              >
                <option value="">-- Choose Striker --</option>
                {battingTeamPlayers?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Non striker */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Opening Batter (Non-Striker)
              </label>
              <select
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                value={openingNonStrikerId}
                onChange={(e) => setOpeningNonStrikerId(e.target.value)}
              >
                <option value="">-- Choose Non-Striker --</option>
                {battingTeamPlayers?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Bowler */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Opening Bowler
              </label>
              <select
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                value={openingBowlerId}
                onChange={(e) => setOpeningBowlerId(e.target.value)}
              >
                <option value="">-- Choose Bowler --</option>
                {bowlingTeamPlayers?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={updateInningsMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider py-3 px-6 rounded-xl shadow-lg shadow-emerald-600/10 flex items-center gap-1.5 transition-colors border border-emerald-600 disabled:opacity-50"
            >
              {updateInningsMutation.isPending ? 'Configuring Crease...' : 'Activate Scoring Control Board'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  // 2. LIVE SCORING STAGE VIEW (Status live)
  return (
    <div className="space-y-6 relative">
      {/* Premium Toast Notification Banner */}
      {alertConfig && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4 animate-scaleUp">
          <div className={`flex items-start gap-3 p-4 rounded-none border-2 border-black shadow-[6px_6px_0_#000] backdrop-blur-md transition-all duration-350 ${
            alertConfig.type === 'success' 
              ? 'bg-emerald-500 text-black' 
              : alertConfig.type === 'error' 
              ? 'bg-red-600 text-white' 
              : 'bg-yellow-500 text-black'
          }`}>
            <span className="text-lg font-bold">
              {alertConfig.type === 'success' ? '✅' : alertConfig.type === 'error' ? '❌' : '⚠️'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider mb-0.5 font-mono">
                {alertConfig.type === 'success' ? 'Success' : alertConfig.type === 'error' ? 'Error' : 'Notification'}
              </p>
              <p className="text-xs font-bold leading-relaxed break-words font-mono">{alertConfig.message}</p>
            </div>
            <button 
              type="button"
              onClick={() => setAlertConfig(null)}
              className="text-xs font-black hover:opacity-75 shrink-0 pl-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {/* 2A. REALTIME SCOREBOARD CARD */}
      {currentInnings && (
        <section className="neo-brutalist-lcd p-6 space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between border-b-2 border-black pb-3 flex-wrap gap-2">
            <div>
              <span className="text-[10px] text-black font-black uppercase tracking-widest block leading-none font-mono">
                Innings {match.current_innings} Scoring Ticker
              </span>
              <h2 className="text-xs font-black text-black uppercase mt-1 font-mono">
                Batting: {currentInnings.batting_team_id === match.team1_id ? match.team1?.name : match.team2?.name}
              </h2>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1.5 bg-red-600 border-2 border-black text-white text-[9px] font-black uppercase tracking-wider animate-pulse shadow-[2px_2px_0_#000] px-2 py-0.5">
                <span className="w-1.5 h-1.5 bg-white rounded-none"></span> Live
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center flex-wrap gap-4 py-2">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-black tracking-tight font-mono">
                {currentInnings.runs}/{currentInnings.wickets}
              </span>
              <span className="text-black/80 font-black text-sm uppercase tracking-wide font-mono">
                ({getOversString(currentBalls)} / {match.overs_limit} ov)
              </span>
            </div>

            <div className="flex gap-4 text-center">
              <div>
                <span className="block text-[9px] text-black/80 font-black uppercase tracking-wider font-mono">Run Rate (CRR)</span>
                <span className="text-lg font-black text-black mt-0.5 block font-mono">{currentCRR}</span>
              </div>
            </div>
          </div>

          {/* Active Batsmen and Bowler rows */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t-2 border-black pt-4">
            <div className="space-y-2">
              <span className="block text-[9px] text-black/95 font-black uppercase tracking-wider font-mono">Batsmen Partnership</span>
              <div className="bg-[#080c14] border-2 border-black p-3 space-y-2 text-xs text-white shadow-[3px_3px_0_#000] rounded-none">
                <div className="flex items-center justify-between font-black text-white">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-none bg-emerald-500 animate-pulse"></span>
                    <strong>{activeStriker?.name || 'Striker'} *</strong>
                  </span>
                  <span className="text-yellow-400 font-mono text-[10px]">Striking</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 font-bold">
                  <span>{activeNonStriker?.name || 'Non Striker'}</span>
                  <span className="text-slate-500 font-mono text-[10px]">Off strike</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <span className="block text-[9px] text-black/95 font-black uppercase tracking-wider font-mono">Bowler Assigned</span>
              <div className="bg-[#080c14] border-2 border-black p-3 flex justify-between items-center text-xs text-white shadow-[3px_3px_0_#000] rounded-none">
                <span className="font-black text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-none bg-purple-500"></span>
                  {activeBowlerData?.name || 'Bowler'}
                </span>
                <span className="font-black text-yellow-400 font-mono text-[10px]">Current Over</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2B. FAT-FINGER BUTTON GRID PANEL */}
      <section className="neo-brutalist-card p-6 shadow-[8px_8px_0_#000] space-y-6">
        <h3 className="text-xs font-black text-yellow-400 uppercase tracking-widest border-b-2 border-black pb-2 font-mono">
          Scoring Control Board
        </h3>

        {/* Extras toggle selectors */}
        {!boardReady && (
          <div className="bg-red-600 border-2 border-black px-4 py-3 text-xs text-white font-black flex items-start gap-2 shadow-[4px_4px_0_#000]">
            <span className="text-lg leading-none">⚠️</span>
            <div>
              <p className="font-black uppercase tracking-wider">Scoring board not ready — database columns missing!</p>
              <p className="mt-0.5 font-mono text-[11px] opacity-90">Run this SQL in your Supabase SQL Editor and refresh:</p>
              <pre className="mt-1.5 bg-slate-900 border border-black p-2 text-[10px] font-mono whitespace-pre-wrap select-all text-yellow-400">{`alter table public.innings add column if not exists striker_id uuid references public.players(id) on delete set null;
alter table public.innings add column if not exists non_striker_id uuid references public.players(id) on delete set null;
alter table public.innings add column if not exists bowler_id uuid references public.players(id) on delete set null;`}</pre>
            </div>
          </div>
        )}
        <div className="grid grid-cols-4 gap-2">
          {['wide', 'no_ball', 'bye', 'leg_bye'].map((type) => {
            const label = type.replace('_', ' ').toUpperCase()
            return (
              <button
                key={type}
                type="button"
                onClick={() => setExtraType(extraType === type ? 'none' : type)}
                className={`py-3 border-2 text-center rounded-none font-black text-[10px] tracking-wider uppercase transition-all shadow-[3px_3px_0_#000] ${
                  extraType === type
                    ? 'border-black bg-yellow-500 text-black'
                    : 'border-black bg-slate-900 hover:bg-slate-800 text-slate-350'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* Standard Runs Button grid (Larger sized buttons for field use!) */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[0, 1, 2, 3, 4, 6].map((run) => (
            <button
              key={run}
              type="button"
              disabled={!boardReady || recordBallMutation.isPending}
              onClick={() => handleScoreRuns(run)}
              className={`py-5 text-xl font-black border-2 text-center transition-all neo-brutalist-btn ${
                run === 4
                  ? 'bg-yellow-500 hover:bg-yellow-600 text-black shadow-[4px_4px_0_#000]'
                  : run === 6
                  ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-[4px_4px_0_#000]'
                  : run === 0
                  ? 'bg-slate-800 hover:bg-slate-950 text-white shadow-[4px_4px_0_#000]'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-black shadow-[4px_4px_0_#000]'
              }`}
            >
              {run} Runs
            </button>
          ))}
        </div>

        {/* Critical controls: Wicket and Undo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Swap Strike */}
          <button
            type="button"
            onClick={handleSwapStrike}
            className="py-4 border-2 border-black bg-white hover:bg-slate-100 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all neo-brutalist-btn shadow-[4px_4px_0_#000]"
          >
            🔄 Rotate Strike
          </button>

          {/* Undo */}
          <button
            type="button"
            disabled={currentBalls.length === 0}
            onClick={() => {
              if (window.confirm('Are you sure you want to undo the last delivery?')) {
                undoLastBallMutation.mutate()
              }
            }}
            className="py-4 border-2 border-black bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all neo-brutalist-btn shadow-[4px_4px_0_#000]"
          >
            <RotateCcw className="w-4 h-4 stroke-[3]" /> Undo Ball
          </button>

          {/* Wicket */}
          <button
            type="button"
            disabled={!boardReady || recordBallMutation.isPending}
            onClick={() => {
              setOutBatsmanId(currentInnings.striker_id) // default to striker out
              setShowWicketModal(true)
            }}
            className="py-4 border-2 border-black bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all neo-brutalist-btn shadow-[4px_4px_0_#ef4444]"
          >
            ⚠️ WICKET
          </button>
        </div>
      </section>

      {/* 2C. DISMISSAL POPUP MODAL */}
      {showWicketModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleWicketSubmit} className="bg-[#111827] border-4 border-black p-6 rounded-none w-full max-w-md space-y-4 shadow-[8px_8px_0_#ef4444] animate-scaleUp">
            <div className="border-b-2 border-black pb-2">
              <h3 className="font-black text-white uppercase tracking-tight text-base">Record Wicket Dismissal</h3>
              <p className="text-slate-400 text-xs mt-0.5 font-mono">Specify how the batsman got out</p>
            </div>

            <div className="space-y-4">
              {/* Dismissal type */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
                  Wicket Type
                </label>
                <select
                  required
                  className="w-full neo-brutalist-select py-2.5 px-3 text-xs"
                  value={wicketType}
                  onChange={(e) => setWicketType(e.target.value)}
                >
                  <option value="bowled">Bowled</option>
                  <option value="caught">Caught Out</option>
                  <option value="lbw">LBW</option>
                  <option value="stumped">Stumped</option>
                  <option value="run_out">Run Out</option>
                  <option value="hit_wicket">Hit Wicket</option>
                  <option value="retired_hurt">Retired Hurt (No wicket credit)</option>
                </select>
              </div>

              {/* Who is out */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
                  Dismissed Batsman
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setOutBatsmanId(currentInnings.striker_id)}
                    className={`py-2.5 px-3 border-2 border-black text-xs font-black transition-all rounded-none ${
                      outBatsmanId === currentInnings.striker_id
                        ? 'bg-red-600 text-white shadow-[3px_3px_0_#000]'
                        : 'bg-slate-900 text-slate-350 hover:bg-slate-800 shadow-[3px_3px_0_#000]'
                    }`}
                  >
                    {activeStriker?.name} (Striker)
                  </button>

                  <button
                    type="button"
                    onClick={() => setOutBatsmanId(currentInnings.non_striker_id)}
                    className={`py-2.5 px-3 border-2 border-black text-xs font-black transition-all rounded-none ${
                      outBatsmanId === currentInnings.non_striker_id
                        ? 'bg-red-600 text-white shadow-[3px_3px_0_#000]'
                        : 'bg-slate-900 text-slate-350 hover:bg-slate-800 shadow-[3px_3px_0_#000]'
                    }`}
                  >
                    {activeNonStriker?.name} (Non-Striker)
                  </button>
                </div>
              </div>

              {/* Fielder select (for catch/runout/stumping) */}
              {['caught', 'stumped', 'run_out'].includes(wicketType) && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
                    Fielder Involved
                  </label>
                  <select
                    className="w-full neo-brutalist-select py-2.5 px-3 text-xs"
                    value={fielderId}
                    onChange={(e) => setFielderId(e.target.value)}
                  >
                    <option value="">-- Choose Opposing Fielder --</option>
                    {bowlingTeamPlayers?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowWicketModal(false)}
                className="bg-white hover:bg-slate-100 text-black text-xs font-black uppercase py-2.5 px-4 rounded-none neo-brutalist-btn shadow-[2px_2px_0_#000]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase py-2.5 px-5 rounded-none neo-brutalist-btn shadow-[2px_2px_0_#000]"
              >
                Confirm Dismissal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2D. NEW BATSMAN ASSIGNMENT POPUP */}
      {showBatsmanSelect && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111827] border-4 border-black p-6 rounded-none w-full max-w-sm space-y-4 shadow-[8px_8px_0_#eab308] animate-scaleUp">
            <h3 className="font-black text-white uppercase tracking-tight text-base">Select New Batsman</h3>
            <p className="text-slate-400 text-xs font-mono">Choose the batsman entering the crease next</p>

            <select
              className="w-full neo-brutalist-select py-2.5 px-3 text-xs"
              value={selectedNewBatsmanId}
              onChange={(e) => setSelectedNewBatsmanId(e.target.value)}
            >
              <option value="">-- Select New Batsman --</option>
              {battingTeamPlayers
                ?.filter((p) => {
                  const isActive = p.id === currentInnings?.striker_id || p.id === currentInnings?.non_striker_id;
                  const isDismissed = dismissedPlayerIds.includes(p.id) || p.id === outBatsmanId;
                  return !isActive && !isDismissed;
                })
                ?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role})
                  </option>
                ))}
            </select>

            <button
              onClick={async () => {
                if (!selectedNewBatsmanId) return
                
                // Striker or Non striker was dismissed?
                // We determine which spot is empty by checking which of striker_id / non_striker_id matches the dismissed batsman id.
                // Wait! Since the innings database was ALREADY updated inside the recordBallMutation, we can update whichever field is empty or manually set the replacement!
                // To be bulletproof: we update the striker_id column in innings!
                let strikerKey = 'striker_id'
                if (currentInnings.striker_id === outBatsmanId) strikerKey = 'striker_id'
                else strikerKey = 'striker_id' // Default update striker
 
                await updateInningsMutation.mutateAsync({
                  inningsId: currentInnings.id,
                  data: {
                    [strikerKey]: selectedNewBatsmanId
                  }
                })

                setShowBatsmanSelect(false)
                setSelectedNewBatsmanId('')
              }}
              disabled={!selectedNewBatsmanId}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs uppercase py-3 rounded-none neo-brutalist-btn shadow-[3px_3px_0_#000]"
            >
              Confirm Replacement
            </button>
          </div>
        </div>
      )}

      {/* 2E. NEW BOWLER ASSIGNMENT POPUP */}
      {showBowlerSelect && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111827] border-4 border-black p-6 rounded-none w-full max-w-sm space-y-4 shadow-[8px_8px_0_#8b5cf6] animate-scaleUp">
            <div className="flex items-center gap-2 border-b-2 border-black pb-2">
              <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 stroke-[3]" />
              <h3 className="font-black text-white uppercase tracking-tight text-sm">Select New Bowler</h3>
            </div>
            <p className="text-slate-400 text-xs font-mono">Over complete. Assign the bowler for the next over.</p>

            <select
              className="w-full neo-brutalist-select py-2.5 px-3 text-xs"
              value={selectedNewBowlerId}
              onChange={(e) => setSelectedNewBowlerId(e.target.value)}
            >
              <option value="">-- Choose New Bowler --</option>
              {bowlingTeamPlayers
                ?.filter((p) => p.id !== currentInnings.bowler_id) // Can't bowl consecutive overs
                ?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>

            <button
              onClick={async () => {
                if (!selectedNewBowlerId) return
                
                await updateInningsMutation.mutateAsync({
                  inningsId: currentInnings.id,
                  data: {
                    bowler_id: selectedNewBowlerId
                  }
                })

                setShowBowlerSelect(false)
                setSelectedNewBowlerId('')
              }}
              disabled={!selectedNewBowlerId}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs uppercase py-3 rounded-none neo-brutalist-btn shadow-[3px_3px_0_#000]"
            >
              Confirm Bowler
            </button>
          </div>
        </div>
      )}

      {/* 2F. CONCLUDE MATCH & MAN OF MATCH SELECT MODAL */}
      {showManOfMatchSelect && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleConcludeMatchSubmit} className="bg-[#111827] border-4 border-black p-6 rounded-none w-full max-w-sm space-y-4 shadow-[8px_8px_0_#eab308] animate-scaleUp">
            <div className="border-b-2 border-black pb-2">
              <h3 className="font-black text-white uppercase tracking-tight text-base flex items-center gap-1.5">
                <Award className="w-5 h-5 text-yellow-400 stroke-[3]" /> Match Concluded
              </h3>
              <p className="text-slate-400 text-xs mt-0.5 font-mono">Configure presenting awards and final standings</p>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
                Select Man of the Match
              </label>
              <select
                required
                className="w-full neo-brutalist-select py-2.5 px-3 text-xs"
                value={selectedManOfMatchId}
                onChange={(e) => setSelectedManOfMatchId(e.target.value)}
              >
                <option value="">-- Choose Outstanding Player --</option>
                {/* Combined lists */}
                {team1Players?.concat(team2Players || [])?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Jersey {p.jersey_number || '-'})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={finishMatchMutation.isPending}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs uppercase py-3 rounded-none neo-brutalist-btn shadow-[4px_4px_0_#000]"
            >
              {finishMatchMutation.isPending ? 'Saving Match...' : 'Submit & Close Fixture'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

