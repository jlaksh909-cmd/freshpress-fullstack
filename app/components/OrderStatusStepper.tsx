"use client"

import { motion } from "framer-motion"

export type OrderStatus = 'pending' | 'confirmed' | 'in_progress' | 'processing' | 'ready' | 'completed' | 'cancelled'

const statusSteps: { key: OrderStatus; label: string; icon: string }[] = [
  { key: 'pending', label: 'Pending', icon: '📝' },
  { key: 'confirmed', label: 'Confirmed', icon: '✅' },
  { key: 'in_progress', label: 'In Progress', icon: '👕' },
  { key: 'processing', label: 'Processing', icon: '🧼' },
  { key: 'ready', label: 'Ready', icon: '✨' },
  { key: 'completed', label: 'Delivered', icon: '🏠' }
]

interface OrderStatusStepperProps {
  currentStatus: OrderStatus
}

export default function OrderStatusStepper({ currentStatus }: OrderStatusStepperProps) {
  if (currentStatus === 'cancelled') {
    return (
      <div className="status-cancelled glass" style={{ padding: '20px', borderRadius: '12px', textAlign: 'center', color: '#ef4444' }}>
        <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>🚫</span>
        <h4 style={{ fontWeight: 800 }}>Order Cancelled</h4>
        <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>This order has been cancelled and will not be processed further.</p>
      </div>
    )
  }

  const currentIndex = statusSteps.findIndex(step => step.key === currentStatus)

  return (
    <div className="status-stepper" style={{ position: 'relative', padding: '20px 0' }}>
      <div className="stepper-track" style={{ 
        position: 'absolute', 
        top: '40px', 
        left: '10%', 
        right: '10%', 
        height: '4px', 
        background: 'rgba(255,255,255,0.1)', 
        borderRadius: '2px',
        zIndex: 0
      }}>
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${(currentIndex / (statusSteps.length - 1)) * 100}%` }}
          style={{ height: '100%', background: 'var(--accent-gold)', borderRadius: '2px' }}
        />
      </div>

      <div className="steps-container" style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
        {statusSteps.map((step, index) => {
          const isActive = index <= currentIndex
          const isCurrent = index === currentIndex

          return (
            <div key={step.key} className="step-item" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '60px' }}>
              <motion.div 
                initial={false}
                animate={{ 
                  scale: isCurrent ? 1.2 : 1,
                  background: isActive ? 'var(--accent-gold)' : 'rgba(255,255,255,0.1)',
                  color: isActive ? '#07071a' : 'var(--text-muted)'
                }}
                style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  boxShadow: isCurrent ? '0 0 20px rgba(245,200,66,0.4)' : 'none',
                  border: isActive ? 'none' : '2px solid var(--glass-border)'
                }}
              >
                {step.icon}
              </motion.div>
              <span style={{ 
                fontSize: '0.65rem', 
                fontWeight: isCurrent ? 800 : 500, 
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                textAlign: 'center',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
