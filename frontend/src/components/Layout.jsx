import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, PlusCircle, Film, Settings, LogOut, Zap, Menu, X } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { authApi } from '../api/client'
import { useState } from 'react'

const nav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/create',    icon: PlusCircle,      label: 'Create Video' },
  { to: '/history',   icon: Film,             label: 'My Videos' },
  { to: '/settings',  icon: Settings,         label: 'Settings' },
]

function NavItem({ to, icon: Icon, label, active, onClick }) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }} onClick={onClick}>
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
}

export default function Layout({ children }) {
  const { pathname } = useLocation()
  const { user, logout } = useAuthStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    try { await authApi.logout() } catch {}
    logout()
  }

  const closeMobile = () => setMobileMenuOpen(false)

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* ── Desktop Sidebar ─────────────────────────────────────────────────── */}
      <aside className="sidebar-desktop">
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
          {nav.map(({ to, icon, label }) => {
            const active = pathname === to || (to !== '/dashboard' && pathname.startsWith(to))
            return <NavItem key={to} to={to} icon={icon} label={label} active={active} />
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
                overflow: 'hidden',
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

      {/* ── Mobile Header ───────────────────────────────────────────────────── */}
      <header className="mobile-header">
        <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{
            width: 30, height: 30, borderRadius: 7,
            background: 'linear-gradient(135deg, var(--purple), var(--teal))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={15} color="white" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>ManimAI</span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="btn btn-ghost btn-icon"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* ── Mobile Slide-down Menu ──────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
            className="mobile-menu"
          >
            <div style={{ padding: '8px 12px' }}>
              {nav.map(({ to, icon, label }) => {
                const active = pathname === to || (to !== '/dashboard' && pathname.startsWith(to))
                return <NavItem key={to} to={to} icon={icon} label={label} active={active} onClick={closeMobile} />
              })}
            </div>
            {user && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', overflow: 'hidden',
                    background: 'linear-gradient(135deg, var(--purple), var(--teal))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0,
                  }}>
                    {user.avatar_url
                      ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : (user.full_name || user.username || '?')[0].toUpperCase()
                    }
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{user.full_name || user.username}</span>
                </div>
                <button onClick={handleLogout} className="btn btn-ghost btn-sm">
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay for mobile menu */}
      {mobileMenuOpen && (
        <div
          onClick={closeMobile}
          style={{
            position: 'fixed', inset: 0, zIndex: 99,
            background: 'rgba(0,0,0,0.4)',
            top: 57, // below mobile header
          }}
        />
      )}

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="main-content">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="main-inner"
        >
          {children}
        </motion.div>
      </main>

      {/* ── Mobile Bottom Navigation ─────────────────────────────────────────── */}
      <nav className="mobile-bottom-nav">
        {nav.map(({ to, icon: Icon, label }) => {
          const active = pathname === to || (to !== '/dashboard' && pathname.startsWith(to))
          return (
            <Link key={to} to={to} style={{ textDecoration: 'none', flex: 1 }}>
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 3, padding: '8px 4px',
                color: active ? 'var(--purple-light)' : 'var(--text-muted)',
                transition: 'color var(--transition)',
              }}>
                <Icon size={20} />
                <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{label}</span>
              </div>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
