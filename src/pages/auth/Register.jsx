import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Trophy, Mail, Lock, User, UserCheck, AlertCircle, ArrowRight } from 'lucide-react'

export default function Register() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('viewer')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  const navigate = useNavigate()

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setSubmitting(true)

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role
          }
        }
      })

      if (signUpError) throw signUpError

      setSuccess(true)
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (err) {
      setError(err.message || 'Failed to register account. Please check inputs.')
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
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 border border-emerald-500/20 text-emerald-500 mb-3 shadow-lg">
            <Trophy className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Create Account</h1>
          <p className="text-slate-400 text-sm mt-1">Register to join the cricket tournament community</p>
        </div>

        {/* Card Form */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-8 shadow-xl">
          {error && (
            <div className="mb-5 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-5 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-3 text-emerald-400 text-sm">
              <UserCheck className="w-5 h-5 shrink-0 mt-0.5 animate-bounce" />
              <div>
                <p className="font-bold">Account Created!</p>
                <p className="text-xs text-emerald-500/80 mt-0.5">Redirecting you to the login screen...</p>
              </div>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <User className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-1.5">
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  type="password"
                  required
                  placeholder="•••••••• (min 6 characters)"
                  minLength={6}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-1.5">
                Desired Account Role
              </label>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all cursor-pointer"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="viewer">Viewer (No write access)</option>
                <option value="scorer">Scorer (Can record runs/wickets for assigned matches)</option>
                <option value="admin">Admin (Full controls, scheduler & settings)</option>
              </select>
              <p className="text-slate-500 text-[10px] mt-1.5 leading-relaxed">
                * Note: In a production release, roles are typically provisioned by existing administrators. This selection allows quick pair-programming testing.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting || success}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 transition-all mt-4 group"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Login Redirect */}
          <div className="mt-6 pt-5 border-t border-slate-800/60 text-center">
            <p className="text-slate-400 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
                Sign In here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
