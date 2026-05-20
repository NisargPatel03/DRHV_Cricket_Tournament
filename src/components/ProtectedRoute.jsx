import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading, initialize } = useAuthStore()
  const location = useLocation()

  useEffect(() => {
    // If not initialized, trigger it
    if (loading && !user) {
      initialize()
    }
  }, [loading, user, initialize])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin"></div>
        </div>
        <p className="mt-4 text-slate-400 text-sm font-medium animate-pulse">
          Loading credentials...
        </p>
      </div>
    )
  }

  if (!user) {
    // Redirect to login but save the current location
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && (!profile || !allowedRoles.includes(profile.role))) {
    // Role not authorized, redirect to home page
    return <Navigate to="/" replace />
  }

  return children
}
