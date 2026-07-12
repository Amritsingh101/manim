import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Zap, Play, Sparkles, Code2, Film, ArrowRight, Check } from 'lucide-react'

/* Solid icon colors — no gradient backgrounds */
const FEATURE_COLORS = {
  purple: '#6B5CE7',
  teal:   '#0D9488',
  amber:  '#D97706',
  rose:   '#E11D48',
}

const features = [
  { icon: Sparkles, title: 'AI Script Generation',   color: FEATURE_COLORS.purple,
    desc: 'Gemini Flash transforms your topic into a detailed educational brief with scene-by-scene breakdown.' },
  { icon: Code2,    title: 'Smart Code Generation',   color: FEATURE_COLORS.teal,
    desc: 'Gemini 2.5 Pro writes complete, runnable Manim CE Python code with beautiful animations.' },
  { icon: Zap,      title: 'Smart Retry Pipeline',    color: FEATURE_COLORS.amber,
    desc: 'Compilation errors are automatically classified and fixed — resume from the failed stage, not from scratch.' },
  { icon: Film,     title: 'Cloud Delivery',           color: FEATURE_COLORS.rose,
    desc: 'Videos are rendered and uploaded to Cloudinary with auto-generated thumbnails.' },
]

const pipeline = [
  { n: '01', title: 'Prompt Detailing', model: 'Flash',   desc: 'Expands your idea into a rich educational brief' },
  { n: '02', title: 'Code Generation',  model: '2.5 Pro', desc: 'Generates complete Manim animation code' },
  { n: '03', title: 'Code Review',      model: 'Flash',   desc: 'Fixes API mistakes and syntax errors' },
  { n: '04', title: 'Compilation',      model: 'Manim',   desc: 'Renders the video with smart error recovery' },
]

const MODEL_STYLE = (model) => model === '2.5 Pro'
  ? { background: 'rgba(217,119,6,0.12)', color: 'var(--gold-light)', border: '1px solid rgba(217,119,6,0.25)' }
  : { background: 'rgba(13,148,136,0.12)', color: 'var(--teal-light)', border: '1px solid rgba(13,148,136,0.25)' }

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>

      {/* Navbar */}
      <nav className="glass" style={{
        position: 'sticky', top: 0, zIndex: 100,
        padding: '14px 0', borderBottom: '1px solid var(--border)',
        boxShadow: 'var(--shadow-xs)',
      }}>
        <div className="container flex items-center justify-between">
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <Zap size={18} color="white" />
            </div>
            <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>ManimAI</span>
          </Link>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Link to="/auth/login" className="btn btn-ghost btn-sm">Sign in</Link>
            <Link to="/auth/register" className="btn btn-primary btn-sm">
              Get Started <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '90px 0 72px', textAlign: 'center', position: 'relative' }}>
        <div className="container" style={{ position: 'relative' }}>
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            {/* Pill badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '5px 14px', borderRadius: '99px', marginBottom: 24,
              background: 'var(--accent-subtle)',
              border: '1px solid rgba(107,92,231,0.25)',
              fontSize: 12, color: 'var(--accent-text)', fontWeight: 600,
              boxShadow: 'var(--shadow-xs)',
            }}>
              <Sparkles size={12} /> Powered by Gemini 2.5 Pro + Gemini Flash
            </div>

            <h1 style={{ fontSize: 'clamp(36px, 6.5vw, 72px)', fontWeight: 900, marginBottom: 22, lineHeight: 1.07 }}>
              Turn any topic into a<br />
              <span style={{ color: 'var(--accent-text)' }}>stunning animation</span>
            </h1>

            <p style={{ fontSize: 17, color: 'var(--text-secondary)', maxWidth: 540, margin: '0 auto 36px', lineHeight: 1.72 }}>
              Describe any mathematical or educational concept.
              ManimAI generates beautiful, professional-quality Manim videos — fully automated.
            </p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/auth/register" className="btn btn-primary btn-lg">
                <Zap size={16} /> Start Creating Free
              </Link>
              <a href="#pipeline" className="btn btn-secondary btn-lg">
                <Play size={16} /> See How It Works
              </a>
            </div>
          </motion.div>

          {/* Demo card */}
          <motion.div
            initial={{ opacity: 0, y: 36, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="card"
            style={{ maxWidth: 580, margin: '52px auto 0', textAlign: 'left' }}
          >
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Prompt
            </div>
            <div style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 18, lineHeight: 1.6 }}>
              "Explain the Fourier Transform visually, showing how any signal can be decomposed into sine waves"
            </div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {pipeline.map((s, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px',
                  borderRadius: 6, background: 'rgba(22,163,74,0.08)',
                  border: '1px solid rgba(22,163,74,0.2)',
                }}>
                  <Check size={11} color="var(--success)" />
                  <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>{s.title}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '72px 0', background: 'var(--bg-surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 36, marginBottom: 10 }}>Everything you need</h2>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>
              A complete AI pipeline from idea to polished video
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {features.map(({ icon: Icon, title, desc, color }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.09 }}
                className="card"
                style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                <div className="landing-feature-icon" style={{ background: color }}>
                  <Icon size={20} color="white" />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>{title}</h3>
                <p style={{ fontSize: 13, lineHeight: 1.65, margin: 0 }}>{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pipeline */}
      <section id="pipeline" style={{ padding: '72px 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 36, marginBottom: 10 }}>4-Stage AI Pipeline</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Each stage uses the right model — fast for simple tasks, powerful for code
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
            {pipeline.map(({ n, title, model, desc }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.09 }}
                className="card"
              >
                <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--accent-text)', marginBottom: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Stage {n}
                </div>
                <h3 style={{ fontSize: 15, marginBottom: 8, fontWeight: 700 }}>{title}</h3>
                <div style={{
                  display: 'inline-block', padding: '3px 8px', borderRadius: 99, marginBottom: 10,
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                  ...MODEL_STYLE(model),
                }}>
                  Gemini {model}
                </div>
                <p style={{ fontSize: 13, margin: 0 }}>{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '72px 0', background: 'var(--bg-surface)', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ fontSize: 36, marginBottom: 14 }}>Ready to create?</h2>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 28 }}>
            Sign up free and generate your first video in minutes.
          </p>
          <Link to="/auth/register" className="btn btn-primary btn-lg">
            <Zap size={16} /> Get Started for Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '28px 0', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          ManimAI v2 · Built with Gemini 2.5 Pro + FastAPI + Manim CE
        </p>
      </footer>
    </div>
  )
}
