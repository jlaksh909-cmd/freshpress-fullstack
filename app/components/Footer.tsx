import Link from "next/link"

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer style={{
      background: "var(--card-bg)",
      borderTop: "1px solid var(--glass-border)",
      padding: "60px 24px 24px",
      marginTop: "80px",
      color: "var(--text-secondary)"
    }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "40px", paddingBottom: "40px" }}>
        
        {/* Brand Column */}
        <div>
          <Link href="/home" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)' }}>Fresh<span style={{ color: 'var(--accent-blue)', fontStyle: 'italic' }}>Press</span></span>
          </Link>
          <p style={{ fontSize: "0.9rem", lineHeight: 1.6, marginBottom: "20px" }}>
            Premium laundry and dry cleaning delivered to your door. Pristine clothes. Zero effort. Guaranteed.
          </p>
          <div style={{ display: "flex", gap: "16px" }}>
            {/* Social Icons Placeholder */}
            <a href="#" style={{ color: "var(--text-secondary)", fontSize: "1.2rem", textDecoration: "none" }}>𝕏</a>
            <a href="#" style={{ color: "var(--text-secondary)", fontSize: "1.2rem", textDecoration: "none" }}>📸</a>
            <a href="#" style={{ color: "var(--text-secondary)", fontSize: "1.2rem", textDecoration: "none" }}>📘</a>
          </div>
        </div>

        {/* Company Links */}
        <div>
          <h4 style={{ color: "var(--text-primary)", fontWeight: 700, marginBottom: "20px", fontSize: "1.1rem" }}>Company</h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
            <li><Link href="/about" style={{ textDecoration: "none", color: "inherit", transition: "color 0.2s" }} className="hover:text-white">About Us</Link></li>
            <li><Link href="/#services" style={{ textDecoration: "none", color: "inherit", transition: "color 0.2s" }} className="hover:text-white">Services</Link></li>
            <li><Link href="/membership" style={{ textDecoration: "none", color: "inherit", transition: "color 0.2s" }} className="hover:text-white">Membership</Link></li>
          </ul>
        </div>

        {/* Support Links */}
        <div>
          <h4 style={{ color: "var(--text-primary)", fontWeight: 700, marginBottom: "20px", fontSize: "1.1rem" }}>Support</h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
            <li><Link href="/faq" style={{ textDecoration: "none", color: "inherit", transition: "color 0.2s" }} className="hover:text-white">FAQ</Link></li>
            <li><Link href="/contact" style={{ textDecoration: "none", color: "inherit", transition: "color 0.2s" }} className="hover:text-white">Contact Us</Link></li>
            <li><a href="mailto:support@freshpress.com" style={{ textDecoration: "none", color: "inherit", transition: "color 0.2s" }} className="hover:text-white">support@freshpress.com</a></li>
          </ul>
        </div>

        {/* Legal Links */}
        <div>
          <h4 style={{ color: "var(--text-primary)", fontWeight: 700, marginBottom: "20px", fontSize: "1.1rem" }}>Legal</h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
            <li><Link href="/privacy-policy" style={{ textDecoration: "none", color: "inherit", transition: "color 0.2s" }} className="hover:text-white">Privacy Policy</Link></li>
            <li><Link href="/terms-of-service" style={{ textDecoration: "none", color: "inherit", transition: "color 0.2s" }} className="hover:text-white">Terms of Service</Link></li>
          </ul>
        </div>

      </div>

      <div style={{ 
        maxWidth: "1200px", 
        margin: "0 auto", 
        paddingTop: "24px", 
        borderTop: "1px solid var(--glass-border)", 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        flexWrap: "wrap",
        gap: "16px",
        fontSize: "0.85rem"
      }}>
        <p>© {currentYear} FreshPress. All rights reserved.</p>
        <p style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          Made with <span style={{ color: "#ef4444" }}>❤️</span> for pristine clothes.
        </p>
      </div>
    </footer>
  )
}
