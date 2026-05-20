import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './store/useAuthStore'

// Layout shells
import ViewerLayout from './components/ViewerLayout'
import AdminLayout from './components/AdminLayout'
import ScorerLayout from './components/ScorerLayout'
import ProtectedRoute from './components/ProtectedRoute'

// Public Viewer Pages
import Home from './pages/viewer/Home'
import Fixtures from './pages/viewer/Fixtures'
import PointsTable from './pages/viewer/PointsTable'
import Teams from './pages/viewer/Teams'
import TeamProfile from './pages/viewer/TeamProfile'
import Players from './pages/viewer/Players'
import PlayerProfile from './pages/viewer/PlayerProfile'
import Gallery from './pages/viewer/Gallery'
import MatchDetail from './pages/viewer/MatchDetail'

// Auth Pages
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'

// Admin Pages
import Dashboard from './pages/admin/Dashboard'
import TeamManager from './pages/admin/TeamManager'
import PlayerManager from './pages/admin/PlayerManager'
import MatchScheduler from './pages/admin/MatchScheduler'
import GalleryManager from './pages/admin/GalleryManager'
import SettingsPage from './pages/admin/Settings'

// Scorer Pages
import MatchList from './pages/scorer/MatchList'
import LiveScoring from './pages/scorer/LiveScoring'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

export default function App() {
  const { initialize } = useAuthStore()

  // Initialize session checks on mount
  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* 1. PUBLIC VIEWER APP PORTAL */}
          <Route path="/" element={<ViewerLayout />}>
            <Route index element={<Home />} />
            <Route path="fixtures" element={<Fixtures />} />
            <Route path="match/:id" element={<MatchDetail />} />
            <Route path="points-table" element={<PointsTable />} />
            <Route path="teams" element={<Teams />} />
            <Route path="team/:id" element={<TeamProfile />} />
            <Route path="players" element={<Players />} />
            <Route path="player/:id" element={<PlayerProfile />} />
            <Route path="gallery" element={<Gallery />} />
          </Route>

          {/* 2. AUTHENTICATION PAGES */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* 3. PROTECTED ADMIN SaaS DASHBOARD PANEL */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="teams" element={<TeamManager />} />
            <Route path="players" element={<PlayerManager />} />
            <Route path="matches" element={<MatchScheduler />} />
            <Route path="gallery" element={<GalleryManager />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* 4. PROTECTED SCORER FAT-FINGER INTERFACE */}
          <Route
            path="/scorer"
            element={
              <ProtectedRoute allowedRoles={['scorer', 'admin']}>
                <ScorerLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<MatchList />} />
            <Route path="match/:id" element={<LiveScoring />} />
          </Route>

          {/* 5. CATCH-ALL REDIRECT ROUTE */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
