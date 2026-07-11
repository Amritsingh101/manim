import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LayoutDashboard, PlusCircle, Film, Settings, LogOut, Zap } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { authApi } from '../api/client'

const nav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/create',    icon: PlusCircle,      label: 'Create Video' },
  { to: '/history',   icon: Film,             label: 'My Videos' },
  { to: '/settings',  icon: Settings,         label: 'Settings' },
]

export default function Layout({ children }) {
  const { pathname } = useLocation()
  const { user, logout } = useAuthStore()

  const handleLogout = async () => {
    try { await authApi.logout() } catch {}
    logout()
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 240, flexShrink: 0,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh',
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border)' }}>
          <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8,
              background: 'linear-gradient(135deg, var(--purple), var(--teal))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Zap size={18} color="white" />
            </div>
            <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-primary)' }}>ManimAI</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '16px 12px' }}>
          {nav.map(({ to, icon: Icon, label }) => {
            const active = pathname === to || (to !== '/dashboard' && pathname.startsWith(to))
            return (
              <Link key={to} to={to} style={{ textDecoration: 'none' }}>
                <motion.div
                  whileHover={{ x: 2 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 10, marginBottom: 4,
                    background: active ? 'rgba(139,92,246,0.15)' : 'transparent',
                    color: active ? 'var(--purple-light)' : 'var(--text-secondary)',
                    fontWeight: active ? 600 : 400, fontSize: 14,
                    transition: 'all var(--transition)',
                    borderLeft: active ? '2px solid var(--purple)' : '2px solid transparent',
                  }}
                >
                  <Icon size={18} />
                  {label}
                </motion.div>
              </Link>
            )
          })}
        </nav>

        {/* User + Logout */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--purple), var(--teal))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0,
              }}>
                {user.avatar_url
                  ? <img src={user.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                  : (user.full_name || user.username || '?')[0].toUpperCase()
                }
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.full_name || user.username}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.email}
                </div>
              </div>
            </div>
          )}
          <button onClick={handleLogout} className="btn btn-ghost btn-sm w-full" style={{ justifyContent: 'flex-start' }}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{ padding: '32px', minHeight: '100%' }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  )
}
