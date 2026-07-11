import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PlusCircle, Film, Zap, TrendingUp, CheckCircle2 } from 'lucide-react'
import { useMe } from '../api/hooks'
import { useVideos } from '../api/hooks'
import { formatDistanceToNow } from 'date-fns'

function StatCard({ value, label, icon: Icon, color }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12, flexShrink: 0,
        background: `linear-gradient(135deg, ${color})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={22} color="white" />
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { data: user } = useMe()
  const { data: videos = [], isLoading } = useVideos({ limit: 6 })

  const completed = videos.filter((v) => v.status === 'completed').length
  const processing = videos.filter((v) => ['pending', 'processing'].includes(v.status)).length

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 6 }}>
          {greeting()}, {user?.full_name?.split(' ')[0] || user?.username || 'there'} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Ready to create something amazing with AI-powered Manim animations?
        </p>
      </motion.div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 36 }}>
        <StatCard value={videos.length} label="Total Videos" icon={Film} color="var(--purple), var(--purple-dark)" />
        <StatCard value={completed} label="Completed" icon={CheckCircle2} color="var(--success), #16a34a" />
        <StatCard value={processing} label="Processing" icon={Zap} color="var(--teal), var(--teal-light)" />
        <StatCard value={videos.reduce((a, v) => a + (v.duration_seconds || 0), 0) + 's'} label="Total Duration" icon={TrendingUp} color="var(--gold), #d97706" />
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 36 }}>
        <Link to="/create" style={{ textDecoration: 'none' }}>
          <motion.div
            whileHover={{ y: -2 }}
            className="card"
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(20,184,166,0.1))',
              border: '1px solid rgba(139,92,246,0.3)',
              display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer',
            }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'linear-gradient(135deg, var(--purple), var(--teal))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <PlusCircle size={22} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>Create New Video</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>AI pipeline: script → code → render</div>
            </div>
          </motion.div>
        </Link>
        <Link to="/history" style={{ textDecoration: 'none' }}>
          <motion.div whileHover={{ y: -2 }} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'linear-gradient(135deg, var(--gold), #d97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Film size={22} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>Browse Videos</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>All your generated animations</div>
            </div>
          </motion.div>
        </Link>
      </div>

      {/* Recent videos */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Recent Videos</h2>
          <Link to="/history" style={{ fontSize: 13, color: 'var(--purple-light)' }}>View all →</Link>
        </div>

        {isLoading && <div className="spinner" />}

        {!isLoading && videos.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <Film size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>No videos yet. Create your first one!</p>
            <Link to="/create" className="btn btn-primary btn-sm"><PlusCircle size={14} /> Create Video</Link>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {videos.map((video, i) => (
            <motion.div key={video.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Link to={`/videos/${video.id}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ cursor: 'pointer', padding: 0, overflow: 'hidden' }}>
                  <div style={{
                    height: 140, background: video.thumbnail_url ? 'transparent' : 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(20,184,166,0.15))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {video.thumbnail_url
                      ? <img src={video.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <Film size={40} color="var(--purple-light)" opacity={0.4} />
                    }
                  </div>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {video.title || video.prompt.slice(0, 40)}
                      </span>
                      <span className={`badge badge-${video.status === 'pending' || video.status === 'processing' ? 'processing' : video.status}`} style={{ flexShrink: 0 }}>
                        {video.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
