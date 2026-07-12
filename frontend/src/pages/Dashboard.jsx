import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PlusCircle, Film, Zap, TrendingUp, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react'
import { useMe } from '../api/hooks'
import { useVideos } from '../api/hooks'
import { formatDistanceToNow } from 'date-fns'

/* ── Compact stat chip ─────────────────────────────────────────────────────── */
function StatChip({ value, label, icon: Icon, gradient, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className="stat-chip"
    >
      <div className="stat-chip-icon" style={{ background: gradient }}>
        <Icon size={14} color="white" />
      </div>
      <div className="stat-chip-value">{value}</div>
      <div className="stat-chip-label">{label}</div>
    </motion.div>
  )
}

/* ── Quick action card ─────────────────────────────────────────────────────── */
function ActionCard({ to, icon: Icon, iconGradient, title, subtitle, delay = 0, accent }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.38, ease: [0.23, 1, 0.32, 1] }}
    >
      <Link to={to} style={{ textDecoration: 'none' }}>
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.18 }}
          className="action-card"
          style={{ '--accent': accent }}
        >
          <div className="action-card-icon" style={{ background: iconGradient }}>
            <Icon size={20} color="white" />
          </div>
          <div className="action-card-body">
            <div className="action-card-title">{title}</div>
            <div className="action-card-sub">{subtitle}</div>
          </div>
          <ArrowRight size={14} className="action-card-arrow" />
        </motion.div>
      </Link>
    </motion.div>
  )
}

/* ── Video card ────────────────────────────────────────────────────────────── */
function VideoCard({ video, i }) {
  const statusClass = {
    completed: 'badge-completed',
    processing: 'badge-processing',
    pending: 'badge-processing',
    failed: 'badge-failed',
  }[video.status] || 'badge-pending'

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 + i * 0.07, duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className="recent-video-card"
    >
      <Link to={`/videos/${video.id}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.18 }}
          className="card recent-video-inner"
        >
          {/* Thumbnail */}
          <div className="recent-video-thumb">
            {video.thumbnail_url
              ? <img src={video.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (
                <div className="recent-video-thumb-placeholder">
                  <Film size={28} color="var(--purple-light)" opacity={0.5} />
                  {(video.status === 'pending' || video.status === 'processing') && (
                    <div className="thumb-processing-bar">
                      <div className="thumb-processing-fill" />
                    </div>
                  )}
                </div>
              )
            }
            <span className={`badge ${statusClass} recent-video-badge`}>{video.status}</span>
          </div>
          {/* Info */}
          <div className="recent-video-info">
            <div className="recent-video-title">
              {video.title || video.prompt?.slice(0, 38) || 'Untitled'}
            </div>
            <div className="recent-video-time">
              {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  )
}

/* ── Dashboard ─────────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { data: user } = useMe()
  const { data: videos = [], isLoading } = useVideos({ limit: 10 })

  const completed  = videos.filter((v) => v.status === 'completed').length
  const processing = videos.filter((v) => ['pending', 'processing'].includes(v.status)).length
  const totalSecs  = videos.reduce((a, v) => a + (v.duration_seconds || 0), 0)

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const firstName = user?.full_name?.split(' ')[0] || user?.username || 'there'

  return (
    <div className="dashboard-root">

      {/* ── Welcome ──────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="dashboard-welcome"
      >
        {/* Ambient glow blob */}
        <div className="welcome-glow" aria-hidden />
        <div className="welcome-text">
          <h1 className="welcome-heading">
            {greeting()}, <span className="gradient-text">{firstName}</span> 👋
          </h1>
          <p className="welcome-sub">
            <Sparkles size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
            AI-powered Manim animations, ready in minutes.
          </p>
        </div>
      </motion.div>

      {/* ── Stats row — 2×2 compact grid ─────────────────────────────────── */}
      <div className="stats-grid">
        <StatChip
          delay={0.06}
          value={videos.length}
          label="Total Videos"
          icon={Film}
          gradient="linear-gradient(135deg, #8b5cf6, #7c3aed)"
        />
        <StatChip
          delay={0.10}
          value={completed}
          label="Completed"
          icon={CheckCircle2}
          gradient="linear-gradient(135deg, #22c55e, #16a34a)"
        />
        <StatChip
          delay={0.14}
          value={processing}
          label="Processing"
          icon={Zap}
          gradient="linear-gradient(135deg, #14b8a6, #2dd4bf)"
        />
        <StatChip
          delay={0.18}
          value={totalSecs > 0 ? `${totalSecs}s` : '—'}
          label="Duration"
          icon={TrendingUp}
          gradient="linear-gradient(135deg, #f59e0b, #d97706)"
        />
      </div>

      {/* ── Quick actions — always 2-column ──────────────────────────────── */}
      <div className="quick-actions-grid">
        <ActionCard
          delay={0.22}
          to="/create"
          icon={PlusCircle}
          iconGradient="linear-gradient(135deg, var(--purple), var(--teal))"
          title="Create Video"
          subtitle="Script → Code → Render"
          accent="rgba(139,92,246,0.35)"
        />
        <ActionCard
          delay={0.26}
          to="/history"
          icon={Film}
          iconGradient="linear-gradient(135deg, #f59e0b, #d97706)"
          title="Browse Videos"
          subtitle="All your animations"
          accent="rgba(245,158,11,0.35)"
        />
      </div>

      {/* ── Recent Videos ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="recent-section"
      >
        <div className="recent-header">
          <h2 className="recent-title">Recent Videos</h2>
          <Link to="/history" className="recent-viewall">View all <ArrowRight size={12} /></Link>
        </div>

        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
            <div className="spinner" />
          </div>
        )}

        {!isLoading && videos.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="card empty-state"
          >
            <Film size={36} color="var(--text-muted)" style={{ marginBottom: 12 }} />
            <p style={{ marginBottom: 16 }}>No videos yet — create your first one!</p>
            <Link to="/create" className="btn btn-primary btn-sm">
              <PlusCircle size={14} /> Create Video
            </Link>
          </motion.div>
        )}

        {!isLoading && videos.length > 0 && (
          <div className="recent-scroll-track">
            <div className="recent-scroll-inner">
              {videos.map((video, i) => (
                <VideoCard key={video.id} video={video} i={i} />
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
