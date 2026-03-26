"use client"

import Link from "next/link"

export default function PrivacyPolicyPage() {
  return (
    <div className="home-root" style={{ minHeight: "100vh", padding: "100px 24px", background: "var(--bg-primary)" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto", color: "var(--text-primary)" }}>
        
        <Link href="/home" className="btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none", color: "var(--text-secondary)", marginBottom: "40px", padding: "8px 16px", borderRadius: "12px", border: "1px solid var(--glass-border)" }}>
          ← Back to Home
        </Link>
        
        <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 900, marginBottom: "24px" }}>
          Privacy Policy
        </h1>
        
        <div style={{ color: "var(--text-secondary)", lineHeight: 1.8, fontSize: "1.1rem" }} className="legal-content">
          <p style={{ marginBottom: "24px" }}>Last Updated: March 2026</p>
          
          <h2 style={{ color: "var(--text-primary)", fontSize: "1.5rem", fontWeight: 700, margin: "32px 0 16px" }}>1. Information We Collect</h2>
          <p style={{ marginBottom: "16px" }}>
            We collect information you provide directly to us, such as when you create an account, request services, or communicate with us. This includes your name, email, phone number, and physical address for pickups.
          </p>

          <h2 style={{ color: "var(--text-primary)", fontSize: "1.5rem", fontWeight: 700, margin: "32px 0 16px" }}>2. How We Use Your Information</h2>
          <p style={{ marginBottom: "16px" }}>
            We use the information we collect to provide, maintain, and improve our services, including processing laundry requests, handling payments, and facilitating order tracking notifications.
          </p>

          <h2 style={{ color: "var(--text-primary)", fontSize: "1.5rem", fontWeight: 700, margin: "32px 0 16px" }}>3. Data Security</h2>
          <p style={{ marginBottom: "16px" }}>
            We implement advanced security measures spanning SSL enforcement and secure Supabase database configurations to protect your personal information against unauthorized access, alteration, or destruction. We do not store raw credit card information on our servers.
          </p>

          <h2 style={{ color: "var(--text-primary)", fontSize: "1.5rem", fontWeight: 700, margin: "32px 0 16px" }}>4. Analytics</h2>
          <p style={{ marginBottom: "16px" }}>
            We may use third-party analytics tools (like Google Analytics) to help us measure traffic and usage trends for the Service. These tools collect information sent by your device or our Service, including the web pages you visit and other information that assists us in improving the Service.
          </p>
        </div>
      </div>
    </div>
  )
}
