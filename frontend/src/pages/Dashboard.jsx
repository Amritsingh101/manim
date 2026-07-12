import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PlusCircle, Film, Zap, TrendingUp, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react'
import { useMe } from '../api/hooks'
import { useVideos } from '../api/hooks'
import { formatDistanceToNow } from 'date-fns'

/* Solid accent colors per stat — no gradients */
const STAT_COLORS = {
  purple: '#6B5CE7',
  green:  '#16A34A',
  teal:   '#0D9488',
  amber:  '#D97706',
}

function StatChip({ value, label, icon: Icon, color, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
      className="stat-chip"
    >
      <div className="stat-chip-icon" style={{ background: color }}>
        <Icon size={14} color="white" />
      </div>
      <div className="stat-chip-value">{value}</div>
      <div className="stat-chip-label">{label}</div>
    </motion.div>
  )
}

function ActionCard({ to, iconBg, icon: Icon, title, subtitle, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
    >
      <Link to={to} style={{ textDecoration: 'none' }}>
        <motion.div
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className="action-card"
        >
          <div className="action-card-icon" style={{ background: iconBg }}>
            <Icon size={19} color="white" />
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

function VideoCard({ video, i }) {
  const statusClass = {
    completed: 'badge-completed',
    processing: 'badge-processing',
    pending: 'badge-processing',
    failed: 'badge-failed',
  }[video.status] || 'badge-pending'

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.04 + i * 0.06, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className="recent-video-card"
    >
      <Link to={`/videos/${video.id}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="card recent-video-inner"
          style={{ padding: 0 }}
        >
          <div className="recent-video-thumb">
            {video.thumbnail_url
              ? <img src={video.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (
                <div className="recent-video-thumb-placeholder">
                  <Film size={24} color="var(--text-muted)" opacity={0.6} />
                  {(video.status === 'pending' || video.status === 'processing') && (
                    <div className="thumb-processing-bar"><div className="thumb-processing-fill" /></div>
                  )}
                </div>
              )
            }
            <span className={`badge ${statusClass} recent-video-badge`}>{video.status}</span>
          </div>
          <div className="recent-video-info">
            <div className="recent-video-title">{video.title || video.prompt?.slice(0, 36) || 'Untitled'}</div>
            <div className="recent-video-time">{formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}</div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  )
}

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

      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="dashboard-welcome"
      >
        <div className="welcome-glow" aria-hidden />
        <h1 className="welcome-heading">
          {greeting()}, <span style={{ color: 'var(--accent-text)' }}>{firstName}</span> 👋
        </h1>
        <p className="welcome-sub">
          <Sparkles size={12} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle', color: 'var(--accent-text)' }} />
          AI-powered Manim animations, ready in minutes.
        </p>
      </motion.div>

      {/* Stats */}
      <div className="stats-grid">
        <StatChip delay={0.06} value={videos.length} label="Total"      icon={Film}         color={STAT_COLORS.purple} />
        <StatChip delay={0.10} value={completed}      label="Completed"  icon={CheckCircle2} color={STAT_COLORS.green}  />
        <StatChip delay={0.13} value={processing}     label="Processing" icon={Zap}          color={STAT_COLORS.teal}   />
        <StatChip delay={0.16} value={totalSecs > 0 ? `${totalSecs}s` : '—'} label="Duration" icon={TrendingUp} color={STAT_COLORS.amber} />
      </div>

      {/* Quick actions — always 2 col */}
      <div className="quick-actions-grid">
        <ActionCard delay={0.20} to="/create"  iconBg={STAT_COLORS.purple} icon={PlusCircle} title="Create Video"  subtitle="Script → Code → Render" />
        <ActionCard delay={0.24} to="/history" iconBg={STAT_COLORS.amber}  icon={Film}        title="Browse Videos" subtitle="All your animations"    />
      </div>

      {/* Recent Videos */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.28 }} className="recent-section">
        <div className="recent-header">
          <h2 className="recent-title">Recent Videos</h2>
          <Link to="/history" className="recent-viewall">
            View all <ArrowRight size={11} />
          </Link>
        </div>

        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '28px 0' }}>
            <div className="spinner" />
          </div>
        )}

        {!isLoading && videos.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card empty-state">
            <Film size={34} color="var(--text-muted)" style={{ marginBottom: 10 }} />
            <p style={{ marginBottom: 14 }}>No videos yet — create your first one!</p>
            <Link to="/create" className="btn btn-primary btn-sm">
              <PlusCircle size={13} /> Create Video
            </Link>
          </motion.div>
        )}

        {!isLoading && videos.length > 0 && (
          <div className="recent-scroll-track">
            <div className="recent-scroll-inner">
              {videos.map((video, i) => <VideoCard key={video.id} video={video} i={i} />)}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
