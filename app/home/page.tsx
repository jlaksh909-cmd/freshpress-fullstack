"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion"
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
    price: 19,
    icon: "tshirt"
  },
  {
    id: "dry-clean",
    name: "Dry Cleaning",
    description: "Premium care for delicate fabrics",
    price: 99,
    icon: "sparkles"
  },
  {
    id: "iron-press",
    name: "Iron & Press",
    description: "Crisp, wrinkle-free clothes",
    price: 12,
    icon: "iron"
  },
  {
    id: "stain-removal",
    name: "Stain Removal",
    description: "Expert treatment for tough stains",
    price: 49,
    icon: "droplet"
  }
]

import Navbar from "@/app/components/Navbar"
import { ToastContainer, ToastType } from "@/app/components/Toast"
import Drawer from "@/app/components/Drawer"
import AddressAutocomplete from "@/app/components/AddressAutocomplete"
import PaymentGateway from "@/app/components/PaymentGateway"

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
  const [confirmedBooking, setConfirmedBooking] = useState<{ pickup_date: string; pickup_time: string } | null>(null)
  const [clothCounts, setClothCounts] = useState({ shirt: 0, tshirt: 0, pant: 0, saree: 0 })
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
  const [paymentMethod, setPaymentMethod] = useState("COD")
  const [showPaymentGateway, setShowPaymentGateway] = useState(false)
  const [pendingBooking, setPendingBooking] = useState<any>(null)
  const router = useRouter()

  // Interactive Parallax
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springConfig = { damping: 25, stiffness: 150 }
  const springX = useSpring(mouseX, springConfig)
  const springY = useSpring(mouseY, springConfig)
  
  const move1X = useTransform(springX, [-0.5, 0.5], [-20, 20])
  const move1Y = useTransform(springY, [-0.5, 0.5], [-20, 20])
  const move2X = useTransform(springX, [-0.5, 0.5], [40, -40])
  const move2Y = useTransform(springY, [-0.5, 0.5], [40, -40])
  const move3X = useTransform(springX, [-0.5, 0.5], [-60, 60])
  const move3Y = useTransform(springY, [-0.5, 0.5], [-60, 60])

  const handleHeroMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    mouseX.set(x)
    mouseY.set(y)
  }

  const supabase = createClient()

  useEffect(() => {
    async function getUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single()

        setUser({
          id: authUser.id,
          name: profile?.full_name || authUser.user_metadata?.full_name || null,
          email: authUser.email || "",
          phone: profile?.phone || authUser.user_metadata?.phone || "",
          role: profile?.role || 'user'
        })
      }
      setLoading(false)
    }
    getUser()
  }, [])

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
      if (!user) return
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
    setClothCounts({ shirt: 0, tshirt: 0, pant: 0, saree: 0 })
  }

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    let activeUser = user;
    if (!activeUser) {
      // Emergency fallback check in case state was lost
      const { data: { user: fetchUser } } = await supabase.auth.getUser()
      if (fetchUser) {
        activeUser = {
          id: fetchUser.id,
          name: fetchUser.user_metadata?.full_name || null,
          email: fetchUser.email || "",
          phone: fetchUser.user_metadata?.phone || "",
          role: "user"
        }
        setUser(activeUser)
      } else {
        addToast("Please login to place a booking", "error")
        router.push("/login")
        return
      }
    }

    if (!selectedService) {
      addToast("Please select a service first", "error")
      return
    }

    setBookingLoading(true)
    
    const totalCloths = clothCounts.shirt + clothCounts.tshirt + clothCounts.pant + clothCounts.saree
    const originalPrice = selectedService.price * Math.max(1, totalCloths)
    const pointsDiscount = usePoints ? Math.min(userPoints * RUPEES_PER_POINT, originalPrice) : 0
    const couponDiscount = getCouponDiscount(originalPrice)
    const finalPrice = Math.max(0, originalPrice - pointsDiscount - couponDiscount)
    const pointsToDeduct = usePoints ? Math.floor(pointsDiscount / RUPEES_PER_POINT) : 0
    const clothDetails = `Shirt: ${clothCounts.shirt}, T-Shirt: ${clothCounts.tshirt}, Pant: ${clothCounts.pant}, Saree: ${clothCounts.saree}`

    const bookingPayload = {
      user_id: activeUser.id,
      service_type: selectedService.id,
      service_name: selectedService.name,
      price: finalPrice,
      original_price: originalPrice,
      coupon_code: couponApplied?.code || null,
      coupon_discount: couponDiscount || null,
      pickup_date: bookingData.pickup_date,
      pickup_time: bookingData.pickup_time,
      address: bookingData.address,
      instructions: bookingData.instructions ? `${clothDetails} | ${bookingData.instructions}` : clothDetails,
      status: "pending",
      customer_name: activeUser.name || activeUser.email,
      phone: activeUser.phone || "",
      payment_method: paymentMethod,
      payment_status: paymentMethod === "COD" ? "pending" : "paid"
    }

    if (paymentMethod !== "COD") {
      setPendingBooking({ payload: bookingPayload, pointsToDeduct, total: finalPrice })
      setShowPaymentGateway(true)
      setBookingLoading(false)
      return
    }

    await completeBooking(bookingPayload, pointsToDeduct, activeUser)
  }

  const completeBooking = async (payload: any, pointsToDeduct: number, passedUser?: UserProfile) => {
    const bookingUser = passedUser || user;
    setBookingLoading(true)
    const { error } = await supabase.from("bookings").insert(payload)

    // Increment coupon usage count
    if (!error && couponApplied) {
      try {
        await supabase.from('coupons').select('used_count').eq('code', couponApplied.code).single().then(({ data }) => {
          if (data) supabase.from('coupons').update({ used_count: (data.used_count || 0) + 1 }).eq('code', couponApplied.code)
        })
      } catch { /* silent fail */ }
    }

    if (!error && bookingUser && selectedService) {
      // Deduct points if used
      if (pointsToDeduct > 0) {
        await supabase.rpc('deduct_points', { 
          p_user_id: bookingUser.id, 
          p_amount: pointsToDeduct,
          p_desc: `Redeemed for ${selectedService.name} booking`
        })
        // Fallback if RPC isn't available: manual update (less safe but works for demo)
        const { data: current } = await supabase.from("user_points").select("balance").eq("user_id", bookingUser.id).single()
        if (current) {
          await supabase.from("user_points").update({ balance: current.balance - pointsToDeduct }).eq("user_id", bookingUser.id)
          await supabase.from("points_history").insert({
            user_id: bookingUser.id,
            amount: -pointsToDeduct,
            transaction_type: 'redeemed',
            description: `Redeemed for ${selectedService.name} booking`
          })
        }
      }

      setConfirmedBooking({ pickup_date: bookingData.pickup_date, pickup_time: bookingData.pickup_time })
      setBookingSuccess(true)
      setShowReview(false)
      setBookingData({ pickup_date: "", pickup_time: "", address: "", instructions: "" })
      addToast("Your order has been placed successfully!", "success")
    } else {
      console.error("Booking Error Object:", error)
      addToast(`Booking failed: ${error?.message || 'Unknown database error'}. Check console for details.`, "error")
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
      addToast(`Failed to post review: ${error?.message}`, "error")
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

      {/* Hero Section (Neo-Dark Design) */}
      <section 
        className="hero" 
        onMouseMove={handleHeroMouseMove}
        onMouseLeave={() => { mouseX.set(0); mouseY.set(0); }}
        style={{ 
        position: 'relative', 
        paddingTop: '80px', 
        paddingBottom: '120px', 
        overflow: 'hidden',
        background: 'radial-gradient(circle at 70% 50%, rgba(33,150,243,0.15) 0%, transparent 60%), radial-gradient(circle at 30% 80%, rgba(245,200,66,0.05) 0%, transparent 50%)' 
      }}>
        <div className="hero-content-neo" style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', position: 'relative', zIndex: 10, flexWrap: 'wrap', gap: '40px' }}>
          
          {/* Left Text & CTA */}
          <div style={{ flex: '1 1 500px', maxWidth: '600px', zIndex: 2 }}>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              style={{ fontSize: 'clamp(3rem, 5vw, 4.5rem)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.05, marginBottom: '24px', color: 'var(--text-primary)' }}
            >
              Pristine Clothes.<br/>Zero Effort.<br/>
              <span style={{ color: 'var(--accent-blue)', background: 'linear-gradient(90deg, #4fc3f7, #2196f3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Guaranteed.</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '40px', lineHeight: 1.6, maxWidth: '480px' }}
            >
              Experience the future of garment care. High-tech cleaning, precise tracking, and a premium experience right at your doorstep. You won't go back.
            </motion.p>
            
            {/* Inline Input CTA */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              style={{ display: 'flex', alignItems: 'center', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '8px', maxWidth: '480px', backdropFilter: 'blur(10px)' }}
            >
              <div style={{ padding: '0 16px', color: 'var(--text-secondary)', fontSize: '1.2rem' }}>📍</div>
              <input 
                type="text" 
                placeholder="Enter your pickup address..." 
                value={bookingData.address}
                onChange={(e) => setBookingData({...bookingData, address: e.target.value})}
                style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '1rem' }}
              />
              <motion.a 
                href="#services" 
                whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(245,200,66,0.6)' }}
                whileTap={{ scale: 0.95 }}
                style={{ background: 'linear-gradient(135deg, var(--accent-gold), #ff9d00)', color: '#07071a', padding: '12px 24px', borderRadius: '12px', fontWeight: 900, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 0 20px rgba(245,200,66,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}
              >
                Book Now <span style={{ fontSize: '1.2rem', fontWeight: 900 }}>›</span>
              </motion.a>
            </motion.div>
          </div>

          {/* Right Abstract Art (Simulating the 3D Pipe graphic) */}
          <div className="hero-visual-neo" style={{ flex: '1 1 400px', position: 'relative', minHeight: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div 
              animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
              style={{ position: 'absolute', width: '450px', height: '450px', border: '2px solid rgba(33,150,243,0.15)', borderRadius: '50%', borderStyle: 'dashed' }}
            />
            <motion.div 
              animate={{ rotate: -360 }} transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
              style={{ position: 'absolute', width: '350px', height: '350px', border: '1px solid rgba(245,200,66,0.15)', borderRadius: '50%' }}
            />
            {/* Tubing Elements with Parallax Wrappers */}
            <motion.div style={{ x: move1X, y: move1Y, position: 'absolute', zIndex: 11 }}>
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} style={{ width: '280px', height: '140px', background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', borderRadius: '70px', transform: 'rotate(15deg) translate(-20px, -40px)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: 'inset 10px 10px 30px rgba(255,255,255,0.3), 0 20px 50px rgba(0,0,0,0.5)' }} />
            </motion.div>
            
            <motion.div style={{ x: move2X, y: move2Y, position: 'absolute', zIndex: 12 }}>
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }} style={{ width: '160px', height: '160px', background: 'linear-gradient(135deg, #ef4444, #f59e0b)', borderRadius: '50%', transform: 'translate(100px, -90px)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: 'inset -5px -5px 20px rgba(0,0,0,0.3), inset 10px 10px 30px rgba(255,255,255,0.4), 0 15px 40px rgba(239,68,68,0.4)' }} />
            </motion.div>
            
            <motion.div style={{ x: move3X, y: move3Y, position: 'absolute', zIndex: 13 }}>
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }} style={{ width: '220px', height: '90px', background: 'linear-gradient(90deg, #ec4899, #8b5cf6)', borderRadius: '45px', transform: 'translate(-80px, 140px) rotate(-25deg)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: 'inset 5px 5px 20px rgba(255,255,255,0.4), 0 15px 30px rgba(236,72,153,0.4)' }} />
            </motion.div>
            
            <motion.div style={{ x: move1X, y: move2Y, position: 'absolute', zIndex: 14 }}>
              <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #4fc3f7, #0284c7)', borderRadius: '50%', transform: 'translate(140px, 130px)', border: '2px solid rgba(255,255,255,0.6)', boxShadow: '0 0 40px rgba(79,195,247,0.6), inset 5px 5px 15px rgba(255,255,255,0.5)' }} />
            </motion.div>
            
            <motion.div style={{ x: move3X, y: move1Y, position: 'absolute', zIndex: 15 }}>
              <motion.div animate={{ y: [0, 15, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }} style={{ width: '40px', height: '40px', background: '#f8fafc', borderRadius: '50%', transform: 'translate(-160px, -100px)', boxShadow: '0 0 20px rgba(255,255,255,0.4)' }} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Bar / Social Proof (overlapping the hero bottom) */}
      <section className="stats-bar-section" style={{ position: 'relative', zIndex: 20, marginTop: '-60px' }}>
        <div className="stats-bar-container glass" style={{ maxWidth: '1100px', margin: '0 auto', background: 'var(--card-bg)', padding: '24px 32px', borderRadius: '24px', display: 'flex', flexWrap: 'wrap', gap: '32px', alignItems: 'center', border: '1px solid var(--glass-border)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)' }}>
          {/* Left: "Incredible" profile */}
          <div style={{ flex: '1 1 200px', minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '2rem', fontWeight: 900, margin: 0, color: 'var(--text-primary)', letterSpacing: '-1px' }}>"Incredible"</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f5c842', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>👤</div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Sarah J.</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Elite Member</div>
              </div>
            </div>
          </div>
          
          {/* Right: The Stats acting like partner logos */}
          <div style={{ flex: '3 1 500px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {[
              { label: 'Active Orders', value: liveStats.orders + 42 },
              { label: 'Avg Turnaround', value: '24h' },
              { label: 'Customer Trust', value: `${liveStats.rating}/5` },
              { label: 'Elite Members', value: '1.2k+' },
            ].map((stat, i) => (
              <motion.div 
                key={stat.label} 
                whileHover={{ y: -5, background: 'var(--glass-bg)', borderColor: 'var(--accent-gold)', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}
                transition={{ duration: 0.2 }}
                style={{ flex: 1, minWidth: '120px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '16px 12px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }} 
              >
                 <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)' }}>{stat.value}</div>
                 <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' }}>{stat.label}</div>
              </motion.div>
            ))}
          </div>
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
        
        {!showBookingModal ? (
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
                  <span className="service-unit" style={{ fontSize: '0.8rem', opacity: 0.5, marginLeft: '4px' }}>/cloth</span>
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
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="inline-booking-container glass"
            style={{ 
              borderRadius: '24px', 
              position: 'relative', 
              border: '1px solid var(--glass-border)', 
              overflow: 'hidden', 
              padding: '0', 
              width: '100%',
              maxWidth: '650px', 
              margin: '0 auto', 
              background: 'var(--card-bg)',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <button 
              onClick={() => setShowBookingModal(false)}
              className="btn-ghost"
              style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10, padding: '8px 16px', borderRadius: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--modal-bg)', border: '1px solid var(--glass-border)' }}
            >
              ← Back
            </button>

            <div className="modal-premium-grid">
              {/* Left: Service Info */}
              <div className="modal-service-info">
                <div className="modal-service-icon-wrap">
                  {selectedService?.icon === 'tshirt' ? '👕' : selectedService?.icon === 'sparkles' ? '✨' : selectedService?.icon === 'iron' ? '👔' : '💧'}
                </div>
                <div>
                  <div className="section-badge" style={{ marginBottom: '8px', fontSize: '0.7rem' }}>Service Selection</div>
                  <h2 className="modal-title-premium">{selectedService?.name}</h2>
                  <p className="modal-desc-premium">{selectedService?.description}</p>
                </div>
                <div className="modal-price-tag">
                  <span>₹{selectedService?.price}</span><small>/cloth</small>
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
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>We'll see you on <strong>{confirmedBooking?.pickup_date}</strong> at <strong>{confirmedBooking?.pickup_time}</strong>.</p>
                    <button onClick={() => setShowBookingModal(false)} className="btn-primary" style={{ width: '100%' }}>Return Home</button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleBookingSubmit} className="mform-premium">
                    <h3 className="form-header-premium">Schedule Pickup</h3>

                    {/* Cloth Count Section */}
                    <div className="mform-group">
                      <label>🧺 Select Clothes</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                        {([['shirt', '👔 Shirt'], ['tshirt', '👕 T-Shirt'], ['pant', '👖 Pant'], ['saree', '🥻 Saree']] as const).map(([key, label]) => (
                          <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '10px 14px', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{label}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <button
                                type="button"
                                onClick={() => setClothCounts(prev => ({ ...prev, [key]: Math.max(0, prev[key] - 1) }))}
                                style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >−</button>
                              <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: 700, fontSize: '1rem' }}>{clothCounts[key]}</span>
                              <button
                                type="button"
                                onClick={() => setClothCounts(prev => ({ ...prev, [key]: prev[key] + 1 }))}
                                style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid rgba(79,195,247,0.3)', background: 'rgba(79,195,247,0.1)', color: 'var(--accent-blue)', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >+</button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {(clothCounts.shirt + clothCounts.tshirt + clothCounts.pant + clothCounts.saree) === 0 && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>Add at least 1 item — price will auto-calculate</p>
                      )}
                    </div>

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
                        required={true}
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

                    {/* Payment Method */}
                    <div className="mform-group">
                      <label>💳 Payment Method</label>
                      <div className="payment-options-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px', marginTop: '10px' }}>
                        {[
                          { id: 'COD', label: 'Cash / COD', icon: '💵' },
                          { id: 'UPI', label: 'UPI / QR', icon: '📱' },
                          { id: 'Card', label: 'Card Payment', icon: '💳' },
                          { id: 'Online', label: 'Net Banking', icon: '🌐' },
                          { id: 'Wallet', label: 'Wallet', icon: '👛' }
                        ].map(method => (
                          <button
                            key={method.id}
                            type="button"
                            onClick={() => setPaymentMethod(method.id)}
                            className={`payment-chip ${paymentMethod === method.id ? 'active' : ''}`}
                            style={{
                              padding: '12px 10px',
                              borderRadius: '12px',
                              border: paymentMethod === method.id ? '2px solid var(--accent-gold)' : '1px solid var(--glass-border)',
                              background: paymentMethod === method.id ? 'rgba(245,200,66,0.1)' : 'rgba(255,255,255,0.03)',
                              color: paymentMethod === method.id ? 'var(--accent-gold)' : 'var(--text-secondary)',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.2s',
                              fontSize: '0.8rem',
                              fontWeight: 600
                            }}
                          >
                            <span style={{ fontSize: '1.2rem' }}>{method.icon}</span>
                            {method.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {(() => {
                      const totalCloths = clothCounts.shirt + clothCounts.tshirt + clothCounts.pant + clothCounts.saree
                      const basePrice = (selectedService?.price || 0) * Math.max(1, totalCloths)
                      const ptDiscount = usePoints ? Math.min(userPoints * RUPEES_PER_POINT, basePrice) : 0
                      const cpDiscount = getCouponDiscount(basePrice)
                      const total = Math.max(0, basePrice - ptDiscount - cpDiscount)
                      return (
                        <div className="booking-summary-mini">
                          <div className="summary-row">
                            <span>Items ({Math.max(1, totalCloths)} cloth{Math.max(1, totalCloths) > 1 ? 's' : ''} × ₹{selectedService?.price})</span>
                            <span>₹{basePrice.toFixed(2)}</span>
                          </div>
                          {usePoints && (
                            <div className="summary-row discount">
                              <span>🌟 Points Discount</span>
                              <span>-₹{ptDiscount.toFixed(2)}</span>
                            </div>
                          )}
                          {couponApplied && (
                            <div className="summary-row discount">
                              <span>🎟️ Coupon ({couponApplied.code})</span>
                              <span>-₹{cpDiscount.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="summary-row total">
                            <span>Total Payable</span>
                            <span>₹{total.toFixed(2)}</span>
                          </div>
                        </div>
                      )
                    })()}

                    <div style={{ marginTop: '24px' }}>
                      <button type="submit" className="btn-primary" disabled={bookingLoading} style={{ width: '100%', height: '52px' }}>
                        {bookingLoading ? <div className="spinner"></div> : "Confirm Booking"}
                      </button>
                    </div>
                  </form>
                 )}
              </div>
            </div>
          </motion.div>
        )}
        
        {showPaymentGateway && pendingBooking && (
          <PaymentGateway 
            amount={pendingBooking.total}
            method={paymentMethod}
            onSuccess={() => {
              setShowPaymentGateway(false)
              completeBooking(pendingBooking.payload, pendingBooking.pointsToDeduct)
              setPendingBooking(null)
            }}
            onCancel={() => {
              setShowPaymentGateway(false)
              setPendingBooking(null)
              addToast("Payment cancelled", "info")
            }}
          />
        )}
      </section>

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
