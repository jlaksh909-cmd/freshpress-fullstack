"use client"

import Link from "next/link"
import { motion } from "framer-motion"

export default function AboutPage() {
  return (
    <div className="home-root" style={{ minHeight: "100vh", padding: "100px 24px", background: "var(--bg-primary)" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto", color: "var(--text-primary)" }}>
        
        <Link href="/home" className="btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none", color: "var(--text-secondary)", marginBottom: "40px", padding: "8px 16px", borderRadius: "12px", border: "1px solid var(--glass-border)" }}>
          ← Back to Home
        </Link>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ fontSize: "clamp(2.5rem, 4vw, 3.5rem)", fontWeight: 900, marginBottom: "24px" }}
        >
          About <span style={{ color: "var(--accent-blue)" }}>FreshPress</span>
        </motion.h1>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <p style={{ fontSize: "1.2rem", lineHeight: 1.8, color: "var(--text-secondary)", marginBottom: "32px" }}>
            FreshPress was born out of a simple idea: laundry should be zero effort. We combine state-of-the-art cleaning technology with a premium logistics network to give you back your time.
          </p>

          <h2 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "16px", marginTop: "40px" }}>Our Mission</h2>
          <p style={{ fontSize: "1.1rem", lineHeight: 1.8, color: "var(--text-secondary)", marginBottom: "24px" }}>
            To revolutionize garment care by making it intelligent, transparent, and eco-friendly. We handle every fabric with precision, ensuring your items return to you looking completely pristine.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "40px" }}>
            <div className="glass" style={{ padding: "32px", borderRadius: "24px", border: "1px solid var(--glass-border)", background: "var(--card-bg)" }}>
              <h3 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "12px", color: "var(--accent-gold)" }}>Quality First</h3>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>Our facilities use hospital-grade sanitization and premium eco-friendly detergents safe for sensitive skin.</p>
            </div>
            <div className="glass" style={{ padding: "32px", borderRadius: "24px", border: "1px solid var(--glass-border)", background: "var(--card-bg)" }}>
              <h3 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "12px", color: "var(--accent-blue)" }}>Tech Enabled</h3>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>Track your laundry at every stage, from our doorstep pickup to processing to final delivery.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
