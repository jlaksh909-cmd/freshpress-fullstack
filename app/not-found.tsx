'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#07071a]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass text-center p-12 rounded-[32px] max-w-lg border border-white/5"
      >
        <h2 className="text-6xl font-black text-white mb-4">404</h2>
        <h3 className="text-2xl font-bold text-white mb-6">Lost in the Laundry?</h3>
        <p className="text-white/60 mb-8 text-lg">
          We couldn't find the page you're looking for. It might have been washed away or moved to another drawer.
        </p>
        <Link 
          href="/home" 
          className="btn-primary inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-lg font-bold"
        >
          Return Home
        </Link>
      </motion.div>
    </div>
  )
}
