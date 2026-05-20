import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { LayoutDashboard, Users, Calendar, Image, Settings, LogOut, ShieldAlert, Menu, X, ArrowLeft, Shield } from 'lucide-react'

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, logout } = useAuthStore()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const adminMenu = [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Teams Manager', path: '/admin/teams', icon: Users },
    { label: 'Players Manager', path: '/admin/players', icon: Users },
    { label: 'Match Scheduler', path: '/admin/matches', icon: Calendar },
    { label: 'Match Gallery', path: '/admin/gallery', icon: Image },
    { label: 'Settings', path: '/admin/settings', icon: Settings },
  ]

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const isActive = (path) => {
    if (path === '/admin') return location.pathname === '/admin'
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-800">
      {/* 1. LEFT SIDEBAR FOR DESKTOP */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-400 shrink-0 border-r border-slate-800">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800/60 flex items-center gap-3">
          <img
            src="/logo.png"
            alt="DRHV Admin Logo"
            className="w-8 h-8 object-contain rounded bg-slate-800/40 p-0.5 border border-slate-700/50 shrink-0"
          />
          <div>
            <span className="font-extrabold text-white text-sm block leading-none uppercase tracking-wide">
              DRHV Admin
            </span>
            <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest block mt-0.5">
              Tournament Portal
            </span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {adminMenu.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all border-l-2 ${
                isActive(item.path)
                  ? 'bg-slate-800/80 border-l-emerald-500 text-white'
                  : 'border-l-transparent hover:bg-slate-800/40 hover:text-slate-200'
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800/60 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-emerald-400 text-xs">
              {profile?.full_name?.substring(0, 2).toUpperCase() || 'AD'}
            </div>
            <div className="min-w-0">
              <span className="block text-xs font-bold text-slate-200 truncate">
                {profile?.full_name || 'Admin User'}
              </span>
              <span className="block text-[9px] text-slate-500 uppercase tracking-wider">
                {profile?.role}
              </span>
            </div>
          </div>

          <Link
            to="/"
            className="flex items-center gap-2 text-[10px] text-slate-400 hover:text-white font-bold uppercase tracking-wider px-2 py-1 bg-slate-850 hover:bg-slate-800 rounded-lg transition-colors border border-slate-800/80"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Viewer Portal</span>
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* 2. MOBILE HEADER & NAVIGATION */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="DRHV Admin Logo"
              className="w-8 h-8 object-contain rounded bg-slate-800/40 p-0.5 border border-slate-700/50 shrink-0"
            />
            <span className="font-extrabold text-sm tracking-wider uppercase">DRHV Admin</span>
          </div>

          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="p-1 text-slate-400 hover:text-white"
          >
            {mobileSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </header>

        {/* Mobile Slide-out Drawer */}
        {mobileSidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-slate-950/98 pt-20 px-6 flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Admin Controls
              </span>
              {adminMenu.map((item) => (
                <Link
                  key={item.label}
                  to={item.path}
                  onClick={() => setMobileSidebarOpen(false)}
                  className={`flex items-center gap-3 py-2 text-base font-semibold uppercase tracking-wider border-b border-slate-900 ${
                    isActive(item.path) ? 'text-emerald-400 font-bold' : 'text-slate-300'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>

            <div className="mt-auto mb-20 flex flex-col gap-4 border-t border-slate-800 pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-emerald-400 text-sm">
                  {profile?.full_name?.substring(0, 2).toUpperCase() || 'AD'}
                </div>
                <div>
                  <span className="block text-sm font-bold text-white">
                    {profile?.full_name}
                  </span>
                  <span className="block text-xs text-slate-500 uppercase tracking-wider font-semibold">
                    System Admin
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-white text-center text-xs font-bold py-2.5 rounded-xl border border-slate-700"
                >
                  View App
                </Link>
                <button
                  onClick={() => {
                    setMobileSidebarOpen(false)
                    handleLogout()
                  }}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold py-2.5 rounded-xl border border-red-500/30"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. MAIN CONTENT FRAME */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
