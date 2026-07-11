import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Zap, Play, Sparkles, Code2, Film, ArrowRight, Check } from 'lucide-react'

const features = [
  {
    icon: Sparkles, title: 'AI Script Generation',
    desc: 'Gemini Flash transforms your topic into a detailed educational brief with scene-by-scene breakdown.',
    gradient: 'var(--purple), #6366f1',
  },
  {
    icon: Code2, title: 'Smart Code Generation',
    desc: 'Gemini 2.5 Pro writes complete, runnable Manim CE Python code with beautiful animations.',
    gradient: 'var(--teal), var(--teal-light)',
  },
  {
    icon: Zap, title: 'Smart Retry Pipeline',
    desc: 'Compilation errors are automatically classified and fixed — resume from the failed stage, not from scratch.',
    gradient: 'var(--gold), #fb923c',
  },
  {
    icon: Film, title: 'Cloud Delivery',
    desc: 'Videos are rendered and uploaded to Cloudinary with auto-generated thumbnails.',
    gradient: 'var(--rose), #f97316',
  },
]

const pipeline = [
  { n: '01', title: 'Prompt Detailing', model: 'Flash', desc: 'Expands your idea into a rich educational brief' },
  { n: '02', title: 'Code Generation',  model: '2.5 Pro', desc: 'Generates complete Manim animation code' },
  { n: '03', title: 'Code Review',      model: 'Flash', desc: 'Fixes API mistakes and syntax errors' },
  { n: '04', title: 'Compilation',      model: 'Manim', desc: 'Renders the video with smart error recovery' },
]

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Navbar */}
      <nav className="glass" style={{
        position: 'sticky', top: 0, zIndex: 100,
        padding: '16px 0', borderBottom: '1px solid var(--border)',
      }}>
        <div className="container flex items-center justify-between">
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9,
              background: 'linear-gradient(135deg, var(--purple), var(--teal))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Zap size={20} color="white" />
            </div>
            <span style={{ fontWeight: 800, fontSize: 20, color: 'var(--text-primary)' }}>ManimAI</span>
          </Link>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Link to="/auth/login" className="btn btn-ghost btn-sm">Sign in</Link>
            <Link to="/auth/register" className="btn btn-primary btn-sm">
              Get Started <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '100px 0 80px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 600, height: 400, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(139,92,246,0.12), transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div className="container" style={{ position: 'relative' }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 16px', borderRadius: 99, marginBottom: 28,
              background: 'rgba(139,92,246,0.12)',
              border: '1px solid rgba(139,92,246,0.3)',
              fontSize: 13, color: 'var(--purple-light)', fontWeight: 600,
            }}>
              <Sparkles size={14} /> Powered by Gemini 2.5 Pro + Gemini Flash
            </div>

            <h1 style={{ fontSize: 'clamp(40px, 7vw, 80px)', fontWeight: 900, marginBottom: 24, lineHeight: 1.05 }}>
              Turn any topic into a<br />
              <span className="gradient-text">stunning animation</span>
            </h1>

            <p style={{ fontSize: 18, color: 'var(--text-secondary)', maxWidth: 560, margin: '0 auto 40px', lineHeight: 1.7 }}>
              Describe any mathematical or educational concept.
              ManimAI generates beautiful, professional-quality Manim videos — fully automated.
            </p>

            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/auth/register" className="btn btn-primary btn-lg">
                <Zap size={18} /> Start Creating Free
              </Link>
              <a href="#pipeline" className="btn btn-secondary btn-lg">
                <Play size={18} /> See How It Works
              </a>
            </div>
          </motion.div>

          {/* Demo prompt card */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            style={{
              maxWidth: 600, margin: '60px auto 0',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 16, padding: '20px 24px', textAlign: 'left',
              boxShadow: '0 0 80px rgba(139,92,246,0.1)',
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'monospace' }}>
              Prompt
            </div>
            <div style={{ fontSize: 16, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 20 }}>
              "Explain the Fourier Transform visually, showing how any signal can be decomposed into sine waves"
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {pipeline.map((s, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                  borderRadius: 6, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                }}>
                  <Check size={12} color="var(--success)" />
                  <span style={{ fontSize: 12, color: 'var(--success)' }}>{s.title}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '80px 0', background: 'var(--bg-surface)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 40, marginBottom: 12 }}>Everything you need</h2>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)' }}>
              A complete AI pipeline from idea to polished video
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {features.map(({ icon: Icon, title, desc, gradient }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="card"
                style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: `linear-gradient(135deg, ${gradient})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={22} color="white" />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700 }}>{title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.6 }}>{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pipeline */}
      <section id="pipeline" style={{ padding: '80px 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 40, marginBottom: 12 }}>4-Stage AI Pipeline</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Each stage uses the right model — fast for simple tasks, powerful for code
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {pipeline.map(({ n, title, model, desc }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="card"
              >
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--purple)', marginBottom: 10, fontWeight: 700 }}>
                  Stage {n}
                </div>
                <h3 style={{ fontSize: 16, marginBottom: 8 }}>{title}</h3>
                <div style={{
                  display: 'inline-block', padding: '3px 9px', borderRadius: 99, marginBottom: 10,
                  fontSize: 11, fontWeight: 700,
                  background: model === '2.5 Pro' ? 'rgba(245,158,11,0.15)' : 'rgba(20,184,166,0.15)',
                  color: model === '2.5 Pro' ? 'var(--gold)' : 'var(--teal-light)',
                }}>
                  Gemini {model}
                </div>
                <p style={{ fontSize: 13 }}>{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 0', background: 'var(--bg-surface)', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ fontSize: 40, marginBottom: 16 }}>
            Ready to create?
          </h2>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 32 }}>
            Sign up free and generate your first video in minutes.
          </p>
          <Link to="/auth/register" className="btn btn-primary btn-lg">
            <Zap size={18} /> Get Started for Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '32px 0', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          ManimAI v2 · Built with Gemini 2.5 Pro + FastAPI + Manim CE
        </p>
      </footer>
    </div>
  )
}
