import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Wand2, Sparkles, ChevronDown, Loader2, ArrowRight } from 'lucide-react'
import { useCreateVideo } from '../api/hooks'

const styles = ['modern', 'minimal', 'colorful', 'dark', 'classic']
const qualities = ['low', 'medium', 'high']

const styleDesc = {
  modern: 'Deep purple & teal on dark background',
  minimal: 'Clean white with subtle highlights',
  colorful: 'Vibrant full-color palette',
  dark: 'Black with neon green & cyan accents',
  classic: '3Blue1Brown style — blue background, white text',
}

const examples = [
  'Explain the Pythagorean theorem with visual proofs',
  'Show how the Fourier Transform decomposes signals into sine waves',
  'Visualize gradient descent finding the minimum of a function',
  'Explain the concept of limits and derivatives in calculus',
  "Demonstrate Bayes' theorem with real probability examples",
]

export default function CreateVideo() {
  const navigate = useNavigate()
  const { mutate: createVideo, isPending } = useCreateVideo()

  const [form, setForm] = useState({
    prompt: '',
    style: 'modern',
    quality: 'medium',
    duration_seconds: 60,
  })

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  const setE = (k) => (e) => set(k)(e.target.value)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.prompt.trim()) return

    createVideo(
      { ...form, duration_seconds: parseInt(form.duration_seconds) },
      {
        onSuccess: (video) => navigate(`/videos/${video.id}`),
      }
    )
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
          <span className="gradient-text">Create Video</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Describe any mathematical or educational concept and let AI generate a Manim animation.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Prompt */}
        <div className="card" style={{ padding: 24 }}>
          <div className="form-group">
            <label className="label" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              <Wand2 size={16} style={{ display: 'inline', marginRight: 6 }} />
              What should the video explain?
            </label>
            <textarea
              className="textarea"
              style={{ minHeight: 120, fontSize: 15 }}
              placeholder="e.g. Explain how neural networks learn through backpropagation, showing the gradient flow visually"
              value={form.prompt}
              onChange={setE('prompt')}
              required
              minLength={10}
              maxLength={2000}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
              <span>{form.prompt.length}/2000 characters</span>
              <span>{form.prompt.length < 20 ? 'Be more specific for better results' : '✓ Good prompt length'}</span>
            </div>
          </div>

          {/* Example prompts */}
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
              <Sparkles size={12} style={{ display: 'inline', marginRight: 4 }} />
              Try an example:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {examples.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => set('prompt')(ex)}
                  style={{
                    padding: '5px 12px', borderRadius: 99, fontSize: 12,
                    background: 'var(--bg-input)', border: '1px solid var(--border)',
                    color: 'var(--text-secondary)', cursor: 'pointer',
                    transition: 'all var(--transition)',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = 'var(--border-hover)'
                    e.target.style.color = 'var(--text-primary)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = 'var(--border)'
                    e.target.style.color = 'var(--text-secondary)'
                  }}
                >
                  {ex.length > 50 ? ex.slice(0, 47) + '…' : ex}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Settings</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
            {/* Style */}
            <div className="form-group">
              <label className="label">Visual Style</label>
              <select
                className="input select"
                value={form.style}
                onChange={setE('style')}
              >
                {styles.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                {styleDesc[form.style]}
              </p>
            </div>

            {/* Quality */}
            <div className="form-group">
              <label className="label">Render Quality</label>
              <select className="input select" value={form.quality} onChange={setE('quality')}>
                {qualities.map((q) => (
                  <option key={q} value={q}>{q.charAt(0).toUpperCase() + q.slice(1)}</option>
                ))}
              </select>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                {form.quality === 'low' ? '480p — fastest render' : form.quality === 'medium' ? '720p — balanced' : '1080p — best quality'}
              </p>
            </div>

            {/* Duration */}
            <div className="form-group">
              <label className="label">Target Duration</label>
              <select
                className="input select"
                value={form.duration_seconds}
                onChange={(e) => set('duration_seconds')(e.target.value)}
              >
                {[30, 45, 60, 90, 120, 180].map((s) => (
                  <option key={s} value={s}>{s}s ({Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')})</option>
                ))}
              </select>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                AI may adjust for content
              </p>
            </div>
          </div>
        </div>

        {/* Pipeline preview */}
        <div className="card" style={{ padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Pipeline that will run:
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {[
              ['Script', 'Flash'],
              ['Code Gen', '2.5 Pro'],
              ['Review', 'Flash'],
              ['Render', 'Manim'],
            ].map(([label, model], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block' }}>Stage {i + 1}</span>
                  {label}
                  <span style={{
                    marginLeft: 6, fontSize: 10, padding: '1px 5px', borderRadius: 4,
                    background: model === '2.5 Pro' ? 'rgba(245,158,11,0.15)' : 'rgba(20,184,166,0.15)',
                    color: model === '2.5 Pro' ? 'var(--gold)' : 'var(--teal-light)',
                  }}>
                    {model}
                  </span>
                </div>
                {i < 3 && <ArrowRight size={14} color="var(--text-muted)" />}
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending || form.prompt.length < 10}
          className="btn btn-primary btn-lg"
          style={{ alignSelf: 'flex-start' }}
        >
          {isPending ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Starting pipeline…</> : <><Wand2 size={18} /> Generate Video</>}
        </button>
      </form>
    </div>
  )
}
