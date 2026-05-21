import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/Spinner'
import { Users, Shield, ArrowRight } from 'lucide-react'

export default function Teams() {
  const { data: teams, isLoading } = useQuery({
    queryKey: ['approved_teams_grid'],
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

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-center text-emerald-450">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">Tournament Teams</h1>
          <p className="text-slate-400 text-xs font-semibold">Explore approved squads participating in this year's championship</p>
        </div>
      </div>

      {isLoading ? (
        <Spinner message="Loading participating teams..." />
      ) : teams && teams.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {teams.map((team) => (
            <Link
              key={team.id}
              to={`/team/${team.id}`}
              className="bento-card bento-card-interactive p-6 flex flex-col items-center text-center border border-white/5!"
            >
              {/* Logo Box */}
              <div className="w-24 h-24 rounded-full border border-white/10 p-1 bg-slate-950 flex items-center justify-center shadow-inner overflow-hidden mb-4 group-hover:border-emerald-500/20 transition-all">
                <img
                  src={team.logo_url || 'https://placehold.co/150x150/1e293b/ffffff?text=' + encodeURIComponent(team.short_name)}
                  alt={team.name}
                  className="w-full h-full rounded-full object-cover bg-slate-950 group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Names */}
              <h2 className="font-extrabold text-base text-slate-100 group-hover:text-white leading-tight">
                {team.name}
              </h2>
              <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mt-2 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/15">
                {team.short_name}
              </span>

              {/* Divider */}
              <div className="neon-divider my-4"></div>

              {/* View squad link */}
              <span className="text-xs font-semibold text-slate-400 group-hover:text-emerald-450 flex items-center gap-1 transition-all">
                View Squad & Stats <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bento-card p-12 text-center text-slate-450 border border-white/5!">
          <Shield className="w-10 h-10 mx-auto text-slate-650 mb-2" />
          <p className="text-sm font-semibold">No teams registered yet.</p>
          <p className="text-xs text-slate-550 mt-1">
            Registered and approved teams will automatically populate this section.
          </p>
        </div>
      )}
    </div>
  )
}
