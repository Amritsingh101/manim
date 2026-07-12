import { motion } from 'framer-motion'
import { CheckCircle2, Loader2, XCircle, AlertCircle, RotateCcw, Clock } from 'lucide-react'

const STAGE_META = {
  script:      { label: 'Script Generation',  emoji: '✍️',  model: 'light', step: 1 },
  code_gen:    { label: 'Code Generation',     emoji: '⚡',  model: 'heavy', step: 2 },
  code_review: { label: 'Code Review & Fix',   emoji: '🔍',  model: 'light', step: 3 },
  compilation: { label: 'Manim Compilation',   emoji: '🎬',  model: null,   step: 4 },
  upload:      { label: 'Cloud Upload',        emoji: '☁️',  model: null,   step: 5 },
}

function StageIcon({ status, size = 18 }) {
  if (status === 'success')  return <CheckCircle2 size={size} color="var(--success)" style={{ flexShrink: 0 }} />
  if (status === 'failed')   return <XCircle size={size} color="var(--error)" style={{ flexShrink: 0 }} />
  if (status === 'skipped')  return <AlertCircle size={size} color="var(--text-muted)" style={{ flexShrink: 0 }} />
  if (status === 'retrying') return <RotateCcw size={size} color="var(--gold)" style={{ flexShrink: 0, animation: 'spin 1.5s linear infinite' }} />
  if (status === 'running')  return <Loader2 size={size} color="var(--purple-light)" style={{ flexShrink: 0, animation: 'spin 1s linear infinite' }} />
  // pending
  return <Clock size={size} color="var(--text-muted)" style={{ flexShrink: 0 }} />
}

function formatDuration(started, completed) {
  if (!started) return null
  const end = completed ? new Date(completed) : new Date()
  const secs = Math.floor((end - new Date(started)) / 1000)
  if (secs < 60) return `${secs}s`
  return `${Math.floor(secs / 60)}m ${secs % 60}s`
}

// Determine which step is currently active (running/retrying)
function getActiveStageIndex(jobs, stages) {
  for (let i = 0; i < stages.length; i++) {
    const job = jobs.find((j) => j.stage === stages[i])
    if (job && (job.status === 'running' || job.status === 'retrying')) return i
  }
  return -1
}

export default function PipelineStatus({ jobs = [], videoStatus }) {
  const stages = Object.keys(STAGE_META)
  const activeIdx = getActiveStageIndex(jobs, stages)
  const isInFlight = videoStatus === 'processing' || videoStatus === 'pending'

  // Find the furthest completed step to determine "done-ness" of un-job'd stages
  const completedSet = new Set(jobs.filter((j) => j.status === 'success').map((j) => j.stage))
  const failedSet   = new Set(jobs.filter((j) => j.status === 'failed').map((j) => j.stage))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {stages.map((stage, idx) => {
        const job    = jobs.find((j) => j.stage === stage)
        const meta   = STAGE_META[stage]
        const status = job?.status || 'pending'
        const duration = formatDuration(job?.started_at, job?.completed_at)
        const isActive  = status === 'running' || status === 'retrying'
        const isDone    = status === 'success'
        const isFailed  = status === 'failed'

        // Visual state
        let cardBg     = 'var(--bg-card)'
        let cardBorder = 'var(--border)'
        let labelColor = 'var(--text-secondary)'

        if (isActive) {
          cardBg     = 'rgba(139,92,246,0.08)'
          cardBorder = 'rgba(139,92,246,0.4)'
          labelColor = 'var(--text-primary)'
        } else if (isDone) {
          cardBg     = 'rgba(34,197,94,0.04)'
          cardBorder = 'rgba(34,197,94,0.2)'
          labelColor = 'var(--text-primary)'
        } else if (isFailed) {
          cardBg     = 'rgba(239,68,68,0.05)'
          cardBorder = 'rgba(239,68,68,0.3)'
          labelColor = 'var(--text-primary)'
        }

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
              padding: '10px 14px',
              borderRadius: 10,
              background: cardBg,
              border: `1px solid ${cardBorder}`,
              transition: 'all 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                <StageIcon status={status} />
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: labelColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {meta.emoji} {meta.label}
                  </span>
                  {/* Live "currently running" label */}
                  {isActive && (
                    <span style={{ fontSize: 11, color: 'var(--purple-light)', fontWeight: 500 }}>
                      ● Running now
                    </span>
                  )}
                  {isDone && (
                    <span style={{ fontSize: 11, color: 'var(--success)' }}>
                      ✓ Completed
                    </span>
                  )}
                  {isFailed && (
                    <span style={{ fontSize: 11, color: 'var(--error)' }}>
                      ✗ Failed
                    </span>
                  )}
                  {status === 'retrying' && (
                    <span style={{ fontSize: 11, color: 'var(--gold)' }}>
                      ↻ Retrying…
                    </span>
                  )}
                  {status === 'pending' && isInFlight && idx === activeIdx + 1 && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Up next
                    </span>
                  )}
                </div>

                {meta.model && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 6px',
                    borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.05em',
                    background: meta.model === 'heavy' ? 'rgba(245,158,11,0.15)' : 'rgba(20,184,166,0.15)',
                    color: meta.model === 'heavy' ? 'var(--gold)' : 'var(--teal-light)',
                    border: `1px solid ${meta.model === 'heavy' ? 'rgba(245,158,11,0.3)' : 'rgba(20,184,166,0.3)'}`,
                    flexShrink: 0,
                  }}>
                    {meta.model === 'heavy' ? 'Pro' : 'Flash'}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {job?.attempt > 1 && (
                  <span style={{ fontSize: 10, color: 'var(--gold)' }}>
                    #{job.attempt}
                  </span>
                )}
                {duration && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {duration}
                  </span>
                )}
              </div>
            </div>

            {/* Animated progress bar for running steps */}
            {isActive && (
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${job?.progress || 15}%` }} />
              </div>
            )}

            {/* Step message */}
            {job?.message && !isFailed && (
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>
                {job.message}
              </p>
            )}

            {/* Error details */}
            {isFailed && job?.error && (
              <details>
                <summary style={{ fontSize: 11, color: 'var(--error)', cursor: 'pointer' }}>
                  View error
                </summary>
                <pre style={{
                  marginTop: 6, padding: '8px 10px', borderRadius: 6,
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                  fontSize: 11, color: 'var(--error)', whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word', maxHeight: 160, overflow: 'auto',
                }}>
                  {job.error}
                </pre>
              </details>
            )}

            {/* Token usage */}
            {job?.total_tokens > 0 && isDone && (
              <div style={{ display: 'flex', gap: 10, fontSize: 10, color: 'var(--text-muted)' }}>
                <span>{job.total_tokens.toLocaleString()} tokens</span>
                {job.model_used && <span>{job.model_used}</span>}
              </div>
            )}
          </motion.div>
        )
      })}

      {/* Overall status summary */}
      {isInFlight && jobs.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            marginTop: 4, padding: '8px 14px', borderRadius: 8,
            background: 'rgba(139,92,246,0.06)',
            border: '1px solid rgba(139,92,246,0.15)',
            fontSize: 12, color: 'var(--text-secondary)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <Loader2 size={12} color="var(--purple-light)" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
          <span>
            {completedSet.size}/{stages.filter(s => s !== 'upload').length} steps completed
          </span>
        </motion.div>
      )}
    </div>
  )
}
