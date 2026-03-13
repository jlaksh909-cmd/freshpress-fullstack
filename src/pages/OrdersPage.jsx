import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getOrders } from '../api/ordersApi'
import { logout } from '../api/authApi'
import './OrdersPage.css'

const STATUS_STEPS = [
  { label: 'Placed',    icon: '📋' },
  { label: 'Picked Up', icon: '🚚' },
  { label: 'Cleaning',  icon: '🏭' },
  { label: 'Ready',     icon: '✨' },
  { label: 'Delivered', icon: '🎉' },
]

/* ─────────────────────────────────
   STATUS TIMELINE
───────────────────────────────── */
function StatusTimeline({ status, color }) {
  return (
    <div className="timeline">
      {STATUS_STEPS.map((step, i) => {
        const done    = i < status
        const current = i === status
        return (
          <div key={i} className="tl-step">
            <div className={`tl-dot ${done ? 'tl-done' : ''} ${current ? 'tl-current' : ''}`}
              style={current || done ? { borderColor: color, background: done ? color : 'transparent' } : {}}>
              {done ? '✓' : step.icon}
            </div>
            <div className={`tl-label ${current ? 'tl-label-current' : ''}`}
              style={current ? { color } : {}}>{step.label}</div>
            {i < STATUS_STEPS.length - 1 && (
              <div className="tl-line" style={{ background: i < status ? color : undefined }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────
   ORDER CARD
───────────────────────────────── */
function OrderCard({ order, onExpand, isExpanded }) {
  const statusLabel = STATUS_STEPS[order.status]?.label || 'Pending'
  const delivered   = order.status === 4
  const displayId   = order._id.substring(order._id.length - 6).toUpperCase()

  return (
    <div
      className={`order-card ${isExpanded ? 'order-expanded' : ''}`}
      style={{ '--oc': order.color }}
    >
      <div className="order-header" onClick={() => onExpand(order._id)}>
        <div className="order-icon">{order.icon}</div>
        <div className="order-info">
          <div className="order-name">{order.service}</div>
          <div className="order-meta">
            <span>📅 {order.date}</span>
            <span>🕐 {order.slot}</span>
          </div>
          <div className="order-items">{order.items.join(', ')}</div>
        </div>
        <div className="order-right">
          <div className="order-id">FP-{displayId}</div>
          <div className={`order-status-badge ${delivered ? 'badge-delivered' : 'badge-active'}`}
            style={!delivered ? { borderColor: order.color, color: order.color } : {}}>
            {delivered ? '✅ Delivered' : `⚡ ${statusLabel}`}
          </div>
          <div className="order-price">{order.price}</div>
          <div className="expand-arrow">{isExpanded ? '▲' : '▼'}</div>
        </div>
      </div>

      {isExpanded && (
        <div className="order-detail">
          <div className="detail-divider" />
          <StatusTimeline status={order.status} color={order.color} />
          <div className="detail-row">
            <span>📍 Pickup Address</span>
            <span>{order.address}</span>
          </div>
          <div className="detail-row">
            <span>💰 Total</span>
            <strong style={{ color: order.color }}>{order.price || 'TBD'}</strong>
          </div>
          {!delivered && (
            <button className="cancel-btn">Cancel Order</button>
          )}
          {delivered && (
            <button className="reorder-btn" style={{ background: `linear-gradient(135deg, ${order.color}, #ff9d00)` }}>
              🔄 Reorder
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────
   TRACK BY ID
───────────────────────────────── */
function TrackPanel({ orders }) {
  const [query, setQuery]   = useState('')
  const [result, setResult] = useState(null)
  const [notFound, setNF]   = useState(false)

  const search = () => {
    // Assuming user types FP-XXXXXX, just match the last 6 chars ignoring FP-
    const q = query.replace('FP-', '').trim().toLowerCase()
    const found = orders.find(o => o._id.toLowerCase().endsWith(q))
    
    if (found) { setResult(found); setNF(false) }
    else       { setResult(null); setNF(true)  }
  }

  return (
    <div className="track-panel glass">
      <div className="track-title">🔍 Track My Order</div>
      <div className="track-input-row">
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setResult(null); setNF(false) }}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Enter Order ID  (e.g. FP-A1B2C3)"
        />
        <button className="track-btn" onClick={search}>Track</button>
      </div>
      {notFound && <div className="track-nf">❌ No order found with that ID in your account.</div>}
      {result && (
        <div className="track-result">
          <div className="tr-header">
            <span className="tr-icon">{result.icon}</span>
            <div>
              <div className="tr-name">{result.service}</div>
              <div className="tr-id">FP-{result._id.substring(result._id.length - 6).toUpperCase()}</div>
            </div>
            <div className="tr-price">{result.price}</div>
          </div>
          <StatusTimeline status={result.status} color={result.color} />
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────
   ORDERS PAGE
───────────────────────────────── */
export default function OrdersPage() {
  const navigate     = useNavigate()
  const [orders, setOrders]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [tab, setTab]           = useState('orders') // 'orders' | 'track'

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await getOrders()
        if (Array.isArray(data)) setOrders(data)
      } catch (err) {
        console.error('Failed to load orders', err)
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [])

  const toggleExpand = id => setExpanded(prev => prev === id ? null : id)

  const handleSignOut = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="orders-root">
      {/* Background */}
      <div className="orders-bg-grid" />
      <div className="orders-bg-glow" />

      {/* Navbar */}
      <nav className="orders-nav">
        <div className="orders-logo" onClick={() => navigate('/home')} style={{cursor:'pointer'}}>
          🧺 <span>Fresh<em>Press</em></span>
        </div>
        <div className="orders-nav-links">
          <a onClick={() => navigate('/home')} style={{cursor:'pointer'}}>← Home</a>
        </div>
        <button className="orders-nav-cta" onClick={handleSignOut}>Sign Out</button>
      </nav>

      {/* Header */}
      <div className="orders-header">
        <div className="orders-header-badge">📦 My Account</div>
        <h1>My <span className="orders-gradient">Orders</span></h1>
        <p>Track and manage all your FreshPress pickups.</p>
      </div>

      {/* Tab switcher */}
      <div className="orders-tabs">
        <button
          className={`orders-tab ${tab === 'orders' ? 'orders-tab-active' : ''}`}
          onClick={() => setTab('orders')}
        >📋 Order History</button>
        <button
          className={`orders-tab ${tab === 'track' ? 'orders-tab-active' : ''}`}
          onClick={() => setTab('track')}
        >🔍 Track Order</button>
      </div>

      <div className="orders-content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#f5c842' }}>Loading orders...</div>
        ) : (
          <>
            {tab === 'orders' && (
              <div className="orders-list">
                {/* Summary chips */}
                <div className="orders-summary">
                  <div className="summary-chip">
                    <span className="sc-num">{orders.length}</span>
                    <span className="sc-label">Total Orders</span>
                  </div>
                  <div className="summary-chip">
                    <span className="sc-num">{orders.filter(o => o.status === 4).length}</span>
                    <span className="sc-label">Completed</span>
                  </div>
                  <div className="summary-chip">
                    <span className="sc-num">{orders.filter(o => o.status < 4).length}</span>
                    <span className="sc-label">Active</span>
                  </div>
                </div>

                {orders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(255,255,255,.05)', borderRadius: '14px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🧺</div>
                    <h3>No orders yet</h3>
                    <p style={{ color: 'rgba(255,255,255,.5)' }}>Your laundry history will appear here.</p>
                  </div>
                ) : (
                  orders.map(order => (
                    <OrderCard
                      key={order._id}
                      order={order}
                      isExpanded={expanded === order._id}
                      onExpand={toggleExpand}
                    />
                  ))
                )}

                <div className="new-order-cta">
                  <button className="btn-new-order" onClick={() => navigate('/home')}>
                    📦 Place a New Order
                  </button>
                </div>
              </div>
            )}

            {tab === 'track' && <TrackPanel orders={orders} />}
          </>
        )}
      </div>
    </div>
  )
}
