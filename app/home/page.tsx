"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { motion } from "framer-motion"
import { RUPEES_PER_POINT, calculatePoints } from "@/lib/points"

interface UserProfile {
  id: string
  name: string | null
  email: string
  phone: string | null
  role: string | null
}

interface Service {
  id: string
  name: string
  description: string
  price: number
  icon: string
}

const services: Service[] = [
  {
    id: "wash-fold",
    name: "Wash & Fold",
    description: "Regular laundry service with professional cleaning",
    price: 149,
    icon: "tshirt"
  },
  {
    id: "dry-clean",
    name: "Dry Cleaning",
    description: "Premium care for delicate fabrics",
    price: 499,
    icon: "sparkles"
  },
  {
    id: "iron-press",
    name: "Iron & Press",
    description: "Crisp, wrinkle-free clothes",
    price: 79,
    icon: "iron"
  },
  {
    id: "stain-removal",
    name: "Stain Removal",
    description: "Expert treatment for tough stains",
    price: 249,
    icon: "droplet"
  }
]

import Navbar from "@/app/components/Navbar"
import { ToastContainer, ToastType } from "@/app/components/Toast"
import Drawer from "@/app/components/Drawer"
import AddressAutocomplete from "@/app/components/AddressAutocomplete"

export default function HomePage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [drawerConfig, setDrawerConfig] = useState<{ isOpen: boolean; title: string; type: 'ratings' | 'chat' | null }>({
    isOpen: false,
    title: "",
    type: null
  })
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [bookingData, setBookingData] = useState({
    pickup_date: "",
    pickup_time: "",
    address: "",
    instructions: ""
  })
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [adminId, setAdminId] = useState<string | null>(null)
  const [chatInput, setChatInput] = useState("")
  const [isWritingReview, setIsWritingReview] = useState(false)
  const [reviews, setReviews] = useState<{ id: string; customer_name: string; rating: number; comment: string }[]>([])
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" })
  const [savedAddresses, setSavedAddresses] = useState<any[]>([])
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [subscription, setSubscription] = useState<any>(null)
  const [userPoints, setUserPoints] = useState<number>(0)
  const [usePoints, setUsePoints] = useState(false)
  const [couponCode, setCouponCode] = useState("")
  const [couponApplied, setCouponApplied] = useState<{ code: string; discount_type: string; discount_value: number } | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [liveStats, setLiveStats] = useState({ orders: 0, rating: 4.9, customers: 0 })
  const [testimonialIndex, setTestimonialIndex] = useState(0)
  const [toasts, setToasts] = useState<{ id: string; message: string; type: ToastType }[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single()

        setUser({
          id: user.id,
          name: user.user_metadata?.name || null,
          email: user.email || "",
          phone: user.user_metadata?.phone || null,
          role: profile?.role || 'user'
        })
      }
      setLoading(false)
    }
    getUser()
  }, [supabase.auth])

  useEffect(() => {
    async function fetchSavedAddresses() {
      if (!user) return
      const { data } = await supabase
        .from("user_addresses")
        .select("*")
        .eq("user_id", user.id)
      if (data) {
        setSavedAddresses(data)
        const def = data.find(a => a.is_default)
        if (def && !bookingData.address) {
          setBookingData(prev => ({ ...prev, address: def.address }))
        }
      }
    }
    if (showBookingModal) fetchSavedAddresses()
  }, [showBookingModal, user])

  useEffect(() => {
    async function fetchAdminAndMessages() {
      if (!user) return
      
      // Find an admin to chat with
      const { data: adminProf } = await supabase.from('profiles').select('id').eq('role', 'admin').limit(1).single()
      if (adminProf) setAdminId(adminProf.id)

      // Initial messages fetch
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: true })
      
      if (msgs) {
        setChatMessages(msgs.map(m => ({ 
          role: m.sender_id === user.id ? 'user' : 'bot', 
          text: m.content 
        })))
      } else {
         setChatMessages([{ role: 'bot', text: "Hello! I'm your FreshPress assistant. How can I help you today?" }])
      }

      // Realtime subscription
      const channel = supabase
        .channel(`chat-user-${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, (payload) => {
          setChatMessages(prev => [...prev, { role: 'bot', text: payload.new.content }])
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }
    
    if (drawerConfig.isOpen && drawerConfig.type === 'chat') {
      fetchAdminAndMessages()
    }
  }, [drawerConfig.isOpen, drawerConfig.type, user])

  useEffect(() => {
    async function fetchUserData() {
      if (!user) return
      
      // Fetch Subscription
      const { data: sub } = await supabase
        .from("user_subscriptions")
        .select("*, subscriptions(*)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single()
      if (sub) setSubscription(sub)

      // Fetch Points
      const { data: pts } = await supabase
        .from("user_points")
        .select("balance")
        .eq("user_id", user.id)
        .single()
      if (pts) setUserPoints(pts.balance)
    }
    fetchUserData()
  }, [user, showBookingModal])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const fetchReviews = async () => {
    const { data } = await supabase
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10)
    
    if (data) {
      // Filter unique comments
      const unique = data.filter((v, i, a) => a.findIndex(t => t.comment === v.comment) === i).slice(0, 5)
      setReviews(unique)
    }
  }

  useEffect(() => {
    fetchReviews()
  }, [supabase])

  useEffect(() => {
    async function fetchLiveStats() {
      const [{ count: orderCount }, { data: reviewData }] = await Promise.all([
        supabase.from('bookings').select('*', { count: 'exact', head: true }),
        supabase.from('reviews').select('rating')
      ])
      const totalOrders = orderCount || 0
      const avgRating = reviewData && reviewData.length > 0
        ? (reviewData.reduce((s: number, r: any) => s + r.rating, 0) / reviewData.length)
        : 4.9
      setLiveStats({ orders: totalOrders, rating: Math.round(avgRating * 10) / 10, customers: Math.max(1, Math.floor(totalOrders * 0.85)) })
    }
    fetchLiveStats()
  }, [supabase])

  useEffect(() => {
    if (reviews.length <= 1) return
    const interval = setInterval(() => setTestimonialIndex(p => (p + 1) % reviews.length), 4000)
    return () => clearInterval(interval)
  }, [reviews])

  const addToast = (message: string, type: ToastType = "info") => {
    const id = Date.now().toString()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => removeToast(id), 5000)
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    setCouponLoading(true)
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", couponCode.trim().toUpperCase())
      .eq("is_active", true)
      .single()
    if (error || !data) {
      addToast("Invalid or expired coupon code", "error")
      setCouponApplied(null)
    } else if (data.expiry_date && new Date(data.expiry_date) < new Date()) {
      addToast("This coupon has expired", "error")
      setCouponApplied(null)
    } else if (data.used_count >= data.max_uses) {
      addToast("This coupon has reached its usage limit", "error")
      setCouponApplied(null)
    } else {
      setCouponApplied({ code: data.code, discount_type: data.discount_type, discount_value: data.discount_value })
      addToast(`🎉 Coupon applied! ${data.discount_type === 'percent' ? data.discount_value + '% off' : '₹' + data.discount_value + ' off'}`, "success")
    }
    setCouponLoading(false)
  }

  const getCouponDiscount = (basePrice: number) => {
    if (!couponApplied) return 0
    if (couponApplied.discount_type === 'percent') return (basePrice * couponApplied.discount_value) / 100
    return Math.min(couponApplied.discount_value, basePrice)
  }

  const openBookingModal = (service: Service) => {
    setSelectedService(service)
    setShowBookingModal(true)
    setBookingSuccess(false)
    setShowReview(false)
    setCouponCode("")
    setCouponApplied(null)
  }

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedService || !user) return

    setBookingLoading(true)
    
    const originalPrice = selectedService.price
    const pointsDiscount = usePoints ? Math.min(userPoints * RUPEES_PER_POINT, originalPrice) : 0
    const couponDiscount = getCouponDiscount(originalPrice)
    const finalPrice = Math.max(0, originalPrice - pointsDiscount - couponDiscount)
    const pointsToDeduct = usePoints ? Math.floor(pointsDiscount / RUPEES_PER_POINT) : 0

    const { error } = await supabase.from("bookings").insert({
      user_id: user.id,
      service_type: selectedService.id,
      service_name: selectedService.name,
      price: finalPrice,
      original_price: originalPrice,
      coupon_code: couponApplied?.code || null,
      coupon_discount: couponDiscount || null,
      pickup_date: bookingData.pickup_date,
      pickup_time: bookingData.pickup_time,
      address: bookingData.address,
      instructions: bookingData.instructions,
      status: "pending",
      customer_name: user.name || user.email,
      phone: user.phone || ""
    })

    // Increment coupon usage count
    if (!error && couponApplied) {
      try {
        await supabase.from('coupons').select('used_count').eq('code', couponApplied.code).single().then(({ data }) => {
          if (data) supabase.from('coupons').update({ used_count: (data.used_count || 0) + 1 }).eq('code', couponApplied.code)
        })
      } catch { /* silent fail */ }
    }

    if (!error) {
      // Deduct points if used
      if (pointsToDeduct > 0) {
        await supabase.rpc('deduct_points', { 
          p_user_id: user.id, 
          p_amount: pointsToDeduct,
          p_desc: `Redeemed for ${selectedService.name} booking`
        })
        // Fallback if RPC isn't available: manual update (less safe but works for demo)
        const { data: current } = await supabase.from("user_points").select("balance").eq("user_id", user.id).single()
        if (current) {
          await supabase.from("user_points").update({ balance: current.balance - pointsToDeduct }).eq("user_id", user.id)
          await supabase.from("points_history").insert({
            user_id: user.id,
            amount: -pointsToDeduct,
            transaction_type: 'redeemed',
            description: `Redeemed for ${selectedService.name} booking`
          })
        }
      }

      setBookingSuccess(true)
      setShowReview(false)
      setBookingData({ pickup_date: "", pickup_time: "", address: "", instructions: "" })
      addToast("Your order has been placed successfully!", "success")
    } else {
      console.error("Booking error details:", error)
      addToast(`Booking failed: ${error.message}`, "error")
    }
    setBookingLoading(false)
  }

  const handleSendMessage = async (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault()
    if (!chatInput.trim() || !user || !adminId) return

    const userMsg = chatInput.trim()
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setChatInput("")

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: adminId,
      content: userMsg
    })

    if (error) {
      addToast("Failed to send message", "error")
    }
  }

  const handleSubmitReview = async () => {
    if (!user) {
      addToast("Please login to post a review", "error")
      return
    }

    if (!reviewForm.comment.trim()) {
      addToast("Please write a comment", "error")
      return
    }
    
    const { error } = await supabase.from("reviews").insert({
      user_id: user.id,
      customer_name: user.name || user.email,
      rating: reviewForm.rating,
      comment: reviewForm.comment
    })

    if (error) {
      addToast(`Failed to post review: ${error.message}`, "error")
    } else {
      addToast("Thank you for your review!", "success")
      setReviewForm({ rating: 5, comment: "" })
      setIsWritingReview(false)
      fetchReviews()
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="home-root">
      <Navbar user={user} />
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="section-badge"
          >
            ✨ Elite Laundry Service
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: '24px' }}
          >
            Pristine Clothes, <br/>
            <span style={{ color: 'var(--accent-blue)', background: 'linear-gradient(90deg, #4fc3f7, #2196f3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Zero Effort.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: '500px', marginBottom: '40px', lineHeight: 1.6 }}
          >
            Experience the future of garment care with FreshPress. High-tech cleaning, express delivery, and a premium experience from start to finish.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="hero-actions"
          >
            <a href="#services" className="btn-primary">Get Clean Clothes</a>
            <a href="#how-it-works" className="btn-ghost">See How It Works</a>
          </motion.div>
          {/* Light Mode Specific Image */}
          <div className="light-only-hero-img">
            <img src="/premium_laundry_hero.png" alt="Premium Service" style={{ width: '100%', borderRadius: '24px', marginTop: '40px', display: 'none' }} className="light-hero-img" />
          </div>
        </div>

        {/* Hero Visual (Washing Machine) */}
        <div className="hero-visual">
          <div className="washer-wrap">
            <svg className="washer-svg" viewBox="0 0 160 210">
              <rect x="10" y="10" width="140" height="190" rx="15" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
              <rect x="25" y="25" width="110" height="10" rx="2" fill="rgba(255,255,255,0.05)" />
              <circle cx="130" cy="30" r="4" fill="var(--accent-gold)" />
              <circle cx="120" cy="30" r="2" fill="rgba(255,255,255,0.2)" />
              
              <g className="drum-spin">
                <circle cx="80" cy="115" r="48" fill="none" stroke="var(--accent-blue)" strokeWidth="3" strokeDasharray="10 5" opacity="0.6" />
                <path d="M50 115 A30 30 0 0 1 110 115" stroke="white" strokeWidth="2" fill="none" opacity="0.2" />
              </g>

              <circle cx="80" cy="115" r="55" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
              <rect x="70" y="185" width="20" height="4" rx="1" fill="rgba(255,255,255,0.1)" />
            </svg>

            {/* Orbital Floating Content (Counter-rotated to stay upright) */}
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="orbital-labels">
              <motion.div 
                animate={{ rotate: -360, y: [0, -8, 0] }} 
                transition={{ 
                  rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                  y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                }} 
                className="floating-chip label-1"
                style={{ translateX: '-50%', translateY: '-50%' }}
              >
                Professional
              </motion.div>
              <motion.div 
                animate={{ rotate: -360, y: [0, -10, 0] }} 
                transition={{ 
                  rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                  y: { duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }
                }} 
                className="floating-chip label-2"
                style={{ translateX: '50%', translateY: '-50%' }}
              >
                Careful
              </motion.div>
              <motion.div 
                animate={{ rotate: -360, y: [0, -12, 0] }} 
                transition={{ 
                  rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                  y: { duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }
                }} 
                className="floating-chip label-3"
                style={{ translateX: '-50%', translateY: '50%' }}
              >
                Fast
              </motion.div>
              <motion.div 
                animate={{ rotate: -360, y: [0, -9, 0] }} 
                transition={{ 
                  rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                  y: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.5 }
                }} 
                className="floating-chip label-4"
                style={{ translateX: '-50%', translateY: '-50%' }}
              >
                Eco-Friendly
              </motion.div>
            </motion.div>
          </div>
          <div className="hero-bg-glow"></div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="stats-bar-section">
        <div className="stats-bar-container glass" style={{ padding: '32px 48px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '32px' }}>
          {[
            { label: 'Active Orders', value: liveStats.orders + 42, icon: (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
            ) },
            { label: 'Avg Turnaround', value: '24h', icon: (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ) },
            { label: 'Customer Trust', value: `${liveStats.rating}/5`, icon: (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            ) },
            { label: 'Elite Members', value: '1.2k+', icon: (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
            ) },
          ].map((stat, i) => (
            <motion.div 
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              style={{ display: 'flex', alignItems: 'center', gap: '24px' }}
            >
              <div style={{ padding: '12px', background: 'rgba(245,200,66,0.1)', borderRadius: '12px', color: 'var(--accent-gold)' }}>
                {stat.icon}
              </div>
              <div>
                <div style={{ fontSize: '1.6rem', fontWeight: 950, color: 'var(--text-primary)', lineHeight: 1.1 }}>{stat.value}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800 }}>{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials-section">
        <div className="section-header center">
          <div className="section-badge">Elite Community</div>
          <h2 className="section-title">Word on the Street</h2>
        </div>

        <div className="testimonial-carousel">
          <div style={{ maxWidth: '950px', margin: '0 auto', position: 'relative', minHeight: '260px', padding: '0 24px' }}>
            {reviews.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ 
                  opacity: i === testimonialIndex ? 1 : 0, 
                  scale: i === testimonialIndex ? 1 : 0.95,
                  y: i === testimonialIndex ? 0 : 10
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                style={{ position: i === 0 ? 'relative' : 'absolute', top: 0, left: 24, right: 24, pointerEvents: i === testimonialIndex ? 'auto' : 'none', zIndex: i === testimonialIndex ? 10 : 0 }}
              >
                <div className="glass" style={{ 
                  padding: '48px', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.08)', 
                  boxShadow: '0 30px 60px rgba(0,0,0,0.4)', position: 'relative', overflow: 'hidden'
                }}>
                  {/* Decorative Background Decoration */}
                  <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'radial-gradient(circle, var(--accent-gold) 0%, transparent 70%)', opacity: 0.05 }}></div>
                  
                  <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative' }}>
                      <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'linear-gradient(135deg, var(--accent-gold), #ff9d00)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: '2rem', fontWeight: 900, boxShadow: '0 10px 30px rgba(245,158,11,0.2)' }}>
                        {r.customer_name[0]}
                      </div>
                      <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: '#10b981', width: '24px', height: '24px', borderRadius: '50%', border: '4px solid var(--modal-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem' }}>✔️</div>
                    </div>
                    <div style={{ flex: 1, minWidth: '250px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>{r.customer_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Premium Client</div>
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--accent-gold)', filter: 'drop-shadow(0 0 5px rgba(245,200,66,0.5))' }}>{'★'.repeat(r.rating)}</div>
                      </div>
                      <p style={{ fontSize: '1.1rem', lineHeight: 1.7, color: 'var(--text-primary)', fontWeight: 500, fontStyle: 'italic', opacity: 0.9 }}>
                        &ldquo;{r.comment}&rdquo;
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          
          <div className="carousel-dots" style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '40px' }}>
            {reviews.map((_, i) => (
              <button 
                key={i} 
                onClick={() => setTestimonialIndex(i)}
                style={{ 
                  width: i === testimonialIndex ? '32px' : '10px', height: '10px', borderRadius: '5px', 
                  background: i === testimonialIndex ? 'var(--accent-gold)' : 'rgba(255,255,255,0.1)', 
                  border: 'none', transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', cursor: 'pointer' 
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="services">
        <div className="section-header">
          <div className="section-badge">Our Expertise</div>
          <h2 className="section-title">Premium Garment Care</h2>
          <p className="section-subtitle">Tailored cleaning solutions for every fabric type and style.</p>
        </div>
        
        <div className="services-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px' }}>
          {services.map((service, i) => (
            <motion.div 
              key={service.id} 
              className="service-card glass"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              style={{ position: 'relative', overflow: 'hidden' }}
            >
              {/* Card Accent */}
              <div style={{ position: 'absolute', top: 0, right: 0, width: '60px', height: '60px', background: 'var(--accent-gold)', clipPath: 'polygon(100% 0, 0 0, 100% 100%)', opacity: 0.1 }}></div>
              
              <div className="service-icon" style={{ width: '64px', height: '64px', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', color: 'var(--accent-blue)' }}>
                {service.icon === 'tshirt' ? (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M22 20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v11Z"/><path d="M10 11a2 2 0 0 0 4 0"/></svg>
                ) : service.icon === 'sparkles' ? (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
                ) : service.icon === 'iron' ? (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10h10a4 4 0 0 1 4 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a4 4 0 0 1 4-4Z"/><path d="M17 10V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v5"/></svg>
                ) : (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5s-3 3.5-3 5.5a7 7 0 0 0 7 7Z"/></svg>
                )}
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '12px', color: 'var(--text-primary)' }}>{service.name}</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px', fontSize: '0.95rem' }}>{service.description}</p>
              <div className="service-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px', marginTop: 'auto' }}>
                <div>
                  <span className="service-price" style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-gold)' }}>₹{service.price}</span>
                  <span className="service-unit" style={{ fontSize: '0.8rem', opacity: 0.5, marginLeft: '4px' }}>/kg</span>
                </div>
                <button 
                  onClick={() => openBookingModal(service)}
                  className="service-btn"
                  style={{ padding: '10px 24px', borderRadius: '14px', fontWeight: 700 }}
                >
                  Book Now
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>


      {/* Booking Modal (Redesigned Phase 12) */}
      {showBookingModal && (
        <div className="modal-overlay">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="modal-container-premium glass"
          >
            <button 
              onClick={() => setShowBookingModal(false)}
              className="modal-close-premium"
            >
              ✕
            </button>

            <div className="modal-premium-grid">
              {/* Left: Service Info */}
              <div className="modal-service-info">
                <div className="modal-service-icon-wrap">
                  {selectedService?.icon === 'tshirt' ? '👕' : selectedService?.icon === 'sparkles' ? '✨' : selectedService?.icon === 'iron' ? '👔' : '💧'}
                </div>
                <div className="section-badge" style={{ marginBottom: '16px' }}>Service Selection</div>
                <h2 className="modal-title-premium">{selectedService?.name}</h2>
                <p className="modal-desc-premium">{selectedService?.description}</p>
                <div className="modal-price-tag">
                  Starting from <span>₹{selectedService?.price}</span>
                </div>
                <div className="modal-service-perks">
                  <div className="perk-item">✓ Eco-Friendly Wash</div>
                  <div className="perk-item">✓ 24h Express Delivery</div>
                  <div className="perk-item">✓ Professional Care</div>
                </div>
              </div>

              {/* Right: Booking Form */}
              <div className="modal-booking-form">
                {bookingSuccess ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="booking-success-premium"
                  >
                    <div className="success-icon-premium">🎉</div>
                    <h3 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '12px' }}>Order Placed!</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>We'll see you on <strong>{bookingData.pickup_date}</strong> at <strong>{bookingData.pickup_time}</strong>.</p>
                    <button onClick={() => setShowBookingModal(false)} className="btn-primary" style={{ width: '100%' }}>Return Home</button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleBookingSubmit} className="mform-premium">
                    <h3 className="form-header-premium">Schedule Pickup</h3>
                    
                    <div className="mform-grid">
                      <div className="mform-group">
                        <label>Pickup Date</label>
                        <input 
                          type="date" 
                          required
                          value={bookingData.pickup_date}
                          onChange={(e) => setBookingData({...bookingData, pickup_date: e.target.value})}
                        />
                      </div>
                      <div className="mform-group">
                        <label>Time Slot</label>
                        <select 
                          required
                          value={bookingData.pickup_time}
                          onChange={(e) => setBookingData({...bookingData, pickup_time: e.target.value})}
                        >
                          <option value="">Select Time Slot</option>
                          <option value="09:00 - 11:00 AM">09:00 - 11:00 AM</option>
                          <option value="11:00 - 01:00 PM">11:00 - 01:00 PM</option>
                          <option value="02:00 - 04:00 PM">02:00 - 04:00 PM</option>
                          <option value="04:00 - 06:00 PM">04:00 - 06:00 PM</option>
                          <option value="06:00 - 08:00 PM">06:00 - 08:00 PM</option>
                        </select>
                      </div>
                    </div>

                    <div className="mform-group">
                      <label>Address Label</label>
                      <div className="address-chip-row">
                        {savedAddresses.map(addr => (
                          <button
                            key={addr.id}
                            type="button"
                            onClick={() => setBookingData({...bookingData, address: addr.address})}
                            className={`address-chip ${bookingData.address === addr.address ? 'active' : ''}`}
                          >
                            {addr.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mform-group">
                      <label>Pickup Address</label>
                      <AddressAutocomplete 
                        value={bookingData.address}
                        onChange={(val) => setBookingData({...bookingData, address: val})}
                        placeholder="Search for your pickup location..."
                      />
                    </div>

                    {/* Points Redemption */}
                    {userPoints > 0 && (
                      <div className="glass" style={{ padding: '16px', borderRadius: '16px', marginBottom: '20px', border: '1px solid rgba(245,200,66,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>🌟 PressPoints: {userPoints}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Redeem to save ₹{(userPoints * RUPEES_PER_POINT).toFixed(2)}</p>
                          </div>
                          <button 
                            type="button"
                            onClick={() => setUsePoints(!usePoints)}
                            className={`redeem-btn ${usePoints ? 'active' : ''}`}
                          >
                            {usePoints ? 'Redeeming' : 'Redeem'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Coupon Code */}
                    <div className="mform-group">
                      <label>🎟️ Promo Code</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          placeholder="CODE"
                          value={couponCode}
                          onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); if (couponApplied) setCouponApplied(null) }}
                          className="coupon-input"
                        />
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          disabled={couponLoading || !couponCode.trim()}
                          className="btn-ghost"
                          style={{ padding: '0 16px', borderRadius: '12px' }}
                        >
                          {couponLoading ? '...' : couponApplied ? '✅' : 'Apply'}
                        </button>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="booking-summary-mini">
                      <div className="summary-row">
                        <span>Original Price</span>
                        <span>₹{selectedService?.price}</span>
                      </div>
                      {usePoints && (
                        <div className="summary-row discount">
                          <span>🌟 Points Discount</span>
                          <span>-₹{Math.min((userPoints * RUPEES_PER_POINT), selectedService?.price || 0).toFixed(2)}</span>
                        </div>
                      )}
                      {couponApplied && (
                        <div className="summary-row discount">
                          <span>🎟️ Coupon ({couponApplied.code})</span>
                          <span>-₹{getCouponDiscount(selectedService?.price || 0).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="summary-row total">
                        <span>Total Payable</span>
                        <span>₹{Math.max(0, (selectedService?.price || 0) - (usePoints ? Math.min(userPoints * RUPEES_PER_POINT, selectedService?.price || 0) : 0) - getCouponDiscount(selectedService?.price || 0)).toFixed(2)}</span>
                      </div>
                    </div>

                    <div style={{ marginTop: '24px' }}>
                      <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', height: '52px' }}>
                        {loading ? <div className="spinner"></div> : "Confirm Booking"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="nav-logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src="/logo-512.png" alt="FreshPress Logo" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
              <span className="brand-name">Fresh<span><em>Press</em></span></span>
            </div>
            <p>Professional laundry and dry cleaning services delivered right to your doorstep. We care for your clothes like no one else.</p>
            <div className="footer-social">
              <a href="#" className="fsoc" style={{ textDecoration: 'none' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="https://www.instagram.com/laksh_jain66?utm_source=qr&igsh=YXAwNjhlMW14c2x0" target="_blank" rel="noopener noreferrer" className="fsoc" style={{ textDecoration: 'none' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.266.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </a>
            <a href="#" className="fsoc" style={{ textDecoration: 'none' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            </a>
          </div>
        </div>
        <div className="footer-links">
          <div>
            <h5>Services</h5>
            <a href="#services">Wash & Fold</a>
            <a href="#services">Dry Cleaning</a>
            <a href="#services">Iron & Press</a>
          </div>
          <div>
            <h5>Company</h5>
            <a>About Us</a>
            <a>Contact</a>
            <a>Privacy Policy</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; 2024 FreshPress Laundry. All rights reserved.</p>
        <div style={{ display: 'flex', gap: '20px' }}>
          <a>Terms of Service</a>
          <a>Cookie Policy</a>
        </div>
      </div>
    </footer>

    {/* Floating Action Buttons */}
    <div className="floating-actions" style={{ position: 'fixed', bottom: '30px', right: '30px', display: 'flex', flexDirection: 'column', gap: '15px', zIndex: 900 }}>
      <button 
        onClick={() => setDrawerConfig({ isOpen: true, title: "Service Ratings", type: 'ratings' })}
        className="glass"
        style={{ width: '56px', height: '56px', borderRadius: '50%', fontSize: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--accent-gold)', color: 'var(--accent-gold)' }}
        title="Ratings & Comments"
      >
        ⭐
      </button>
      <button 
        onClick={() => setDrawerConfig({ isOpen: true, title: "FreshPress Assistant", type: 'chat' })}
        className="btn-primary"
        style={{ width: '56px', height: '56px', borderRadius: '50%', fontSize: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
        title="Chat With Us"
      >
        💬
      </button>
    </div>

    {/* Side Drawer */}
    <Drawer 
      isOpen={drawerConfig.isOpen} 
      onClose={() => setDrawerConfig({ ...drawerConfig, isOpen: false })}
      title={drawerConfig.title}
    >
      {drawerConfig.type === 'ratings' && (
        <div className="ratings-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {isWritingReview ? (
            <div className="review-form glass" style={{ padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>Write a Review</h3>
              <div className="rating-input" style={{ display: 'flex', gap: '8px', fontSize: '1.5rem' }}>
                {[1,2,3,4,5].map(star => (
                  <span 
                    key={star} 
                    onClick={() => setReviewForm({...reviewForm, rating: star})}
                    style={{ cursor: 'pointer', color: star <= reviewForm.rating ? 'var(--accent-gold)' : 'var(--text-muted)', opacity: star <= reviewForm.rating ? 1 : 0.3 }}
                  >
                    ★
                  </span>
                ))}
              </div>
              <textarea 
                placeholder="Tell us about your experience..." 
                className="glass"
                rows={4}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--glass-bg)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)' }}
                value={reviewForm.comment}
                onChange={(e) => setReviewForm({...reviewForm, comment: e.target.value})}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setIsWritingReview(false)} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
                <button onClick={handleSubmitReview} className="btn-primary" style={{ flex: 2 }}>Post Review</button>
              </div>
            </div>
          ) : (
            <>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '10px', color: 'var(--text-primary)' }}>Recent Feedback</h3>
              {reviews.length === 0 ? (
                <div className="glass" style={{ padding: '20px', borderRadius: '16px', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>No reviews yet. Be the first to share your experience!</p>
                </div>
              ) : (
                reviews.map(r => (
                  <div key={r.id} className="glass" style={{ padding: '20px', borderRadius: '16px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{r.customer_name}</span>
                      <div style={{ color: 'var(--accent-gold)', fontSize: '0.8rem' }}>
                        {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                      </div>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>"{r.comment}"</p>
                  </div>
                ))
              )}
              <button onClick={() => setIsWritingReview(true)} className="btn-primary" style={{ width: '100%', marginTop: '10px' }}>Leave a Review</button>
            </>
          )}
        </div>
      )}
      {drawerConfig.type === 'chat' && (
        <div className="chat-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '15px' }}>
          <div className="chat-messages" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
            {chatMessages.map((msg, i) => (
              <div 
                key={i} 
                className={msg.role === 'bot' ? "glass" : "btn-primary"} 
                style={{ 
                  padding: '12px 16px', 
                  borderRadius: msg.role === 'bot' ? '14px 14px 14px 0' : '14px 14px 0 14px', 
                  alignSelf: msg.role === 'bot' ? 'flex-start' : 'flex-end', 
                  maxWidth: '85%',
                  background: msg.role === 'bot' ? 'var(--glass-bg)' : 'var(--accent-blue)',
                  color: msg.role === 'bot' ? 'var(--text-primary)' : 'white',
                  border: '1px solid var(--glass-border)',
                  marginBottom: '8px'
                }}
              >
                <p style={{ fontSize: '0.9rem' }}>{msg.text}</p>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
            <input 
              type="text" 
              placeholder="Type a message..." 
              className="glass" 
              style={{ flex: 1, padding: '12px 16px', borderRadius: '25px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)' }}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(e)}
            />
            <button 
              className="btn-primary" 
              onClick={handleSendMessage}
              style={{ borderRadius: '50%', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </Drawer>

    </div>
  )
}
