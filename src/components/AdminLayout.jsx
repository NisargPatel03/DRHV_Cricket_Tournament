import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { supabase } from '../lib/supabase'
import { LayoutDashboard, Users, Calendar, Image, Settings, LogOut, ShieldAlert, Menu, X, ArrowLeft, Shield } from 'lucide-react'

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, logout } = useAuthStore()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const [latency, setLatency] = useState(0)
  const [telemetryStatus, setTelemetryStatus] = useState('CONNECTING')

  useEffect(() => {
    let active = true
    const checkLatency = async () => {
      const start = performance.now()
      try {
        const { error } = await supabase.from('matches').select('id').limit(1)
        if (error) throw error
        const end = performance.now()
        if (active) {
          setLatency(Math.round(end - start))
          setTelemetryStatus('CONNECTED')
        }
      } catch (err) {
        if (active) {
          setTelemetryStatus('DISCONNECTED')
        }
      }
    }
    
    checkLatency()
    const timer = setInterval(checkLatency, 8000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

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
    <div className="min-h-screen carbon-telemetry-canvas flex text-slate-100 relative overflow-hidden">
      {/* Absolute Admin Ambient Canvas Blobs */}
      <div className="fixed w-[500px] h-[500px] rounded-full bg-emerald-500/[0.02] top-[-100px] right-[-100px] filter blur-[80px] pointer-events-none z-0 animate-float-slow"></div>
      <div className="fixed w-[600px] h-[600px] rounded-full bg-blue-500/[0.02] bottom-[-200px] left-[-200px] filter blur-[100px] pointer-events-none z-0 animate-float-reverse"></div>
 
      {/* 1. LEFT SIDEBAR FOR DESKTOP */}
      <aside className="hidden md:flex flex-col w-64 bg-[#090e18] text-slate-450 shrink-0 border-r border-white/10 relative z-10 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
        {/* Brand Header */}
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
          <img
            src="/logo.png"
            alt="DRHV Admin Logo"
            className="w-8 h-8 object-contain rounded-xl bg-slate-900 border border-white/15 p-0.5 shrink-0"
          />
          <div>
            <span className="font-black text-white text-sm block leading-none uppercase tracking-widest">
              DRHV Admin
            </span>
            <span className="text-[9px] text-emerald-450 font-black uppercase tracking-widest block mt-0.5 flex items-center gap-1">
              <span className="led-indicator led-green mr-0" /> Portal Active
            </span>
          </div>
        </div>
 
        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {adminMenu.map((item) => {
            const active = isActive(item.path)
            return (
              <Link
                key={item.label}
                to={item.path}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                  active
                    ? 'bg-slate-950/80 border-white/10 text-white shadow-[inset_0_1px_3px_rgba(255,255,255,0.05),0_0_12px_rgba(16,185,129,0.05)]'
                    : 'bg-transparent text-slate-450 hover:bg-slate-900/40 hover:text-slate-100 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-4 h-4 shrink-0 ${active ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {active && (
                  <span className="led-indicator led-green mr-0 shrink-0" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Dynamic Skeuomorphic Latency & Web Telemetry Panel */}
        <div className="mx-4 mb-6 p-4 bg-slate-950/80 border border-white/5 rounded-2xl space-y-3.5 shadow-inner">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">System Latency</span>
            <span className="flex items-center gap-1.5 text-[8px] text-slate-400 font-extrabold uppercase">
              <span className={`w-1.5 h-1.5 rounded-full ${
                telemetryStatus === 'CONNECTED' ? 'bg-cyan-500 animate-pulse' :
                telemetryStatus === 'CONNECTING' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'
              }`} />
              {telemetryStatus}
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="text-xl font-black text-white tracking-tight monospace font-mono">
              {telemetryStatus === 'CONNECTED' ? `${latency}` : '---'} <span className="text-[9px] text-slate-500 uppercase">ms</span>
            </div>
            {/* Visual signal bars */}
            <div className="flex gap-0.5 h-3 items-end">
              <div className={`w-1 h-1.5 rounded-sm ${latency > 0 && latency < 500 ? (latency < 100 ? 'bg-emerald-450' : 'bg-amber-500') : 'bg-slate-800'}`} />
              <div className={`w-1 h-2.5 rounded-sm ${latency > 0 && latency < 300 ? (latency < 100 ? 'bg-emerald-450' : 'bg-amber-500') : 'bg-slate-800'}`} />
              <div className={`w-1 h-3.5 rounded-sm ${latency > 0 && latency < 100 ? 'bg-emerald-450' : 'bg-slate-800'}`} />
            </div>
          </div>

          {/* Progress gauge dial simulation */}
          <div className="w-full bg-slate-900 border border-white/5 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                latency < 100 ? 'bg-cyan-500' : latency < 300 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(10, latency > 0 ? (350 - latency) / 3 : 0))}%` }}
            />
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center font-black text-emerald-400 text-xs">
              {profile?.full_name?.substring(0, 2).toUpperCase() || 'AD'}
            </div>
            <div className="min-w-0">
              <span className="block text-xs font-extrabold text-slate-200 truncate">
                {profile?.full_name || 'Admin User'}
              </span>
              <span className="block text-[9px] text-slate-500 uppercase tracking-widest font-bold">
                {profile?.role}
              </span>
            </div>
          </div>
 
          <Link
            to="/"
            className="flex items-center justify-center gap-2 text-[10px] text-slate-400 hover:text-white font-black uppercase tracking-widest px-2 py-2 bg-slate-900 border border-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Viewer Portal</span>
          </Link>
 
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* 2. MOBILE HEADER & NAVIGATION */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <header className="md:hidden bg-slate-950/60 backdrop-blur-xl text-white p-4 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="DRHV Admin Logo"
              className="w-8 h-8 object-contain rounded bg-slate-800/40 p-0.5 border border-white/10 shrink-0"
            />
            <span className="font-black text-sm tracking-widest uppercase">DRHV Admin</span>
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
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Admin Controls
              </span>
              {adminMenu.map((item) => (
                <Link
                  key={item.label}
                  to={item.path}
                  onClick={() => setMobileSidebarOpen(false)}
                  className={`flex items-center gap-3 py-2 text-base font-black uppercase tracking-widest border-b border-white/5 ${
                    isActive(item.path) ? 'text-emerald-400 font-bold' : 'text-slate-300'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>

            <div className="mt-auto mb-20 flex flex-col gap-4 border-t border-white/5 pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center font-black text-emerald-400 text-sm">
                  {profile?.full_name?.substring(0, 2).toUpperCase() || 'AD'}
                </div>
                <div>
                  <span className="block text-sm font-extrabold text-white">
                    {profile?.full_name}
                  </span>
                  <span className="block text-xs text-slate-550 uppercase tracking-widest font-black">
                    System Admin
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-center text-xs font-black py-2.5 rounded-xl border border-white/5"
                >
                  View App
                </Link>
                <button
                  onClick={() => {
                    setMobileSidebarOpen(false)
                    handleLogout()
                  }}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-black py-2.5 rounded-xl border border-red-500/30"
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
