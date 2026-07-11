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
          email: form.email,
          password: form.password,
          username: form.username,
          full_name: form.full_name || undefined,
        })
      }
      login(res.data.access_token, res.data.refresh_token)
      toast.success(isLogin ? 'Welcome back!' : 'Account created!')
      navigate('/dashboard')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Authentication failed'
      toast.error(Array.isArray(msg) ? msg[0]?.msg || 'Validation error' : msg)
    } finally {
      setLoading(false)
    }
  }

  const handleOAuth = async (provider) => {
    setOauthLoading(provider)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) toast.error(error.message)
    } catch {
      toast.error('OAuth failed — check Supabase configuration')
      setOauthLoading(null)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-base)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', position: 'relative',
    }}>
      {/* Gradient background */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 20% 20%, rgba(139,92,246,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(20,184,166,0.06) 0%, transparent 50%)',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        style={{ width: '100%', maxWidth: 420, position: 'relative' }}
      >
        {/* Back to home */}
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 24, fontSize: 13, color: 'var(--text-secondary)' }}>
          <ArrowLeft size={14} /> Back to home
        </Link>

        <div className="card" style={{ padding: 32 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9,
              background: 'linear-gradient(135deg, var(--purple), var(--teal))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Zap size={20} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800 }}>ManimAI</h1>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                {isLogin ? 'Welcome back' : 'Create your account'}
              </p>
            </div>
          </div>

          {/* OAuth buttons */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
            <button
              onClick={() => handleOAuth('google')}
              disabled={!!oauthLoading}
              className="btn btn-secondary w-full"
              style={{ justifyContent: 'center' }}
            >
              {oauthLoading === 'google' ? <div className="spinner" /> : <Globe size={16} />}
              Google
            </button>
            <button
              onClick={() => handleOAuth('github')}
              disabled={!!oauthLoading}
              className="btn btn-secondary w-full"
              style={{ justifyContent: 'center' }}
            >
              {oauthLoading === 'github' ? <div className="spinner" /> : <GitFork size={16} />}
              GitHub
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>or with email</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                    <User size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      className="input"
                      style={{ paddingLeft: 36 }}
                      placeholder="yourname"
                      value={form.username}
                      onChange={set('username')}
                      required={!isLogin}
                      minLength={3}
                      maxLength={40}
                      pattern="^[a-zA-Z0-9_]+$"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!isLogin && (
              <div className="form-group">
                <label className="label">Full Name (optional)</label>
                <input className="input" placeholder="Your Name" value={form.full_name} onChange={set('full_name')} />
              </div>
            )}

            <div className="form-group">
              <label className="label">Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="input"
                  style={{ paddingLeft: 36 }}
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={set('email')}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="input"
                  style={{ paddingLeft: 36, paddingRight: 40 }}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={set('password')}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full" style={{ justifyContent: 'center', marginTop: 4 }}>
              {loading ? <div className="spinner" /> : <Zap size={16} />}
              {loading ? 'Please wait…' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Toggle */}
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-secondary)' }}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <Link to={isLogin ? '/auth/register' : '/auth/login'} style={{ color: 'var(--purple-light)', fontWeight: 600 }}>
              {isLogin ? 'Sign up' : 'Sign in'}
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
