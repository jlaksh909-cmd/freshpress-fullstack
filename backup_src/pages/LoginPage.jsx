import { useRef, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api/authApi'
import './LoginPage.css'

/* ── Iron SVG Pendant ── */
function IronPendant() {
  return (
    <div className="lamp-wrap">
      <div className="lamp-cord" />
      <div className="iron-body">
        <svg className="iron-svg" viewBox="0 0 120 75" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="ironBody" x1="0" y1="0" x2="120" y2="75" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2a2a3e"/>
              <stop offset="100%" stopColor="#12121e"/>
            </linearGradient>
            <linearGradient id="soleGrad" x1="0" y1="0" x2="120" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#c8a820"/>
              <stop offset="50%" stopColor="#f5c842"/>
              <stop offset="100%" stopColor="#c8a820"/>
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2.5" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="bodyGlow">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          {/* Iron body */}
          <path d="M10 22 Q10 11 20 11 H82 Q102 11 110 30 L113 41 Q115 48 108 52 L104 54 H10 Q5 54 5 47 V28 Q5 22 10 22Z"
            fill="url(#ironBody)" stroke="#f5c842" strokeWidth="1.5" filter="url(#bodyGlow)"/>
          {/* Handle */}
          <path d="M20 11 V6 Q20 2 27 2 H56 Q63 2 63 6 V11"
            fill="none" stroke="#d4a520" strokeWidth="2.5" strokeLinecap="round"/>
          {/* Sole plate */}
          <path d="M10 54 H104 L109 59 Q111 63 104 65 H16 Q9 65 7 62 L7 56 Q7 54 10 54Z"
            fill="url(#soleGrad)" stroke="#f5c842" strokeWidth="1"/>
          {/* Steam vents */}
          {[28,46,64,82].map(cx => (
            <circle key={cx} cx={cx} cy="59" r="2.8" fill="#07071a" opacity=".85"/>
          ))}
          {/* Indicator light */}
          <circle cx="93" cy="32" r="5.5" fill="#f5c842" opacity=".95" filter="url(#glow)"/>
          {/* Cord plug */}
          <path d="M104 54 Q114 48 116 40" stroke="#888" strokeWidth="2" strokeLinecap="round" fill="none"/>
        </svg>
        <div className="iron-glow" />
      </div>
    </div>
  )
}

/* ── Bubble canvas ── */
function Bubbles() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let raf
    let W = canvas.width  = window.innerWidth
    let H = canvas.height = window.innerHeight
    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight }
    window.addEventListener('resize', resize)
    const bubbles = Array.from({length: 28}, () => ({
      x: Math.random() * W,
      y: H + Math.random() * H,
      r: 12 + Math.random() * 55,
      speed: 0.4 + Math.random() * 0.7,
      drift: (Math.random() - 0.5) * 0.4,
      alpha: 0.08 + Math.random() * 0.12,
      hue: Math.random() < 0.5 ? 200 : 45,
    }))
    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      bubbles.forEach(b => {
        b.y -= b.speed
        b.x += b.drift
        if (b.y + b.r < 0) { b.y = H + b.r; b.x = Math.random() * W }
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.strokeStyle = `hsla(${b.hue},80%,65%,${b.alpha})`
        ctx.lineWidth = 1.2
        ctx.stroke()
        // inner sheen
        const g = ctx.createRadialGradient(b.x - b.r*0.3, b.y - b.r*0.3, 0, b.x, b.y, b.r)
        g.addColorStop(0, `hsla(${b.hue},80%,85%,${b.alpha * 0.8})`)
        g.addColorStop(1, 'transparent')
        ctx.fillStyle = g
        ctx.fill()
      })
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(raf) }
  }, [])
  return <canvas ref={canvasRef} className="bubble-canvas" />
}

/* ── Steam particles ── */
function Steam() {
  const particles = Array.from({length: 10}, (_, i) => ({
    id: i,
    left: `${15 + Math.random() * 70}%`,
    dur:  `${2 + Math.random() * 2}s`,
    delay:`${Math.random() * 3}s`,
    drift1:`${(Math.random()-0.5)*30}px`,
    drift2:`${(Math.random()-0.5)*60}px`,
  }))
  return (
    <div className="steam-wrap">
      {particles.map(p => (
        <div key={p.id} className="steam-dot" style={{
          left: p.left,
          '--dur': p.dur, '--delay': p.delay,
          '--d1': p.drift1, '--d2': p.drift2,
          animationDelay: p.delay,
        }}/>
      ))}
    </div>
  )
}

/* ── Login Page ── */
export default function LoginPage() {
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [pressed, setPressed] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  
  const overlayRef = useRef(null)
  const ironPressRef = useRef(null)

  const togglePass = () => {
    setShowPass(!showPass)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null) // Clear previous errors
    if (!email || !password) { setError('Please enter valid details'); return }

    try {
      const data = await login(email, password)
      localStorage.setItem('freshpress_token', data.token)
      localStorage.setItem('freshpress_user', JSON.stringify(data))
      
      const overlay = overlayRef.current
      const iron = ironPressRef.current // Corrected from ironRef.current to ironPressRef.current
      overlay.style.pointerEvents = 'all'
      iron.className = 'press-iron drop'
      setTimeout(() => iron.classList.add('lift'), 800)
      setTimeout(() => navigate('/home'), 1600)
    } catch (err) {
      setError(err.message || 'Login failed')
    }
  }

  const addRipple = e => {
    const btn = e.currentTarget
    const r = document.createElement('span')
    r.className = 'btn-ripple'
    r.style.left = e.nativeEvent.offsetX + 'px'
    r.style.top  = e.nativeEvent.offsetY + 'px'
    btn.appendChild(r)
    setTimeout(() => r.remove(), 700)
  }

  return (
    <div className="login-root">
      {/* BG layers */}
      <div className="bg-grid" />
      <Bubbles />
      <div className="light-cone" />

      {/* Iron pendant */}
      <IronPendant />
      <Steam />

      {/* Card */}
      <div className="login-card glass">
        <div className="card-badge">🧺 FreshPress</div>
        <h1>Welcome <span className="gradient-text">Back</span></h1>
        <p className="sub">Sign in to manage your laundry &amp; dry cleaning.</p>

        <form onSubmit={handleSubmit}>
          {error && <div className="field-err" style={{color: '#f87171', marginBottom: '10px'}}>{error}</div>}
          <div className="form-group">
            <label>Email / Phone</label>
            <div className="input-wrap">
              <span className="input-icon">📧</span>
              <input type="text" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" required/>
              <div className="input-glow"/>
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-wrap">
              <span className="input-icon">🔒</span>
              <input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required/>
              <button type="button" className="eye-btn" onClick={togglePass}>{showPass ? '🙈' : '👁'}</button>
              <div className="input-glow"/>
            </div>
          </div>

          <div className="form-extras">
            <label className="remember">
              <input type="checkbox"/> Remember me
            </label>
            <a href="#" className="forgot">Forgot password?</a>
          </div>

          <button type="submit" className="btn-login" onClick={addRipple}>
            🔑 &nbsp;Sign In
          </button>
        </form>

        <div className="divider"><hr/><span>or continue with</span><hr/></div>
        <div className="social-row">
          <button className="social-btn" onClick={() => navigate('/home')}>🌐 Google</button>
          <button className="social-btn" onClick={() => navigate('/home')}>📘 Facebook</button>
        </div>
        <p className="signup-prompt">
          Don't have an account? <a onClick={() => navigate('/signup')} style={{cursor:'pointer'}}>Sign up free →</a>
        </p>
        <div className="services-strip">
          {['👕 Laundry','🧴 Dry Clean','♨️ Press & Iron'].map((s,i) => (
            <div key={s} className="svc-chip" style={{'--cd': `${i*0.4}s`}}>{s}</div>
          ))}
        </div>
      </div>

      {/* Iron press overlay */}
      <div className="press-overlay" ref={overlayRef}>
        <div className="press-iron" ref={ironPressRef}>🫳</div>
      </div>
    </div>
  )
}
