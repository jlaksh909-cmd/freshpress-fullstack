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
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled"
  created_at: string
}

interface UserProfile {
  id: string
  name: string | null
  email: string
}

const statusConfig = {
  pending: { label: "Pending", color: "#f59e0b", bg: "#fef3c7" },
  confirmed: { label: "Confirmed", color: "#3b82f6", bg: "#dbeafe" },
  in_progress: { label: "In Progress", color: "#8b5cf6", bg: "#ede9fe" },
  completed: { label: "Completed", color: "#10b981", bg: "#d1fae5" },
  cancelled: { label: "Cancelled", color: "#ef4444", bg: "#fee2e2" }
}

export default function OrdersPage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")
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
        setUser({
          id: user.id,
          name: user.user_metadata?.name || null,
          email: user.email || ""
        })
        await fetchBookings(user.id)
      }
      setLoading(false)
    }
    getUser()
  }, [supabase.auth, fetchBookings])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return

    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId)

    if (error) {
      console.error("Error cancelling booking:", error)
      alert("Failed to cancel booking")
    } else {
      if (user) {
        fetchBookings(user.id)
      }
    }
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
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Loading orders...</p>
      </div>
    )
  }

  return (
    <div className="orders-page">
      {/* Navigation */}
      <nav className="main-nav">
        <div className="nav-container">
          <div className="logo-container">
            <svg viewBox="0 0 40 40" className="logo-icon">
              <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 20 Q20 10 28 20 Q20 30 12 20" fill="currentColor"/>
            </svg>
            <span className="brand-name">FreshPress</span>
          </div>
          
          <div className="nav-links">
            <Link href="/home" className="nav-link">Home</Link>
            <Link href="/orders" className="nav-link active">My Orders</Link>
          </div>
          
          <div className="nav-user">
            <span className="user-greeting">Hello, {user?.name?.split(" ")[0] || "User"}</span>
            <button onClick={handleLogout} className="logout-btn">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 4.414l-4.293 4.293a1 1 0 01-1.414-1.414L11.586 7H7a1 1 0 110-2h6a1 1 0 011 1v6a1 1 0 11-2 0V7.414z" clipRule="evenodd"/>
              </svg>
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Orders Content */}
      <main className="orders-content">
        <div className="orders-header">
          <div className="header-text">
            <h1>My Orders</h1>
            <p>Track and manage your laundry bookings</p>
          </div>
          <Link href="/home" className="new-order-btn">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
            </svg>
            New Booking
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All Orders
          </button>
          <button 
            className={`filter-tab ${filter === "pending" ? "active" : ""}`}
            onClick={() => setFilter("pending")}
          >
            Pending
          </button>
          <button 
            className={`filter-tab ${filter === "in_progress" ? "active" : ""}`}
            onClick={() => setFilter("in_progress")}
          >
            In Progress
          </button>
          <button 
            className={`filter-tab ${filter === "completed" ? "active" : ""}`}
            onClick={() => setFilter("completed")}
          >
            Completed
          </button>
        </div>

        {/* Orders List */}
        <div className="orders-list">
          {bookings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                </svg>
              </div>
              <h3>No orders yet</h3>
              <p>Book your first laundry service to see it here</p>
              <Link href="/home" className="book-now-btn">
                Book Now
              </Link>
            </div>
          ) : (
            bookings.map((booking) => {
              const status = statusConfig[booking.status]
              return (
                <div key={booking.id} className="order-card">
                  <div className="order-header">
                    <div className="order-service">
                      <h3>{booking.service_name}</h3>
                      <span 
                        className="order-status"
                        style={{ 
                          color: status.color, 
                          backgroundColor: status.bg 
                        }}
                      >
                        {status.label}
                      </span>
                    </div>
                    <div className="order-price">
                      ${booking.price.toFixed(2)}/lb
                    </div>
                  </div>
                  
                  <div className="order-details">
                    <div className="detail-item">
                      <svg viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                      </svg>
                      <span>{formatDate(booking.pickup_date)}</span>
                    </div>
                    <div className="detail-item">
                      <svg viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                      </svg>
                      <span>{formatTime(booking.pickup_time)}</span>
                    </div>
                    <div className="detail-item address">
                      <svg viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                      </svg>
                      <span>{booking.address}</span>
                    </div>
                  </div>
                  
                  {booking.instructions && (
                    <div className="order-instructions">
                      <strong>Instructions:</strong> {booking.instructions}
                    </div>
                  )}
                  
                  <div className="order-footer">
                    <span className="order-date">
                      Booked on {formatDate(booking.created_at)}
                    </span>
                    {(booking.status === "pending" || booking.status === "confirmed") && (
                      <button 
                        className="cancel-btn"
                        onClick={() => handleCancelBooking(booking.id)}
                      >
                        Cancel Order
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}
