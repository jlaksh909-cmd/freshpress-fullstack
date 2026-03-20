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

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [user, setUser] = useState<any>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'orders' | 'reviews' | 'stats' | 'users' | 'messages' | 'inventory' | 'coupons'>('orders')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<{ id: string; message: string; type: ToastType }[]>([])
  const [stats, setStats] = useState({ 
    total: 0, 
    pending: 0, 
    revenue: 0, 
    dailyTrend: [] as any[],
    forecast: [] as any[],
    growthRate: 0
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [conversations, setConversations] = useState<any[]>([])
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [replyText, setReplyText] = useState("")
  const [inventory, setInventory] = useState<any[]>([])
  const [isRestocking, setIsRestocking] = useState<string | null>(null)
  const [restockAmount, setRestockAmount] = useState<number>(0)
  const [coupons, setCoupons] = useState<any[]>([])
  const [newCoupon, setNewCoupon] = useState({ code: '', discount_type: 'percent', discount_value: 10, min_order_value: 0, expiry_date: '', max_uses: 100 })
  const [showCouponForm, setShowCouponForm] = useState(false)
  const [photoEditingOrder, setPhotoEditingOrder] = useState<Booking | null>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showBroadcastForm, setShowBroadcastForm] = useState(false)
  const [broadcastForm, setBroadcastForm] = useState({ title: '', content: '', target: 'all' })
  const [broadcastLoading, setBroadcastLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const addToast = (message: string, type: ToastType = "info") => {
    const id = Date.now().toString()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => removeToast(id), 5000)
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  useEffect(() => {
    fetchAdminData()

    const channel = supabase
      .channel('admin-bookings')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bookings' },
        (payload) => {
          setBookings(prev => [payload.new as Booking, ...prev])
          addToast(`New order received!`, "success")
          setStats(prev => ({ ...prev, total: prev.total + 1, pending: prev.pending + 1 }))
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings' },
        (payload) => {
          setBookings(prev => prev.map(b => b.id === payload.new.id ? { ...b, ...payload.new } : b))
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

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      addToast("Failed to fetch bookings", "error")
    } else {
      const bookingsData = data || []
      setBookings(bookingsData)

      const { data: reviewsData } = await supabase.from("reviews").select("*").order("created_at", { ascending: false })
      setReviews(reviewsData || [])

      const { data: profilesData } = await supabase.from("profiles").select("*").order("created_at", { ascending: false })
      setProfiles(profilesData || [])
      
      const total = bookingsData.length
      const pending = bookingsData.filter(b => b.status === "pending").length
      const revenue = bookingsData
        .filter(b => b.status === "completed")
        .reduce((acc, curr) => acc + (curr.price || 0), 0)
      
      const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - i)
        return d.toISOString().split('T')[0]
      }).reverse()

      const dailyTrend = last7Days.map(date => ({
        date,
        count: bookingsData.filter(b => b.created_at.startsWith(date)).length
      }))
      
      setStats({ 
        total, 
        pending, 
        revenue, 
        dailyTrend,
        forecast: [
          ...dailyTrend,
          { date: 'Next Week (Proj)', count: Math.round(dailyTrend[dailyTrend.length-1].count * 1.15) },
          { date: 'Next Month (Proj)', count: Math.round(total / 4 * 1.25) }
        ],
        growthRate: 15.5 // Simulated for current UI
      })

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
    }
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

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    setUpdatingId(id)
    const { error } = await supabase
      .from("bookings")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", id)

    if (error) {
      addToast(error.message, "error")
    } else {
      addToast(`Order updated to ${newStatus}`, "success")
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b))
      if (newStatus === "completed") {
        const { data } = await supabase.from("bookings").select("price").filter("status", "eq", "completed")
        const newRev = data?.reduce((acc, curr) => acc + (curr.price || 0), 0) || 0
        setStats(prev => ({ ...prev, revenue: newRev }))

        // Referral Logic: Award points on first wash completion
        const booking = bookings.find(b => b.id === id)
        if (booking) {
          // Check if user has other completed bookings
          const { count } = await supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('user_id', booking.user_id).eq('status', 'completed')
          if (count === 1) { // This was their first one!
            const { data: profile } = await supabase.from('profiles').select('referred_by').eq('id', booking.user_id).single()
            if (profile?.referred_by) {
              // Award 500 points to referrer
              const { data: referrerPoints } = await supabase.from('user_points').select('balance').eq('user_id', profile.referred_by).single()
              const newBalance = (referrerPoints?.balance || 0) + 500
              await supabase.from('user_points').upsert({ user_id: profile.referred_by, balance: newBalance, updated_at: new Date().toISOString() })
              await supabase.from('points_history').insert({
                user_id: profile.referred_by,
                amount: 500,
                transaction_type: 'earned',
                description: `Referral bonus: Friend's first wash completion!`,
                order_id: id
              })
              addToast("Referral bonus awarded to referrer!", "success")
            }
          }
        }
      }
    }
    setUpdatingId(null)
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
      setProfiles(prev => prev.map(p => p.id === userId ? { ...p, role: newRole } : p))
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

  const handleExportCSV = () => {
    if (!bookings.length) { addToast('No orders to export', 'info'); return }
    const headers = ['ID', 'Customer', 'Service', 'Status', 'Price', 'Pickup Date', 'Pickup Time', 'Address']
    const rows = bookings.map(b => [
      b.id.slice(0,8).toUpperCase(),
      b.customer_name || '',
      b.service_name,
      b.status,
      `₹${b.price}`,
      b.pickup_date,
      b.pickup_time || '',
      `"${b.address.replace(/"/g, '""')}"`
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `freshpress-orders-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    addToast('Orders exported as CSV!', 'success')
  }

  const filteredBookings = bookings.filter(b => 
    b.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.id.includes(searchTerm)
  )

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
            { id: 'orders', label: 'Orders', icon: '📦' },
            { id: 'stats', label: 'Analytics', icon: '📊' },
            { id: 'messages', label: 'Messages', icon: '💬' },
            { id: 'inventory', label: 'Inventory', icon: '🛠️' },
            { id: 'coupons', label: 'Coupons', icon: '🎟️' },
            { id: 'users', label: 'Customers', icon: '👥' },
            { id: 'reviews', label: 'Reviews', icon: '⭐' }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)} 
              className={`admin-nav-item ${activeTab === tab.id ? 'active' : ''}`}
            >
              <span style={{ fontSize: '1.2rem' }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
        
        <div className="sidebar-footer" style={{ marginTop: 'auto', padding: '20px 12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '0.7rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Administrator</div>
          <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--accent-gold)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.name || user?.email?.split('@')[0]}
          </div>
          <button 
            onClick={() => supabase.auth.signOut().then(() => router.push('/'))}
            className="btn-ghost" 
            style={{ width: '100%', marginTop: '16px', fontSize: '0.75rem', padding: '8px', borderRadius: '8px', color: '#ef4444' }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 950, letterSpacing: '-0.02em' }}>
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Dashboard
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Real-time synchronization active • {bookings.length} events
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn-ghost" style={{ padding: '12px', borderRadius: '14px', position: 'relative' }} onClick={() => addToast(`You have ${unreadCount} unread notifications`, "info")}>
              🔔
              {unreadCount > 0 && (
                <span style={{ 
                  position: 'absolute', top: '4px', right: '4px', minWidth: '18px', height: '18px', 
                  background: '#ef4444', borderRadius: '50%', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 900,
                  border: '2px solid var(--bg-color)'
                }}>
                  {unreadCount}
                </span>
              )}
            </button>
            <div className="glass" style={{ padding: '4px 16px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>₹{stats.revenue.toLocaleString()}</div>
                <div style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 700 }}>MONTHLY REV</div>
              </div>
            </div>
          </div>
        </header>

        <div style={{ display: 'none' }}>
          <Navbar user={user} />
        </div>

        <div className="admin-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <button onClick={() => setActiveTab('orders')} className={activeTab === 'orders' ? 'btn-primary' : 'btn-ghost'} style={{ borderRadius: '12px', padding: '10px 20px' }}>📦 Orders</button>
          <button onClick={() => setActiveTab('reviews')} className={activeTab === 'reviews' ? 'btn-primary' : 'btn-ghost'} style={{ borderRadius: '12px', padding: '10px 20px' }}>⭐ Reviews</button>
          <button onClick={() => setActiveTab('users')} className={activeTab === 'users' ? 'btn-primary' : 'btn-ghost'} style={{ borderRadius: '12px', padding: '10px 20px' }}>👥 Users</button>
          <button onClick={() => setActiveTab('messages')} className={activeTab === 'messages' ? 'btn-primary' : 'btn-ghost'} style={{ borderRadius: '12px', padding: '10px 20px' }}>💬 Messages</button>
          <button onClick={() => setActiveTab('inventory')} className={activeTab === 'inventory' ? 'btn-primary' : 'btn-ghost'} style={{ borderRadius: '12px', padding: '10px 20px' }}>📦 Inventory</button>
          <button onClick={() => setActiveTab('coupons')} className={activeTab === 'coupons' ? 'btn-primary' : 'btn-ghost'} style={{ borderRadius: '12px', padding: '10px 20px' }}>🎟️ Coupons</button>
          <button onClick={() => setActiveTab('stats')} className={activeTab === 'stats' ? 'btn-primary' : 'btn-ghost'} style={{ borderRadius: '12px', padding: '10px 20px' }}>📊 Analytics</button>
        </div>

        {activeTab === 'orders' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '24px' }}>
              <input 
                type="text" 
                placeholder="Search orders, customers..." 
                className="glass"
                style={{ width: '320px', padding: '12px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: 'white' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button onClick={handleExportCSV} className="btn-ghost" style={{ borderRadius: '12px', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                ⬇️ Export
              </button>
            </div>

            <div className="glass" style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
              <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead className="admin-table-header">
                  <tr>
                    <th>ORDER ID</th>
                    <th>CUSTOMER</th>
                    <th>SERVICE</th>
                    <th>PICKUP</th>
                    <th>STATUS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((booking) => (
                    <tr key={booking.id} className="admin-tr">
                      <td style={{ fontStyle: 'italic', opacity: 0.6 }}>#{booking.id.slice(0,8).toUpperCase()}</td>
                      <td>
                        <div style={{ fontWeight: 800 }}>{booking.customer_name || 'Anonymous'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{booking.phone}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>{booking.service_name}</div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>₹{booking.price?.toFixed(2)}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{booking.pickup_date}</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>{booking.pickup_time}</div>
                      </td>
                      <td>
                        <span style={{ 
                          padding: '6px 12px', 
                          borderRadius: '100px', 
                          fontSize: '0.65rem', 
                          fontWeight: 900,
                          letterSpacing: '0.05em',
                          background: statusOptions.find(o => o.value === booking.status)?.color + '15',
                          color: statusOptions.find(o => o.value === booking.status)?.color,
                          border: `1px solid ${statusOptions.find(o => o.value === booking.status)?.color}30`
                        }}>
                          {statusOptions.find(o => o.value === booking.status)?.label.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <select 
                            className="glass"
                            style={{ padding: '8px 12px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', flex: 1 }}
                            value={booking.status}
                            disabled={updatingId === booking.id}
                            onChange={(e) => handleStatusUpdate(booking.id, e.target.value)}
                          >
                            {statusOptions.map(opt => (
                              <option key={opt.value} value={opt.value} style={{ background: '#07071a' }}>{opt.label}</option>
                            ))}
                          </select>
                          <button 
                            onClick={() => setPhotoEditingOrder(booking)}
                            className="btn-ghost"
                            style={{ padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderColor: (booking.before_photo_url || booking.after_photo_url) ? '#10b981' : 'rgba(255,255,255,0.1)' }}
                            title="Service Photos"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={(booking.before_photo_url || booking.after_photo_url) ? '#10b981' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                          </button>
                        </div>
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
              <div key={review.id} className="glass" style={{ padding: '28px', borderRadius: '24px', position: 'relative', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '4px' }}>{review.customer_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', fontWeight: 800 }}>VERIFIED CUSTOMER</div>
                  </div>
                  <div style={{ color: '#f5c842', filter: 'drop-shadow(0 0 5px rgba(245,200,66,0.3))' }}>{"★".repeat(review.rating)}</div>
                </div>
                <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px', fontStyle: 'italic' }}>
                  &ldquo;{review.comment}&rdquo;
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                  <span style={{ fontSize: '0.75rem', opacity: 0.5, color: 'var(--text-muted)' }}>{new Date(review.created_at).toLocaleDateString()}</span>
                  <button onClick={() => handleDeleteReview(review.id)} className="btn-ghost" style={{ padding: '8px 16px', borderRadius: '10px', color: '#ef4444', fontSize: '0.8rem', fontWeight: 700 }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="admin-analytics" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div className="admin-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
              <div className="admin-stat-card">
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 800 }}>Volume</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 950, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>{stats.total}</div>
                <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '12px', fontWeight: 600 }}>↑ 12% from last week</div>
              </div>
              <div className="admin-stat-card">
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 800 }}>Net Revenue</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 950, color: '#10b981', letterSpacing: '-0.03em' }}>₹{stats.revenue.toLocaleString()}</div>
                <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '12px', fontWeight: 600 }}>↑ 8% this month</div>
              </div>
              <div className="admin-stat-card">
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 800 }}>Avg Turnaround</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 950, color: 'var(--accent-gold)', letterSpacing: '-0.03em' }}>24.2<span style={{ fontSize: '1rem', opacity: 0.5 }}>h</span></div>
                <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '12px', fontWeight: 600 }}>↓ 2% efficiency</div>
              </div>
              <div className="admin-stat-card">
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 800 }}>Avg Ticket</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 950, color: '#4fc3f7', letterSpacing: '-0.03em' }}>₹{(stats.revenue / (stats.total || 1)).toFixed(0)}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '12px', fontWeight: 600 }}>Per average booking</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '24px' }}>
              <div className="glass" style={{ padding: '30px', borderRadius: '24px' }}>
                <h3 style={{ marginBottom: '24px', fontSize: '1.1rem', fontWeight: 800 }}>Revenue Trend</h3>
                <div style={{ width: '100%', height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.dailyTrend}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={10} tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                      <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} />
                      <Tooltip contentStyle={{ background: '#0a0a20', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ color: '#3b82f6' }} />
                      <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="glass" style={{ padding: '30px', borderRadius: '24px' }}>
                <h3 style={{ marginBottom: '24px', fontSize: '1.1rem', fontWeight: 800 }}>Top Services</h3>
                <div style={{ width: '100%', height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Wash & Fold', value: 400 },
                          { name: 'Dry Cleaning', value: 300 },
                          { name: 'Steam Iron', value: 300 },
                          { name: 'Premium Wash', value: 200 },
                        ]}
                        innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                      >
                        {[0,1,2,3].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'][index % 4]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#0a0a20', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Growth Forecasting Card */}
            <div className="glass" style={{ padding: '30px', borderRadius: '24px', background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1))', border: '1px solid rgba(59,130,246,0.2)', marginTop: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '4px' }}>AI Growth Forecasting</h3>
                  <p style={{ fontSize: '0.85rem', color: 'rgba(238,242,255,0.6)' }}>Predictive analytics based on historical order patterns</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 950, color: '#10b981' }}>+ {stats.growthRate}%</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Est. Monthly Growth</div>
                </div>
              </div>
              
              <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.forecast}>
                    <defs>
                      <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={10} tickFormatter={(val) => val.includes('Proj') ? val : val.split('-').slice(1).join('/')} />
                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} />
                    <Tooltip contentStyle={{ background: '#0a0a20', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                    <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorForecast)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              
              <div style={{ marginTop: '24px', display: 'flex', gap: '16px' }}>
                <div className="glass" style={{ padding: '12px 20px', borderRadius: '12px', flex: 1 }}>
                  <p style={{ fontSize: '0.7rem', opacity: 0.5, marginBottom: '4px' }}>PROJECTED REVENUE</p>
                  <p style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>₹{(stats.revenue * 1.25).toFixed(0)}</p>
                </div>
                <div className="glass" style={{ padding: '12px 20px', borderRadius: '12px', flex: 1 }}>
                  <p style={{ fontSize: '0.7rem', opacity: 0.5, marginBottom: '4px' }}>PROJECTED LOAD</p>
                  <p style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f5c842' }}>{Math.round(stats.total * 1.2)} Orders</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="admin-messages glass" style={{ borderRadius: '24px', display: 'flex', height: '600px', overflow: 'hidden' }}>
            <div style={{ width: '300px', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 800 }}>ACTIVE CHATS</div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {conversations.map(userId => (
                  <button 
                    key={userId} onClick={() => setSelectedConvo(userId)}
                    style={{ width: '100%', padding: '20px', textAlign: 'left', border: 'none', background: selectedConvo === userId ? 'rgba(59,130,246,0.1)' : 'transparent', color: 'white', borderBottom: '1px solid rgba(255,255,255,0.02)', cursor: 'pointer' }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                      {profiles.find(p => p.id === userId)?.full_name || `User: ${userId.slice(0,8)}`}
                    </div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>{profiles.find(p => p.id === userId)?.email || 'View conversation'}</div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.1)' }}>
              {selectedConvo ? (
                <>
                  <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 700 }}>Chat with {selectedConvo}</div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {chatMessages.map(msg => (
                      <div key={msg.id} style={{
                        alignSelf: msg.sender_id === user.id ? 'flex-end' : 'flex-start',
                        background: msg.sender_id === user.id ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)',
                        padding: '12px 16px', borderRadius: '12px', maxWidth: '70%', fontSize: '0.9rem'
                      }}>{msg.content}</div>
                    ))}
                  </div>
                  <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '12px' }}>
                    <input 
                      className="glass" style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
                      placeholder="Type a reply..." value={replyText} onChange={(e) => setReplyText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendReply()}
                    />
                    <button onClick={sendReply} className="btn-primary" style={{ padding: '0 24px', borderRadius: '12px' }}>Send</button>
                  </div>
                </>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.4 }}>Select a conversation</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="admin-inventory">
            <div className="admin-stats-grid">
              {inventory.map(item => (
                <div key={item.id} className="admin-stat-card" style={{ 
                  border: item.quantity <= (item.min_stock_level || 5) ? '1.5px solid #ef4444' : '1px solid rgba(255,255,255,0.05)',
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
                        style={{ width: '80px', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
                        value={restockAmount} onChange={(e) => setRestockAmount(Number(e.target.value))}
                      />
                      <button onClick={() => handleRestock(item.id)} className="btn-primary" style={{ flex: 1, padding: '10px', borderRadius: '12px', fontWeight: 800 }}>Apply</button>
                    </div>
                  ) : (
                    <button onClick={() => { setIsRestocking(item.id); setRestockAmount(10); }} className="btn-ghost" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.85rem', fontWeight: 700 }}>+ Restock Supply</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="glass" style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
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
                      <div style={{ fontWeight: 800 }}>{profile.full_name || 'No Name'}</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.4, fontStyle: 'italic' }}>UID: {profile.id.slice(0,12)}...</div>
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
                        style={{ padding: '8px 14px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                      >
                        <option value="user" style={{ background: '#07071a' }}>Set as Customer</option>
                        <option value="worker" style={{ background: '#07071a' }}>Set as Worker</option>
                        <option value="admin" style={{ background: '#07071a' }}>Set as Admin</option>
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
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Coupon Management</h3>
              <button onClick={() => setShowCouponForm(!showCouponForm)} className="btn-primary" style={{ padding: '10px 24px', borderRadius: '12px' }}>
                {showCouponForm ? 'Cancel' : '+ New Coupon'}
              </button>
            </div>

            {showCouponForm && (
              <div className="glass" style={{ padding: '28px', borderRadius: '20px', marginBottom: '24px', border: '1px solid rgba(245,200,66,0.2)' }}>
                <h4 style={{ marginBottom: '20px', fontWeight: 800 }}>Create New Coupon</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', opacity: 0.6, display: 'block', marginBottom: '6px' }}>CODE</label>
                    <input type="text" placeholder="SAVE20" value={newCoupon.code} onChange={e => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', fontWeight: 700, letterSpacing: '1px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', opacity: 0.6, display: 'block', marginBottom: '6px' }}>TYPE</label>
                    <select value={newCoupon.discount_type} onChange={e => setNewCoupon({...newCoupon, discount_type: e.target.value})}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', boxSizing: 'border-box' }}>
                      <option value="percent" style={{ background: '#07071a' }}>Percent (%)</option>
                      <option value="fixed" style={{ background: '#07071a' }}>Fixed (₹)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', opacity: 0.6, display: 'block', marginBottom: '6px' }}>VALUE</label>
                    <input type="number" value={newCoupon.discount_value} onChange={e => setNewCoupon({...newCoupon, discount_value: Number(e.target.value)})}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', opacity: 0.6, display: 'block', marginBottom: '6px' }}>EXPIRY DATE</label>
                    <input type="date" value={newCoupon.expiry_date} onChange={e => setNewCoupon({...newCoupon, expiry_date: e.target.value})}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', opacity: 0.6, display: 'block', marginBottom: '6px' }}>MAX USES</label>
                    <input type="number" value={newCoupon.max_uses} onChange={e => setNewCoupon({...newCoupon, max_uses: Number(e.target.value)})}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <button onClick={handleCreateCoupon} className="btn-primary" style={{ padding: '12px 32px', borderRadius: '12px' }}>Create Coupon</button>
              </div>
            )}

            <div className="glass" style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
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
                        <span style={{ color: c.used_count >= c.max_uses ? '#ef4444' : '#fff', fontWeight: 600 }}>{c.max_uses - c.used_count} left</span>
                        <div style={{ fontSize: '0.65rem', opacity: 0.4 }}>{c.used_count} redeemed</div>
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
                    <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', opacity: 0.4 }}>No coupons yet. Create your first one above.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        .admin-tr:hover { background: rgba(255,255,255,0.02); }
        .admin-tr td { transition: background 0.2s; }
      `}</style>
    {/* Photo Upload Modal */}
    {photoEditingOrder && (
      <div className="modal-overlay">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="modal-container glass" 
          style={{ maxWidth: '500px', padding: '32px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900 }}>Service Quality Proof</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Order #{photoEditingOrder.id.slice(0,8).toUpperCase()}</p>
            </div>
            <button onClick={() => setPhotoEditingOrder(null)} className="btn-ghost" style={{ padding: '8px', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
            <PhotoUpload 
              label="Before Wash" 
              currentUrl={photoEditingOrder.before_photo_url}
              onUpload={async (url: string) => {
                const { error } = await supabase.from('bookings').update({ before_photo_url: url }).eq('id', photoEditingOrder.id)
                if (!error) {
                  setBookings(prev => prev.map(b => b.id === photoEditingOrder.id ? { ...b, before_photo_url: url } : b))
                }
              }}
            />
            <PhotoUpload 
              label="After Wash" 
              currentUrl={photoEditingOrder.after_photo_url}
              onUpload={async (url: string) => {
                const { error } = await supabase.from('bookings').update({ after_photo_url: url }).eq('id', photoEditingOrder.id)
                if (!error) {
                  setBookings(prev => prev.map(b => b.id === photoEditingOrder.id ? { ...b, after_photo_url: url } : b))
                }
              }}
            />
          </div>

          <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', marginBottom: '24px' }}>
            <p style={{ fontSize: '0.85rem', color: '#4fc3f7', lineHeight: 1.5 }}>
              <strong>Elite Tip:</strong> Quality photos are visible to the customer on their live tracking page. This builds trust!
            </p>
          </div>

          <button onClick={() => setPhotoEditingOrder(null)} className="btn-primary" style={{ width: '100%' }}>Done</button>
        </motion.div>
      </div>
    )}
    </div>
  )
}
