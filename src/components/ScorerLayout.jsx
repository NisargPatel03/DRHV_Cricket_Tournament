import { useNavigate, Outlet, Link } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { LogOut, ArrowLeft, ShieldAlert, Award } from 'lucide-react'

export default function ScorerLayout() {
  const navigate = useNavigate()
  const { profile, logout } = useAuthStore()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen neo-brutalist-canvas flex flex-col text-white border-t-4 border-yellow-500">
      {/* 1. SCORER TOP NAVIGATION HEADER */}
      <header className="bg-[#111827] border-b-4 border-black px-6 py-4 flex items-center justify-between shadow-[0_4px_0_#000] z-10 shrink-0">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="DRHV Scorer Logo"
            className="w-9 h-9 object-contain rounded-none bg-white p-0.5 border-2 border-black shadow-[2px_2px_0_#000] shrink-0"
          />
          <div>
            <h1 className="font-black text-sm uppercase tracking-wider text-white leading-none">Scorer Dashboard</h1>
            <span className="text-[10px] text-yellow-400 font-bold font-mono uppercase tracking-widest block mt-0.5">DRHV Match Registry</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline text-xs font-black text-slate-400 font-mono uppercase tracking-wide">
            Official: {profile?.full_name || 'Assigned Scorer'}
          </span>

          <Link
            to="/"
            className="flex items-center gap-1.5 text-[10px] text-black bg-white hover:bg-slate-100 font-black uppercase tracking-wider px-3.5 py-2 neo-brutalist-btn"
          >
            <ArrowLeft className="w-3.5 h-3.5 stroke-[3]" />
            <span>Viewer App</span>
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-[10px] text-white bg-red-600 hover:bg-red-700 px-3.5 py-2 font-black uppercase tracking-wider neo-brutalist-btn"
          >
            <LogOut className="w-3.5 h-3.5 stroke-[3]" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN SCORING STAGE VIEWPORT */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* 3. ACCESSIBILITY HIGH CONTRAST STATUS FOOTER */}
      <footer className="bg-[#111827] border-t-4 border-black px-6 py-3 text-center text-[10px] text-slate-400 font-black uppercase tracking-widest shrink-0 shadow-[0_-4px_0_#000]">
        <span>© Official scorer console • High-contrast esports neo-brutalist active</span>
      </footer>
    </div>
  )
}
