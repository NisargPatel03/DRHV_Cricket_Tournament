import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/Spinner'
import { Trophy, HelpCircle, CheckCircle2 } from 'lucide-react'

export default function PointsTable() {
  const { data: standings, isLoading } = useQuery({
    queryKey: ['points_table_standings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('view_points_table')
        .select('*')
      if (error) throw error
      return data || []
    }
  })

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div className="glass-panel p-4 rounded-2xl flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
          <Trophy className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase leading-none mb-1">Points Table</h1>
          <p className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">Real-time team standings and qualification rankings</p>
        </div>
      </div>

      {isLoading ? (
        <Spinner message="Computing team standings..." />
      ) : standings && standings.length > 0 ? (
        <div className="space-y-6">
          {/* Main Table Card (Bento Style) */}
          <div className="bento-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                <thead>
                  <tr className="bg-slate-950/40 text-slate-400 font-extrabold uppercase tracking-widest text-[10px] border-b border-white/5">
                    <th className="py-4 px-4 text-center w-16">Rank</th>
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
                  {standings.map((team, index) => {
                    const isTop4 = index < 4
                    const totalTeams = standings.length
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
                        {/* Rank */}
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-extrabold ${
                              index === 0
                                ? 'bg-amber-500/10 text-amber-400 text-xs border border-amber-500/20'
                                : isTop4
                                ? 'bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20'
                                : 'text-slate-400'
                            }`}
                          >
                            {index + 1}
                          </span>
                        </td>

                        {/* Team Info */}
                        <td className="py-4 px-2 font-bold text-slate-200">
                          <Link
                            to={`/team/${team.team_id}`}
                            className="hover:text-emerald-400 flex items-center gap-3 transition-colors group"
                          >
                            <img
                              src={team.logo_url || 'https://placehold.co/100x100/1e293b/ffffff?text=T'}
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
                        <td className="py-4 px-3 text-center text-slate-300 font-medium">
                          {team.played}
                        </td>

                        {/* Won */}
                        <td className="py-4 px-3 text-center text-emerald-400 font-bold">
                          {team.won}
                        </td>

                        {/* Lost */}
                        <td className="py-4 px-3 text-center text-red-400 font-medium">
                          {team.lost}
                        </td>

                        {/* No Result */}
                        <td className="py-4 px-3 text-center text-slate-400 font-medium">
                          {team.no_result}
                        </td>

                        {/* Points */}
                        <td className="py-4 px-3 text-center font-black text-white text-base">
                          {team.points}
                        </td>

                        {/* Net Run Rate */}
                        <td
                          className={`py-4 px-5 text-right font-black ${
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

          {/* Guidelines / Help indicators (Bento Style) */}
          <div className="bento-card p-6 space-y-4 text-xs text-slate-400">
            <h3 className="font-extrabold text-white flex items-center gap-1.5 uppercase tracking-widest text-[11px] border-b border-white/5 pb-2.5">
              <HelpCircle className="w-4 h-4 text-emerald-400" /> Standings Rules & Guidelines
            </h3>
            <ul className="space-y-3 leading-relaxed">
              <li className="flex gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-300">Points allocation</strong>: Teams receive **2 points** for a win, **1 point** for a tie/abandoned match, and **0 points** for a loss.
                </span>
              </li>
              <li className="flex gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-300">Qualification criteria</strong>: The top **4 teams** at the end of the league stage qualify for the tournament playoffs (Semifinals and Finals).
                </span>
              </li>
              <li className="flex gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-300">Tie Breakers</strong>: If teams are level on points, they are separated by their **Net Run Rate (NRR)**. NRR is computed as `(Runs Scored / Overs Faced) - (Runs Conceded / Overs Bowled)`.
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
