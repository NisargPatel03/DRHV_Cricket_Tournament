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
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 border-t-4 border-emerald-600">
      {/* 1. SCORER TOP NAVIGATION HEADER */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="DRHV Scorer Logo"
            className="w-9 h-9 object-contain rounded bg-slate-100 p-0.5 border border-slate-200 shadow-sm shrink-0"
          />
          <div>
            <h1 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 leading-none">Scorer Dashboard</h1>
            <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest block mt-0.5">DRHV Match Registry</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline text-xs font-bold text-slate-500 uppercase tracking-wide">
            Official: {profile?.full_name || 'Assigned Scorer'}
          </span>

          <Link
            to="/"
            className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-slate-800 font-bold uppercase tracking-wider px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Viewer App</span>
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-[10px] text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 font-bold uppercase tracking-wider transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN SCORING STAGE VIEWPORT */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50">
        <div className="max-w-4xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* 3. ACCESSIBILITY HIGH CONTRAST STATUS FOOTER */}
      <footer className="bg-white border-t border-slate-200 px-6 py-3 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest shrink-0">
        <span>© Official scorer console • Sunlight High-contrast mode enabled</span>
      </footer>
    </div>
  )
}
