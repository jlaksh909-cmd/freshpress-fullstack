"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("dark")

  useEffect(() => {
    // Check localStorage or system preference
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null
    if (savedTheme) {
      setTheme(savedTheme)
      document.documentElement.setAttribute("data-theme", savedTheme)
    } else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      setTheme("light")
      document.documentElement.setAttribute("data-theme", "light")
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark"
    setTheme(newTheme)
    document.documentElement.setAttribute("data-theme", newTheme)
    localStorage.setItem("theme", newTheme)
  }

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={toggleTheme}
      className="theme-toggle"
      style={{
        background: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '12px',
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontSize: '1.2rem',
        color: 'var(--accent-gold)',
        transition: 'all 0.3s ease'
      }}
      aria-label="Toggle Theme"
    >
      {theme === "dark" ? "🌙" : "☀️"}
    </motion.button>
  )
}
