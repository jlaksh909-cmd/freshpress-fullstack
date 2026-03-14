import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FreshPress - Premium Laundry & Dry Cleaning Service',
  description: 'Professional laundry, dry cleaning & ironing with free doorstep pickup and delivery. Book your pickup in under 60 seconds.',
}

export const viewport: Viewport = {
  themeColor: '#07071a',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
