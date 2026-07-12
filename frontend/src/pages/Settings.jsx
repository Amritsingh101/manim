import { useState } from 'react'
import { motion } from 'framer-motion'
import { useMe, useUpdateProfile } from '../api/hooks'
import { User, Mail, Shield, Palette } from 'lucide-react'

export default function Settings() {
  const { data: user } = useMe()
  const { mutate: updateProfile, isPending } = useUpdateProfile()
  const [form, setForm] = useState({ full_name: '', username: '' })

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSave = (e) => {
    e.preventDefault()
    const payload = {}
    if (form.full_name) payload.full_name = form.full_name
    if (form.username) payload.username = form.username
    if (Object.keys(payload).length > 0) updateProfile(payload)
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 32 }}>Settings</h1>

      {/* Profile */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <User size={18} color="var(--purple-light)" />
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Profile</h2>
        </div>

        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%', flexShrink: 0,
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 800, color: 'white', overflow: 'hidden',
          }}>
            {user?.avatar_url
              ? <img src={user.avatar_url} alt="" style={{ width: 60, height: 60, objectFit: 'cover' }} />
              : (user?.full_name || user?.username || '?')[0].toUpperCase()
            }
          </div>
          <div>
            <p style={{ fontWeight: 600, fontSize: 16 }}>{user?.full_name || user?.username}</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user?.email}</p>
            <p style={{ fontSize: 11, color: user?.is_verified ? 'var(--success)' : 'var(--warning)', marginTop: 2 }}>
              {user?.is_verified ? '✓ Email verified' : '⚠ Email not verified'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="label">Full Name</label>
            <input className="input" placeholder={user?.full_name || 'Your name'} value={form.full_name} onChange={set('full_name')} maxLength={200} />
          </div>
          <div className="form-group">
            <label className="label">Username</label>
            <input className="input" placeholder={user?.username} value={form.username} onChange={set('username')} minLength={3} maxLength={40} pattern="^[a-zA-Z0-9_]+$" />
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Letters, numbers, underscores only</p>
          </div>
          <button type="submit" disabled={isPending || (!form.full_name && !form.username)} className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }}>
            {isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </motion.div>

      {/* Account info */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Shield size={18} color="var(--teal-light)" />
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Account</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            ['Sign-in Method', user?.oauth_provider || 'email/password'],
            ['Account Status', user?.is_active !== false ? 'Active' : 'Disabled'],
            ['Email Verified', user?.is_verified ? 'Yes' : 'No'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{k}</span>
              <span style={{ fontSize: 14, fontWeight: 500, textTransform: 'capitalize' }}>{v}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Models info */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Palette size={18} color="var(--gold)" />
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>AI Models in Use</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { stage: 'Stage 1 — Script Generation', model: 'Gemini 2.0 Flash', color: 'var(--teal-light)', desc: 'Fast, cost-efficient for script writing' },
            { stage: 'Stage 2 — Code Generation', model: 'Gemini 2.5 Pro', color: 'var(--gold)', desc: 'Maximum capability for complex Manim code' },
            { stage: 'Stage 3 — Code Review', model: 'Gemini 2.0 Flash', color: 'var(--teal-light)', desc: 'Quick static analysis + targeted fixes' },
            { stage: 'Stage 4 — Error Recovery', model: 'Gemini 2.5 Pro', color: 'var(--gold)', desc: 'Deep error analysis when compilation fails' },
          ].map(({ stage, model, color, desc }) => (
            <div key={stage} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{stage}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</div>
              </div>
              <span style={{
                fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 99, alignSelf: 'flex-start', flexShrink: 0,
                background: color === 'var(--gold)' ? 'rgba(245,158,11,0.15)' : 'rgba(20,184,166,0.15)',
                color, border: `1px solid ${color === 'var(--gold)' ? 'rgba(245,158,11,0.3)' : 'rgba(20,184,166,0.3)'}`,
              }}>
                {model}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
