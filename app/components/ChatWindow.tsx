"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, User, ShieldCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Message {
  id: string
  sender_id: string
  content: string
  created_at: string
}

interface ChatWindowProps {
  isOpen: boolean
  userId: string
  adminId?: string // If null, it's general support
}

export default function ChatWindow({ isOpen, userId }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!isOpen) return

    fetchMessages()

    const channel = supabase
      .channel(`chat-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${userId}` },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message])
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${userId}` },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isOpen, userId])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  async function fetchMessages() {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: true })

    if (error) {
      console.error("Fetch messages error:", error)
    } else {
      setMessages(data || [])
    }
    setLoading(false)
  }

  async function sendMessage() {
    if (!input.trim()) return

    const { error } = await supabase
      .from('messages')
      .insert({
        sender_id: userId,
        content: input
      })

    if (error) {
      console.error("Send message error:", error)
      alert("Failed to send message: " + error.message)
    } else {
      setInput("")
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          style={{
            position: 'fixed',
            bottom: '100px',
            right: '30px',
            width: '380px',
            height: '500px',
            background: 'rgba(15, 15, 35, 0.85)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck color="#3b82f6" size={20} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>FreshPress Support</h4>
              <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>Active Now</span>
            </div>
          </div>

          {/* Messages Area */}
          <div 
            ref={scrollRef}
            style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            {messages.map((msg) => (
              <div 
                key={msg.id}
                style={{
                  alignSelf: msg.sender_id === userId ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  padding: '12px 16px',
                  borderRadius: msg.sender_id === userId ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.sender_id === userId ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)',
                  fontSize: '0.9rem',
                  lineHeight: 1.5,
                  border: msg.sender_id === userId ? 'none' : '1px solid rgba(255,255,255,0.1)'
                }}
              >
                {msg.content}
              </div>
            ))}
            {loading && <div style={{ textAlign: 'center', opacity: 0.5, fontSize: '0.8rem' }}>Loading conversation...</div>}
            {!loading && messages.length === 0 && (
              <div style={{ textAlign: 'center', opacity: 0.4, fontSize: '0.85rem', marginTop: '40px' }}>
                👋 Hi! How can we help you today?
              </div>
            )}
          </div>

          {/* Input Area */}
          <div style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
            <button 
              onClick={sendMessage}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'var(--accent-blue)',
                border: 'none',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <Send size={18} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
