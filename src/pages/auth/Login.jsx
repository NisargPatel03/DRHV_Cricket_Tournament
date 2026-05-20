import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Trophy, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      // Retrieve role to redirect logically
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profile?.role === 'admin') {
        navigate('/admin')
      } else if (profile?.role === 'scorer') {
        navigate('/scorer')
      } else {
        navigate(from, { replace: true })
      }
    } catch (err) {
      setError(err.message || 'Failed to sign in. Please check your credentials.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Blur Circles */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md relative">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 border border-emerald-500/20 text-emerald-500 mb-3 shadow-lg">
            <Trophy className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Welcome Back</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to manage teams, fixtures, and live scores</p>
        </div>

        {/* Card Form */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-8 shadow-xl">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Mail className="w-5 h-5" />
                </span>
                <input
                  type="email"
                  required
                  placeholder="name@society.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 transition-all mt-2 group"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Registration Redirect */}
          <div className="mt-8 pt-6 border-t border-slate-800/60 text-center">
            <p className="text-slate-400 text-sm">
              Don't have an account?{' '}
              <Link to="/register" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
