"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Navbar from "@/app/components/Navbar"
import { ToastContainer, ToastType } from "@/app/components/Toast"
import { addPoints, calculatePoints } from "@/lib/points"
import PhotoUpload from "@/app/components/PhotoUpload"

interface Order {
  id: string
  service_name: string
  customer_name: string | null
  address: string
  status: string
  pickup_date: string
  pickup_time: string | null
  before_photo_url?: string | null
  after_photo_url?: string | null
}

const workerStatuses = [
  { value: "in_progress", label: "Start Processing", color: "#8b5cf6" },
  { value: "processing", label: "Washing/Cleaning", color: "#ec4899" },
  { value: "ready", label: "Ready for Delivery", color: "#06b6d4" },
  { value: "completed", label: "Mark Delivered", color: "#10b981" }
]

export default function WorkerPortal() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [toasts, setToasts] = useState<{ id: string; message: string; type: ToastType }[]>([])
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  const addToast = (message: string, type: ToastType = "info") => {
    const id = Date.now().toString()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => removeToast(id), 5000)
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  useEffect(() => {
    async function initWorker() {
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

      if (profile?.role !== 'worker' && profile?.role !== 'admin') {
        router.push("/home")
        return
      }

      setUser(user)
      fetchWorkerOrders()

      const channel = supabase
        .channel('worker-tasks')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
          fetchWorkerOrders()
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }
    initWorker()
  }, [])

  async function fetchWorkerOrders() {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .in("status", ["confirmed", "in_progress", "processing", "ready"])
      .order("pickup_date", { ascending: true })

    if (error) {
      addToast("Error fetching tasks", "error")
    } else {
      setOrders(data || [])
    }
    setLoading(false)
  }

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from("bookings")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", id)

    if (error) {
      addToast(error.message, "error")
    } else {
      addToast(`Updated status to ${newStatus}`, "success")
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o))
      
      if (newStatus === 'completed') {
        const { data: order } = await supabase.from("bookings").select("*").eq("id", id).single()
        if (order) {
          const { data: sub } = await supabase
            .from("user_subscriptions")
            .select("*, subscriptions(*)")
            .eq("user_id", order.user_id)
            .eq("status", "active")
            .single()
          
          const pointsEarned = calculatePoints(order.price, sub?.subscriptions?.name)
          if (pointsEarned > 0) {
            await addPoints(order.user_id, pointsEarned, `Earned from order #${id.slice(0,8)}`, id)
          }
        }
      }
    }
  }

  const handleSavePhoto = async (id: string, field: 'before' | 'after', url: string) => {
    if (!url) return
    const updateObj = field === 'before' ? { before_photo_url: url } : { after_photo_url: url }
    const { error } = await supabase
      .from("bookings")
      .update({ ...updateObj, updated_at: new Date().toISOString() })
      .eq("id", id)

    if (error) {
      addToast(error.message, "error")
    } else {
      addToast(`${field === 'before' ? 'Before' : 'After'} photo updated`, "success")
      setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updateObj } : o))
    }
  }

  if (loading) {
    return (
      <div className="home-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="home-root worker-root">
      <Navbar user={{ name: "Worker", email: user?.email }} />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      <div className="hero-bg-glow" style={{ top: '10%', right: '10%', background: 'rgba(139,92,246,0.1)' }}></div>

      <main style={{ padding: '120px 24px 60px', maxWidth: '1000px', margin: '0 auto' }}>
        <header style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: '8px' }}>Worker Portal</h1>
          <p style={{ color: 'rgba(238,242,255,0.5)' }}>Manage your assigned laundry tasks and fulfillment</p>
        </header>

        <section className="tasks-grid" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {orders.map(order => (
            <div key={order.id} style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <div className="glass" style={{ padding: '24px', borderRadius: '24px 24px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '24px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'rgba(238,242,255,0.4)' }}>#{order.id.slice(0,8).toUpperCase()}</span>
                    <span style={{ 
                      padding: '2px 10px', 
                      borderRadius: '20px', 
                      fontSize: '0.65rem', 
                      fontWeight: 700, 
                      background: 'rgba(79,195,247,0.1)', 
                      color: '#4fc3f7' 
                    }}>{order.status.toUpperCase()}</span>
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '4px' }}>{order.service_name}</h3>
                  <p style={{ fontSize: '0.9rem', color: 'rgba(238,242,255,0.6)' }}>{order.customer_name} • {order.address}</p>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '12px' }}>
                    <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                      📅 <strong>{order.pickup_date}</strong> at <strong>{order.pickup_time}</strong>
                    </div>
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`}
                      target="_blank" rel="noopener noreferrer" className="glass"
                      style={{ padding: '4px 12px', borderRadius: '8px', fontSize: '0.75rem', color: '#f5c842', textDecoration: 'none', border: '1px solid rgba(245,200,66,0.3)' }}
                    >
                      📍 View on Map
                    </a>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '300px' }}>
                  {workerStatuses.map(status => (
                    order.status !== status.value && (
                      <button 
                        key={status.value}
                        onClick={() => handleUpdateStatus(order.id, status.value)}
                        className="btn-ghost"
                        style={{ fontSize: '0.75rem', padding: '8px 16px', borderRadius: '10px', border: `1px solid ${status.color}40`, color: status.color }}
                      >
                        {status.label}
                      </button>
                    )
                  ))}
                </div>
              </div>

              {/* Quality Photos Section */}
              <div className="glass" style={{ 
                padding: '20px 24px', 
                borderRadius: '0 0 24px 24px', 
                background: 'rgba(255,255,255,0.02)',
                borderTop: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(238,242,255,0.3)', textTransform: 'uppercase', marginBottom: '14px' }}>
                  📸 Quality Check Photos
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <PhotoUpload
                    label="Before Processing"
                    currentUrl={order.before_photo_url}
                    onUpload={(url) => url ? handleSavePhoto(order.id, 'before', url) : null}
                  />
                  <PhotoUpload
                    label="After Processing"
                    currentUrl={order.after_photo_url}
                    onUpload={(url) => url ? handleSavePhoto(order.id, 'after', url) : null}
                  />
                </div>
              </div>
            </div>
          ))}
          {orders.length === 0 && (
            <div className="glass" style={{ padding: '80px', textAlign: 'center', borderRadius: '24px', opacity: 0.5 }}>
              <h3>No active tasks assigned.</h3>
              <p>Check back later for new pick-ups.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
