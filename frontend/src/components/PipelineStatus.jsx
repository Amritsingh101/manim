import { motion } from 'framer-motion'
import { CheckCircle2, Loader2, XCircle, AlertCircle, RotateCcw } from 'lucide-react'

const STAGE_META = {
  script:      { label: 'Script Generation',  emoji: '✍️',  model: 'light' },
  code_gen:    { label: 'Code Generation',     emoji: '⚡',  model: 'heavy' },
  code_review: { label: 'Code Review & Fix',   emoji: '🔍',  model: 'light' },
  compilation: { label: 'Manim Compilation',   emoji: '🎬',  model: null   },
  upload:      { label: 'Cloud Upload',        emoji: '☁️',  model: null   },
}

const STATUS_ICON = {
  pending:  { icon: Loader2, color: 'var(--text-muted)', spin: false },
  running:  { icon: Loader2, color: 'var(--purple-light)', spin: true },
  retrying: { icon: RotateCcw, color: 'var(--gold)', spin: false },
  success:  { icon: CheckCircle2, color: 'var(--success)', spin: false },
  failed:   { icon: XCircle, color: 'var(--error)', spin: false },
  skipped:  { icon: AlertCircle, color: 'var(--text-muted)', spin: false },
}

function StageIcon({ status }) {
  const { icon: Icon, color, spin } = STATUS_ICON[status] || STATUS_ICON.pending
  return (
    <Icon
      size={18}
      color={color}
      style={{ animation: spin ? 'spin 1s linear infinite' : 'none', flexShrink: 0 }}
    />
  )
}

function formatDuration(started, completed) {
  if (!started) return null
  const end = completed ? new Date(completed) : new Date()
  const secs = Math.floor((end - new Date(started)) / 1000)
  if (secs < 60) return `${secs}s`
  return `${Math.floor(secs / 60)}m ${secs % 60}s`
}

export default function PipelineStatus({ jobs = [], videoStatus }) {
  const stages = Object.keys(STAGE_META)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {stages.map((stage, idx) => {
        const job = jobs.find((j) => j.stage === stage)
        const meta = STAGE_META[stage]
        const status = job?.status || (videoStatus === 'pending' ? 'pending' : 'pending')
        const duration = formatDuration(job?.started_at, job?.completed_at)
        const isActive = status === 'running' || status === 'retrying'

        return (
          <motion.div
            key={stage}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.06 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              padding: '12px 16px',
              borderRadius: 10,
              background: isActive ? 'rgba(139,92,246,0.08)' : 'var(--bg-card)',
              border: `1px solid ${isActive ? 'rgba(139,92,246,0.3)' : 'var(--border)'}`,
              transition: 'all 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <StageIcon status={status} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {meta.emoji} {meta.label}
                </span>
                {meta.model && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 7px',
                    borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.05em',
                    background: meta.model === 'heavy' ? 'rgba(245,158,11,0.15)' : 'rgba(20,184,166,0.15)',
                    color: meta.model === 'heavy' ? 'var(--gold)' : 'var(--teal-light)',
                    border: `1px solid ${meta.model === 'heavy' ? 'rgba(245,158,11,0.3)' : 'rgba(20,184,166,0.3)'}`,
                  }}>
                    {meta.model === 'heavy' ? 'Gemini 2.5 Pro' : 'Gemini Flash'}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {job?.attempt > 1 && (
                  <span style={{ fontSize: 11, color: 'var(--gold)' }}>
                    Attempt {job.attempt}
                  </span>
                )}
                {duration && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {duration}
                  </span>
                )}
              </div>
            </div>

            {/* Progress bar */}
            {isActive && (
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${job?.progress || 10}%` }} />
              </div>
            )}

            {/* Message */}
            {job?.message && (
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                {job.message}
              </p>
            )}

            {/* Error */}
            {status === 'failed' && job?.error && (
              <details>
                <summary style={{ fontSize: 12, color: 'var(--error)', cursor: 'pointer' }}>
                  Error details
                </summary>
                <pre style={{
                  marginTop: 6, padding: '8px 10px', borderRadius: 6,
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                  fontSize: 11, color: 'var(--error)', whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word', maxHeight: 200, overflow: 'auto',
                }}>
                  {job.error}
                </pre>
              </details>
            )}

            {/* Token usage */}
            {job?.total_tokens > 0 && status === 'success' && (
              <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)' }}>
                <span>{job.total_tokens.toLocaleString()} tokens</span>
                {job.model_used && <span>{job.model_used}</span>}
              </div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
