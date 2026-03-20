import { useRef, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { register } from '../api/authApi'
import './SignUpPage.css'

/* ── Iron Pendant (shared look with LoginPage) ── */
function IronPendant() {
  return (
    <div className="lamp-wrap">
      <div className="lamp-cord" />
      <div className="iron-body">
        <svg className="iron-svg" viewBox="0 0 120 75" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="ironBody2" x1="0" y1="0" x2="120" y2="75" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2a2a3e"/>
              <stop offset="100%" stopColor="#12121e"/>
            </linearGradient>
            <linearGradient id="soleGrad2" x1="0" y1="0" x2="120" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#00c88a"/>
              <stop offset="50%" stopColor="#00e5a0"/>
              <stop offset="100%" stopColor="#00c88a"/>
            </linearGradient>
            <filter id="glow2">
              <feGaussianBlur stdDeviation="2.5" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="bodyGlow2">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <path d="M10 22 Q10 11 20 11 H82 Q102 11 110 30 L113 41 Q115 48 108 52 L104 54 H10 Q5 54 5 47 V28 Q5 22 10 22Z"
            fill="url(#ironBody2)" stroke="#00e5a0" strokeWidth="1.5" filter="url(#bodyGlow2)"/>
          <path d="M20 11 V6 Q20 2 27 2 H56 Q63 2 63 6 V11"
            fill="none" stroke="#00c88a" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M10 54 H104 L109 59 Q111 63 104 65 H16 Q9 65 7 62 L7 56 Q7 54 10 54Z"
            fill="url(#soleGrad2)" stroke="#00e5a0" strokeWidth="1"/>
          {[28,46,64,82].map(cx => (
            <circle key={cx} cx={cx} cy="59" r="2.8" fill="#07071a" opacity=".85"/>
          ))}
          <circle cx="93" cy="32" r="5.5" fill="#00e5a0" opacity=".95" filter="url(#glow2)"/>
          <path d="M104 54 Q114 48 116 40" stroke="#888" strokeWidth="2" strokeLinecap="round" fill="none"/>
        </svg>
        <div className="iron-glow su-glow" />
      </div>
    </div>
  )
}

/* ── Bubble Canvas ── */
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
    const bubbles = Array.from({length: 24}, () => ({
      x: Math.random() * W,
      y: H + Math.random() * H,
      r: 10 + Math.random() * 48,
      speed: 0.4 + Math.random() * 0.6,
      drift: (Math.random() - 0.5) * 0.4,
      alpha: 0.07 + Math.random() * 0.1,
      hue: Math.random() < 0.5 ? 160 : 200,
    }))
    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      bubbles.forEach(b => {
        b.y -= b.speed; b.x += b.drift
        if (b.y + b.r < 0) { b.y = H + b.r; b.x = Math.random() * W }
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.strokeStyle = `hsla(${b.hue},80%,65%,${b.alpha})`
        ctx.lineWidth = 1.2; ctx.stroke()
        const g = ctx.createRadialGradient(b.x - b.r*0.3, b.y - b.r*0.3, 0, b.x, b.y, b.r)
        g.addColorStop(0, `hsla(${b.hue},80%,85%,${b.alpha * 0.8})`)
        g.addColorStop(1, 'transparent')
        ctx.fillStyle = g; ctx.fill()
      })
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(raf) }
  }, [])
  return <canvas ref={canvasRef} className="bubble-canvas" />
}

/* ── Sign Up Page ── */
export default function SignUpPage() {
  const navigate = useNavigate()
  const passRef    = useRef(null)
  const confirmRef = useRef(null)
  const overlayRef = useRef(null)
  const ironRef    = useRef(null)

  const [showPass, setShowPass]    = useState(false)
  const [showConf, setShowConf]    = useState(false)
  const [strength, setStrength]    = useState(0)
  const [errors, setErrors]        = useState({})

  const togglePass = () => {
    const inp = passRef.current
    inp.type = inp.type === 'password' ? 'text' : 'password'
    setShowPass(s => !s)
  }
  const toggleConf = () => {
    const inp = confirmRef.current
    inp.type = inp.type === 'password' ? 'text' : 'password'
    setShowConf(s => !s)
  }

  const checkStrength = val => {
    let score = 0
    if (val.length >= 8)          score++
    if (/[A-Z]/.test(val))        score++
    if (/[0-9]/.test(val))        score++
    if (/[^A-Za-z0-9]/.test(val)) score++
    setStrength(score)
  }

  const validate = (form) => {
    const errs = {}
    if (!form.name.trim())            errs.name     = 'Name is required'
    if (!form.email.trim())           errs.email    = 'Email or phone is required'
    if (form.password.length < 6)     errs.password = 'At least 6 characters'
    if (form.password !== form.confirm) errs.confirm = 'Passwords do not match'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const form = {
      name:     e.target.name.value,
      email:    e.target.email.value,
      password: passRef.current.value,
      confirm:  confirmRef.current.value,
    }
    const errs = validate(form)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    
    try {
      const data = await register(form.name, form.email, form.password, '')
      localStorage.setItem('freshpress_token', data.token)
      localStorage.setItem('freshpress_user', JSON.stringify(data))

      const overlay = overlayRef.current
      const iron    = ironRef.current
      overlay.style.pointerEvents = 'all'
      iron.className = 'press-iron drop'
      setTimeout(() => iron.classList.add('lift'), 800)
      setTimeout(() => navigate('/home'), 1600)
    } catch (err) {
      setErrors({ email: err.message || 'Sign up failed' })
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

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength]
  const strengthColor = ['', '#ef4444', '#f59e0b', '#3b82f6', '#10b981'][strength]

  return (
    <div className="signup-root">
      <div className="bg-grid" />
      <Bubbles />
      <div className="light-cone su-cone" />

      <IronPendant />

      <div className="signup-card glass">
        <div className="card-badge su-badge">🧺 FreshPress</div>
        <h1>Create <span className="gradient-text-green">Account</span></h1>
        <p className="sub">Join 50,000+ customers enjoying fresh clothes daily.</p>

        <form onSubmit={handleSubmit} autoComplete="off">
          {/* Full Name */}
          <div className="form-group">
            <label>Full Name</label>
            <div className="input-wrap">
              <span className="input-icon">👤</span>
              <input name="name" type="text" placeholder="Your full name" required/>
              <div className="input-glow su-input-glow"/>
            </div>
            {errors.name && <span className="field-err">{errors.name}</span>}
          </div>

          {/* Email / Phone */}
          <div className="form-group">
            <label>Email / Phone</label>
            <div className="input-wrap">
              <span className="input-icon">📧</span>
              <input name="email" type="text" placeholder="you@email.com" required/>
              <div className="input-glow su-input-glow"/>
            </div>
            {errors.email && <span className="field-err">{errors.email}</span>}
          </div>

          {/* Password */}
          <div className="form-group">
            <label>Password</label>
            <div className="input-wrap">
              <span className="input-icon">🔒</span>
              <input
                ref={passRef} type="password" placeholder="Min. 6 characters" required
                onChange={e => checkStrength(e.target.value)}
              />
              <button type="button" className="eye-btn" onClick={togglePass}>
                {showPass ? '🙈' : '👁'}
              </button>
              <div className="input-glow su-input-glow"/>
            </div>
            {errors.password && <span className="field-err">{errors.password}</span>}
            {strength > 0 && (
              <div className="strength-bar">
                <div className="strength-track">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="strength-seg" style={{
                      background: i <= strength ? strengthColor : 'rgba(255,255,255,.1)',
                      transition: 'background .3s',
                    }}/>
                  ))}
                </div>
                <span className="strength-label" style={{color: strengthColor}}>{strengthLabel}</span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label>Confirm Password</label>
            <div className="input-wrap">
              <span className="input-icon">🔐</span>
              <input ref={confirmRef} type="password" placeholder="Repeat password" required/>
              <button type="button" className="eye-btn" onClick={toggleConf}>
                {showConf ? '🙈' : '👁'}
              </button>
              <div className="input-glow su-input-glow"/>
            </div>
            {errors.confirm && <span className="field-err">{errors.confirm}</span>}
          </div>

          <div className="form-extras">
            <label className="remember">
              <input type="checkbox" required/>
              I agree to the <a href="#" className="forgot">Terms &amp; Privacy</a>
            </label>
          </div>

          <button type="submit" className="btn-signup" onClick={addRipple}>
            🚀&nbsp;Create Account
          </button>
        </form>

        <div className="divider"><hr/><span>already have an account?</span><hr/></div>
        <p className="signup-prompt" style={{textAlign:'center', marginTop:0}}>
          <a onClick={() => navigate('/login')} style={{cursor:'pointer', color:'#f5c842', fontWeight:700}}>
            ← Sign In
          </a>
        </p>

        <div className="services-strip">
          {['👕 Laundry','🧴 Dry Clean','♨️ Press & Iron'].map((s,i) => (
            <div key={s} className="svc-chip" style={{'--cd': `${i*0.4}s`}}>{s}</div>
          ))}
        </div>
      </div>

      {/* Iron press overlay */}
      <div className="press-overlay" ref={overlayRef}>
        <div className="press-iron" ref={ironRef}>🫳</div>
      </div>
    </div>
  )
}
