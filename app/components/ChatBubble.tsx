"use client"

import { motion } from "framer-motion"
import { MessageCircle, X } from "lucide-react"

interface ChatBubbleProps {
  isOpen: boolean
  onClick: () => void
  hasUnread?: boolean
}

export default function ChatBubble({ isOpen, onClick, hasUnread }: ChatBubbleProps) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      style={{
        position: 'fixed',
        bottom: '30px',
        right: '30px',
        width: '60px',
        height: '60px',
        borderRadius: '30px',
        background: isOpen ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        zIndex: 1000,
        cursor: 'pointer'
      }}
    >
      {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      
      {hasUnread && !isOpen && (
        <span style={{
          position: 'absolute',
          top: '0',
          right: '5px',
          width: '14px',
          height: '14px',
          background: '#ef4444',
          borderRadius: '50%',
          border: '2px solid #07071a'
        }} />
      )}
    </motion.button>
  )
}
