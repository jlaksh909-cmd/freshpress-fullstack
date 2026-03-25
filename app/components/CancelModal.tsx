"use client"

import { motion, AnimatePresence } from "framer-motion"

interface CancelModalProps {
  isOpen: boolean
  onConfirm: () => void
  onClose: () => void
  orderId?: string
}

export default function CancelModal({ isOpen, onConfirm, onClose, orderId }: CancelModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          {/* Overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'absolute', inset: 0, background: 'rgba(7, 7, 26, 0.8)', backdropFilter: 'blur(5px)' }}
          />

          {/* Modal content */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            style={{ 
              position: 'relative', 
              width: '100%', 
              maxWidth: '400px', 
              background: 'var(--card-bg)', 
              borderRadius: '24px', 
              border: '1px solid var(--glass-border)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              overflow: 'hidden',
              padding: '32px'
            }}
          >
            {/* Icon */}
            <div style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '50%', 
              background: 'rgba(239, 68, 68, 0.1)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 24px',
              border: '2px solid rgba(239, 68, 68, 0.2)'
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
            </div>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, textAlign: 'center', marginBottom: '12px', color: 'var(--text-primary)' }}>Cancel Booking?</h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '32px', lineHeight: 1.5 }}>
              Are you sure you want to cancel this booking{orderId ? ` (#${orderId.slice(0,8).toUpperCase()})` : ''}? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                onClick={onConfirm}
                className="btn-primary"
                style={{ 
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)', 
                  padding: '16px', 
                  borderRadius: '14px', 
                  fontWeight: 900,
                  fontSize: '1rem',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  boxShadow: '0 10px 20px rgba(239, 68, 68, 0.3)'
                }}
              >
                Yes, Cancel Order
              </button>
              <button 
                onClick={onClose}
                className="btn-ghost"
                style={{ 
                  padding: '16px', 
                  borderRadius: '14px', 
                  fontWeight: 700,
                  fontSize: '1rem',
                  background: 'transparent',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              >
                No, Keep It
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
