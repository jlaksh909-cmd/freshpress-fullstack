"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { ToastContainer, ToastType } from "@/app/components/Toast"
import ThemeToggle from "@/app/components/ThemeToggle"
import { Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toasts, setToasts] = useState<{ id: string; message: string; type: ToastType }[]>([])
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

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
    } catch (err: any) {
      console.error("Login Error:", err)
      addToast(err.message || "An unexpected error occurred", "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="home-root login-container" style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '20px', 
      position: 'relative',
      overflow: 'hidden',
      background: 'var(--bg-primary)'
    }}>
      <div style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 100 }}>
        <ThemeToggle />
      </div>

      {/* Interactive Iron Lamp Glow */}
      <motion.div 
        animate={{
          x: mousePos.x - 250,
          y: mousePos.y - 250,
        }}
        transition={{ type: "spring", damping: 30, stiffness: 200, mass: 0.5 }}
        style={{
          position: 'fixed',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245, 200, 66, 0.07) 0%, rgba(245, 200, 66, 0) 70%)',
          pointerEvents: 'none',
          zIndex: 1,
          filter: 'blur(40px)',
          mixBlendMode: 'screen'
        }}
      />

      {/* Steam Particles */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ y: '110vh', x: `${20 + i * 15}%`, opacity: 0 }}
            animate={{ 
              y: '-20vh', 
              opacity: [0, 0.2, 0],
              x: `${20 + i * 15 + Math.sin(i) * 5}%` 
            }}
            transition={{ 
              duration: 8 + Math.random() * 4, 
              repeat: Infinity, 
              delay: i * 1.5,
              ease: "linear"
            }}
            style={{
              position: 'absolute',
              width: '100px',
              height: '100px',
              background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
              filter: 'blur(30px)',
              borderRadius: '50%'
            }}
          />
        ))}
      </div>

      <div className="hero-bg-glow" style={{ top: '20%', left: '20%', opacity: 0.3 }}></div>
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
              <Link href="/forgot-password" style={{ fontSize: '0.75rem', color: '#f5c842', textDecoration: 'none' }}>Forgot password?</Link>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                style={{ paddingRight: '40px', width: '100%', boxSizing: 'border-box' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'rgba(238,242,255,0.5)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
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
