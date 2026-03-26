"use client"

import Link from "next/link"

export default function TermsOfServicePage() {
  return (
    <div className="home-root" style={{ minHeight: "100vh", padding: "100px 24px", background: "var(--bg-primary)" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto", color: "var(--text-primary)" }}>
        
        <Link href="/home" className="btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none", color: "var(--text-secondary)", marginBottom: "40px", padding: "8px 16px", borderRadius: "12px", border: "1px solid var(--glass-border)" }}>
          ← Back to Home
        </Link>
        
        <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 900, marginBottom: "24px" }}>
          Terms of Service
        </h1>
        
        <div style={{ color: "var(--text-secondary)", lineHeight: 1.8, fontSize: "1.1rem" }} className="legal-content">
          <p style={{ marginBottom: "24px" }}>Last Updated: March 2026</p>
          
          <h2 style={{ color: "var(--text-primary)", fontSize: "1.5rem", fontWeight: 700, margin: "32px 0 16px" }}>1. Acceptance of Terms</h2>
          <p style={{ marginBottom: "16px" }}>
            By downloading, accessing, or using the FreshPress service, you agree to be bound by these Terms of Service. If you do not agree to these terms, you must not use our service.
          </p>

          <h2 style={{ color: "var(--text-primary)", fontSize: "1.5rem", fontWeight: 700, margin: "32px 0 16px" }}>2. Service Delivery Policy</h2>
          <p style={{ marginBottom: "16px" }}>
            While we guarantee pristine cleaning through high standards of care, FreshPress assumes no liability for damage due to inherent weaknesses in materials not apparent prior to processing. We follow standard professional practices for dry cleaning and laundering.
          </p>

          <h2 style={{ color: "var(--text-primary)", fontSize: "1.5rem", fontWeight: 700, margin: "32px 0 16px" }}>3. Lost or Damaged Items</h2>
          <p style={{ marginBottom: "16px" }}>
            In the rare event of damage or loss, our liability is strictly limited to 10 times the charge for cleaning that particular garment, not exceeding a standard total sum limit as defined in our comprehensive liability waiver.
          </p>

          <h2 style={{ color: "var(--text-primary)", fontSize: "1.5rem", fontWeight: 700, margin: "32px 0 16px" }}>4. Memberships & Subscriptions</h2>
          <p style={{ marginBottom: "16px" }}>
            By subscribing to Gold or Platinum memberships, you authorize recurring charges. Benefits including Points Multipliers are applied conditionally to active balances. You may cancel at any time through the Membership portal.
          </p>
        </div>
      </div>
    </div>
  )
}
