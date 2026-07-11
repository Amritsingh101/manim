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
        // With implicit flow, Supabase auto-processes the #access_token hash.
        // detectSessionInUrl=true means getSession() will find it immediately.
        setStatusMsg('Loading session…')

        // Small delay to let supabase-js parse the hash fragment
        await new Promise((r) => setTimeout(r, 300))

        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error('getSession error:', error)
          throw new Error(error.message)
        }

        if (!data?.session) {
          console.error('No session at callback. URL:', window.location.href)
          toast.error(
            'Sign-in failed — no session returned. Check Supabase redirect URL config.'
          )
          navigate('/auth/login')
          return
        }

        // Exchange Supabase token for our app's JWT pair
        setStatusMsg('Setting up your account…')
        const res = await authApi.oauthSync(data.session.access_token)
        login(res.data.access_token, res.data.refresh_token)
        toast.success('Signed in successfully!')
        navigate('/dashboard')
      } catch (err) {
        const detail = err.response?.data?.detail
        const msg = detail
          ? Array.isArray(detail) ? detail[0]?.msg : detail
          : err.message || 'OAuth callback failed'

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
        background: 'linear-gradient(135deg, var(--purple), var(--teal))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Zap size={28} color="white" />
      </div>
      <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
      <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{statusMsg}</p>
    </div>
  )
}
