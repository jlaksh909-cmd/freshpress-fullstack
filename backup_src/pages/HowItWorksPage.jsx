import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import './HowItWorksPage.css'
import './HomePage.css' // Import for shared Navbar, Footer, Toast styles

/* ════════════════════════════════════════
   TOAST SYSTEM (Duplicated from HomePage for now, could be extracted to a shared hook/component)
════════════════════════════════════════ */
function useToast() {
  const [toasts, setToasts] = useState([])
  const add = useCallback((msg, type = 'info', duration = 3500) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }, [])
  return { toasts, add }
}

function ToastContainer({ toasts }) {
  const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' }
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span>{icons[t.type]}</span> {t.msg}
        </div>
      ))}
    </div>
  )
}

/* ════════════════════════════════════════
   NAVBAR (Shared)
════════════════════════════════════════ */
function Navbar({ toast }) {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', h)
    return () => window.removeEventListener('scroll', h)
  }, [])
  const closeMenu = () => setMobileOpen(false)
  return (
    <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="nav-logo" onClick={() => { navigate('/home'); closeMenu() }}
        style={{cursor:'pointer'}}>
        🧺 <span>Fresh<em>Press</em></span>
      </div>
      <div className={`nav-links ${mobileOpen ? 'nav-open' : ''}`}>
        <a style={{cursor:'pointer'}} onClick={() => { navigate('/home'); closeMenu() }}>Services</a>
        <a style={{cursor:'pointer'}} onClick={() => { navigate('/how-it-works'); closeMenu() }}>How It Works</a>
        <a style={{cursor:'pointer'}} onClick={() => { navigate('/pricing'); closeMenu() }}>Pricing</a>
        <a href="#contact"    onClick={closeMenu}>Contact</a>
        <a style={{cursor:'pointer'}} onClick={() => { navigate('/orders'); closeMenu() }}>My Orders</a>
      </div>
      <div className="nav-right">
        <button className="nav-cta" onClick={() => { toast('Signed out. See you soon! 👋', 'info'); setTimeout(() => navigate('/login'), 800) }}>
          Sign Out
        </button>
        <button className="hamburger" onClick={() => setMobileOpen(o => !o)} aria-label="Toggle menu">
          <span className={mobileOpen ? 'ham-x' : ''}></span>
          <span className={mobileOpen ? 'ham-x ham-mid' : ''}></span>
          <span className={mobileOpen ? 'ham-x' : ''}></span>
        </button>
      </div>
    </nav>
  )
}

/* ════════════════════════════════════════
   STEP COMPONENT
════════════════════════════════════════ */
function Step({ n, icon, title, desc, delay }) {
  return (
    <div className="step-card" style={{'--sd': delay}}>
      <div className="step-num">{n}</div>
      <div className="step-icon">{icon}</div>
      <h4>{title}</h4>
      <p>{desc}</p>
    </div>
  )
}

/* ════════════════════════════════════════
   HOW IT WORKS PAGE
════════════════════════════════════════ */
export default function HowItWorksPage() {
  const { toasts, add: toast } = useToast()
  const navigate = useNavigate()

  return (
    <div className="hiw-page-root">
      <Navbar toast={toast} />
      <ToastContainer toasts={toasts} />

      {/* ── HOW IT WORKS ── */}
      <section className="steps-section" id="howitworks">
        <div className="section-header">
          <div className="section-badge">Simple Process</div>
          <h2>How <span className="gradient-text">FreshPress</span> Works</h2>
          <p>Just 4 easy steps to perfectly clean clothes.</p>
        </div>
        <div className="steps-grid">
          <Step n="01" icon="📱" title="Book Online"    desc="Schedule a pickup in under 60 seconds via our app or website."          delay="0s"/>
          <Step n="02" icon="🚚" title="We Pickup"      desc="Our rider arrives at your doorstep at your chosen time."                delay=".15s"/>
          <Step n="03" icon="🏭" title="Expert Cleaning" desc="Your clothes get premium care at our state-of-the-art facility."       delay=".3s"/>
          <Step n="04" icon="✨" title="Delivered Fresh" desc="Clean, crisp clothes delivered back to you with care."                 delay=".45s"/>
        </div>
        <div className="steps-cta">
          <button className="btn-primary" onClick={() => navigate('/home')}>Start Now – Book a Pickup 🚀</button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer" id="contact">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="nav-logo">🧺 <span>Fresh<em>Press</em></span></div>
            <p>Making laundry effortless—one garment at a time. Serving across India.</p>
            <div className="footer-social">
              <button className="fsoc" title="Facebook">📘</button>
              <button className="fsoc" title="Twitter">🐦</button>
              <button className="fsoc" title="Instagram">📸</button>
              <button className="fsoc" title="YouTube">▶</button>
            </div>
          </div>
          <div className="footer-links">
            <div>
              <h5>Services</h5>
              <a onClick={() => navigate('/home')}>Laundry Wash</a>
              <a onClick={() => navigate('/home')}>Dry Cleaning</a>
              <a onClick={() => navigate('/home')}>Steam Press</a>
              <a onClick={() => navigate('/home')}>Shoe Care</a>
            </div>
            <div>
              <h5>Company</h5>
              <a onClick={() => toast('About Us page coming soon!', 'info')}>About Us</a>
              <a onClick={() => toast('Careers page coming soon!', 'info')}>Careers</a>
            </div>
            <div>
              <h5>Support</h5>
              <a onClick={() => toast('Contact Us page coming soon!', 'info')}>Contact Us</a>
              <a onClick={() => toast('FAQ page coming soon!', 'info')}>FAQ</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 FreshPress. All rights reserved.</span>
          <span>Made with ♥ for clean clothes</span>
        </div>
      </footer>
    </div>
  )
}
