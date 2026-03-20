"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { ToastContainer, ToastType } from "@/app/components/Toast"
import ThemeToggle from "@/app/components/ThemeToggle"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        addToast(error.message, "error")
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single()

          const role = profile?.role || "user"
          addToast(`Welcome back, ${role}!`, "success")

          if (role === "admin") {
            router.push("/admin")
          } else if (role === "worker") {
            router.push("/worker")
          } else {
            router.push("/home")
          }
        }
        router.refresh()
      }
    } catch {
      addToast("An unexpected error occurred", "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="home-root login-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', position: 'relative' }}>
      <div style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 100 }}>
        <ThemeToggle />
      </div>
      <div className="hero-bg-glow" style={{ top: '20%', left: '20%' }}></div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="login-box glass" 
        style={{ 
          width: '100%', 
          maxWidth: '480px', 
          padding: '48px', 
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.1)',
          position: 'relative',
          zIndex: 10
        }}
      >
        <div className="login-header" style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div className="nav-logo" style={{ justifyContent: 'center', marginBottom: '16px', gap: '12px' }}>
            <img src="/logo-512.png" alt="FreshPress Logo" style={{ width: '48px', height: '48px', borderRadius: '12px' }} />
            <span className="brand-name" style={{ fontSize: '1.8rem' }}>Fresh<span><em>Press</em></span></span>
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '8px' }}>Welcome Back</h1>
          <p style={{ color: 'rgba(238,242,255,0.5)', fontSize: '0.95rem' }}>Experience the future of laundry management</p>
        </div>

        <form onSubmit={handleLogin} className="modal-form">
          <div className="mform-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="mform-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Password</label>
              <Link href="#" style={{ fontSize: '0.75rem', color: '#f5c842', textDecoration: 'none' }}>Forgot password?</Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="modal-submit" disabled={loading} style={{ marginTop: '12px' }}>
            {loading ? <div className="spinner"></div> : "Sign In"}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '32px', fontSize: '0.9rem', color: 'rgba(238,242,255,0.5)' }}>
          Don't have an account? <Link href="/signup" style={{ color: '#f5c842', fontWeight: 700, textDecoration: 'none' }}>Create Account</Link>
        </div>
      </motion.div>

      {/* Decorative Elements */}
      <div className="hero-emojis" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', opacity: 0.1 }}>
        <div style={{ position: 'absolute', top: '10%', left: '10%', fontSize: '3rem' }}>👕</div>
        <div style={{ position: 'absolute', top: '70%', left: '15%', fontSize: '2.5rem' }}>✨</div>
        <div style={{ position: 'absolute', top: '20%', right: '15%', fontSize: '3rem' }}>👔</div>
        <div style={{ position: 'absolute', top: '60%', right: '10%', fontSize: '2.5rem' }}>🧼</div>
      </div>
    </div>
  )
}
