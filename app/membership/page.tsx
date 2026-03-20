"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import Navbar from "@/app/components/Navbar"
import { ToastContainer, ToastType } from "@/app/components/Toast"

const plans = [
  {
    name: "Silver",
    emoji: "🥈",
    price: 499,
    color: "#c0c0c0",
    border: "rgba(192,192,192,0.3)",
    bg: "linear-gradient(135deg, rgba(192,192,192,0.12), rgba(255,255,255,0.03))",
    benefits: [
      "10% Extra Discount on every order",
      "Standard email support",
      "3 Free pickups per month",
      "Access to member-only offers",
    ],
    popular: false,
  },
  {
    name: "Gold",
    emoji: "⭐",
    price: 999,
    color: "#f5c842",
    border: "rgba(245,200,66,0.5)",
    bg: "linear-gradient(135deg, rgba(245,200,66,0.15), rgba(184,138,5,0.05))",
    benefits: [
      "25% Extra Discount on every order",
      "Priority 24/7 support",
      "Unlimited free pickups",
      "Express 12-hour return",
      "1.5× PressPoints on every wash",
    ],
    popular: true,
  },
  {
    name: "Platinum",
    emoji: "💎",
    price: 1999,
    color: "#e5e4e2",
    border: "rgba(229,228,226,0.35)",
    bg: "linear-gradient(135deg, rgba(229,228,226,0.15), rgba(255,255,255,0.04))",
    benefits: [
      "50% Extra Discount on every order",
      "VIP Concierge support",
      "Stain Protection Plus included",
      "Unlimited everything",
      "2× PressPoints on every wash",
      "Dedicated account manager",
    ],
    popular: false,
  },
]

interface UserProfile {
  id: string
  name: string | null
  email: string
  role: string | null
}

export default function MembershipPage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [toasts, setToasts] = useState<{ id: string; message: string; type: ToastType }[]>([])
  const router = useRouter()
  const supabase = createClient()

  const addToast = (message: string, type: ToastType = "info") => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000)
  }

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.push("/login"); return }

      const { data: profile } = await supabase.from("profiles").select("*").eq("id", authUser.id).single()
      setUser(profile)

      const { data: sub } = await supabase
        .from("user_subscriptions")
        .select("*, subscriptions(*)")
        .eq("user_id", authUser.id)
        .eq("status", "active")
        .single()
      if (sub) setCurrentPlan(sub.subscriptions?.name)
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const handleSubscribe = async (planName: string) => {
    if (!user) { router.push("/login"); return }
    setProcessing(true)
    setSelectedPlan(planName)

    const { data: plan } = await supabase.from("subscriptions").select("id").eq("name", planName).single()
    if (!plan) { addToast("Plan not found. Please run unified_setup.sql first.", "error"); setProcessing(false); return }

    // Deactivate existing
    await supabase.from("user_subscriptions").update({ status: "inactive" }).eq("user_id", user.id)

    const { error } = await supabase.from("user_subscriptions").insert({
      user_id: user.id,
      subscription_id: plan.id,
      status: "active",
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })

    if (error) {
      addToast("Failed to activate plan: " + error.message, "error")
    } else {
      setCurrentPlan(planName)
      addToast(`🎉 ${planName} plan activated! Enjoy your benefits.`, "success")
    }
    setProcessing(false)
    setSelectedPlan(null)
  }

  if (loading) {
    return (
      <div className="home-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div className="spinner" style={{ width: "48px", height: "48px" }} />
      </div>
    )
  }

  return (
    <div className="home-root">
      <Navbar user={user} />
      <ToastContainer toasts={toasts} onRemove={id => setToasts(p => p.filter(t => t.id !== id))} />

      {/* Back Button */}
      <div style={{ position: 'fixed', top: '24px', right: '48px', zIndex: 110 }}>
        <button 
          onClick={() => router.push('/home')}
          className="btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '30px' }}
        >
          <span>←</span> Back to Home
        </button>
      </div>

      {/* Hero */}
      <div style={{ paddingTop: "130px", paddingBottom: "60px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div className="hero-bg-glow" style={{ top: "0", left: "30%", opacity: 0.6 }} />
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="section-badge" style={{ marginBottom: "20px" }}>💎 PREMIUM MEMBERSHIP</div>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 900, marginBottom: "20px", lineHeight: 1.1 }}>
            Choose Your <span className="gradient-text">Plan</span>
          </h1>
          <p style={{ fontSize: "1.1rem", color: "var(--text-secondary)", maxWidth: "520px", margin: "0 auto 16px" }}>
            Unlock exclusive discounts, priority pickup, and bonus PressPoints on every wash. Cancel anytime.
          </p>
          {currentPlan && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "10px",
              padding: "10px 22px", borderRadius: "40px",
              background: "rgba(245,200,66,0.1)", border: "1px solid rgba(245,200,66,0.3)",
              fontSize: "0.9rem", fontWeight: 700, color: "#f5c842",
            }}>
              <span>✅</span> Currently on {currentPlan} plan
            </div>
          )}
        </motion.div>
      </div>

      {/* Plans Grid */}
      <section style={{ padding: "0 5% 100px", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "28px", alignItems: "start" }}>
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.12 }}
              style={{
                padding: "40px 36px",
                borderRadius: "28px",
                background: plan.bg,
                border: `${plan.popular ? "2px" : "1px"} solid ${plan.border}`,
                position: "relative",
                overflow: "hidden",
                boxShadow: plan.popular ? `0 0 40px ${plan.color}22` : "none",
              }}
            >
              {plan.popular && (
                <div style={{
                  position: "absolute", top: "20px", right: "-32px",
                  background: "var(--accent-gold)", color: "#000",
                  padding: "6px 48px", transform: "rotate(45deg)",
                  fontSize: "0.72rem", fontWeight: 900, letterSpacing: "0.05em",
                }}>POPULAR</div>
              )}

              <div style={{ marginBottom: "24px" }}>
                <div style={{ fontSize: "2.2rem", marginBottom: "10px" }}>{plan.emoji}</div>
                <h2 style={{ fontSize: "1.6rem", fontWeight: 900, marginBottom: "6px", color: plan.color }}>{plan.name}</h2>
                <div style={{ fontSize: "3.2rem", fontWeight: 900, lineHeight: 1 }}>
                  ₹{plan.price}
                  <span style={{ fontSize: "1rem", fontWeight: 400, color: "var(--text-muted)" }}>/mo</span>
                </div>
              </div>

              <ul style={{ listStyle: "none", padding: 0, marginBottom: "36px", display: "flex", flexDirection: "column", gap: "14px" }}>
                {plan.benefits.map(b => (
                  <li key={b} style={{ display: "flex", alignItems: "flex-start", gap: "12px", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                    <span style={{ color: plan.color, fontWeight: 700, fontSize: "1rem", lineHeight: 1.4 }}>✓</span>
                    {b}
                  </li>
                ))}
              </ul>

              {currentPlan === plan.name ? (
                <div style={{
                  width: "100%", padding: "14px", borderRadius: "14px", textAlign: "center",
                  background: `${plan.color}20`, border: `1px solid ${plan.border}`,
                  fontWeight: 700, fontSize: "0.9rem", color: plan.color,
                }}>
                  ✅ Current Plan
                </div>
              ) : (
                <button
                  onClick={() => handleSubscribe(plan.name)}
                  disabled={processing && selectedPlan === plan.name}
                  className={plan.popular ? "btn-primary" : "btn-ghost"}
                  style={{ width: "100%", padding: "14px", borderRadius: "14px", fontSize: "0.95rem", fontWeight: 700 }}
                >
                  {processing && selectedPlan === plan.name ? "Activating..." : `Get ${plan.name}`}
                </button>
              )}
            </motion.div>
          ))}
        </div>

        {/* FAQ / Note section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="glass"
          style={{ marginTop: "60px", padding: "36px 40px", borderRadius: "24px", textAlign: "center" }}
        >
          <h3 style={{ fontWeight: 800, marginBottom: "12px", fontSize: "1.2rem" }}>📌 How It Works</h3>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.8, maxWidth: "600px", margin: "0 auto", fontSize: "0.95rem" }}>
            Plans are billed monthly and activate instantly. Discounts apply automatically on every booking.
            PressPoints bonuses are credited after each completed wash. Cancel anytime from your profile.
          </p>
        </motion.div>
      </section>
    </div>
  )
}
