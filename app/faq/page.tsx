"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { useState } from "react"

const FAQs = [
  {
    v: "How long does a pickup service take?",
    a: "Our standard turnaround time is 24-48 hours. If you opt for Express Service, we can process your items within 12 hours depending on the items' volume and fabric requirements."
  },
  {
    v: "What is your pricing structure?",
    a: "We offer completely transparent, per-cloth pricing. Wash & Fold starts at ₹19/cloth, and premium Dry Cleaning starts at ₹99/cloth. See our Services section on the Home page for full details."
  },
  {
    v: "How do I pay?",
    a: "We accept Cash on Delivery (COD) as well as secure online payments via Credit Card, UPI, and Wallet integrated directly in our app after you initiate a booking."
  },
  {
    v: "Do you offer subscriptions?",
    a: "Yes! We offer Gold and Platinum memberships that provide benefits like 2x reward points, free priority processing, and special monthly discounts. Check the Membership portal for details."
  }
]

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

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
          Frequent <span style={{ color: "var(--accent-blue)" }}>Questions</span>
        </motion.h1>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <p style={{ fontSize: "1.2rem", lineHeight: 1.8, color: "var(--text-secondary)", marginBottom: "40px" }}>
            Got queries? We've got answers. If you can't find what you're looking for, feel free to contact our support team.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {FAQs.map((faq, i) => (
              <div 
                key={i} 
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="glass" 
                style={{ 
                  padding: "24px", 
                  borderRadius: "20px", 
                  border: "1px solid var(--glass-border)", 
                  background: "var(--card-bg)",
                  cursor: "pointer",
                  transition: "all 0.3s ease"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>{faq.v}</h3>
                  <span style={{ fontSize: "1.5rem", color: "var(--accent-gold)" }}>{openIndex === i ? "−" : "+"}</span>
                </div>
                {openIndex === i && (
                  <motion.p 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: "auto" }} 
                    style={{ marginTop: "16px", color: "var(--text-secondary)", lineHeight: 1.6 }}
                  >
                    {faq.a}
                  </motion.p>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
