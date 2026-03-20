"use client"

import { motion, AnimatePresence } from "framer-motion"
import { ReactNode } from "react"

interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export default function Drawer({ isOpen, onClose, title, children }: DrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="drawer-backdrop"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(4px)',
              zIndex: 1000,
            }}
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="drawer-panel glass"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              maxWidth: '400px',
              zIndex: 1001,
              padding: '32px 24px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.2)',
              background: 'var(--modal-bg)',
              borderLeft: '1px solid var(--glass-border)',
            }}
          >
            <div className="drawer-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{title}</h2>
              <button
                onClick={onClose}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                }}
              >
                ✕
              </button>
            </div>

            <div className="drawer-content" style={{ flex: 1, overflowY: 'auto' }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
