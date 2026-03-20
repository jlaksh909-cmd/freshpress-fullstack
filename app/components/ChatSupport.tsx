"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import ChatBubble from "./ChatBubble"
import ChatWindow from "./ChatWindow"

export default function ChatSupport() {
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
      }
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!user) return null

  return (
    <>
      <ChatBubble isOpen={isOpen} onClick={() => setIsOpen(!isOpen)} />
      <ChatWindow isOpen={isOpen} userId={user.id} />
    </>
  )
}
