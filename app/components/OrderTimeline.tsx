"use client"

import { motion } from "framer-motion"

interface OrderTimelineProps {
  status: string
}

const steps = [
  { id: 'confirmed', label: 'Confirmed', icon: '📝', colors: ['pending', 'confirmed'] },
  { id: 'processing', label: 'Cleaning', icon: '🧼', colors: ['processing', 'in_progress'] },
  { id: 'ready', label: 'Ready', icon: '👔', colors: ['ready'] },
  { id: 'delivered', label: 'Delivered', icon: '🚚', colors: ['completed'] }
]

export default function OrderTimeline({ status }: OrderTimelineProps) {
  // Determine current stage index
  const currentIdx = steps.findIndex(step => step.colors.includes(status))
  const isCancelled = status === 'cancelled'

  if (isCancelled) {
    return (
      <div className="timeline-cancelled glass" style={{ padding: '12px 20px', borderRadius: '12px', border: '1px solid #ef444440', color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>⚠️</span> This order was cancelled.
      </div>
    )
  }

  return (
    <div className="order-timeline-container" style={{ margin: '24px 0 12px' }}>
      <div className="timeline-track" style={{ 
        position: 'relative', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 10px'
      }}>
        {/* Connection Line */}
        <div style={{ 
          position: 'absolute', 
          top: '18px', 
          left: '40px', 
          right: '40px', 
          height: '2px', 
          background: 'rgba(255,255,255,0.08)',
          zIndex: 0
        }}>
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(Math.max(0, currentIdx) / (steps.length - 1)) * 100}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{ 
              height: '100%', 
              background: 'linear-gradient(90deg, #f5c842, #4fc3f7)',
              boxShadow: '0 0 10px rgba(245,200,66,0.3)'
            }}
          />
        </div>

        {steps.map((step, idx) => {
          const isDone = idx < currentIdx
          const isActive = idx === currentIdx
          const isPending = idx > currentIdx

          return (
            <div key={idx} style={{ 
              position: 'relative', 
              zIndex: 1, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              width: '80px'
            }}>
              <motion.div 
                initial={false}
                animate={{ 
                  scale: isActive ? 1.2 : 1,
                  backgroundColor: isDone || isActive ? 'rgba(245, 200, 66, 0.2)' : 'rgba(255,255,255,0.03)',
                  borderColor: isDone || isActive ? '#f5c842' : 'rgba(255,255,255,0.1)'
                }}
                style={{ 
                  width: '36px', 
                  height: '36px', 
                  borderRadius: '12px', 
                  border: '1px solid',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  marginBottom: '8px',
                  boxShadow: isActive ? '0 0 20px rgba(245,200,66,0.2)' : 'none'
                }}
              >
                {isDone ? '✅' : step.icon}
                {isActive && (
                  <motion.div 
                    layoutId="active-glow"
                    className="active-glow"
                    style={{ 
                      position: 'absolute', 
                      inset: -4, 
                      borderRadius: '16px', 
                      border: '2px solid #f5c842',
                      opacity: 0.3
                    }}
                    animate={{ opacity: [0.2, 0.5, 0.2] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                )}
              </motion.div>
              <span style={{ 
                fontSize: '0.65rem', 
                fontWeight: isActive ? 800 : 500,
                color: isActive ? '#f5c842' : isDone ? 'var(--text-primary)' : 'var(--text-muted)',
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
