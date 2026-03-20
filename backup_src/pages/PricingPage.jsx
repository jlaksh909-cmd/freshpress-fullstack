import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import './PricingPage.css'
import './HomePage.css' // Import for shared Navbar, Footer, Toast styles

/* ════════════════════════════════════════
   TOAST SYSTEM (Shared)
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
   PRICING CARD
════════════════════════════════════════ */
function PriceCard({ plan, price, features, badge, highlight, onBook }) {
  return (
    <div className={`price-card ${highlight ? 'price-highlight' : ''}`}>
      {badge && <div className="price-badge">{badge}</div>}
      <h3>{plan}</h3>
      <div className="price-amount">₹{price}<span>/order</span></div>
      <ul>
        {features.map(f => <li key={f}>✓ {f}</li>)}
      </ul>
      <button className="price-btn" onClick={() => onBook()}>Get Started →</button>
    </div>
  )
}

/* ════════════════════════════════════════
   TESTIMONIAL
════════════════════════════════════════ */
function Testimonial({ name, role, msg, avatar }) {
  return (
    <div className="testi-card glass">
      <div className="testi-top">
        <div className="testi-avatar">{avatar}</div>
        <div>
          <div className="testi-name">{name}</div>
          <div className="testi-role">{role}</div>
        </div>
        <div className="testi-stars">★★★★★</div>
      </div>
      <p>{msg}</p>
    </div>
  )
}

/* ════════════════════════════════════════
   PRICING PAGE
════════════════════════════════════════ */
export default function PricingPage() {
  const { toasts, add: toast } = useToast()
  const navigate = useNavigate()

  const onBook = () => navigate('/home') // Route to the home page for booking logic

  return (
    <div className="pricing-page-root">
      <Navbar toast={toast} />
      <ToastContainer toasts={toasts} />

      {/* ── PRICING ── */}
      <section className="pricing-section" id="pricing">
        <div className="section-header">
          <div className="section-badge">Transparent Pricing</div>
          <h2>Simple, <span className="gradient-text">Fair</span> Pricing</h2>
          <p>No hidden charges. Pay only for what you get.</p>
        </div>
        <div className="pricing-grid">
          <PriceCard plan="Basic Wash"    price="49"  features={['Wash & Fold','2-3 Day Delivery','Up to 5kg','Eco Detergents']}                                   onBook={onBook}/>
          <PriceCard plan="Premium Clean" price="149" badge="⭐ Most Popular" highlight features={['Dry Clean + Press','24h Turnaround','White-glove Handling','Stain Treatment','Free Pickup']} onBook={onBook}/>
          <PriceCard plan="Luxury Care"   price="349" features={['Designer Garments','Same-Day Service','Personal Garment Rep','Fragrance Finish','Priority Support']} onBook={onBook}/>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="testi-section">
        <div className="section-header">
          <div className="section-badge">Testimonials</div>
          <h2>What Our <span className="gradient-text">Customers</span> Say</h2>
        </div>
        <div className="testi-grid">
          <Testimonial avatar="😊" name="Priya Sharma"  role="Fashion Designer"    msg="FreshPress saved my silk sarees! The dry cleaning is impeccable and pickup is always on time. Highly recommended!"/>
          <Testimonial avatar="🤗" name="Rahul Mehta"   role="Corporate Executive" msg="My suits come back perfectly pressed every single time. It's like having a personal tailor on call!"/>
          <Testimonial avatar="😄" name="Sneha Gupta"   role="Home Maker"          msg="The home linen service is fantastic. My curtains look brand new. The eco-wash option is a thoughtful touch!"/>
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
