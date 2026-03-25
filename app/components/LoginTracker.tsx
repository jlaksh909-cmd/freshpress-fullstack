"use client"

import { useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"

export default function LoginTracker() {
  const supabase = createClient()
  const hasLogged = useRef(false)

  useEffect(() => {
    // Only log once per browser session
    if (sessionStorage.getItem('fp_login_logged')) {
      hasLogged.current = true
      return
    }

    const checkAndLog = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user && !hasLogged.current) {
        hasLogged.current = true
        sessionStorage.setItem('fp_login_logged', 'true')
        
        try {
          const userAgent = window.navigator.userAgent
          // Attempt to get a rough IP (or just use the server-side one if RPC handles it)
          // We'll call the RPC we created
          await supabase.rpc('log_user_login', {
            p_ip: 'Client-side Action', // Best effort; SQL can use inet_client_addr if needed
            p_ua: userAgent
          })
        } catch (err) {
          console.error("Failed to log login:", err)
        }
      }
    }

    checkAndLog()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user && !hasLogged.current) {
        checkAndLog()
      } else if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem('fp_login_logged')
        hasLogged.current = false
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  return null // This component doesn't render anything
}
