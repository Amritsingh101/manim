import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useVideos } from '../api/hooks'
import { PlusCircle, Film, Clock, Zap } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

function StatusBadge({ status }) {
  const classes = { pending: 'badge-pending', processing: 'badge-processing', completed: 'badge-completed', failed: 'badge-failed' }
  return <span className={`badge ${classes[status] || 'badge-pending'}`}>{status}</span>
}

function VideoCard({ video, i }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05 }}
    >
      <Link to={`/videos/${video.id}`} style={{ textDecoration: 'none' }}>
        <div className="card" style={{ display: 'flex', gap: 16, alignItems: 'flex-start', cursor: 'pointer' }}>
          {/* Thumbnail */}
          <div style={{
            width: 120, height: 72, borderRadius: 8, flexShrink: 0,
            background: video.thumbnail_url ? 'transparent' : 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(20,184,166,0.2))',
            overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {video.thumbnail_url
              ? <img src={video.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <Film size={28} color="var(--purple-light)" opacity={0.5} />
            }
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {video.title || video.prompt.slice(0, 60)}
              </span>
              <StatusBadge status={video.status} />
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {video.description || video.prompt}
            </p>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
              <span><Clock size={12} style={{ display: 'inline', marginRight: 4 }} />
                {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
              </span>
              {video.duration_seconds && <span>⏱ {video.duration_seconds}s</span>}
              <span>🎨 {video.style}</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export default function VideoHistory() {
  const { data: videos = [], isLoading } = useVideos({ limit: 50 })

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>My Videos</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            {videos.length} video{videos.length !== 1 ? 's' : ''} generated
          </p>
        </div>
        <Link to="/create" className="btn btn-primary">
          <PlusCircle size={16} /> New Video
        </Link>
      </div>

      {isLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
        </div>
      )}

      {!isLoading && videos.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <Film size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ marginBottom: 8 }}>No videos yet</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Create your first AI-generated Manim animation</p>
          <Link to="/create" className="btn btn-primary">
            <Zap size={16} /> Create First Video
          </Link>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {videos.map((v, i) => <VideoCard key={v.id} video={v} i={i} />)}
      </div>
    </div>
  )
}
