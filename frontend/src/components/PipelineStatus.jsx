import { motion } from 'framer-motion'
import { CheckCircle2, Loader2, XCircle, AlertCircle, RotateCcw, Clock } from 'lucide-react'

const STAGE_META = {
  script:      { label: 'Script Generation',  emoji: '✍️',  model: 'light', step: 1 },
  code_gen:    { label: 'Code Generation',     emoji: '⚡',  model: 'heavy', step: 2 },
  code_review: { label: 'Code Review & Fix',   emoji: '🔍',  model: 'light', step: 3 },
  compilation: { label: 'Manim Compilation',   emoji: '🎬',  model: null,   step: 4 },
  upload:      { label: 'Cloud Upload',        emoji: '☁️',  model: null,   step: 5 },
}

function StageIcon({ status }) {
  if (status === 'success')  return <CheckCircle2 size={16} color="var(--success)" style={{ flexShrink: 0 }} />
  if (status === 'failed')   return <XCircle      size={16} color="var(--error)"   style={{ flexShrink: 0 }} />
  if (status === 'skipped')  return <AlertCircle  size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
  if (status === 'retrying') return <RotateCcw    size={16} color="var(--gold-light)" style={{ flexShrink: 0, animation: 'spin 1.5s linear infinite' }} />
  if (status === 'running')  return <Loader2      size={16} color="var(--accent-text)" style={{ flexShrink: 0, animation: 'spin 1s linear infinite' }} />
  return <Clock size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
}

function formatDuration(started, completed) {
  if (!started) return null
  const end = completed ? new Date(completed) : new Date()
  const secs = Math.floor((end - new Date(started)) / 1000)
  if (secs < 60) return `${secs}s`
  return `${Math.floor(secs / 60)}m ${secs % 60}s`
}

function getActiveIdx(jobs, stages) {
  for (let i = 0; i < stages.length; i++) {
    const j = jobs.find((x) => x.stage === stages[i])
    if (j && (j.status === 'running' || j.status === 'retrying')) return i
  }
  return -1
}

const MODEL_BADGE = (model) => model === 'heavy'
  ? { label: 'Pro',   bg: 'rgba(217,119,6,0.12)', color: 'var(--gold-light)', border: '1px solid rgba(217,119,6,0.25)' }
  : { label: 'Flash', bg: 'rgba(13,148,136,0.12)', color: 'var(--teal-light)', border: '1px solid rgba(13,148,136,0.25)' }

export default function PipelineStatus({ jobs = [], videoStatus }) {
  const stages = Object.keys(STAGE_META)
  const activeIdx = getActiveIdx(jobs, stages)
  const isInFlight = videoStatus === 'processing' || videoStatus === 'pending'
  const completedCount = jobs.filter((j) => j.status === 'success').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {stages.map((stage, idx) => {
        const job     = jobs.find((j) => j.stage === stage)
        const meta    = STAGE_META[stage]
        const status  = job?.status || 'pending'
        const duration = formatDuration(job?.started_at, job?.completed_at)
        const isActive = status === 'running' || status === 'retrying'
        const isDone   = status === 'success'
        const isFailed = status === 'failed'

        let cardBg     = 'var(--bg-card)'
        let cardBorder = 'var(--border)'
        let shadow     = 'var(--shadow-xs)'

        if (isActive) { cardBg = 'var(--accent-subtle)';                  cardBorder = 'rgba(107,92,231,0.35)'; shadow = 'var(--shadow-sm)' }
        if (isDone)   { cardBg = 'rgba(22,163,74,0.06)';                  cardBorder = 'rgba(22,163,74,0.22)' }
        if (isFailed) { cardBg = 'rgba(220,38,38,0.06)';                  cardBorder = 'rgba(220,38,38,0.22)' }

        const modelBadge = meta.model ? MODEL_BADGE(meta.model) : null

        return (
          <motion.div
            key={stage}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.055 }}
            style={{
              display: 'flex', flexDirection: 'column', gap: 6,
              padding: '10px 13px', borderRadius: 'var(--radius-md)',
              background: cardBg, border: `1px solid ${cardBorder}`,
              boxShadow: shadow,
              transition: 'all 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 }}>
                <StageIcon status={status} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {meta.emoji} {meta.label}
                    </span>
                    {modelBadge && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.06em', ...modelBadge }}>
                        {modelBadge.label}
                      </span>
                    )}
                  </div>
                  {isActive && <div style={{ fontSize: 10, color: 'var(--accent-text)', fontWeight: 600, marginTop: 1 }}>● Running now</div>}
                  {isDone   && <div style={{ fontSize: 10, color: 'var(--success)', marginTop: 1 }}>✓ Completed</div>}
                  {isFailed && <div style={{ fontSize: 10, color: 'var(--error)', marginTop: 1 }}>✗ Failed</div>}
                  {status === 'retrying' && <div style={{ fontSize: 10, color: 'var(--gold-light)', marginTop: 1 }}>↻ Retrying…</div>}
                  {status === 'pending' && isInFlight && idx === activeIdx + 1 && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>Up next</div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {job?.attempt > 1 && <span style={{ fontSize: 10, color: 'var(--gold-light)' }}>#{job.attempt}</span>}
                {duration && <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{duration}</span>}
              </div>
            </div>

            {isActive && (
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${job?.progress || 15}%` }} />
              </div>
            )}

            {job?.message && !isFailed && (
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>{job.message}</p>
            )}

            {isFailed && job?.error && (
              <details>
                <summary style={{ fontSize: 11, color: 'var(--error)', cursor: 'pointer' }}>View error</summary>
                <pre style={{
                  marginTop: 6, padding: '7px 10px', borderRadius: 6,
                  background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.18)',
                  fontSize: 10, color: 'var(--error)', whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word', maxHeight: 150, overflow: 'auto',
                }}>
                  {job.error}
                </pre>
              </details>
            )}

            {job?.total_tokens > 0 && isDone && (
              <div style={{ display: 'flex', gap: 10, fontSize: 10, color: 'var(--text-muted)' }}>
                <span>{job.total_tokens.toLocaleString()} tokens</span>
                {job.model_used && <span>{job.model_used}</span>}
              </div>
            )}
          </motion.div>
        )
      })}

      {/* Progress summary */}
      {isInFlight && jobs.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            marginTop: 4, padding: '7px 12px', borderRadius: 8,
            background: 'var(--accent-subtle)',
            border: '1px solid rgba(107,92,231,0.18)',
            fontSize: 11, color: 'var(--text-secondary)',
            display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <Loader2 size={11} color="var(--accent-text)" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
          {completedCount}/{stages.filter(s => s !== 'upload').length} steps completed
        </motion.div>
      )}
    </div>
  )
}
