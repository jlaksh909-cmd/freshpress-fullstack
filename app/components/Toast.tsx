"use client"

import { motion, AnimatePresence } from "framer-motion"

export type ToastType = "success" | "error" | "info"

interface ToastProps {
  message: string
  type?: ToastType
  onClose: () => void
}

export default function Toast({ message, type = "info", onClose }: ToastProps) {
  const icons = {
    success: "✓",
    error: "✕",
    info: "ℹ"
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 10, scale: 0.95 }}
      className={`toast ${type}`}
      onClick={onClose}
    >
      <div className="toast-icon">{icons[type]}</div>
      <div className="toast-content">
        <span className="toast-title">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
        <p className="toast-desc">{message}</p>
      </div>
    </motion.div>
  )
}

interface ToastContainerProps {
  toasts: { id: string; message: string; type: ToastType }[]
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="toast-container">
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => onRemove(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
