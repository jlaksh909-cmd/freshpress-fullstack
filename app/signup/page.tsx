"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { ToastContainer, ToastType } from "@/app/components/Toast"
import { generateReferralCode, processReferral } from "@/lib/points"

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    referralCode: "",
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [toasts, setToasts] = useState<{ id: string; message: string; type: ToastType }[]>([])
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (formData.password !== formData.confirmPassword) {
      addToast("Passwords do not match", "error")
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      addToast("Password must be at least 6 characters", "error")
      setLoading(false)
      return
    }

    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || 
            `${window.location.origin}/home`,
          data: {
            full_name: formData.name,
            phone: formData.phone,
            referral_code: generateReferralCode(formData.name)
          },
        },
      })

      if (error) {
        addToast(error.message, "error")
      } else {
        // Process referral if provided
        if (authData.user && formData.referralCode) {
          try {
            await processReferral(authData.user.id, formData.referralCode)
          } catch (err) {
            console.error("Referral process error:", err)
          }
        }
        setSuccess(true)
        addToast("Account created! Please check your email.", "success")
      }
    } catch (err) {
      addToast("An unexpected error occurred", "error")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="home-root login-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div className="hero-bg-glow" style={{ top: '20%', left: '20%' }}></div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="login-box glass" 
          style={{ width: '100%', maxWidth: '480px', padding: '48px', borderRadius: '24px', textAlign: 'center' }}
        >
          <div className="done-anim" style={{ fontSize: '4rem', marginBottom: '24px' }}>✉️</div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '16px' }}>Check Your Email</h1>
          <p style={{ color: 'rgba(238,242,255,0.6)', lineHeight: 1.6, marginBottom: '32px' }}>
            We've sent a confirmation link to <strong style={{ color: '#f5c842' }}>{formData.email}</strong>.
            Click it to activate your FreshPress account.
          </p>
          <Link href="/login" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
            Return to Login
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="home-root login-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div className="hero-bg-glow" style={{ top: '10%', left: '10%' }}></div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="login-box glass" 
        style={{ 
          width: '100%', 
          maxWidth: '520px', 
          padding: '40px', 
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.1)',
          position: 'relative',
          zIndex: 10
        }}
      >
        <div className="login-header" style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div className="nav-logo" style={{ justifyContent: 'center', marginBottom: '16px' }}>
            <svg viewBox="0 0 40 40" className="logo-icon" style={{ width: '40px', height: '40px' }}>
              <circle cx="20" cy="20" r="18" fill="none" stroke="#f5c842" strokeWidth="2"/>
              <path d="M12 20 Q20 10 28 20 Q20 30 12 20" fill="#f5c842"/>
            </svg>
            <span className="brand-name" style={{ fontSize: '1.8rem' }}>Fresh<span><em>Press</em></span></span>
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '8px' }}>Create Account</h1>
          <p style={{ color: 'rgba(238,242,255,0.5)', fontSize: '0.95rem' }}>Join the premium laundry experience</p>
        </div>

        <form onSubmit={handleSignup} className="modal-form">
          <div className="mform-group">
            <label>Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
              required
            />
          </div>

          <div className="mform-row">
            <div className="mform-group">
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="name@example.com"
                required
              />
            </div>
            <div className="mform-group">
              <label>Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 (555) 000-0000"
                required
              />
            </div>
          </div>

          <div className="mform-row">
            <div className="mform-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
            </div>
            <div className="mform-group">
              <label>Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div className="mform-group" style={{ marginTop: '16px' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between' }}>
              Referral Code 
              <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>OPTIONAL</span>
            </label>
            <input
              type="text"
              name="referralCode"
              value={formData.referralCode}
              onChange={handleChange}
              placeholder="FP-XXXX-XXXX"
              style={{ textTransform: 'uppercase' }}
            />
          </div>

          <button type="submit" className="modal-submit" disabled={loading} style={{ marginTop: '24px' }}>
            {loading ? <div className="spinner"></div> : "Create Account"}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: 'rgba(238,242,255,0.5)' }}>
          Already have an account? <Link href="/login" style={{ color: '#f5c842', fontWeight: 700, textDecoration: 'none' }}>Sign In</Link>
        </div>
      </motion.div>
    </div>
  )
}
