"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { createClient } from "@/lib/supabase/client"

interface Notification {
  id: string
  title: string
  content: string
  type: string
  is_read: boolean
  created_at: string
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    async function fetchNotifications() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (data) {
        setNotifications(data)
        setUnreadCount(data.filter(n => !n.is_read).length)
      }
    }

    fetchNotifications()

    // Subscribe to new notifications
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newNotif = payload.new as Notification
          setNotifications(prev => [newNotif, ...prev].slice(0, 10))
          setUnreadCount(prev => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  return (
    <div className="notification-wrapper" style={{ position: 'relative' }}>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen && unreadCount > 0) markAllAsRead()
        }}
        className="notification-btn"
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
          position: 'relative'
        }}
      >
        <span style={{ fontSize: '1.2rem' }}>🔔</span>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-5px',
            right: '-5px',
            background: '#ff4b2b',
            color: 'white',
            borderRadius: '50%',
            width: '18px',
            height: '18px',
            fontSize: '0.65rem',
            fontWeight: 900,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 10px rgba(255,75,43,0.5)'
          }}>
            {unreadCount}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="notification-dropdown glass"
            style={{
              position: 'absolute',
              top: '50px',
              right: '0',
              width: '320px',
              maxHeight: '400px',
              borderRadius: '20px',
              overflowY: 'auto',
              zIndex: 1000,
              padding: '16px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Notifications</h4>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  style={{ background: 'none', border: 'none', color: '#f5c842', fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  Mark all read
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(238,242,255,0.4)', fontSize: '0.9rem' }}>
                  No notifications yet
                </div>
              ) : (
                notifications.map(n => (
                  <div 
                    key={n.id} 
                    style={{ 
                      padding: '12px', 
                      borderRadius: '12px', 
                      background: n.is_read ? 'rgba(255,255,255,0.03)' : 'rgba(245,200,66,0.05)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      position: 'relative'
                    }}
                  >
                    {!n.is_read && <div style={{ position: 'absolute', top: '12px', right: '12px', width: '6px', height: '6px', background: '#f5c842', borderRadius: '50%' }}></div>}
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '4px', color: n.type === 'order_update' ? '#4fc3f7' : 'white' }}>{n.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(238,242,255,0.6)', lineHeight: 1.4 }}>{n.content}</div>
                    <div style={{ fontSize: '0.65rem', opacity: 0.3, marginTop: '6px' }}>{new Date(n.created_at).toLocaleDateString()}</div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
