import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Mail, Lock, User, GitFork, Globe, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { authApi } from '../api/client'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'

export default function AuthPage() {
  const { mode } = useParams()
  const isLogin = mode !== 'register'
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const [form, setForm] = useState({ email: '', password: '', username: '', full_name: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(null)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      let res
      if (isLogin) {
        res = await authApi.login({ email: form.email, password: form.password })
      } else {
        res = await authApi.register({
          email: form.email, password: form.password,
          username: form.username, full_name: form.full_name || undefined,
        })
      }
      login(res.data.access_token, res.data.refresh_token)
      toast.success(isLogin ? 'Welcome back!' : 'Account created!')
      navigate('/dashboard')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Authentication failed'
      toast.error(Array.isArray(msg) ? msg[0]?.msg || 'Validation error' : msg)
    } finally { setLoading(false) }
  }

  const handleOAuth = async (provider) => {
    setOauthLoading(provider)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) toast.error(error.message)
    } catch {
      toast.error('OAuth failed — check Supabase configuration')
      setOauthLoading(null)
    }
  }

  const ICON_STYLE = { position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-base)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.38 }}
        style={{ width: '100%', maxWidth: 400 }}
      >
        {/* Back link */}
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
          <ArrowLeft size={13} /> Back to home
        </Link>

        <div className="card" style={{ padding: 28 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9,
              background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)', flexShrink: 0,
            }}>
              <Zap size={18} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: 19, fontWeight: 800 }}>ManimAI</h1>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                {isLogin ? 'Welcome back' : 'Create your account'}
              </p>
            </div>
          </div>

          {/* OAuth */}
          <div style={{ display: 'flex', gap: 9, marginBottom: 20 }}>
            {[
              { provider: 'google',  Icon: Globe,    label: 'Google' },
              { provider: 'github',  Icon: GitFork,  label: 'GitHub' },
            ].map(({ provider, Icon, label }) => (
              <button
                key={provider}
                onClick={() => handleOAuth(provider)}
                disabled={!!oauthLoading}
                className="btn btn-secondary w-full"
                style={{ justifyContent: 'center', flex: 1 }}
              >
                {oauthLoading === provider ? <div className="spinner" /> : <Icon size={15} />}
                {label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>or with email</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            <AnimatePresence>
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="form-group"
                >
                  <label className="label">Username</label>
                  <div style={{ position: 'relative' }}>
                    <User size={14} style={ICON_STYLE} />
                    <input className="input" style={{ paddingLeft: 36 }} placeholder="yourname"
                      value={form.username} onChange={set('username')}
                      required={!isLogin} minLength={3} maxLength={40} pattern="^[a-zA-Z0-9_]+$" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!isLogin && (
              <div className="form-group">
                <label className="label">Full Name <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
                <input className="input" placeholder="Your Name" value={form.full_name} onChange={set('full_name')} />
              </div>
            )}

            <div className="form-group">
              <label className="label">Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} style={ICON_STYLE} />
                <input className="input" style={{ paddingLeft: 36 }} type="email"
                  placeholder="you@example.com" value={form.email} onChange={set('email')} required />
              </div>
            </div>

            <div className="form-group">
              <label className="label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} style={ICON_STYLE} />
                <input className="input" style={{ paddingLeft: 36, paddingRight: 40 }}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••" value={form.password} onChange={set('password')}
                  required minLength={8} />
                <button type="button" onClick={() => setShowPassword((p) => !p)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full" style={{ justifyContent: 'center', marginTop: 4 }}>
              {loading ? <div className="spinner" /> : <Zap size={15} />}
              {loading ? 'Please wait…' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Toggle */}
          <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'var(--text-secondary)' }}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <Link to={isLogin ? '/auth/register' : '/auth/login'} style={{ color: 'var(--accent-text)', fontWeight: 700 }}>
              {isLogin ? 'Sign up' : 'Sign in'}
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
