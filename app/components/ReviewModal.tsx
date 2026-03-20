"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { createClient } from "@/lib/supabase/client"

interface ReviewModalProps {
  orderId: string
  serviceName: string
  userId: string
  userName: string
  onClose: () => void
  onSubmitted: () => void
}

export default function ReviewModal({ orderId, serviceName, userId, userName, onClose, onSubmitted }: ReviewModalProps) {
  const [rating, setRating] = useState(5)
  const [hoveredStar, setHoveredStar] = useState<number | null>(null)
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const supabase = createClient()

  const handleSubmit = async () => {
    if (!comment.trim()) return
    setLoading(true)

    const { error } = await supabase.from("reviews").insert({
      user_id: userId,
      customer_name: userName,
      rating,
      comment,
      order_id: orderId,
    })

    if (!error) {
      setSubmitted(true)
      setTimeout(() => {
        onSubmitted()
        onClose()
      }, 1800)
    }
    setLoading(false)
  }

  const displayRating = hoveredStar ?? rating

  return (
    <AnimatePresence>
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 3000,
          background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "20px"
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0 }}
          className="glass"
          style={{ maxWidth: "460px", width: "100%", borderRadius: "28px", padding: "40px", border: "1px solid rgba(245,200,66,0.2)" }}
          onClick={e => e.stopPropagation()}
        >
          {submitted ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                style={{ fontSize: "3.5rem", marginBottom: "16px" }}
              >🎉</motion.div>
              <h3 style={{ fontSize: "1.4rem", fontWeight: 900, marginBottom: "8px" }}>Thank You!</h3>
              <p style={{ color: "rgba(238,242,255,0.6)" }}>Your review helps us serve better.</p>
            </div>
          ) : (
            <>
              <div style={{ textAlign: "center", marginBottom: "28px" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>⭐</div>
                <h3 style={{ fontSize: "1.3rem", fontWeight: 900, marginBottom: "4px" }}>How was your experience?</h3>
                <p style={{ fontSize: "0.85rem", color: "rgba(238,242,255,0.5)" }}>{serviceName}</p>
              </div>

              {/* Star Rating */}
              <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "24px" }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <motion.button
                    key={star}
                    type="button"
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(null)}
                    onClick={() => setRating(star)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: "2rem",
                      color: star <= displayRating ? "#f5c842" : "rgba(255,255,255,0.2)",
                      transition: "color 0.15s",
                      filter: star <= displayRating ? "drop-shadow(0 0 6px rgba(245,200,66,0.5))" : "none"
                    }}
                  >
                    ★
                  </motion.button>
                ))}
              </div>

              <div style={{ textAlign: "center", marginBottom: "20px", fontSize: "0.9rem", fontWeight: 700, color: displayRating >= 4 ? "#10b981" : displayRating >= 2 ? "#f59e0b" : "#ef4444" }}>
                {displayRating === 5 ? "Excellent! 🚀" : displayRating === 4 ? "Great! 😊" : displayRating === 3 ? "Okay 🙂" : displayRating === 2 ? "Poor 😕" : "Very Bad 😢"}
              </div>

              <textarea
                placeholder="Tell us what you loved (or could be better)..."
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={3}
                style={{
                  width: "100%", padding: "14px", borderRadius: "14px",
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "white", fontSize: "0.9rem", lineHeight: 1.5, resize: "none",
                  marginBottom: "20px", boxSizing: "border-box"
                }}
              />

              <div style={{ display: "flex", gap: "12px" }}>
                <button onClick={onClose} className="btn-ghost" style={{ flex: 1, padding: "14px", borderRadius: "14px" }}>
                  Skip
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !comment.trim()}
                  className="btn-primary"
                  style={{ flex: 2, padding: "14px", borderRadius: "14px", fontSize: "1rem" }}
                >
                  {loading ? <div className="spinner" /> : "Submit Review"}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
