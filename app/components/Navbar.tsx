"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import ThemeToggle from "./ThemeToggle"
import NotificationBell from "./NotificationBell"

interface NavbarProps {
  user: {
    name?: string | null
    email?: string | null
    role?: string | null
  } | null
}

export default function Navbar({ user }: NavbarProps) {
  const [subscription, setSubscription] = useState<any>(null)
  const [points, setPoints] = useState<number>(0)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        // Fetch Subscription
        const { data: subData } = await supabase
          .from("user_subscriptions")
          .select("*, subscriptions(*)")
          .eq("user_id", authUser.id)
          .eq("status", "active")
          .single()
        if (subData) setSubscription(subData)

        // Fetch Points
        const { data: ptsData } = await supabase
          .from("user_points")
          .select("balance")
          .eq("user_id", authUser.id)
          .single()
        if (ptsData) setPoints(ptsData.balance)
      }
    }
    fetchData()
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const firstName = user?.name?.split(" ")[0] || "User"

  return (
    <div className="navbar-side-container">
      <div className="nav-side-trigger">
        <svg viewBox="0 0 24 24" className="profile-svg">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
        </svg>
      </div>
      
      <nav className="navbar-side">
        <Link href="/home" className="nav-logo side-nav-logo" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <img src="/logo-512.png" alt="FreshPress Logo" style={{ width: '40px', height: '40px', borderRadius: '10px' }} />
          <span className="brand-name">Fresh<span><em>Press</em></span></span>
        </Link>

        <div className="side-nav-links">
          {user?.role !== 'admin' ? (
            <>
              <Link href="/home" className={pathname === "/home" ? "active" : ""}>
                <span>🏠</span> Home
              </Link>
              <Link href="/orders" className={pathname === "/orders" ? "active" : ""}>
                <span>📦</span> My Orders
              </Link>
              <Link href="/membership" className={pathname === "/membership" ? "active" : ""} style={{ color: '#f5c842', fontWeight: 700 }}>
                <span>💎</span> Membership
              </Link>
              <Link href="/profile" className={pathname === "/profile" ? "active" : ""}>
                <span>👤</span> Profile
              </Link>
            </>
          ) : (
            <>
              <Link href="/admin" className={pathname === "/admin" ? "active" : ""} style={{ color: '#f5c842' }}>
                <span>🛡️</span> Admin Dashboard
              </Link>
              <Link href="/home" className={pathname === "/home" ? "active" : ""}>
                <span>🏠</span> View Site
              </Link>
            </>
          )}
          {user?.role === 'worker' && (
            <Link href="/worker" className={pathname === "/worker" ? "active" : ""} style={{ color: '#10b981' }}>
              <span>🏗️</span> Worker Portal
            </Link>
          )}
        </div>

        <div className="side-nav-footer">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '10px' }}>
            <NotificationBell />
            <ThemeToggle />
          </div>

          {/* Subscription Card */}
          {user && user.role !== 'admin' && (
            <div style={{
              marginBottom: '12px',
              borderRadius: '14px',
              padding: '12px 14px',
              background: subscription
                ? subscription.subscriptions?.name === 'Platinum'
                  ? 'linear-gradient(135deg, rgba(229,228,226,0.15), rgba(255,255,255,0.05))'
                  : subscription.subscriptions?.name === 'Gold'
                  ? 'linear-gradient(135deg, rgba(245,200,66,0.18), rgba(184,138,5,0.05))'
                  : 'linear-gradient(135deg, rgba(192,192,192,0.12), rgba(255,255,255,0.03))'
                : 'rgba(255,255,255,0.04)',
              border: subscription
                ? subscription.subscriptions?.name === 'Platinum'
                  ? '1px solid rgba(229,228,226,0.3)'
                  : subscription.subscriptions?.name === 'Gold'
                  ? '1px solid rgba(245,200,66,0.35)'
                  : '1px solid rgba(192,192,192,0.2)'
                : '1px solid rgba(255,255,255,0.07)',
            }}>
              {subscription ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.4rem' }}>
                    {subscription.subscriptions?.name === 'Platinum' ? '💎' : subscription.subscriptions?.name === 'Gold' ? '⭐' : '🥈'}
                  </span>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.05em', color: subscription.subscriptions?.name === 'Gold' ? '#f5c842' : subscription.subscriptions?.name === 'Platinum' ? '#e5e4e2' : '#c0c0c0' }}>
                      {subscription.subscriptions?.name?.toUpperCase()} MEMBER
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(238,242,255,0.45)', marginTop: '2px' }}>
                      {subscription.subscriptions?.name === 'Platinum' ? '2× points on every wash' : subscription.subscriptions?.name === 'Gold' ? '1.5× points boost active' : 'Standard benefits active'}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.1rem' }}>🚀</span>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(238,242,255,0.8)' }}>Free Plan</div>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(238,242,255,0.4)', marginTop: '2px' }}>Basic benefits active</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {user && (
            <>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="user-name" style={{ fontSize: '0.95rem', fontWeight: 700 }}>{user.name || 'User'}</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{user.email}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 600 }}>
                  <span>🌟</span> {points} PressPoints
                </div>
              </div>
              <button onClick={handleLogout} className="nav-cta" style={{ width: '100%' }}>
                Logout
              </button>
            </>
          )}
        </div>
      </nav>
    </div>
  )
}
