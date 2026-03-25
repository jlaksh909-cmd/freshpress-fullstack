"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts'
import { createClient } from "@/lib/supabase/client"
import Navbar from "@/app/components/Navbar"
import { ToastContainer, ToastType } from "@/app/components/Toast"
import PhotoUpload from "@/app/components/PhotoUpload"
import NotificationBell from "@/app/components/NotificationBell"

interface Booking {
  id: string
  user_id: string
  service_name: string
  price: number
  customer_name: string | null
  phone: string | null
  address: string
  pickup_date: string
  pickup_time: string | null
  status: string
  created_at: string
  before_photo_url?: string | null
  after_photo_url?: string | null
}

const statusOptions = [
  { value: "pending", label: "Pending", color: "#f59e0b" },
  { value: "confirmed", label: "Confirmed", color: "#3b82f6" },
  { value: "in_progress", label: "In Progress", color: "#8b5cf6" },
  { value: "processing", label: "Processing", color: "#ec4899" },
  { value: "ready", label: "Ready", color: "#06b6d4" },
  { value: "completed", label: "Delivered", color: "#10b981" },
  { value: "cancelled", label: "Cancelled", color: "#ef4444" }
]

// Define interfaces for data types
interface Profile {
  id: string
  full_name: string | null
  email: string | null
  role: 'user' | 'worker' | 'admin'
  created_at: string
}

interface Review {
  id: string
  customer_name: string
  rating: number
  comment: string
  created_at: string
}

interface InventoryItem {
  id: string
  item_name: string
  category: string
  quantity: number
  unit: string
  min_stock_level: number
  updated_at: string
}

interface Coupon {
  id: string
  code: string
  discount_type: 'percent' | 'fixed'
  discount_value: number
  min_order_value: number
  expiry_date: string | null
  max_uses: number
  used_count: number
  is_active: boolean
  created_at: string
}

interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
}


export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'reviews' | 'orders' | 'users' | 'messages' | 'inventory' | 'coupons'>('reviews')
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [user, setUser] = useState<any>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [toasts, setToasts] = useState<{ id: string; message: string; type: ToastType }[]>([])
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null)
  const [showManualOrderForm, setShowManualOrderForm] = useState(false)
  const [manualOrder, setManualOrder] = useState({ 
    customer_name: '', phone: '', address: '', service_name: 'Wash & Fold', price: 499, pickup_date: new Date().toISOString().split('T')[0]
  })
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [replyText, setReplyText] = useState('')
  const [isRestocking, setIsRestocking] = useState<string | null>(null)
  const [restockAmount, setRestockAmount] = useState<number>(0)
  const [newCoupon, setNewCoupon] = useState({ code: '', discount_type: 'percent', discount_value: 10, min_order_value: 0, expiry_date: '', max_uses: 100 })
  const [showCouponForm, setShowCouponForm] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showBroadcastForm, setShowBroadcastForm] = useState(false)
  const [broadcastForm, setBroadcastForm] = useState({ title: '', content: '', target: 'all' })
  const [broadcastLoading, setBroadcastLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [conversations, setConversations] = useState<string[]>([])
  const [activities, setActivities] = useState<any[]>([])
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const addToast = (message: string, type: ToastType = "info") => {
    const id = Date.now().toString()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => removeToast(id), 5000)
  }

  useEffect(() => {
    fetchAdminData()

    // Subscribe to Realtime events
    const channel = supabase
      .channel('admin_room')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setBookings(prev => [payload.new as Booking, ...prev])
            addToast(`New order received: ${payload.new.service_name}`, "success")
            setActivities(prev => [{ id: Date.now(), type: 'order', content: `New order: ${payload.new.service_name} (₹${payload.new.price})`, time: new Date() }, ...prev].slice(0, 8))
          } else if (payload.eventType === 'UPDATE') {
            setBookings(prev => prev.map(b => b.id === payload.new.id ? payload.new as Booking : b))
            addToast(`Order updated to ${payload.new.status}`, "info")
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev])
          setUnreadCount(c => c + 1)
          addToast(`${payload.new.title}: ${payload.new.content}`, payload.new.type || "info")
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          // Refresh conversation list if it's a new sender
          setConversations(prev => Array.from(new Set([payload.new.sender_id, ...prev])).filter(Boolean))
          addToast("New message received", "info")
          setActivities(prev => [{ id: Date.now(), type: 'message', content: 'New message received', time: new Date() }, ...prev].slice(0, 8))
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reviews' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setReviews(prev => [payload.new as Review, ...prev])
            setActivities(prev => [{ id: Date.now(), type: 'review', content: `New ${payload.new.rating}★ review from ${payload.new.customer_name}`, time: new Date() }, ...prev].slice(0, 8))
          } else if (payload.eventType === 'DELETE') {
            setReviews(prev => prev.filter(r => r.id !== payload.old.id))
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'profiles' },
        (p) => {
          const newProfile = { ...p.new, role: p.new.role as 'user' | 'worker' | 'admin' }
          setProfiles(prev => [newProfile as Profile, ...prev])
          setActivities(prev => [{ id: Date.now(), type: 'user', content: `New user joined: ${p.new.full_name || 'Guest'}`, time: new Date() }, ...prev].slice(0, 8))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchAdminData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push("/login")
      return
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== 'admin') {
      router.push("/home")
      return
    }

    setUser({
      id: user.id,
      name: user.user_metadata?.name || null,
      email: user.email || "",
      role: profile.role
    })

    const { data: reviewsData } = await supabase.from("reviews").select("*").order("created_at", { ascending: false })
    setReviews(reviewsData || [])

    const { data: bookingsData } = await supabase.from("bookings").select("*").order("created_at", { ascending: false })
    setBookings(bookingsData || [])

    const { data: profilesData } = await supabase.from("profiles").select("*").order("created_at", { ascending: false })
    setProfiles(profilesData || [])
    


    // Improved Messaging: Find all users we've chatted with
    const { data: sentMsgs } = await supabase.from('messages').select('receiver_id').eq('sender_id', user.id)
    const { data: recvMsgs } = await supabase.from('messages').select('sender_id').eq('receiver_id', user.id)
    const participants = new Set([
      ...(sentMsgs?.map(m => m.receiver_id) || []),
      ...(recvMsgs?.map(m => m.sender_id) || [])
    ])
    setConversations(Array.from(participants).filter(Boolean))

    const { data: notifData } = await supabase.from('notifications').select('*').order('created_at', { ascending: false })
    setNotifications(notifData || [])
    setUnreadCount(notifData?.filter(n => !n.is_read).length || 0)

    const { data: invData } = await supabase.from('inventory').select('*').order('item_name')
    setInventory(invData || [])

    const { data: couponData } = await supabase.from('coupons').select('*').order('created_at', { ascending: false })
    setCoupons(couponData || [])
    
    setLoading(false)
  }

  useEffect(() => {
    if (activeTab === 'messages' && selectedConvo) {
      fetchChatMessages(selectedConvo)
      const channel = supabase
        .channel(`admin-convo-${selectedConvo}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          if (payload.new.sender_id === selectedConvo || payload.new.receiver_id === selectedConvo) {
            setChatMessages(prev => [...prev, payload.new])
          }
        })
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    }
  }, [selectedConvo, activeTab])

  async function fetchChatMessages(userId: string) {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: true })
    setChatMessages(data || [])
  }

  async function sendReply() {
    if (!replyText.trim() || !selectedConvo) return
    const { error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        receiver_id: selectedConvo,
        content: replyText
      })
    if (error) {
      addToast("Failed to send reply", "error")
    } else {
      setReplyText("")
    }
  }

  const handleDeleteReview = async (id: string) => {
    const { error } = await supabase.from("reviews").delete().eq("id", id)
    if (error) {
      addToast(error.message, "error")
    } else {
      addToast("Review deleted", "success")
      setReviews(prev => prev.filter(r => r.id !== id))
    }
  }

  const handleRoleUpdate = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId)
    if (error) {
      addToast(error.message, "error")
    } else {
      addToast(`Role updated to ${newRole}`, "success")
      setProfiles(prev => prev.map(p => p.id === userId ? { ...p, role: newRole as 'user' | 'worker' | 'admin' } : p))
    }
  }

  const handleRestock = async (itemId: string) => {
    if (restockAmount <= 0) return
    const item = inventory.find(i => i.id === itemId)
    if (!item) return
    const newQty = Number(item.quantity) + Number(restockAmount)
    const { error } = await supabase.from('inventory').update({ quantity: newQty, updated_at: new Date().toISOString() }).eq('id', itemId)
    if (error) {
      addToast(error.message, "error")
    } else {
      await supabase.from('inventory_logs').insert({ item_id: itemId, change_amount: restockAmount, reason: 'Restocked via dashboard' })
      addToast(`Restocked ${item.item_name}`, "success")
      setInventory(prev => prev.map(i => i.id === itemId ? { ...i, quantity: newQty } : i))
      setIsRestocking(null)
      setRestockAmount(0)
    }
  }

  const handleCreateCoupon = async () => {
    if (!newCoupon.code.trim()) return
    const { data, error } = await supabase.from('coupons').insert({
      code: newCoupon.code.toUpperCase().trim(),
      discount_type: newCoupon.discount_type,
      discount_value: newCoupon.discount_value,
      min_order_value: newCoupon.min_order_value,
      expiry_date: newCoupon.expiry_date || null,
      max_uses: newCoupon.max_uses,
      is_active: true
    }).select().single()
    if (error) {
      addToast(error.message, "error")
    } else {
      setCoupons(prev => [data, ...prev])
      setNewCoupon({ code: '', discount_type: 'percent', discount_value: 10, min_order_value: 0, expiry_date: '', max_uses: 100 })
      setShowCouponForm(false)
      addToast(`Coupon ${data.code} created!`, "success")
    }
  }

  const handleToggleCoupon = async (id: string, currentActive: boolean) => {
    const { error } = await supabase.from('coupons').update({ is_active: !currentActive }).eq('id', id)
    if (!error) {
      setCoupons(prev => prev.map(c => c.id === id ? { ...c, is_active: !currentActive } : c))
      addToast(`Coupon ${currentActive ? 'deactivated' : 'activated'}`, "info")
    }
  }

  const handleBroadcast = async () => {
    if (!broadcastForm.title.trim() || !broadcastForm.content.trim()) return
    setBroadcastLoading(true)
    const { data: allProfiles } = await supabase.from('profiles').select('id').neq('role', 'admin')
    const targets = allProfiles || []
    const rows = targets.map(p => ({ user_id: p.id, title: broadcastForm.title, content: broadcastForm.content, type: 'info' }))
    if (rows.length > 0) {
      const { error } = await supabase.from('notifications').insert(rows)
      if (error) {
        addToast('Broadcast failed: ' + error.message, 'error')
      } else {
        addToast(`📢 Broadcast sent to ${rows.length} users!`, 'success')
        setBroadcastForm({ title: '', content: '', target: 'all' })
        setShowBroadcastForm(false)
      }
    } else {
      addToast('No users to notify', 'info')
    }
    setBroadcastLoading(false)
  }

  if (loading) {
    return (
      <div className="home-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
      </div>
    )
  }

  if (!isMounted) return null

  return (
    <div className="admin-layout">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      {/* Sidebar Navigation */}
      <aside className="admin-sidebar">
        <div className="brand-header" style={{ marginBottom: '48px', padding: '0 12px' }}>
          <div className="logo-container">
            <svg className="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span className="brand-name">FreshPress</span>
          </div>
        </div>
        
        <nav style={{ flex: 1 }}>
          {[
            { id: 'orders', label: 'Orders', icon: '🧺' },
            { id: 'messages', label: 'Messages', icon: '💬' },
            { id: 'inventory', label: 'Inventory', icon: '🛠️' },
            { id: 'coupons', label: 'Coupons', icon: '🎟️' },
            { id: 'users', label: 'Customers', icon: '👥' },
            { id: 'reviews', label: 'Reviews', icon: '⭐' }
          ].map(item => (
            <button 
              key={item.id} onClick={() => setActiveTab(item.id as any)}
              className={`admin-nav-item ${activeTab === item.id ? 'active' : ''}`}
            >
              <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        
        <div className="sidebar-footer" style={{ marginTop: 'auto', padding: '20px 12px', borderTop: '1px solid var(--glass-border)' }}>
          <div style={{ fontSize: '0.7rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', color: 'var(--text-muted)' }}>Administrator</div>
          <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--accent-gold)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.name || user?.email?.split('@')[0]}
          </div>
          <button 
            onClick={() => supabase.auth.signOut().then(() => router.push('/'))}
            className="btn-ghost" 
            style={{ width: '100%', marginTop: '16px', fontSize: '0.75rem', padding: '8px', borderRadius: '8px', color: '#ef4444', borderColor: '#ef444430' }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 950, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Dashboard
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Real-time synchronization active
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <NotificationBell />
            <div style={{ padding: '4px 16px', borderRadius: '14px', border: '1px solid var(--glass-border)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              ADMIN SESSION ACTIVE
            </div>
          </div>
        </header>

        <div style={{ display: 'none' }}>
          <Navbar user={user} />
        </div>

        <div className="admin-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <button onClick={() => setActiveTab('orders')} className={activeTab === 'orders' ? 'btn-primary' : 'btn-ghost'} style={{ borderRadius: '12px', padding: '10px 20px' }}>🧺 Orders</button>
          <button onClick={() => setActiveTab('reviews')} className={activeTab === 'reviews' ? 'btn-primary' : 'btn-ghost'} style={{ borderRadius: '12px', padding: '10px 20px' }}>⭐ Reviews</button>
          <button onClick={() => setActiveTab('users')} className={activeTab === 'users' ? 'btn-primary' : 'btn-ghost'} style={{ borderRadius: '12px', padding: '10px 20px' }}>👥 Customers</button>
          <button onClick={() => setActiveTab('messages')} className={activeTab === 'messages' ? 'btn-primary' : 'btn-ghost'} style={{ borderRadius: '12px', padding: '10px 20px' }}>💬 Live Messages</button>
          <button onClick={() => setActiveTab('inventory')} className={activeTab === 'inventory' ? 'btn-primary' : 'btn-ghost'} style={{ borderRadius: '12px', padding: '10px 20px' }}>📦 Inventory</button>
          <button onClick={() => setActiveTab('coupons')} className={activeTab === 'coupons' ? 'btn-primary' : 'btn-ghost'} style={{ borderRadius: '12px', padding: '10px 20px' }}>🎟️ Coupons</button>
        </div>

        {activeTab === 'orders' && (
          <div className="admin-orders">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>Active Laundry Orders</h3>
              <button 
                onClick={() => setShowManualOrderForm(!showManualOrderForm)} 
                className="btn-primary" 
                style={{ padding: '10px 24px', borderRadius: '12px' }}
              >
                {showManualOrderForm ? 'Cancel' : '+ Add Walk-in Order'}
              </button>
            </div>

            {showManualOrderForm && (
              <div className="glass" style={{ padding: '28px', borderRadius: '24px', marginBottom: '24px', border: '1px solid var(--accent-blue)', animation: 'modalSlide 0.3s ease' }}>
                <h4 style={{ marginBottom: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>New Manual Entry</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>CUSTOMER NAME</label>
                    <input type="text" className="glass" style={{ width: '100%', padding: '12px', borderRadius: '12px', color: 'var(--text-primary)' }} 
                      value={manualOrder.customer_name} onChange={e => setManualOrder({...manualOrder, customer_name: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>PHONE</label>
                    <input type="text" className="glass" style={{ width: '100%', padding: '12px', borderRadius: '12px', color: 'var(--text-primary)' }} 
                      value={manualOrder.phone} onChange={e => setManualOrder({...manualOrder, phone: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>SERVICE</label>
                    <select className="glass" style={{ width: '100%', padding: '12px', borderRadius: '12px', color: 'var(--text-primary)' }} 
                      value={manualOrder.service_name} onChange={e => setManualOrder({...manualOrder, service_name: e.target.value})}>
                      <option value="Wash & Fold">Wash & Fold</option>
                      <option value="Dry Cleaning">Dry Cleaning</option>
                      <option value="Steam Iron">Steam Iron</option>
                      <option value="Premium Wash">Premium Wash</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>PRICE (₹)</label>
                    <input type="number" className="glass" style={{ width: '100%', padding: '12px', borderRadius: '12px', color: 'var(--text-primary)' }} 
                      value={manualOrder.price} onChange={e => setManualOrder({...manualOrder, price: Number(e.target.value)})} />
                  </div>
                </div>
                <button 
                  onClick={async () => {
                    const { error } = await supabase.from('bookings').insert({ ...manualOrder, status: 'confirmed' })
                    if (error) addToast(error.message, "error")
                    else {
                      addToast("Manual order created", "success")
                      setShowManualOrderForm(false)
                      fetchAdminData()
                    }
                  }} 
                  className="btn-primary" style={{ padding: '12px 32px', borderRadius: '12px' }}
                >
                  Confirm & Add to List
                </button>
              </div>
            )}

            <div className="glass" style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
              <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead className="admin-table-header">
                  <tr>
                    <th>ORDER ID</th>
                    <th>CUSTOMER</th>
                    <th>SERVICE</th>
                    <th>STATUS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(order => (
                    <tr key={order.id} className="admin-tr">
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>#{order.id.slice(0,8)}</td>
                      <td>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{order.customer_name || 'Anonymous'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{order.phone || 'No phone'}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>{order.service_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>₹{order.price}</div>
                      </td>
                      <td>
                        <span style={{ 
                          padding: '6px 14px', borderRadius: '100px', fontSize: '0.65rem', fontWeight: 900, 
                          background: `${statusOptions.find(s => s.value === order.status)?.color}15`, 
                          color: statusOptions.find(s => s.value === order.status)?.color,
                          border: `1px solid ${statusOptions.find(s => s.value === order.status)?.color}30`
                        }}>
                          {order.status?.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <select 
                          className="glass" 
                          value={order.status} 
                          onChange={async (e) => {
                            const { error } = await supabase.from('bookings').update({ status: e.target.value }).eq('id', order.id)
                            if (error) addToast(error.message, "error")
                            else addToast("Status updated", "success")
                          }}
                          style={{ padding: '8px 14px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700, background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', cursor: 'pointer' }}
                        >
                          {statusOptions.map(opt => (
                            <option key={opt.value} value={opt.value} style={{ background: 'var(--modal-bg)' }}>{opt.label}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="admin-reviews-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
            {reviews.map(review => (
              <div key={review.id} className="glass" style={{ padding: '28px', borderRadius: '24px', position: 'relative', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '4px' }}>{review.customer_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', fontWeight: 800 }}>VERIFIED CUSTOMER</div>
                  </div>
                  <div style={{ color: 'var(--accent-gold)', filter: 'drop-shadow(0 0 5px rgba(245,200,66,0.3))' }}>{"★".repeat(review.rating)}</div>
                </div>
                <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px', fontStyle: 'italic' }}>
                  &ldquo;{review.comment}&rdquo;
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: '16px', marginTop: 'auto' }}>
                  <span style={{ fontSize: '0.75rem', opacity: 0.8, color: 'var(--text-muted)' }}>{new Date(review.created_at).toLocaleDateString()}</span>
                  <button onClick={() => handleDeleteReview(review.id)} className="btn-ghost" style={{ padding: '8px 16px', borderRadius: '10px', color: '#ef4444', fontSize: '0.8rem', fontWeight: 700 }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Real-time Operations board (Global - visible at bottom) */}
        <div className="glass" style={{ padding: '30px', borderRadius: '24px', border: '1px solid var(--accent-blue)', background: 'rgba(59, 130, 246, 0.02)', marginTop: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <motion.span 
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }}
              ></motion.span>
              Real-time Operations
            </h3>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Active Feed</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {activities.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', gridColumn: '1 / -1' }}>
                Waiting for administrative events... 📡
              </div>
            ) : (
              activities.map(act => (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={act.id} 
                  style={{ 
                    padding: '12px 16px', 
                    borderRadius: '16px', 
                    background: 'rgba(255,255,255,0.03)', 
                    border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px'
                  }}
                >
                  <div style={{ fontSize: '1.2rem', marginTop: '2px' }}>
                    {act.type === 'order' ? '📦' : act.type === 'user' ? '👤' : act.type === 'review' ? '⭐' : '💬'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>{act.content}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {act.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {activeTab === 'messages' && (
          <div className="admin-messages glass" style={{ borderRadius: '24px', display: 'flex', height: '600px', overflow: 'hidden' }}>
            <div style={{ width: '300px', borderRight: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', fontWeight: 800, color: 'var(--text-primary)' }}>ACTIVE CHATS</div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {conversations.map(userId => (
                  <button 
                    key={userId} onClick={() => setSelectedConvo(userId)}
                    style={{ width: '100%', padding: '20px', textAlign: 'left', border: 'none', background: selectedConvo === userId ? 'var(--glass-bg)' : 'transparent', color: 'var(--text-primary)', borderBottom: '1px solid var(--glass-border)', cursor: 'pointer' }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                      {profiles.find(p => p.id === userId)?.full_name || `User: ${userId.slice(0,8)}`}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{profiles.find(p => p.id === userId)?.email || 'View conversation'}</div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.02)' }}>
              {selectedConvo ? (
                <>
                  <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', fontWeight: 700, color: 'var(--text-primary)' }}>Chat with {selectedConvo.slice(0,8)}</div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {chatMessages.map(msg => (
                      <div key={msg.id} style={{
                        alignSelf: msg.sender_id === user.id ? 'flex-end' : 'flex-start',
                        background: msg.sender_id === user.id ? 'var(--accent-blue)' : 'var(--glass-bg)',
                        color: msg.sender_id === user.id ? 'white' : 'var(--text-primary)',
                        padding: '12px 16px', borderRadius: '12px', maxWidth: '70%', fontSize: '0.9rem',
                        border: '1px solid var(--glass-border)'
                      }}>{msg.content}</div>
                    ))}
                  </div>
                  <div style={{ padding: '20px', borderTop: '1px solid var(--glass-border)', display: 'flex', gap: '12px' }}>
                    <input 
                      className="glass" style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}
                      placeholder="Type a reply..." value={replyText} onChange={(e) => setReplyText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendReply()}
                    />
                    <button onClick={sendReply} className="btn-primary" style={{ padding: '0 24px', borderRadius: '12px' }}>Send</button>
                  </div>
                </>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Select a conversation</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="admin-inventory">
            <div className="admin-stats-grid">
              {inventory.map(item => (
                <div key={item.id} className="admin-stat-card" style={{ 
                  border: item.quantity <= (item.min_stock_level || 5) ? '1.5px solid #ef4444' : '1px solid var(--glass-border)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {item.quantity <= (item.min_stock_level || 5) && (
                    <div style={{ position: 'absolute', top: 0, right: 0, background: '#ef4444', color: 'var(--text-primary)', padding: '4px 12px', fontSize: '0.6rem', fontWeight: 950, borderBottomLeftRadius: '12px' }}>LOW STOCK</div>
                  )}
                  <p style={{ fontSize: '0.7rem', color: 'var(--accent-blue)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>{item.category}</p>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px', color: 'var(--text-primary)' }}>{item.item_name}</h3>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '24px' }}>
                    <span style={{ fontSize: '2.5rem', fontWeight: 950 }}>{item.quantity}</span>
                    <span style={{ fontSize: '1rem', opacity: 0.5 }}>{item.unit}</span>
                  </div>
                  {isRestocking === item.id ? (
                    <div style={{ display: 'flex', gap: '8px', animation: 'modalSlide 0.3s ease' }}>
                      <input 
                        type="number" autoFocus className="glass" 
                        style={{ width: '80px', padding: '10px', borderRadius: '12px', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', background: 'var(--card-bg)' }}
                        value={restockAmount} onChange={(e) => setRestockAmount(Number(e.target.value))}
                      />
                      <button onClick={() => handleRestock(item.id)} className="btn-primary" style={{ flex: 1, padding: '10px', borderRadius: '12px', fontWeight: 800 }}>Apply</button>
                    </div>
                  ) : (
                    <button onClick={() => { setIsRestocking(item.id); setRestockAmount(10); }} className="btn-ghost" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>+ Restock Supply</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="glass" style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead className="admin-table-header">
                <tr>
                  <th>CUSTOMER</th>
                  <th>ROLE</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => (
                  <tr key={profile.id} className="admin-tr">
                    <td>
                      <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{profile.full_name || 'No Name'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>UID: {profile.id.slice(0,12)}...</div>
                    </td>
                    <td>
                      <span style={{ 
                        padding: '6px 14px', 
                        borderRadius: '100px', 
                        fontSize: '0.6rem', 
                        fontWeight: 900, 
                        letterSpacing: '0.05em',
                        background: profile.role === 'admin' ? '#ef444415' : profile.role === 'worker' ? '#f5c84215' : '#3b82f615', 
                        color: profile.role === 'admin' ? '#ef4444' : profile.role === 'worker' ? '#f5c842' : '#3b82f6',
                        border: `1px solid ${profile.role === 'admin' ? '#ef4444' : profile.role === 'worker' ? '#f5c842' : '#3b82f6'}30`
                      }}>
                        {profile.role?.toUpperCase() || 'USER'}
                      </span>
                    </td>
                    <td>
                      <select 
                        className="glass" value={profile.role || 'user'} onChange={(e) => handleRoleUpdate(profile.id, e.target.value)}
                        style={{ padding: '8px 14px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700, background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', cursor: 'pointer' }}
                      >
                        <option value="user" style={{ background: 'var(--modal-bg)' }}>Set as Customer</option>
                        <option value="worker" style={{ background: 'var(--modal-bg)' }}>Set as Worker</option>
                        <option value="admin" style={{ background: 'var(--modal-bg)' }}>Set as Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'coupons' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>Coupon Management</h3>
              <button onClick={() => setShowCouponForm(!showCouponForm)} className="btn-primary" style={{ padding: '10px 24px', borderRadius: '12px' }}>
                {showCouponForm ? 'Cancel' : '+ New Coupon'}
              </button>
            </div>

            {showCouponForm && (
              <div className="glass" style={{ padding: '28px', borderRadius: '20px', marginBottom: '24px', border: '1px solid var(--accent-gold)' }}>
                <h4 style={{ marginBottom: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>Create New Coupon</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>CODE</label>
                    <input type="text" placeholder="SAVE20" value={newCoupon.code} onChange={e => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'var(--card-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontWeight: 700, letterSpacing: '1px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>TYPE</label>
                    <select value={newCoupon.discount_type} onChange={e => setNewCoupon({...newCoupon, discount_type: e.target.value})}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'var(--card-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', boxSizing: 'border-box' }}>
                      <option value="percent" style={{ background: 'var(--modal-bg)' }}>Percent (%)</option>
                      <option value="fixed" style={{ background: 'var(--modal-bg)' }}>Fixed (₹)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>VALUE</label>
                    <input type="number" value={newCoupon.discount_value} onChange={e => setNewCoupon({...newCoupon, discount_value: Number(e.target.value)})}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'var(--card-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', opacity: 0.8, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>EXPIRY DATE</label>
                    <input type="date" value={newCoupon.expiry_date} onChange={e => setNewCoupon({...newCoupon, expiry_date: e.target.value})}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'var(--card-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', opacity: 0.8, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>MAX USES</label>
                    <input type="number" value={newCoupon.max_uses} onChange={e => setNewCoupon({...newCoupon, max_uses: Number(e.target.value)})}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'var(--card-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <button onClick={handleCreateCoupon} className="btn-primary" style={{ padding: '12px 32px', borderRadius: '12px' }}>Create Coupon</button>
              </div>
            )}

            <div className="glass" style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
              <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead className="admin-table-header">
                  <tr>
                    {['CODE', 'TYPE', 'DISCOUNT', 'REMAINING', 'EXPIRY', 'STATUS', 'ACTION'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {coupons.map(c => (
                    <tr key={c.id} className="admin-tr">
                      <td style={{ fontWeight: 900, letterSpacing: '0.05em', color: 'var(--accent-gold)' }}>{c.code}</td>
                      <td style={{ fontSize: '0.8rem', opacity: 0.6, textTransform: 'capitalize' }}>{c.discount_type}</td>
                      <td style={{ fontWeight: 800, color: '#10b981' }}>{c.discount_type === 'percent' ? `${c.discount_value}%` : `₹${c.discount_value}`}</td>
                      <td style={{ fontSize: '0.85rem' }}>
                        <span style={{ color: c.used_count >= c.max_uses ? '#ef4444' : 'var(--text-primary)', fontWeight: 600 }}>{c.max_uses - c.used_count} left</span>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{c.used_count} redeemed</div>
                      </td>
                      <td style={{ fontSize: '0.8rem', opacity: 0.6 }}>{c.expiry_date ? new Date(c.expiry_date).toLocaleDateString() : 'Never'}</td>
                      <td>
                        <span style={{ 
                          padding: '4px 12px', borderRadius: '100px', fontSize: '0.65rem', fontWeight: 900, 
                          background: c.is_active ? '#10b98115' : '#ef444415', color: c.is_active ? '#10b981' : '#ef4444',
                          border: `1px solid ${c.is_active ? '#10b981' : '#ef4444'}30`
                        }}>
                          {c.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td>
                        <button onClick={() => handleToggleCoupon(c.id, c.is_active)} className="btn-ghost" style={{ padding: '6px 14px', fontSize: '0.75rem', borderRadius: '100px', fontWeight: 700 }}>
                          {c.is_active ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {coupons.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No coupons yet. Create your first one above.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        .admin-tr:hover { background: var(--hover-bg); }
        .admin-tr td { transition: background 0.2s; }
      `}</style>
    </div>
  )
}
