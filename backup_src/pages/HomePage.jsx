import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { createBooking } from '../api/bookingsApi'
import './HomePage.css'

/* ════════════════════════════════════════
   TOAST SYSTEM
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
   BOOKING MODAL  (3 steps)
════════════════════════════════════════ */
const SERVICES = [
  { id: 'laundry',  icon: '👕', name: 'Laundry Wash & Fold',     price: '₹49/order'  },
  { id: 'dry',      icon: '🥼', name: 'Dry Cleaning',             price: '₹149/piece' },
  { id: 'iron',     icon: '♨️', name: 'Steam Iron & Press',       price: '₹29/piece'  },
  { id: 'premium',  icon: '🧥', name: 'Premium Garment Care',     price: '₹349/piece' },
  { id: 'linen',    icon: '🛋️', name: 'Home Linen & Curtains',    price: '₹99/kg'     },
  { id: 'shoes',    icon: '👟', name: 'Shoe Cleaning',             price: '₹199/pair'  },
]

function BookingModal({ onClose, preService, toast }) {
  const navigate = useNavigate()
  const [step, setStep]       = useState(preService ? 2 : 1)
  const [service, setService] = useState(preService || null)
  const [form, setForm]       = useState({ name:'', phone:'', address:'', date:'', slot:'', notes:'' })
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)

  const slots = ['08:00 – 10:00 AM','10:00 – 12:00 PM','12:00 – 02:00 PM',
                 '02:00 – 04:00 PM','04:00 – 06:00 PM','06:00 – 08:00 PM']

  const today = new Date().toISOString().split('T')[0]

  const selectService = s => { setService(s); setStep(2) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.slot) { toast('Please select a pickup time slot.', 'warning'); return }
    setLoading(true)
    try {
      if (!service) throw new Error("No service selected")
      await createBooking({ ...form, service: service.name, serviceId: service.id, icon: service.icon, price: service.price })
      setDone(true)
    } catch (err) {
      if (err.message.includes('Not authorized') || err.message.includes('jwt')) {
        toast('Please sign in to place an order.', 'error')
        setTimeout(() => navigate('/login'), 2000)
      } else {
        toast(err.message || 'Booking failed.', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            {done ? '🎉 Booking Confirmed!' : step === 1 ? '📦 Choose a Service' : '📋 Pickup Details'}
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Step dots */}
        {!done && (
          <div className="modal-steps">
            {[1,2].map(s => (
              <div key={s} className={`mstep ${step >= s ? 'mstep-active' : ''}`}>
                <div className="mstep-dot">{s}</div>
                <div className="mstep-label">{s===1?'Service':'Details'}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── STEP 1: service selection ── */}
        {!done && step === 1 && (
          <div className="modal-services">
            {SERVICES.map(s => (
              <button key={s.id} className="msvc-btn" onClick={() => selectService(s)}>
                <span className="msvc-icon">{s.icon}</span>
                <span className="msvc-name">{s.name}</span>
                <span className="msvc-price">{s.price}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── STEP 2: details form ── */}
        {!done && step === 2 && (
          <form className="modal-form" onSubmit={handleSubmit}>
            {service && (
              <div className="selected-svc">
                {service.icon} <strong>{service.name}</strong>
                <span>{service.price}</span>
                <button type="button" className="change-btn" onClick={() => setStep(1)}>Change</button>
              </div>
            )}
            <div className="mform-row">
              <div className="mform-group">
                <label>Full Name *</label>
                <input required placeholder="Your name"
                  value={form.name} onChange={e => setForm({...form, name: e.target.value})}/>
              </div>
              <div className="mform-group">
                <label>Phone *</label>
                <input required placeholder="+91 98765 43210" type="tel"
                  value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}/>
              </div>
            </div>
            <div className="mform-group">
              <label>Pickup Address *</label>
              <input required placeholder="House no., Street, City"
                value={form.address} onChange={e => setForm({...form, address: e.target.value})}/>
            </div>
            <div className="mform-row">
              <div className="mform-group">
                <label>Pickup Date *</label>
                <input required type="date" min={today}
                  value={form.date} onChange={e => setForm({...form, date: e.target.value})}/>
              </div>
              <div className="mform-group">
                <label>Time Slot *</label>
                <select value={form.slot} onChange={e => setForm({...form, slot: e.target.value})}>
                  <option value="">-- Select slot --</option>
                  {slots.map(sl => <option key={sl} value={sl}>{sl}</option>)}
                </select>
              </div>
            </div>
            <div className="mform-group">
              <label>Special Notes</label>
              <textarea rows={2} placeholder="Any stains, delicate items, special instructions..."
                value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}/>
            </div>
            <button type="submit" className="modal-submit" disabled={loading}>
              {loading ? <span className="spinner"/> : '🚀 Confirm Pickup'}
            </button>
          </form>
        )}

        {/* ── DONE ── */}
        {done && (
          <div className="modal-done">
            <div className="done-anim">✅</div>
            <h3>Your pickup is scheduled!</h3>
            <p>
              <strong>{form.name}</strong>, we'll pick up your{' '}
              <strong>{service?.name}</strong> on{' '}
              <strong>{form.date}</strong> between{' '}
              <strong>{form.slot}</strong> from your address.
            </p>
            <p className="done-sub">Confirmation SMS sent to <strong>{form.phone}</strong></p>
            <div className="done-id">Booking ID: <strong>FP-{Math.floor(Math.random()*90000)+10000}</strong></div>
            <button className="modal-submit" onClick={onClose}>Done 🎉</button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ════════════════════════════════════════
   VIDEO MODAL  (How It Works)
════════════════════════════════════════ */
function VideoModal({ onClose }) {
  const steps = [
    { icon:'📱', title:'Book Online',      desc:'Open the app or website, pick a service and schedule in under 60 seconds.', color:'#4fc3f7' },
    { icon:'🚚', title:'We Pickup',         desc:'A friendly rider arrives at your doorstep exactly at your booked time slot.', color:'#f5c842' },
    { icon:'🏭', title:'Expert Cleaning',   desc:'Your garments get premium professional care at our state-of-the-art facility.', color:'#00e5cc' },
    { icon:'✨', title:'Delivered Fresh',   desc:'Crisp, clean clothes delivered back to you. 100% satisfaction guaranteed!', color:'#a78bfa' },
  ]
  const [active, setActive] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setActive(a => (a+1) % steps.length), 2200)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box modal-video">
        <div className="modal-header">
          <div className="modal-title">▶ How FreshPress Works</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="video-steps">
          {steps.map((s, i) => (
            <div key={i}
              className={`vstep ${i === active ? 'vstep-active' : ''}`}
              style={{'--vc': s.color}}
              onClick={() => setActive(i)}
            >
              <div className="vstep-icon">{s.icon}</div>
              <div className="vstep-body">
                <div className="vstep-title">{s.title}</div>
                <div className="vstep-desc">{s.desc}</div>
              </div>
              <div className="vstep-num">0{i+1}</div>
            </div>
          ))}
        </div>
        <div className="vstep-progress">
          {steps.map((_,i) => (
            <div key={i} className={`vpd ${i === active ? 'vpd-active' : ''}`} onClick={() => setActive(i)}/>
          ))}
        </div>
        <button className="modal-submit" onClick={onClose}>Got it! Book Now 🧺</button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════
   CHAT PANEL
════════════════════════════════════════ */
const BOT_REPLIES = {
  default: "I'm here to help! You can ask about our services, pricing, or pickup scheduling.",
  hi: "Hey there! 👋 Welcome to FreshPress. How can I assist you today?",
  hello: "Hello! 😊 How can I help you with your laundry today?",
  price: "Our pricing starts at ₹49 for basic wash & fold. Dry cleaning from ₹149/piece. Check our Pricing section for full details!",
  pickup: "We offer free pickup & delivery! Just book a slot and our rider will come to your doorstep. 🚚",
  track: "You can track your order in the 'My Orders' section after booking. We'll also send SMS updates!",
  time: "Standard turnaround is 24–48 hours. Same-day service available for Premium & Luxury plans. ⚡",
  cancel: "You can cancel your booking up to 1 hour before pickup time with no charges. Just call us at 1800-FRESH.",
  eco: "Yes! We use eco-friendly, biodegradable detergents and our wash cycles are water-efficient. 🌱",
  payment: "We accept UPI, cards, net banking, and cash on delivery. Payment is collected at pickup.",
}

function ChatPanel({ onClose, toast }) {
  const [messages, setMessages] = useState([
    { from:'bot', text:"Hi! 👋 I'm FreshBot, your laundry assistant. How can I help?" }
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages])

  const send = () => {
    const txt = input.trim()
    if (!txt) return
    setMessages(m => [...m, { from:'user', text: txt }])
    setInput('')
    setTyping(true)
    const key = Object.keys(BOT_REPLIES).find(k => txt.toLowerCase().includes(k)) || 'default'
    setTimeout(() => {
      setTyping(false)
      setMessages(m => [...m, { from:'bot', text: BOT_REPLIES[key] }])
    }, 900 + Math.random()*600)
  }

  const quickReplies = ['Pickup info','Pricing','Track order','Payment options','Cancel booking']

  return (
    <div className="chat-panel glass">
      <div className="chat-header">
        <div className="chat-avatar">🤖</div>
        <div>
          <div className="chat-name">FreshBot</div>
          <div className="chat-status">● Online</div>
        </div>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>

      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble cb-${m.from}`}>{m.text}</div>
        ))}
        {typing && <div className="chat-bubble cb-bot typing-dots"><span/><span/><span/></div>}
        <div ref={bottomRef}/>
      </div>

      <div className="chat-quick">
        {quickReplies.map(q => (
          <button key={q} className="quick-btn"
            onClick={() => { setInput(q); setTimeout(send, 0) }}>
            {q}
          </button>
        ))}
      </div>

      <div className="chat-input-row">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask me anything..."
        />
        <button className="chat-send" onClick={send}>➤</button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════
   SVG COMPONENTS
════════════════════════════════════════ */
function WashingMachine() {
  return (
    <div className="washer-wrap">
      <svg viewBox="0 0 160 200" className="washer-svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bodyG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e1e3a"/>
            <stop offset="100%" stopColor="#0d0d1f"/>
          </linearGradient>
          <linearGradient id="drumG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2a2a4e"/>
            <stop offset="100%" stopColor="#111124"/>
          </linearGradient>
          <filter id="gInner">
            <feGaussianBlur stdDeviation="2" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <rect x="5" y="5" width="150" height="190" rx="14" fill="url(#bodyG)" stroke="rgba(79,195,247,.25)" strokeWidth="1.5"/>
        <rect x="5" y="5" width="150" height="35" rx="14" fill="rgba(79,195,247,.06)"/>
        <circle cx="28" cy="22" r="6" fill="#4fc3f7" opacity=".7" filter="url(#gInner)"/>
        <circle cx="50" cy="22" r="4" fill="#00e5cc" opacity=".6"/>
        <rect x="70" y="15" width="70" height="14" rx="7" fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.1)" strokeWidth="1"/>
        <rect x="72" y="17" width="30" height="10" rx="5" fill="#4fc3f7" opacity=".4"/>
        <circle cx="80" cy="125" r="58" fill="none" stroke="rgba(79,195,247,.3)" strokeWidth="3"/>
        <circle cx="80" cy="125" r="52" fill="url(#drumG)" stroke="rgba(255,255,255,.1)" strokeWidth="1"/>
        <circle cx="80" cy="125" r="52" fill="rgba(79,195,247,.03)"/>
        <ellipse cx="67" cy="108" rx="18" ry="10" fill="rgba(255,255,255,.06)" transform="rotate(-25 67 108)"/>
        {[0,120,240].map(deg => (
          <g key={deg} style={{transformOrigin:'80px 125px', transform:`rotate(${deg}deg)`}}>
            <rect x="76" y="75" width="8" height="20" rx="4" fill="rgba(79,195,247,.5)"/>
          </g>
        ))}
        <g className="drum-spin" style={{transformOrigin:'80px 125px'}}>
          <ellipse cx="80" cy="100" rx="18" ry="8" fill="rgba(245,200,66,.5)" transform="rotate(-10 80 100)"/>
          <ellipse cx="100" cy="130" rx="14" ry="6" fill="rgba(79,195,247,.5)" transform="rotate(30 100 130)"/>
          <ellipse cx="60" cy="145" rx="16" ry="7" fill="rgba(0,229,204,.4)" transform="rotate(-15 60 145)"/>
        </g>
        {[{cx:70,cy:140,r:4},{cx:88,cy:150,r:3},{cx:78,cy:160,r:2.5}].map((b,i) => (
          <circle key={i} cx={b.cx} cy={b.cy} r={b.r} fill="rgba(79,195,247,.35)" className="bubble-anim" style={{'--bi':i}}/>
        ))}
        <path d="M124 118 Q132 125 124 132" stroke="rgba(255,255,255,.4)" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <rect x="20" y="182" width="120" height="6" rx="3" fill="rgba(79,195,247,.1)"/>
      </svg>
    </div>
  )
}

function ClothWave() {
  return (
    <div className="cloth-wrap">
      {[0,1,2,3].map(i => <div key={i} className="cloth-wave" style={{'--wi':i}}/>)}
    </div>
  )
}

/* ════════════════════════════════════════
   NAVBAR
════════════════════════════════════════ */
function Navbar({ onBook, toast }) {
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
      <div className="nav-logo" onClick={() => { window.scrollTo({top:0,behavior:'smooth'}); closeMenu() }}
        style={{cursor:'pointer'}}>
        🧺 <span>Fresh<em>Press</em></span>
      </div>
      <div className={`nav-links ${mobileOpen ? 'nav-open' : ''}`}>
        <a href="#services"    onClick={closeMenu}>Services</a>
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
   SERVICE CARD
════════════════════════════════════════ */
function ServiceCard({ icon, title, desc, tags, color, delay, onBook }) {
  const [hovered, setHovered] = useState(false)
  const svc = SERVICES.find(s => s.name === title) || null
  return (
    <div
      className="service-card"
      style={{ '--cc': color, '--cd': delay }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onBook(svc)}
    >
      <div className="scard-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{desc}</p>
      <div className="scard-tags">
        {tags.map(t => <span key={t}>{t}</span>)}
      </div>
      <div className="scard-arrow">{hovered ? '→' : '›'}</div>
      <div className="scard-glow"/>
    </div>
  )
}

/* ════════════════════════════════════════
   STAT
════════════════════════════════════════ */
function Stat({ n, label, suffix='' }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const triggered = useRef(false)
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !triggered.current) {
        triggered.current = true
        let start = 0
        const end = parseFloat(n)
        const dur = 1800
        const step = end / (dur / 16)
        const t = setInterval(() => {
          start = Math.min(start + step, end)
          setCount(Number.isInteger(end) ? Math.floor(start) : parseFloat(start.toFixed(1)))
          if (start >= end) clearInterval(t)
        }, 16)
        obs.disconnect()
      }
    }, { threshold: 0.3, rootMargin: '0px 0px -50px 0px' })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [n])
  return (
    <div className="stat-item" ref={ref}>
      <div className="stat-num">{count}{suffix}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

/* ════════════════════════════════════════
   HOME PAGE
════════════════════════════════════════ */
export default function HomePage() {
  const { toasts, add: toast } = useToast()
  const [booking, setBooking]  = useState(null)   // null | { service }
  const [showVideo, setVideo]  = useState(false)
  const [showChat, setChat]    = useState(false)

  const openBook  = (svc = null) => setBooking({ service: svc })
  const closeBook = () => setBooking(null)

  const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  const footerLink = label => toast(`${label} page coming soon! 🚧`, 'info')
  const socialOpen = url  => { window.open(url, '_blank'); toast('Opening in new tab...', 'info') }

  return (
    <div className="home-root">
      <Navbar onBook={openBook} toast={toast} />
      <ToastContainer toasts={toasts} />

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-bg-glow"/>
        <ClothWave />
        <div className="hero-content">
          <div className="hero-badge">⚡ Same-Day Delivery Available</div>
          <h1>Your Clothes Deserve<br/><span className="gradient-text">Premium Care</span></h1>
          <p>Professional laundry, dry cleaning &amp; ironing with free doorstep pickup and delivery.</p>
          <div className="hero-cta-row">
            <button className="btn-primary" onClick={() => openBook()}>📦 Book Pickup Now</button>
            <button className="btn-ghost"   onClick={() => { setVideo(true); scrollTo('howitworks') }}>▶ Watch How It Works</button>
          </div>
          <div className="hero-stats">
            <Stat n="50000" suffix="+" label="Happy Customers"/>
            <div className="stat-divider"/>
            <Stat n="99"    suffix="%" label="Satisfaction Rate"/>
            <div className="stat-divider"/>
            <Stat n="24"    suffix="h" label="Turnaround"/>
          </div>
        </div>
        <div className="hero-visual">
          <WashingMachine />
          <div className="hero-floating-chips">
            {[
              { icon:'✨', text:'Stain Free', delay:'0s'   },
              { icon:'💧', text:'Eco Wash',   delay:'.4s'  },
              { icon:'♨️', text:'Steam Iron', delay:'.8s'  },
              { icon:'🚚', text:'Free Pickup',delay:'1.2s' },
            ].map(c => (
              <div key={c.text} className="floating-chip" style={{'--fcd': c.delay}}
                onClick={() => { toast(`${c.text} – included in every order!`, 'success') }}>
                {c.icon} {c.text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section className="services-section" id="services">
        <div className="section-header">
          <div className="section-badge">Our Services</div>
          <h2>Everything Your <span className="gradient-text">Wardrobe</span> Needs</h2>
          <p>Click any service to book a pickup instantly.</p>
        </div>
        <div className="services-grid">
          <ServiceCard icon="👕" title="Laundry Wash & Fold"   desc="Machine & hand wash with premium detergents. Fold & package neatly."        tags={['Cotton','Linen','Synthetics']}      color="#4fc3f7" delay="0s"  onBook={openBook}/>
          <ServiceCard icon="🥼" title="Dry Cleaning"           desc="Solvent-based professional cleaning for delicate fabrics & formal wear."      tags={['Suits','Silk','Wool','Cashmere']}   color="#f5c842" delay=".1s" onBook={openBook}/>
          <ServiceCard icon="♨️" title="Steam Iron & Press"     desc="Industrial steam pressing for crisp, wrinkle-free results every time."        tags={['Shirts','Sarees','Trousers']}       color="#00e5cc" delay=".2s" onBook={openBook}/>
          <ServiceCard icon="🧥" title="Premium Garment Care"   desc="Specialized treatment for premium & designer garments with white-glove handling." tags={['Leather','Fur','Embroidered']}   color="#a78bfa" delay=".3s" onBook={openBook}/>
          <ServiceCard icon="🛋️" title="Home Linen & Curtains"  desc="Deep cleaning for bed sheets, curtains, duvets, blankets & upholstery."      tags={['Bedding','Curtains','Blankets']}    color="#f97316" delay=".4s" onBook={openBook}/>
          <ServiceCard icon="👟" title="Shoe Cleaning"           desc="Expert shoe cleaning, conditioning & polishing for all shoe types."           tags={['Sneakers','Leather','Suede']}       color="#34d399" delay=".5s" onBook={openBook}/>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section">
        <div className="cta-glow"/>
        <div className="cta-content">
          <h2>Ready for <span className="gradient-text">Freshness</span>?</h2>
          <p>Join 50,000+ happy customers enjoying spotless clothes, delivered to their door.</p>
          <div className="cta-btns">
            <button className="btn-primary" onClick={() => openBook()}>📞 Book First Pickup Free</button>
            <button className="btn-ghost"   onClick={() => setChat(true)}>💬 Chat With Us</button>
          </div>
        </div>
        <div className="cta-emojis">
          {['👔','👗','🧥','👕','👖','🧣','🧤'].map((e,i) => (
            <div key={i} className="ce" style={{'--ci': i}}
              onClick={() => toast(`${e} – We clean those too! Book now.`, 'success')}>
              {e}
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer" id="contact">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="nav-logo">🧺 <span>Fresh<em>Press</em></span></div>
            <p>Making laundry effortless—one garment at a time. Serving across India.</p>
            <div className="footer-social">
              <button className="fsoc" title="Facebook"  onClick={() => socialOpen('https://facebook.com')}>📘</button>
              <button className="fsoc" title="Twitter"   onClick={() => socialOpen('https://twitter.com')}>🐦</button>
              <button className="fsoc" title="Instagram" onClick={() => socialOpen('https://instagram.com')}>📸</button>
              <button className="fsoc" title="YouTube"   onClick={() => socialOpen('https://youtube.com')}>▶</button>
            </div>
          </div>
          <div className="footer-links">
            <div>
              <h5>Services</h5>
              <a onClick={() => { scrollTo('services') }}>Laundry Wash</a>
              <a onClick={() => { scrollTo('services') }}>Dry Cleaning</a>
              <a onClick={() => { scrollTo('services') }}>Steam Press</a>
              <a onClick={() => { scrollTo('services') }}>Shoe Care</a>
            </div>
            <div>
              <h5>Company</h5>
              <a onClick={() => footerLink('About Us')}>About Us</a>
              <a onClick={() => footerLink('Careers')}>Careers</a>
              <a onClick={() => footerLink('Blog')}>Blog</a>
              <a onClick={() => footerLink('Press')}>Press</a>
            </div>
            <div>
              <h5>Support</h5>
              <a onClick={() => setChat(true)}>Contact Us</a>
              <a onClick={() => footerLink('FAQ')}>FAQ</a>
              <a onClick={() => footerLink('Privacy Policy')}>Privacy</a>
              <a onClick={() => footerLink('Terms of Service')}>Terms</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 FreshPress. All rights reserved.</span>
          <span>Made with ♥ for clean clothes</span>
        </div>
      </footer>

      {/* ── FLOATING CHAT BUTTON ── */}
      {!showChat && (
        <button className="fab-chat" onClick={() => setChat(true)} title="Chat with us">
          💬
          <span className="fab-badge">1</span>
        </button>
      )}

      {/* ── MODALS ── */}
      {booking   && <BookingModal onClose={closeBook} preService={booking.service} toast={toast}/>}
      {showVideo && <VideoModal   onClose={() => setVideo(false)}/>}
      {showChat  && <ChatPanel    onClose={() => setChat(false)} toast={toast}/>}
    </div>
  )
}
