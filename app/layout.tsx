import type { Metadata, Viewport } from 'next'
import ChatSupport from "./components/ChatSupport"
import MobileBottomNav from "./components/MobileBottomNav"
import LoginTracker from "./components/LoginTracker"
import Footer from "./components/Footer"
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var savedTheme = localStorage.getItem('theme');
                  var theme = savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {}
              })();
            `,
          }}
        />
        {/* Placeholder for Analytics Integration (e.g. Google Analytics) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-XXXXXXXXXX', {
                page_path: window.location.pathname,
              });
            `,
          }}
        />
        <link rel="icon" href="/logo.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        <main>{children}</main>
        <Footer />
        <ChatSupport />
        <MobileBottomNav />
        <LoginTracker />
      </body>
    </html>
  )
}
