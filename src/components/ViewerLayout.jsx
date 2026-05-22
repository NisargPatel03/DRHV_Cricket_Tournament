import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { Home, Calendar, Trophy, Users, BarChart3, Image, User, LogOut, Menu, X, Sparkles } from 'lucide-react'
import { useState } from 'react'

export default function ViewerLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, logout } = useAuthStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Fixtures', path: '/fixtures', icon: Calendar },
    { label: 'Standings', path: '/points-table', icon: Trophy },
    { label: 'Teams', path: '/teams', icon: Users },
    { label: 'Stats', path: '/players', icon: BarChart3 },
    { label: 'Simulator', path: '/simulator', icon: Sparkles },
    { label: 'Gallery', path: '/gallery', icon: Image },
  ]

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#0a0f1d] to-[#040814] text-slate-100 flex flex-col pb-16 md:pb-0 relative overflow-hidden">
      {/* Dynamic Ambient Background Glows */}
      <div className="fixed w-[600px] h-[600px] rounded-full ambient-glow-1 top-[-200px] left-[-200px] filter blur-[60px] opacity-80 pointer-events-none z-0 animate-float-slow"></div>
      <div className="fixed w-[700px] h-[700px] rounded-full ambient-glow-2 bottom-[-200px] right-[-200px] filter blur-[80px] opacity-60 pointer-events-none z-0 animate-float-reverse"></div>

      {/* Top Navbar for Desktop */}
      <header className="sticky top-0 z-40 bg-slate-950/40 backdrop-blur-xl border-b border-white/5 px-4 py-3 md:px-8 shadow-lg shadow-black/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="DRHV Premier League Logo"
              className="w-10 h-10 object-contain rounded-xl bg-slate-800/40 p-1 border border-slate-700/50"
            />
            <div>
              <span className="font-extrabold text-white tracking-wider text-base md:text-lg block leading-none">
                DRHV
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold tracking-widest uppercase">
                Premier League
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                className={`text-sm font-medium tracking-wide transition-all hover:text-white px-2 py-1 relative ${
                  isActive(item.path)
                    ? 'text-emerald-400 font-semibold'
                    : 'text-slate-400'
                }`}
              >
                {item.label}
                {isActive(item.path) && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full"></span>
                )}
              </Link>
            ))}
          </nav>

          {/* Auth Actions (Desktop) */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="block text-xs font-semibold text-white">
                    {profile?.full_name || 'User'}
                  </span>
                  <span className="block text-[10px] text-emerald-400 uppercase tracking-widest font-bold">
                    {profile?.role}
                  </span>
                </div>
                
                {/* Panel Quick Links */}
                {profile?.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-semibold text-xs px-3 py-1.5 rounded-lg transition-all"
                  >
                    Admin Panel
                  </Link>
                )}
                {profile?.role === 'scorer' && (
                  <Link
                    to="/scorer"
                    className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-semibold text-xs px-3 py-1.5 rounded-lg transition-all"
                  >
                    Scorer Panel
                  </Link>
                )}

                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm px-4 py-2 rounded-xl border border-slate-700/80 transition-all flex items-center gap-1.5"
              >
                <User className="w-4 h-4" />
                <span>Sign In</span>
              </Link>
            )}
          </div>

          {/* Hamburger Menu Icon (Mobile) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu (When clicking header burger button) */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-slate-950/98 pt-20 px-6 flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Navigation
            </span>
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 py-2 text-lg font-medium border-b border-slate-900 ${
                  isActive(item.path) ? 'text-emerald-400' : 'text-slate-300'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          <div className="mt-auto mb-20 flex flex-col gap-4 border-t border-slate-800 pt-6">
            {user ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-emerald-400 border border-slate-700">
                    {profile?.full_name?.substring(0, 2).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <span className="block text-sm font-bold text-white">
                      {profile?.full_name}
                    </span>
                    <span className="block text-xs text-slate-400 uppercase tracking-wider">
                      {profile?.role}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {profile?.role === 'admin' && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-center text-xs py-2.5 rounded-xl block"
                    >
                      Admin Panel
                    </Link>
                  )}
                  {profile?.role === 'scorer' && (
                    <Link
                      to="/scorer"
                      onClick={() => setMobileMenuOpen(false)}
                      className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-center text-xs py-2.5 rounded-xl block"
                    >
                      Scorer Panel
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      handleLogout()
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-red-400 font-bold text-xs py-2.5 rounded-xl border border-slate-700"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2"
              >
                <User className="w-5 h-5" />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 md:px-8 relative z-10">
        <Outlet />
      </main>

      {/* Bottom Sticky Tab Bar Navigation for Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800/80 px-2 py-1.5 flex items-center justify-around shadow-2xl">
        {navItems.map((item) => (
          <Link
            key={item.label}
            to={item.path}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              isActive(item.path) ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <item.icon className={`w-5 h-5 mb-0.5 ${isActive(item.path) ? 'scale-110' : ''}`} />
            <span className="text-[9px] font-medium tracking-wide">
              {item.label}
            </span>
          </Link>
        ))}
        {user ? (
          <Link
            to={profile?.role === 'admin' ? '/admin' : profile?.role === 'scorer' ? '/scorer' : '/'}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              location.pathname.startsWith('/admin') || location.pathname.startsWith('/scorer')
                ? 'text-emerald-400'
                : 'text-slate-400'
            }`}
          >
            <User className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] font-medium tracking-wide">
              Dashboard
            </span>
          </Link>
        ) : (
          <Link
            to="/login"
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              location.pathname === '/login' ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            <User className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] font-medium tracking-wide">
              Login
            </span>
          </Link>
        )}
      </nav>
    </div>
  )
}
