"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

interface UserProfile {
  id: string
  name: string | null
  email: string
  phone: string | null
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
    price: 2.5,
    icon: "tshirt"
  },
  {
    id: "dry-clean",
    name: "Dry Cleaning",
    description: "Premium care for delicate fabrics",
    price: 8.0,
    icon: "sparkles"
  },
  {
    id: "iron-press",
    name: "Iron & Press",
    description: "Crisp, wrinkle-free clothes",
    price: 3.0,
    icon: "iron"
  },
  {
    id: "stain-removal",
    name: "Stain Removal",
    description: "Expert treatment for tough stains",
    price: 5.0,
    icon: "droplet"
  }
]

export default function HomePage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [bookingData, setBookingData] = useState({
    pickup_date: "",
    pickup_time: "",
    address: "",
    instructions: ""
  })
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser({
          id: user.id,
          name: user.user_metadata?.name || null,
          email: user.email || "",
          phone: user.user_metadata?.phone || null
        })
      }
      setLoading(false)
    }
    getUser()
  }, [supabase.auth])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const openBookingModal = (service: Service) => {
    setSelectedService(service)
    setShowBookingModal(true)
    setBookingSuccess(false)
  }

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedService || !user) return

    setBookingLoading(true)
    
    const { error } = await supabase.from("bookings").insert({
      user_id: user.id,
      service_type: selectedService.id,
      service_name: selectedService.name,
      price: selectedService.price,
      pickup_date: bookingData.pickup_date,
      pickup_time: bookingData.pickup_time,
      address: bookingData.address,
      instructions: bookingData.instructions,
      status: "pending"
    })

    setBookingLoading(false)

    if (error) {
      console.error("Booking error:", error)
      alert("Failed to create booking. Please try again.")
    } else {
      setBookingSuccess(true)
      setBookingData({ pickup_date: "", pickup_time: "", address: "", instructions: "" })
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
    <div className="home-page">
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
            <Link href="/home" className="nav-link active">Home</Link>
            <Link href="/orders" className="nav-link">My Orders</Link>
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

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Fresh Laundry,<br/><span>Delivered to You</span></h1>
          <p>Professional laundry service at your doorstep. Schedule a pickup and we&apos;ll handle the rest.</p>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-number">24h</span>
              <span className="stat-label">Fast Delivery</span>
            </div>
            <div className="stat">
              <span className="stat-number">100%</span>
              <span className="stat-label">Satisfaction</span>
            </div>
            <div className="stat">
              <span className="stat-number">5K+</span>
              <span className="stat-label">Happy Customers</span>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-card">
            <div className="floating-clothes">
              <div className="cloth-item shirt"></div>
              <div className="cloth-item pants"></div>
              <div className="cloth-item sock"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="services-section">
        <div className="section-header">
          <h2>Our Services</h2>
          <p>Choose from our range of professional laundry services</p>
        </div>
        
        <div className="services-grid">
          {services.map((service) => (
            <div key={service.id} className="service-card">
              <div className="service-icon">
                {service.icon === "tshirt" && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z"/>
                  </svg>
                )}
                {service.icon === "sparkles" && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M5.6 18.4L18.4 5.6"/>
                  </svg>
                )}
                {service.icon === "iron" && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 17h14M3 12h18l-3-9H6l-3 9zM12 12v5"/>
                  </svg>
                )}
                {service.icon === "droplet" && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/>
                  </svg>
                )}
              </div>
              <h3>{service.name}</h3>
              <p>{service.description}</p>
              <div className="service-price">
                <span className="price">${service.price.toFixed(2)}</span>
                <span className="unit">/ lb</span>
              </div>
              <button 
                className="book-service-btn"
                onClick={() => openBookingModal(service)}
              >
                Book Now
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <div className="section-header">
          <h2>How It Works</h2>
          <p>Simple steps to fresh, clean laundry</p>
        </div>
        
        <div className="steps-container">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Schedule Pickup</h3>
              <p>Choose a convenient time for us to collect your laundry</p>
            </div>
          </div>
          <div className="step-connector"></div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>We Clean</h3>
              <p>Your clothes are professionally cleaned and cared for</p>
            </div>
          </div>
          <div className="step-connector"></div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Delivery</h3>
              <p>Fresh clothes delivered back to your doorstep</p>
            </div>
          </div>
        </div>
      </section>

      {/* Booking Modal */}
      {showBookingModal && selectedService && (
        <div className="modal-overlay" onClick={() => setShowBookingModal(false)}>
          <div className="booking-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowBookingModal(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
            
            {bookingSuccess ? (
              <div className="booking-success">
                <div className="success-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <h2>Booking Confirmed!</h2>
                <p>Your {selectedService.name} service has been scheduled.</p>
                <p className="success-details">
                  Pickup: {bookingData.pickup_date || "As scheduled"} at {bookingData.pickup_time || "Scheduled time"}
                </p>
                <div className="success-actions">
                  <button onClick={() => setShowBookingModal(false)} className="done-btn">
                    Done
                  </button>
                  <Link href="/orders" className="view-orders-btn">
                    View Orders
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="modal-header">
                  <h2>Book {selectedService.name}</h2>
                  <p>Schedule your pickup for this service</p>
                </div>
                
                <form onSubmit={handleBookingSubmit} className="booking-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Pickup Date</label>
                      <input
                        type="date"
                        value={bookingData.pickup_date}
                        onChange={(e) => setBookingData({...bookingData, pickup_date: e.target.value})}
                        min={new Date().toISOString().split("T")[0]}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Pickup Time</label>
                      <select
                        value={bookingData.pickup_time}
                        onChange={(e) => setBookingData({...bookingData, pickup_time: e.target.value})}
                        required
                      >
                        <option value="">Select time</option>
                        <option value="09:00">9:00 AM</option>
                        <option value="10:00">10:00 AM</option>
                        <option value="11:00">11:00 AM</option>
                        <option value="12:00">12:00 PM</option>
                        <option value="13:00">1:00 PM</option>
                        <option value="14:00">2:00 PM</option>
                        <option value="15:00">3:00 PM</option>
                        <option value="16:00">4:00 PM</option>
                        <option value="17:00">5:00 PM</option>
                        <option value="18:00">6:00 PM</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label>Pickup Address</label>
                    <input
                      type="text"
                      value={bookingData.address}
                      onChange={(e) => setBookingData({...bookingData, address: e.target.value})}
                      placeholder="Enter your full address"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Special Instructions (Optional)</label>
                    <textarea
                      value={bookingData.instructions}
                      onChange={(e) => setBookingData({...bookingData, instructions: e.target.value})}
                      placeholder="Any special care instructions..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="booking-summary">
                    <div className="summary-row">
                      <span>Service</span>
                      <span>{selectedService.name}</span>
                    </div>
                    <div className="summary-row">
                      <span>Price</span>
                      <span>${selectedService.price.toFixed(2)} / lb</span>
                    </div>
                  </div>
                  
                  <button type="submit" className="confirm-booking-btn" disabled={bookingLoading}>
                    {bookingLoading ? "Booking..." : "Confirm Booking"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="main-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="logo-container">
              <svg viewBox="0 0 40 40" className="logo-icon">
                <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 20 Q20 10 28 20 Q20 30 12 20" fill="currentColor"/>
              </svg>
              <span className="brand-name">FreshPress</span>
            </div>
            <p>Professional laundry service at your doorstep</p>
          </div>
          <div className="footer-links">
            <div className="link-group">
              <h4>Services</h4>
              <a href="#">Wash & Fold</a>
              <a href="#">Dry Cleaning</a>
              <a href="#">Iron & Press</a>
            </div>
            <div className="link-group">
              <h4>Support</h4>
              <a href="#">Contact Us</a>
              <a href="#">FAQs</a>
              <a href="#">Pricing</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2024 FreshPress. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
