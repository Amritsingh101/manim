import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, PlusCircle, Film, Settings, LogOut, Zap, Menu, X, Moon, Sun } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useThemeStore } from '../stores/themeStore'
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
    <Link
      to={to}
      onClick={onClick}
      className={`sidebar-nav-item${active ? ' active' : ''}`}
    >
      <Icon size={16} />
      <span>{label}</span>
      <span className="nav-dot" />
    </Link>
  )
}

function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore()
  const isLight = theme === 'light'
  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '6px 10px', borderRadius: 'var(--radius-sm)',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        color: 'var(--text-secondary)', cursor: 'pointer',
        fontSize: 12, fontWeight: 600,
        boxShadow: 'var(--shadow-xs)',
        transition: 'all var(--t-fast)',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
    >
      {isLight ? <Moon size={13} /> : <Sun size={13} />}
      {isLight ? 'Dark' : 'Light'}
    </button>
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
  const initial = (user?.full_name || user?.username || '?')[0]?.toUpperCase()

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* ── Desktop Sidebar ──────────────────────────────────────────────── */}
      <aside className="sidebar-desktop">
        {/* Logo */}
        <div className="sidebar-logo">
          <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flex: 1 }}>
            <div className="sidebar-logo-icon">
              <Zap size={17} color="white" />
            </div>
            <span style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              ManimAI
            </span>
          </Link>
          <ThemeToggle />
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '6px 12px 8px', marginBottom: 2 }}>
            Menu
          </div>
          {nav.map(({ to, icon, label }) => {
            const active = pathname === to || (to !== '/dashboard' && pathname.startsWith(to))
            return <NavItem key={to} to={to} icon={icon} label={label} active={active} />
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          {user && (
            <div className="sidebar-user">
              <div className="sidebar-avatar">
                {user.avatar_url
                  ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : initial
                }
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.full_name || user.username}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.email}
                </div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="btn btn-ghost btn-sm w-full"
            style={{ justifyContent: 'flex-start', fontSize: 13 }}
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile Header ────────────────────────────────────────────────── */}
      <header className="mobile-header">
        <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-xs)' }}>
            <Zap size={14} color="white" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>ManimAI</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="btn btn-ghost btn-icon"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </header>

      {/* ── Mobile Slide-down Menu ───────────────────────────────────────── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16 }}
              className="mobile-menu"
              style={{ zIndex: 101 }}
            >
              <div style={{ padding: '8px 10px' }}>
                {nav.map(({ to, icon, label }) => {
                  const active = pathname === to || (to !== '/dashboard' && pathname.startsWith(to))
                  return <NavItem key={to} to={to} icon={icon} label={label} active={active} onClick={closeMobile} />
                })}
              </div>
              {user && (
                <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="sidebar-avatar" style={{ width: 26, height: 26, fontSize: 11 }}>
                      {user.avatar_url ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initial}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{user.full_name || user.username}</span>
                  </div>
                  <button onClick={handleLogout} className="btn btn-ghost btn-sm">
                    <LogOut size={13} /> Sign out
                  </button>
                </div>
              )}
            </motion.div>
            {/* Backdrop */}
            <div
              onClick={closeMobile}
              style={{ position: 'fixed', inset: 0, zIndex: 99, background: 'var(--bg-overlay)', top: 56 }}
            />
          </>
        )}
      </AnimatePresence>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="main-content">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="main-inner"
        >
          {children}
        </motion.div>
      </main>

      {/* ── Mobile Bottom Nav ─────────────────────────────────────────────── */}
      <nav className="mobile-bottom-nav">
        {nav.map(({ to, icon: Icon, label }) => {
          const active = pathname === to || (to !== '/dashboard' && pathname.startsWith(to))
          return (
            <Link key={to} to={to} style={{ textDecoration: 'none', flex: 1 }}>
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 3, padding: '8px 4px',
                color: active ? 'var(--accent-text)' : 'var(--text-muted)',
                transition: 'color var(--t-fast)',
              }}>
                <Icon size={19} />
                <span style={{ fontSize: 9.5, fontWeight: active ? 700 : 400, letterSpacing: '0.02em' }}>{label}</span>
                {active && <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)', marginTop: 1 }} />}
              </div>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
