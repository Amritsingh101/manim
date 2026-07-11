import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useMe } from './api/hooks'
import { useAuthStore } from './stores/authStore'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import AuthPage from './pages/AuthPage'
import AuthCallback from './pages/AuthCallback'
import Dashboard from './pages/Dashboard'
import CreateVideo from './pages/CreateVideo'
import VideoDetail from './pages/VideoDetail'
import VideoHistory from './pages/VideoHistory'
import Settings from './pages/Settings'

function AuthSync() {
  const { data: user, isError } = useMe()
  const { setUser } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => { if (user) setUser(user) }, [user, setUser])
  useEffect(() => { if (isError) setUser(null) }, [isError, setUser])

  useEffect(() => {
    const handler = () => navigate('/auth/login', { replace: true })
    window.addEventListener('auth:logout', handler)
    return () => window.removeEventListener('auth:logout', handler)
  }, [navigate])

  return null
}

function PrivateRoute({ children }) {
  const { isAuthenticated, token } = useAuthStore()
  if (!token && !isAuthenticated) return <Navigate to="/auth/login" replace />
  if (isAuthenticated) return children
  return null // Token exists, waiting for /me
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthSync />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/auth/:mode" element={<AuthPage />} />
        <Route path="/dashboard" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
        <Route path="/create" element={<PrivateRoute><Layout><CreateVideo /></Layout></PrivateRoute>} />
        <Route path="/videos/:id" element={<PrivateRoute><Layout><VideoDetail /></Layout></PrivateRoute>} />
        <Route path="/history" element={<PrivateRoute><Layout><VideoHistory /></Layout></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><Layout><Settings /></Layout></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
