import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/Spinner'
import { Trophy, Calendar, Zap, Users, Play, Clock, Medal } from 'lucide-react'

export default function Home() {
  // 1. Fetch Tournament Settings
  const { data: settings } = useQuery({
    queryKey: ['tournament_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tournament_settings').select('*').limit(1)
      if (error) throw error
      return data?.[0] || { name: 'DRHV Premier League', start_date: '2026-05-20', end_date: '2026-06-10' }
    }
  })

  // 2. Fetch Live Matches
  const { data: liveMatches, isLoading: loadingLive } = useQuery({
    queryKey: ['live_matches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          team1:team1_id (name, short_name, logo_url),
          team2:team2_id (name, short_name, logo_url),
          innings (*)
        `)
        .eq('status', 'live')
      if (error) throw error
      return data || []
    },
    refetchInterval: 10000 // Refetch every 10 seconds for real-time backup
  })

  // 3. Fetch Upcoming Matches (next 3)
  const { data: upcomingMatches, isLoading: loadingUpcoming } = useQuery({
    queryKey: ['upcoming_matches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          team1:team1_id (name, short_name, logo_url),
          team2:team2_id (name, short_name, logo_url)
        `)
        .eq('status', 'upcoming')
        .order('match_date', { ascending: true })
        .order('match_time', { ascending: true })
        .limit(3)
      if (error) throw error
      return data || []
    }
  })

  // 4. Fetch Top 3 Teams in Points Table
  const { data: pointsTable, isLoading: loadingPoints } = useQuery({
    queryKey: ['top_points_table'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('view_points_table')
        .select('*')
        .limit(3)
      if (error) throw error
      return data || []
    }
  })

  // 5. Fetch Caps (Orange and Purple)
  const { data: orangeCap, isLoading: loadingOrange } = useQuery({
    queryKey: ['orange_cap_leader'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('view_batting_stats')
        .select('*')
        .order('runs', { ascending: false })
        .limit(1)
      if (error) throw error
      return data?.[0] || null
    }
  })

  const { data: purpleCap, isLoading: loadingPurple } = useQuery({
    queryKey: ['purple_cap_leader'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('view_bowling_stats')
        .select('*')
        .order('wickets', { ascending: false })
        .limit(1)
      if (error) throw error
      return data?.[0] || null
    }
  })

  // 6. Fetch Completed Match Results (last 3)
  const { data: completedMatches, isLoading: loadingCompleted } = useQuery({
    queryKey: ['completed_matches_results'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          team1:team1_id (name, short_name, logo_url),
          team2:team2_id (name, short_name, logo_url),
          innings (*)
        `)
        .eq('status', 'completed')
        .order('match_date', { ascending: false })
        .limit(3)
      if (error) throw error
      return data || []
    }
  })

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (timeStr) => {
    return timeStr.substring(0, 5) // Return HH:MM
  }

  return (
    <div className="space-y-10">
      {/* 1. HERO BANNER */}
      <section className="relative overflow-hidden bento-card p-6 md:p-12 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-8 border border-white/5!">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none"></div>
        <div className="relative space-y-4 max-w-xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 font-semibold text-xs tracking-widest uppercase rounded-full border border-emerald-500/20">
            <Trophy className="w-3.5 h-3.5" /> Official Tournament
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
            {settings?.name}
          </h1>
          <p className="text-slate-400 text-sm md:text-base leading-relaxed">
            Welcome to the ultimate housing society cricket league! Follow live ball-by-ball updates, points standings, player statistics, and match highlights in real time.
          </p>
          <div className="flex flex-wrap gap-4 pt-2 justify-center md:justify-start">
            <div className="flex items-center gap-2 text-slate-350 bg-slate-950/60 border border-white/5 px-4 py-2 rounded-2xl text-xs font-semibold">
              <Calendar className="w-4 h-4 text-emerald-450" />
              <span>
                {settings?.start_date ? formatDate(settings.start_date) : 'May 20, 2026'} -{' '}
                {settings?.end_date ? formatDate(settings.end_date) : 'Jun 10, 2026'}
              </span>
            </div>
          </div>
        </div>

        {/* Floating Tournament Logo Graphic */}
        <div className="relative hidden md:block animate-fadeIn">
          <div className="w-40 h-40 rounded-3xl bg-slate-950/40 border-2 border-white/5 flex items-center justify-center shadow-2xl rotate-6 hover:rotate-0 transition-all duration-300 group overflow-hidden p-5">
            <img
              src="/logo.png"
              alt="DRHV Premier League Championship Logo"
              className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
            />
          </div>
        </div>
      </section>

      {/* 2. LIVE MATCHES */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse-red"></span>
            <h2 className="text-xl font-black text-white uppercase tracking-wider">Live Matches</h2>
          </div>
        </div>

        {loadingLive ? (
          <Spinner message="Checking live match status..." />
        ) : liveMatches && liveMatches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {liveMatches.map((match) => {
              const innings1 = match.innings?.find((i) => i.innings_number === 1)
              const innings2 = match.innings?.find((i) => i.innings_number === 2)

              return (
                <Link
                  key={match.id}
                  to={`/match/${match.id}`}
                  className="bento-card bento-card-interactive p-6 block relative group overflow-hidden border border-white/5!"
                >
                  <div className="absolute top-0 right-0 px-4 py-1.5 bg-red-650 text-white font-extrabold text-[10px] tracking-widest uppercase flex items-center gap-1 rounded-bl-xl shadow-md animate-pulse">
                    <span className="w-1.5 h-1.5 bg-white rounded-full"></span> Live
                  </div>

                  <div className="text-slate-500 text-[10px] uppercase font-extrabold tracking-widest mb-3">
                    {match.stage} • {match.venue}
                  </div>

                  {/* Team details and Score */}
                  <div className="space-y-4">
                    {/* Team 1 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={match.team1?.logo_url || 'https://placehold.co/100x100/1e293b/ffffff?text=T1'}
                          alt={match.team1?.name}
                          className="w-8 h-8 rounded-full border border-white/10 object-cover bg-slate-950"
                        />
                        <span className="font-extrabold text-sm text-slate-100 group-hover:text-white transition-colors">
                          {match.team1?.name}
                        </span>
                      </div>
                      <div className="text-right">
                        {innings1 ? (
                          <span className="font-black text-base text-white">
                            {innings1.runs}/{innings1.wickets}
                            <span className="text-xs text-slate-400 font-medium ml-1">
                              ({Math.floor(innings1.total_balls / 6)}.{innings1.total_balls % 6} ov)
                            </span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">Yet to bat</span>
                        )}
                      </div>
                    </div>

                    {/* Team 2 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={match.team2?.logo_url || 'https://placehold.co/100x100/1e293b/ffffff?text=T2'}
                          alt={match.team2?.name}
                          className="w-8 h-8 rounded-full border border-white/10 object-cover bg-slate-950"
                        />
                        <span className="font-extrabold text-sm text-slate-100 group-hover:text-white transition-colors">
                          {match.team2?.name}
                        </span>
                      </div>
                      <div className="text-right">
                        {innings2 ? (
                          <span className="font-black text-base text-white">
                            {innings2.runs}/{innings2.wickets}
                            <span className="text-xs text-slate-400 font-medium ml-1">
                              ({Math.floor(innings2.total_balls / 6)}.{innings2.total_balls % 6} ov)
                            </span>
                          </span>
                        ) : innings1 ? (
                          <span className="text-xs text-emerald-450 font-bold uppercase tracking-wider bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                            Batting Next
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">Yet to bat</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs">
                    <span className="text-slate-450 font-semibold uppercase tracking-wider text-[10px]">
                      Innings {match.current_innings} in progress
                    </span>
                    <span className="text-emerald-450 font-black group-hover:underline flex items-center gap-1 uppercase tracking-wider text-[10px]">
                      View Live Scorecard <Play className="w-3 h-3 fill-current" />
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="bento-card p-12 text-center text-slate-450">
            <Zap className="w-8 h-8 mx-auto text-slate-650 mb-2" />
            <p className="text-sm font-semibold">No matches are currently live.</p>
            <p className="text-xs text-slate-550 mt-1">Check out the upcoming fixtures scheduled below.</p>
          </div>
        )}
      </section>

      {/* 3. SPLIT SECTION (Upcoming Fixtures & standings) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming Fixtures */}
        <section className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white uppercase tracking-wider">Upcoming Fixtures</h2>
            <Link to="/fixtures" className="text-xs text-emerald-455 hover:text-emerald-350 font-bold uppercase tracking-widest">
              View All
            </Link>
          </div>

          {loadingUpcoming ? (
            <div className="space-y-4">
              <div className="h-20 bg-slate-900 animate-pulse rounded-xl"></div>
              <div className="h-20 bg-slate-900 animate-pulse rounded-xl"></div>
            </div>
          ) : upcomingMatches && upcomingMatches.length > 0 ? (
            <div className="space-y-4">
              {upcomingMatches.map((match) => (
                <Link
                  key={match.id}
                  to={`/match/${match.id}`}
                  className="bento-card bento-card-interactive p-4 flex items-center justify-between gap-4 group border border-white/5!"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {/* Date Time */}
                    <div className="bg-slate-950/60 border border-white/5 px-3 py-2 rounded-xl text-center min-w-[70px]">
                      <span className="block text-[10px] text-emerald-400 font-black uppercase tracking-wider">
                        {new Date(match.match_date).toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className="block text-base font-black text-white leading-none mt-1">
                        {new Date(match.match_date).getDate()}
                      </span>
                    </div>

                    {/* Team versus */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-200 group-hover:text-white">
                          {match.team1?.name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-black uppercase">vs</span>
                        <span className="font-extrabold text-sm text-slate-200 group-hover:text-white">
                          {match.team2?.name}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-450 font-medium">
                        {formatTime(match.match_time)} • {match.venue} • {match.overs_limit} Overs
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] bg-slate-950/50 border border-white/5 text-slate-400 font-extrabold tracking-widest px-2.5 py-1 rounded-lg uppercase">
                      Upcoming
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bento-card p-8 text-center text-slate-450">
              <Calendar className="w-6 h-6 mx-auto text-slate-650 mb-2" />
              <p className="text-xs font-semibold">No upcoming fixtures scheduled.</p>
            </div>
          )}
        </section>

        {/* Points Table Snippet */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white uppercase tracking-wider">Standings</h2>
            <Link to="/points-table" className="text-xs text-emerald-455 hover:text-emerald-350 font-bold uppercase tracking-widest">
              Full Table
            </Link>
          </div>

          {loadingPoints ? (
            <div className="h-40 bg-slate-900 animate-pulse rounded-xl"></div>
          ) : pointsTable && pointsTable.length > 0 ? (
            <div className="bento-card overflow-hidden p-0! border border-white/5!">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950/40 text-slate-400 uppercase tracking-widest text-[9px] font-extrabold border-b border-white/5">
                    <th className="py-3 px-4 text-center">Rank</th>
                    <th className="py-3 px-2">Team</th>
                    <th className="py-3 px-2 text-center">Pts</th>
                    <th className="py-3 px-4 text-right">NRR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {pointsTable.map((team, index) => (
                    <tr
                      key={team.team_id}
                      className={`hover:bg-white/[0.01] transition-colors ${
                        index === 0 ? 'bg-emerald-500/[0.01]' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-center font-extrabold text-slate-400">
                        {index + 1}
                      </td>
                      <td className="py-3 px-2 font-bold text-slate-200">
                        <Link to={`/team/${team.team_id}`} className="hover:text-emerald-400 flex items-center gap-2">
                          <img
                            src={team.logo_url || 'https://placehold.co/100x100/1e293b/ffffff?text=T'}
                            alt={team.name}
                            className="w-5 h-5 rounded-full object-cover bg-slate-950 border border-white/5 shrink-0"
                          />
                          <span className="truncate max-w-[85px] tracking-wide font-semibold">{team.name}</span>
                        </Link>
                      </td>
                      <td className="py-3 px-2 text-center font-black text-white">
                        {team.points}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-350">
                        {team.net_run_rate >= 0 ? `+${team.net_run_rate}` : team.net_run_rate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bento-card p-8 text-center text-slate-450 border border-white/5!">
              <Trophy className="w-6 h-6 mx-auto text-slate-655 mb-2" />
              <p className="text-xs font-semibold">No standings records available.</p>
            </div>
          )}
        </section>
      </div>

      {/* 4. LEADER CAPS (Orange & Purple Caps) */}
      <section className="space-y-4">
        <h2 className="text-xl font-black text-white uppercase tracking-wider">Tournament Leaders</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Orange Cap */}
          <div className="bento-card bento-card-interactive p-6 flex items-center gap-6 relative overflow-hidden group border border-white/5!">
            {/* Top border orange bar */}
            <div className="absolute top-0 inset-x-0 h-1 bg-amber-500"></div>
            
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-lg text-amber-500">
              <Medal className="w-10 h-10" />
            </div>

            <div className="flex-1 space-y-1">
              <div className="text-[10px] text-amber-500 font-black uppercase tracking-widest">
                Orange Cap (Top Runs)
              </div>
              {loadingOrange ? (
                <div className="h-6 w-32 bg-slate-950 animate-pulse rounded"></div>
              ) : orangeCap ? (
                <div>
                  <h3 className="font-extrabold text-lg text-white hover:text-amber-400">
                    <Link to={`/player/${orangeCap.player_id}`}>
                      {orangeCap.player_name}
                    </Link>
                  </h3>
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mt-0.5">
                    {orangeCap.team_name} ({orangeCap.team_short})
                  </p>
                </div>
              ) : (
                <p className="text-slate-500 text-xs">No runs scored yet</p>
              )}
            </div>

            <div className="text-right shrink-0">
              {orangeCap ? (
                <div>
                  <span className="block text-3xl font-black text-white leading-none">
                    {orangeCap.runs}
                  </span>
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider mt-1.5 block">
                    Runs • SR {orangeCap.strike_rate}
                  </span>
                </div>
              ) : (
                <span className="text-slate-600 text-2xl font-bold">-</span>
              )}
            </div>
          </div>

          {/* Purple Cap */}
          <div className="bento-card bento-card-interactive p-6 flex items-center gap-6 relative overflow-hidden group border border-white/5!">
            {/* Top border purple bar */}
            <div className="absolute top-0 inset-x-0 h-1 bg-purple-500"></div>
            
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0 shadow-lg text-purple-500">
              <Medal className="w-10 h-10" />
            </div>

            <div className="flex-1 space-y-1">
              <div className="text-[10px] text-purple-400 font-black uppercase tracking-widest">
                Purple Cap (Top Wickets)
              </div>
              {loadingPurple ? (
                <div className="h-6 w-32 bg-slate-950 animate-pulse rounded"></div>
              ) : purpleCap ? (
                <div>
                  <h3 className="font-extrabold text-lg text-white hover:text-purple-450">
                    <Link to={`/player/${purpleCap.player_id}`}>
                      {purpleCap.player_name}
                    </Link>
                  </h3>
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mt-0.5">
                    {purpleCap.team_name} ({purpleCap.team_short})
                  </p>
                </div>
              ) : (
                <p className="text-slate-500 text-xs">No wickets taken yet</p>
              )}
            </div>

            <div className="text-right shrink-0">
              {purpleCap ? (
                <div>
                  <span className="block text-3xl font-black text-white leading-none">
                    {purpleCap.wickets}
                  </span>
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider mt-1.5 block">
                    Wickets • Econ {purpleCap.economy_rate}
                  </span>
                </div>
              ) : (
                <span className="text-slate-600 text-2xl font-bold">-</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 5. RECENT RESULTS */}
      <section className="space-y-4">
        <h2 className="text-xl font-black text-white uppercase tracking-wider">Recent Results</h2>

        {loadingCompleted ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-28 bg-slate-900 animate-pulse rounded-xl"></div>
          </div>
        ) : completedMatches && completedMatches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {completedMatches.map((match) => {
              const innings1 = match.innings?.find((i) => i.innings_number === 1)
              const innings2 = match.innings?.find((i) => i.innings_number === 2)

              return (
                <Link
                  key={match.id}
                  to={`/match/${match.id}`}
                  className="bento-card bento-card-interactive p-5 block group border border-white/5!"
                >
                  <div className="text-[9px] text-slate-500 uppercase font-black tracking-wider mb-2 flex items-center justify-between">
                    <span>{match.stage}</span>
                    <span>{formatDate(match.match_date)}</span>
                  </div>

                  <div className="space-y-2 mb-3">
                    {/* Team 1 */}
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-slate-200">
                        {match.team1?.short_name}
                      </span>
                      {innings1 ? (
                        <span className="font-black text-white">
                          {innings1.runs}/{innings1.wickets}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </div>

                    {/* Team 2 */}
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-slate-200">
                        {match.team2?.short_name}
                      </span>
                      {innings2 ? (
                        <span className="font-black text-white">
                          {innings2.runs}/{innings2.wickets}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </div>
                  </div>

                  {/* Result margin */}
                  <div className="text-[10px] text-emerald-450 font-black uppercase tracking-wider border-t border-white/5 pt-2.5">
                    {match.result_margin || 'Match Completed'}
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="bento-card p-8 text-center text-slate-450 border border-white/5!">
            <Clock className="w-6 h-6 mx-auto text-slate-650 mb-2" />
            <p className="text-xs font-semibold">No recent match results available.</p>
          </div>
        )}
      </section>
    </div>
  )
}
