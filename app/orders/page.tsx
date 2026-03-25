"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

interface Booking {
  id: string
  service_type: string
  service_name: string
  price: number
  pickup_date: string
  pickup_time: string
  address: string
  instructions: string | null
  status: "pending" | "confirmed" | "in_progress" | "processing" | "ready" | "completed" | "cancelled"
  before_photo_url?: string | null
  after_photo_url?: string | null
  payment_method?: string
  payment_status?: string
  created_at: string
}

interface UserProfile {
  id: string
  name: string | null
  email: string
  role: string | null
}

const statusConfig = {
  pending: { label: "Pending", color: "#f59e0b", bg: "#fef3c7" },
  confirmed: { label: "Confirmed", color: "#3b82f6", bg: "#dbeafe" },
  in_progress: { label: "In Progress", color: "#8b5cf6", bg: "#ede9fe" },
  processing: { label: "Processing", color: "#10b981", bg: "#d1fae5" },
  ready: { label: "Ready", color: "#06b6d4", bg: "#cffafe" },
  completed: { label: "Completed", color: "#10b981", bg: "#d1fae5" },
  cancelled: { label: "Cancelled", color: "#ef4444", bg: "#fee2e2" }
}

import Navbar from "@/app/components/Navbar"
import { ToastContainer, ToastType } from "@/app/components/Toast"
import OrderTimeline from "@/app/components/OrderTimeline"
import Receipt from "@/app/components/Receipt"
import ReviewModal from "@/app/components/ReviewModal"
import CancelModal from "@/app/components/CancelModal"

export default function OrdersPage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")
  const [selectedOrder, setSelectedOrder] = useState<Booking | null>(null)
  const [showReceiptOrder, setShowReceiptOrder] = useState<Booking | null>(null)
  const [reviewOrder, setReviewOrder] = useState<Booking | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [bookingToCancel, setBookingToCancel] = useState<string | null>(null)
  const [toasts, setToasts] = useState<{ id: string; message: string; type: ToastType }[]>([])
  const router = useRouter()
  const supabase = createClient()

  const fetchBookings = useCallback(async (userId: string) => {
    let query = supabase
      .from("bookings")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (filter !== "all") {
      query = query.eq("status", filter)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching bookings:", error)
    } else {
      setBookings(data || [])
    }
  }, [supabase, filter])

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Fetch role from profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single()

        setUser({
          id: user.id,
          name: user.user_metadata?.name || null,
          email: user.email || "",
          role: profile?.role || 'user'
        })
        await fetchBookings(user.id)
      }
      setLoading(false)
    }
    getUser()

    // Real-time subscription for status updates
    const channel = supabase
      .channel('booking-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: user ? `user_id=eq.${user.id}` : undefined
        },
        (payload) => {
          console.log('Real-time update received:', payload)
          setBookings(prev => prev.map(booking => 
            booking.id === payload.new.id ? { ...booking, ...payload.new } : booking
          ))
          
          if (selectedOrder?.id === payload.new.id) {
            setSelectedOrder(payload.new as Booking)
          }
          
          addToast(`Order status updated to ${payload.new.status}!`, "info")
          
          // Auto-show review modal for newly completed orders
          if (payload.new.status === 'completed') {
            setTimeout(() => checkForUnreviewedOrders(), 1000)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchBookings, user?.id, selectedOrder?.id])

  const addToast = (message: string, type: ToastType = "info") => {
    const id = Date.now().toString()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => removeToast(id), 5000)
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const checkForUnreviewedOrders = useCallback(async () => {
    if (!user) return
    const completedOrders = bookings.filter(b => b.status === 'completed')
    if (!completedOrders.length) return

    // Check if any completed order lacks a review
    const { data: existingReviews } = await supabase
      .from('reviews')
      .select('order_id')
      .eq('user_id', user.id)
      .in('order_id', completedOrders.map(o => o.id))

    const reviewedIds = new Set((existingReviews || []).map((r: any) => r.order_id))
    const unreviewed = completedOrders.find(o => !reviewedIds.has(o.id))
    if (unreviewed) setReviewOrder(unreviewed)
  }, [user, bookings, supabase])

  useEffect(() => {
    if (bookings.length > 0 && user) {
      checkForUnreviewedOrders()
    }
  }, [bookings, user, checkForUnreviewedOrders])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const handleCancelBooking = (bookingId: string) => {
    setBookingToCancel(bookingId)
    setShowCancelModal(true)
  }

  const confirmCancel = async () => {
    if (!bookingToCancel) return

    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingToCancel)

    if (error) {
      console.error("Error cancelling booking:", error)
      addToast("Failed to cancel booking", "error")
    } else {
      addToast("Order cancelled successfully", "info")
      if (user) {
        fetchBookings(user.id)
      }
    }
    setShowCancelModal(false)
    setBookingToCancel(null)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    })
  }

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":")
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? "PM" : "AM"
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  if (loading) {
    return (
      <div className="home-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
      </div>
    )
  }

  return (
    <div className="home-root">
      <Navbar user={user} />
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <main className="orders-content" style={{ padding: '120px 48px 60px', maxWidth: '1200px', margin: '0 auto' }}>
        <div className="orders-header" style={{ marginBottom: '40px' }}>
          <div className="header-text">
            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '8px', color: 'var(--text-primary)' }}>My Orders</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Track and manage your premium laundry bookings</p>
          </div>
          <Link href="/home" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '12px 24px', borderRadius: '14px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            New Booking
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="filter-tabs" style={{ display: 'flex', gap: '12px', marginBottom: '32px', overflowX: 'auto', paddingBottom: '12px' }}>
          {["all", "pending", "in_progress", "completed", "cancelled"].map((f) => (
            <button 
              key={f}
              className={`filter-tab ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
              style={{
                padding: '10px 20px',
                borderRadius: '40px',
                border: filter === f ? '1px solid var(--accent-gold)' : '1px solid var(--glass-border)',
                background: filter === f ? 'rgba(245,200,66,.15)' : 'var(--glass-bg)',
                color: filter === f ? 'var(--accent-gold)' : 'var(--text-secondary)',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all .2s'
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1).replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: '24px', position: 'relative' }}>
          <input
            type="text"
            placeholder="🔍  Search by service, status, address..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: '16px',
              background: 'var(--card-bg)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-primary)',
              fontSize: '0.95rem',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => (e.target.style.borderColor = 'rgba(245,200,66,0.4)')}
            onBlur={e => (e.target.style.borderColor = 'var(--glass-border)')}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}
            >✕</button>
          )}
        </div>

        {/* Orders List */}
        {(() => {
          const lq = searchQuery.toLowerCase()
          const filtered = bookings.filter(b => {
            const matchesSearch = !lq ||
              b.service_name?.toLowerCase().includes(lq) ||
              b.status?.toLowerCase().includes(lq) ||
              b.address?.toLowerCase().includes(lq) ||
              b.pickup_date?.toLowerCase().includes(lq)
            
            const matchesFilter = filter === "all" || b.status === filter
            
            return matchesSearch && matchesFilter
          })
          return (
            <div className="orders-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
              {filtered.length === 0 ? (
                <div className="empty-state glass" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '80px', borderRadius: '32px', border: '1px dashed var(--glass-border)' }}>
                  <div style={{ marginBottom: '24px', opacity: 0.5 }}>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--accent-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                  </div>
                  <h3 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '12px', color: 'var(--text-primary)' }}>{searchQuery ? `No results for "${searchQuery}"` : 'No orders found'}</h3>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '1rem' }}>{searchQuery ? 'Try a different search term or check your spelling.' : "Your laundry basket is empty! Ready to start a fresh wash?"}</p>
                  {!searchQuery && <Link href="/home" className="btn-primary" style={{ textDecoration: 'none', padding: '14px 40px', borderRadius: '16px' }}>Start My First Order</Link>}
                </div>
              ) : (
                filtered.map((booking) => {
              const status = statusConfig[booking.status]
              return (
                <div key={booking.id} className="order-card glass" style={{ padding: '24px', borderRadius: '20px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px' }}>{booking.service_name}</h3>
                      <span 
                        style={{ 
                          padding: '4px 12px',
                          borderRadius: '40px',
                          fontSize: '.75rem',
                          fontWeight: 700,
                          color: status.color, 
                          backgroundColor: status.bg 
                        }}
                      >
                        {status.label}
                      </span>
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-gold)' }}>
                      ₹{booking.price.toFixed(2)}/cloth
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '.9rem', color: 'var(--text-secondary)' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                      {formatDate(booking.pickup_date)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '.9rem', color: 'var(--text-secondary)' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                      {booking.pickup_time ? formatTime(booking.pickup_time) : "TBD"}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '.9rem', color: 'var(--text-secondary)' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{booking.address}</span>
                    </div>
                  </div>
                  
                  {booking.instructions && (
                    <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--card-bg)', fontSize: '.85rem', color: 'var(--text-secondary)' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Note:</strong> {booking.instructions}
                    </div>
                  )}

                  <OrderTimeline status={booking.status} />
                  
                  <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>
                      Ref: #{booking.id.slice(0,8).toUpperCase()}
                    </span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {(booking.status === "pending" || booking.status === "confirmed") && (
                        <button 
                          className="btn-ghost"
                          onClick={() => handleCancelBooking(booking.id)}
                          style={{ padding: '6px 14px', fontSize: '.8rem', color: '#f87171', borderColor: 'rgba(239,68,68,.2)' }}
                        >
                          Cancel
                        </button>
                      )}
                      {booking.status !== "cancelled" && booking.status !== "pending" && (
                        <button 
                          className="btn-ghost"
                          onClick={() => setShowReceiptOrder(booking)}
                          style={{ padding: '8px 16px', fontSize: '.8rem', color: 'var(--accent-gold)', borderColor: 'rgba(245,200,66,.2)', gap: '8px' }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"></path><path d="M16 8h-6"></path><path d="M16 12H8"></path><path d="M13 16H8"></path></svg>
                          Receipt
                        </button>
                      )}
                      <button 
                        className="btn-primary"
                        onClick={() => setSelectedOrder(booking)}
                        style={{ padding: '6px 14px', fontSize: '.8rem', boxShadow: 'none' }}
                      >
                        Track
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
            </div>
          )
        })()}
      </main>

      {/* Receipt Modal */}
      {showReceiptOrder && (
        <div className="modal-backdrop" onClick={() => setShowReceiptOrder(null)} style={{ zIndex: 2000 }}>
          <div 
            className="modal-box no-bg" 
            onClick={e => e.stopPropagation()} 
            style={{ 
              maxWidth: '550px', 
              background: 'transparent',
              padding: 0,
              boxShadow: 'none',
              position: 'relative'
            }}
          >
            <div style={{ position: 'absolute', right: '10px', top: '10px', zIndex: 2001 }}>
              <button 
                className="modal-close no-print" 
                onClick={() => setShowReceiptOrder(null)}
                style={{ background: '#f5c842', color: '#07071a', width: '30px', height: '30px', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
              >✕</button>
            </div>
            <Receipt order={{
              ...showReceiptOrder,
              customer_name: user?.name || user?.email || 'Guest User'
            }} />
          </div>
        </div>
      )}

      {/* Order Tracking Modal */}
      {selectedOrder && (
        <div className="modal-backdrop" onClick={() => setSelectedOrder(null)}>
          <div className="modal-box glass" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Live Tracking</h2>
              <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', marginRight: '16px' }}>
                <button 
                  onClick={() => user && fetchBookings(user.id)} 
                  className="btn-ghost" 
                  style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '10px' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path><polyline points="21 3 21 8 16 8"></polyline></svg>
                  Refresh
                </button>
              </div>
              <button className="modal-close" onClick={() => setSelectedOrder(null)}>✕</button>
            </div>
            
            <div className="order-summary" style={{ marginBottom: '30px', padding: '0 10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)' }}>{selectedOrder.service_name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <span 
                      style={{ 
                        padding: '2px 10px', 
                        borderRadius: '20px', 
                        fontSize: '0.7rem', 
                        fontWeight: 700,
                        background: statusConfig[selectedOrder.status].bg,
                        color: statusConfig[selectedOrder.status].color
                      }}
                    >
                      {statusConfig[selectedOrder.status].label}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>#{selectedOrder.id.slice(0,8).toUpperCase()}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 950, color: 'var(--accent-gold)' }}>₹{selectedOrder.price.toFixed(2)}</div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Estimate</span>
                </div>
              </div>
              
              <OrderTimeline status={selectedOrder.status} />
            </div>

            <div className="tracking-timeline glass" style={{ padding: '24px', borderRadius: '20px', marginBottom: '24px', background: 'var(--card-bg)' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '16px' }}>Estimated Timeline</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-gold)', marginTop: '6px', zIndex: 1 }}></div>
                  <div style={{ position: 'absolute', left: '3px', top: '14px', bottom: '-16px', width: '2px', background: 'var(--glass-border)' }}></div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Pickup Scheduled</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatDate(selectedOrder.pickup_date)} at {selectedOrder.pickup_time ? formatTime(selectedOrder.pickup_time) : "TBD"}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--glass-border)', marginTop: '6px' }}></div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)' }}>Estimated Delivery</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Usually within 24-48 hours after pickup</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-details-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="glass" style={{ padding: '16px', borderRadius: '16px' }}>
                <h4 style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Pickup Location</h4>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>📍 {selectedOrder.address}</div>
              </div>
              <div className="glass" style={{ padding: '16px', borderRadius: '16px' }}>
                <h4 style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Security Note</h4>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>Verified Partner Pickup. Check for FreshPress ID.</div>
              </div>
              {selectedOrder.instructions && (
                <div className="glass" style={{ gridColumn: '1 / span 2', padding: '16px', borderRadius: '16px' }}>
                  <h4 style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Your Instructions</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{selectedOrder.instructions}"</p>
                </div>
              )}
            </div>

            {(selectedOrder.before_photo_url || selectedOrder.after_photo_url) && (
              <div className="glass" style={{ marginTop: '24px', padding: '24px', borderRadius: '20px', border: '1px solid var(--accent-blue)' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-blue)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                  Service Quality Proof
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {selectedOrder.before_photo_url && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>BEFORE PROCESSING</p>
                      <img 
                        src={selectedOrder.before_photo_url} 
                        alt="Before Processing" 
                        style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '12px', border: '1px solid var(--glass-border)' }}
                      />
                    </div>
                  )}
                  {selectedOrder.after_photo_url && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>AFTER PROCESSING</p>
                      <img 
                        src={selectedOrder.after_photo_url} 
                        alt="After Processing" 
                        style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '12px', border: '1px solid var(--glass-border)' }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            <button 
              className="btn-primary" 
              style={{ width: '100%', marginTop: '30px' }}
              onClick={() => setSelectedOrder(null)}
            >
              Close Details
            </button>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewOrder && user && (
        <ReviewModal
          orderId={reviewOrder.id}
          serviceName={reviewOrder.service_name}
          userId={user.id}
          userName={user.name || user.email}
          onClose={() => setReviewOrder(null)}
          onSubmitted={() => {
            setReviewOrder(null)
            addToast("Review submitted! Thank you 🎉", "success")
          }}
        />
      )}

      <CancelModal 
        isOpen={showCancelModal}
        onConfirm={confirmCancel}
        onClose={() => {
          setShowCancelModal(false)
          setBookingToCancel(null)
        }}
        orderId={bookingToCancel || undefined}
      />
    </div>
  )
}
