"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface PaymentGatewayProps {
  amount: number
  method: string
  onSuccess: () => void
  onCancel: () => void
}

export default function PaymentGateway({ amount, method, onSuccess, onCancel }: PaymentGatewayProps) {
  const [step, setStep] = useState<'info' | 'processing' | 'success'>('info')
  const [loadingProgress, setLoadingProgress] = useState(0)

  useEffect(() => {
    if (step === 'processing') {
      const interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval)
            setTimeout(() => setStep('success'), 500)
            return 100
          }
          return prev + Math.random() * 15
        })
      }, 200)
      return () => clearInterval(interval)
    }
  }, [step])

  useEffect(() => {
    if (step === 'success') {
      const timer = setTimeout(() => {
        onSuccess()
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [step, onSuccess])

  const renderContent = () => {
    switch (step) {
      case 'info':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="payment-modal-content"
          >
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>
                {method === 'UPI' ? '📱' : method === 'Card' ? '💳' : method === 'Online' ? '🌐' : '👛'}
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)' }}>Secure Payment</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Paying via {method}</p>
            </div>

            <div className="payment-details-card glass" style={{ padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', marginBottom: '24px', border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Amount to Pay</span>
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent-gold)' }}>₹{amount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Merchant</span>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>FreshPress Laundry</span>
              </div>
            </div>

            {method === 'UPI' && (
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ background: 'white', padding: '16px', borderRadius: '12px', display: 'inline-block', border: '4px solid #f5c842' }}>
                   {/* Simulated QR Code */}
                   <svg width="140" height="140" viewBox="0 0 100 100">
                      <rect width="100" height="100" fill="white" />
                      <path d="M10 10h30v30h-30zM60 10h30v30h-30zM10 60h30v30h-30z" fill="#07071a" />
                      <path d="M20 20h10v10h-10zM70 20h10v10h-10zM20 70h10v10h-10z" fill="white" />
                      <rect x="45" y="10" width="10" height="10" fill="#f5c842" />
                      <rect x="10" y="45" width="10" height="10" fill="#f5c842" />
                      <path d="M50 50h40v40h-40z" fill="#07071a" opacity="0.1" />
                      <path d="M55 55h5v5h-5zM65 65h5v5h-5zM75 75h5v5h-5zM55 75h5v5h-5zM75 55h5v5h-5z" fill="#07071a" />
                   </svg>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginTop: '12px', fontWeight: 600 }}>Scan QR to Pay via any UPI App</p>
              </div>
            )}

            {method === 'Card' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                <div className="mform-group">
                  <label style={{ fontSize: '0.75rem' }}>Card Number</label>
                  <input type="text" placeholder="XXXX XXXX XXXX XXXX" defaultValue="4242 4242 4242 4242" readOnly style={{ background: 'rgba(255,255,255,0.05)' }} />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div className="mform-group" style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.75rem' }}>Expiry</label>
                    <input type="text" placeholder="MM/YY" defaultValue="12/28" readOnly style={{ background: 'rgba(255,255,255,0.05)' }} />
                  </div>
                  <div className="mform-group" style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.75rem' }}>CVV</label>
                    <input type="text" placeholder="XXX" defaultValue="***" readOnly style={{ background: 'rgba(255,255,255,0.05)' }} />
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={onCancel} className="btn-ghost" style={{ flex: 1, height: '48px', borderRadius: '12px' }}>Cancel</button>
              <button 
                onClick={() => setStep('processing')} 
                className="btn-primary" 
                style={{ flex: 2, height: '48px', borderRadius: '12px', background: 'var(--accent-gold)', color: '#07071a', fontWeight: 800 }}
              >
                Pay ₹{amount.toFixed(2)}
              </button>
            </div>
          </motion.div>
        )
      case 'processing':
        return (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: 'center', padding: '40px 0' }}
          >
            <div className="spinner-container" style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto 24px' }}>
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                <motion.circle 
                  cx="50" cy="50" r="45" 
                  fill="none" 
                  stroke="var(--accent-gold)" 
                  strokeWidth="8" 
                  strokeDasharray="283"
                  strokeDashoffset={283 - (283 * loadingProgress) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 800 }}>
                {Math.round(loadingProgress)}%
              </div>
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '8px' }}>Processing Payment...</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Please do not close this window or press back.</p>
          </motion.div>
        )
      case 'success':
        return (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: 'center', padding: '40px 0' }}
          >
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12, stiffness: 200 }}
              style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', margin: '0 auto 24px' }}
            >
              ✓
            </motion.div>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 950, color: '#10b981', marginBottom: '8px' }}>Payment Successful!</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Verification #FP-TXN-{Math.random().toString(36).substring(7).toUpperCase()}</p>
            <div className="spinner" style={{ borderTopColor: '#10b981', width: '24px', height: '24px', margin: '0 auto' }}></div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>Finalizing your booking...</p>
          </motion.div>
        )
    }
  }

  return (
    <div className="modal-backdrop" style={{ zIndex: 3000, background: 'rgba(7, 7, 26, 0.95)', backdropFilter: 'blur(10px)' }}>
      <div className="modal-box glass" style={{ maxWidth: '420px', padding: '32px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </div>
    </div>
  )
}
