import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useVideo, useVideoJobs, useDeleteVideo } from '../api/hooks'
import PipelineStatus from '../components/PipelineStatus'
import { ArrowLeft, Trash2, Download, Play, Code2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function StatusBadge({ status }) {
  const map = {
    pending: 'badge-pending', processing: 'badge-processing',
    completed: 'badge-completed', failed: 'badge-failed',
  }
  return <span className={`badge ${map[status] || 'badge-pending'}`}>{status}</span>
}

export default function VideoDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: video, isLoading } = useVideo(id)
  // Pass videoStatus so polling continues even before any jobs are created
  const { data: jobs = [] } = useVideoJobs(id, video?.status)
  const { mutate: deleteVideo, isPending: deleting } = useDeleteVideo()
  const [showCode, setShowCode] = useState(false)

  const handleDelete = () => {
    if (!confirm('Delete this video?')) return
    deleteVideo(id, { onSuccess: () => navigate('/history') })
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      </div>
    )
  }

  if (!video) return <p style={{ color: 'var(--text-muted)' }}>Video not found.</p>

  const isProcessing = ['pending', 'processing'].includes(video.status)

  return (
    <div className="video-detail-root">
      {/* Back */}
      <Link to="/history" className="back-link">
        <ArrowLeft size={14} /> All Videos
      </Link>

      {/* Title row */}
      <div className="video-detail-title-row">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 800 }}>{video.title || 'Generating…'}</h1>
            <StatusBadge status={video.status} />
          </div>
          {video.description && (
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 600 }}>{video.description}</p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
          {video.video_url && (
            <a href={video.video_url} download className="btn btn-secondary btn-sm">
              <Download size={14} /> Download
            </a>
          )}
          <button onClick={handleDelete} disabled={deleting} className="btn btn-danger btn-sm">
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {/* Pipeline progress — always show on mobile as first block */}
      <div className="video-detail-pipeline-mobile">
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Pipeline Progress</h3>
          <PipelineStatus jobs={jobs} videoStatus={video.status} />
        </div>
      </div>

      <div className="video-detail-grid">
        {/* Left col */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Video player */}
          {video.status === 'completed' && video.video_url && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card"
              style={{ padding: 0, overflow: 'hidden' }}
            >
              <video
                controls
                autoPlay
                style={{ width: '100%', display: 'block', borderRadius: 'var(--radius-lg)' }}
                poster={video.thumbnail_url || undefined}
              >
                <source src={video.video_url} type="video/mp4" />
              </video>
            </motion.div>
          )}

          {/* Processing animation */}
          {isProcessing && (
            <div className="card" style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: 'clamp(24px, 5vw, 60px)', gap: 20,
            }}>
              <div style={{ position: 'relative', width: 80, height: 80 }}>
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  border: '3px solid rgba(139,92,246,0.1)',
                }} />
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  border: '3px solid transparent',
                  borderTopColor: 'var(--purple)',
                  animation: 'spin 1s linear infinite',
                }} />
                <div style={{
                  position: 'absolute', inset: 12, borderRadius: '50%',
                  border: '3px solid transparent',
                  borderTopColor: 'var(--teal)',
                  animation: 'spin 1.5s linear infinite reverse',
                }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  AI pipeline running…
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  This typically takes 2–5 minutes. Live progress shown below.
                </p>
              </div>
            </div>
          )}

          {/* Failed state */}
          {video.status === 'failed' && (
            <div className="card" style={{
              background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)',
              padding: 24,
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--error)', marginBottom: 8 }}>
                Generation Failed
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
                {video.error_message || 'An unknown error occurred.'}
              </p>
              {video.compile_attempt > 0 && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Attempted {video.compile_attempt} compilation {video.compile_attempt === 1 ? 'attempt' : 'attempts'} with smart retry.
                </p>
              )}
              <Link to="/create" className="btn btn-primary btn-sm" style={{ marginTop: 16, display: 'inline-flex' }}>
                Try again
              </Link>
            </div>
          )}

          {/* Generated code viewer */}
          {video.manim_code && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', cursor: 'pointer', borderBottom: showCode ? '1px solid var(--border)' : 'none' }}
                onClick={() => setShowCode(!showCode)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Code2 size={16} color="var(--purple-light)" />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Generated Manim Code</span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {video.manim_code.split('\n').length} lines · {showCode ? 'Hide' : 'Show'}
                </span>
              </div>
              {showCode && (
                <pre style={{
                  padding: '16px 20px', fontSize: 12, lineHeight: 1.7,
                  color: 'var(--teal-light)', overflowX: 'auto',
                  maxHeight: 500, overflow: 'auto',
                }}>
                  <code>{video.manim_code}</code>
                </pre>
              )}
            </div>
          )}
        </div>

        {/* Pipeline sidebar — desktop only, hidden on mobile (shown above) */}
        <div className="video-detail-sidebar">
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Pipeline Progress</h3>
            <PipelineStatus jobs={jobs} videoStatus={video.status} />
          </div>

          {/* Metadata */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 14 }}>Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['Style', video.style],
                ['Quality', video.quality],
                ['Duration', video.duration_seconds ? `${video.duration_seconds}s` : '—'],
                ['Compile Attempts', video.compile_attempt || 1],
                ['Created', new Date(video.created_at).toLocaleDateString()],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Original prompt */}
          <div className="card" style={{ padding: 16 }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Original Prompt</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{video.prompt}</p>
          </div>
        </div>
      </div>

      {/* Mobile metadata + prompt below pipeline */}
      <div className="video-detail-meta-mobile">
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 14 }}>Details</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['Style', video.style],
              ['Quality', video.quality],
              ['Duration', video.duration_seconds ? `${video.duration_seconds}s` : '—'],
              ['Compile Attempts', video.compile_attempt || 1],
              ['Created', new Date(video.created_at).toLocaleDateString()],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k}</span>
                <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Original Prompt</p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{video.prompt}</p>
        </div>
      </div>
    </div>
  )
}
