"use client"

import Link from "next/link"
import { motion } from "framer-motion"

export default function ContactPage() {
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
          Get in <span style={{ color: "var(--accent-gold)" }}>Touch</span>
        </motion.h1>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <p style={{ fontSize: "1.2rem", lineHeight: 1.8, color: "var(--text-secondary)", marginBottom: "40px" }}>
            Have a specialized care request or need help with a current order? Our elite support team is here for you 24/7.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "24px", marginBottom: "60px" }}>
            <div className="glass" style={{ padding: "32px", borderRadius: "24px", border: "1px solid var(--glass-border)", background: "var(--card-bg)", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: "16px" }}>📧</div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "8px" }}>Email Us</h3>
              <p style={{ color: "var(--text-secondary)" }}>support@freshpress.com</p>
            </div>
            
            <div className="glass" style={{ padding: "32px", borderRadius: "24px", border: "1px solid var(--glass-border)", background: "var(--card-bg)", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: "16px" }}>📞</div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "8px" }}>Call Us</h3>
              <p style={{ color: "var(--text-secondary)" }}>1-800-LAUNDRY</p>
            </div>
          </div>

          <div className="glass" style={{ padding: "40px", borderRadius: "24px", border: "1px solid var(--glass-border)", background: "var(--card-bg)" }}>
            <h2 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "24px" }}>Send a Message</h2>
            <form onSubmit={(e) => e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "var(--text-secondary)" }}>Name</label>
                <input type="text" placeholder="Your name" style={{ width: "100%", padding: "16px", borderRadius: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--glass-border)", color: "white", outline: "none" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "var(--text-secondary)" }}>Email</label>
                <input type="email" placeholder="Your email" style={{ width: "100%", padding: "16px", borderRadius: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--glass-border)", color: "white", outline: "none" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "var(--text-secondary)" }}>Message</label>
                <textarea rows={5} placeholder="How can we help?" style={{ width: "100%", padding: "16px", borderRadius: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--glass-border)", color: "white", outline: "none", resize: "vertical" }} />
              </div>
              <button style={{ background: "linear-gradient(135deg, var(--accent-gold), #ff9d00)", color: "#000", padding: "16px", borderRadius: "12px", fontWeight: 800, border: "none", cursor: "pointer", fontSize: "1.1rem" }}>
                Send Message
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
