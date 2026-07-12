import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { authApi } from '../api/client'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'
import { Zap } from 'lucide-react'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [statusMsg, setStatusMsg] = useState('Completing sign-in…')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        setStatusMsg('Loading session…')
        let accessToken = null

        // 1. Direct parsing fallback (Bulletproof)
        // If Supabase redirected back with implicit flow, the tokens are directly
        // in the URL hash (e.g. #access_token=...&refresh_token=...)
        const hash = window.location.hash
        if (hash) {
          const params = new URLSearchParams(hash.substring(1))
          accessToken = params.get('access_token')
          if (accessToken) {
            console.log('Successfully extracted access token directly from URL hash')
          }
        }

        // 2. Library getSession fallback
        if (!accessToken) {
          // Allow small delay for supabase-js to parse hash if not already done
          await new Promise((r) => setTimeout(r, 200))
          const { data, error } = await supabase.auth.getSession()
          if (error) {
            console.warn('supabase getSession warning:', error.message)
          }
          accessToken = data?.session?.access_token
        }

        // 3. Fallback to check if user has a query parameter code (PKCE fallback)
        if (!accessToken) {
          const urlParams = new URLSearchParams(window.location.search)
          const code = urlParams.get('code')
          if (code) {
            setStatusMsg('Exchanging authorization code…')
            const { data, error } = await supabase.auth.exchangeCodeForSession(code)
            if (error) throw new Error(error.message)
            accessToken = data?.session?.access_token
          }
        }

        if (!accessToken) {
          console.error('No access token found in hash, session, or search params. URL:', window.location.href)
          toast.error('Sign-in failed — no session returned. Check your redirect configuration.')
          navigate('/auth/login')
          return
        }

        // Exchange Supabase token for our app's JWT pair
        setStatusMsg('Setting up your account…')
        const res = await authApi.oauthSync(accessToken)
        login(res.data.access_token, res.data.refresh_token)
        toast.success('Signed in successfully!')
        navigate('/dashboard')

      } catch (err) {
        const detail = err.response?.data?.detail
        const msg = detail
          ? (Array.isArray(detail) ? detail[0]?.msg : detail)
          : (err.message || 'OAuth callback failed')

        console.error('OAuth callback error:', err)
        toast.error(msg)
        navigate('/auth/login')
      }
    }

    handleCallback()
  }, [navigate, login])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
      background: 'var(--bg-base)',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: 'var(--accent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Zap size={28} color="white" />
      </div>
      <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
      <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{statusMsg}</p>
    </div>
  )
}
