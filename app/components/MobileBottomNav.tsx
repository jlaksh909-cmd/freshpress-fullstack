"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

export default function MobileBottomNav() {
  const pathname = usePathname()
  const [unread, setUnread] = useState(0)
  const [role, setRole] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()
      if (profile) setRole(profile.role)

      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false)
      setUnread(count || 0)

      // Real-time badge update
      const ch = supabase
        .channel("mobile-notif-count")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
          setUnread(p => p + 1)
        })
        .subscribe()

      return () => { supabase.removeChannel(ch) }
    }
    init()
  }, [supabase])

  // Don't show for admin on admin pages, or on auth pages, or on desktop
  if (!isMobile || pathname === "/login" || pathname === "/signup" || (role === "admin" && pathname === "/admin")) return null

  const tabs = [
    { href: "/home", icon: "🏠", label: "Home" },
    { href: "/orders", icon: "📦", label: "Orders" },
    { href: "/profile", icon: "👤", label: "Profile" },
  ]

  if (role === "worker") tabs.splice(1, 0, { href: "/worker", icon: "🏗️", label: "Worker" })
  if (role === "admin") tabs.push({ href: "/admin", icon: "🛡️", label: "Admin" })

  return (
    <nav style={{
      display: "none",
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1500,
      background: "rgba(7, 7, 26, 0.85)",
      backdropFilter: "blur(20px)",
      borderTop: "1px solid rgba(255,255,255,0.08)",
      padding: "8px 0 max(8px, env(safe-area-inset-bottom))",
    }} className="mobile-bottom-nav">
      {tabs.map(tab => {
        const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/")
        const isNotif = tab.href === "/notifications"
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
              gap: "3px",
              textDecoration: "none",
              position: "relative",
              padding: "6px 0",
              transition: "opacity 0.15s",
              opacity: isActive ? 1 : 0.45,
            }}
          >
            <span style={{
              fontSize: "1.3rem",
              lineHeight: 1,
              filter: isActive ? "drop-shadow(0 0 8px rgba(245,200,66,0.6))" : "none",
              transform: isActive ? "scale(1.15)" : "scale(1)",
              transition: "all 0.2s",
            }}>
              {tab.icon}
            </span>
            <span style={{
              fontSize: "0.6rem",
              fontWeight: isActive ? 800 : 500,
              color: isActive ? "#f5c842" : "inherit",
              letterSpacing: "0.02em",
            }}>
              {tab.label}
            </span>
            {isNotif && unread > 0 && (
              <span style={{
                position: "absolute",
                top: "2px",
                right: "calc(50% - 22px)",
                background: "#ef4444",
                color: "white",
                fontSize: "0.55rem",
                fontWeight: 900,
                borderRadius: "10px",
                padding: "1px 5px",
                minWidth: "16px",
                textAlign: "center",
                lineHeight: "14px",
              }}>
                {unread > 9 ? "9+" : unread}
              </span>
            )}
            {isActive && (
              <span style={{
                position: "absolute",
                bottom: "-8px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "4px",
                height: "4px",
                borderRadius: "50%",
                background: "#f5c842",
              }} />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
