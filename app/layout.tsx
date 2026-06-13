import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CinePop 🍿',
  description: 'Pick, watch, and feel — your shared movie night app.',
  icons: { icon: '/favicon.ico' },
  openGraph: {
    title: 'CinePop',
    description: 'Pick, watch, and feel — your shared movie night app.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="grain min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-sky-50">
        {children}
      </body>
    </html>
  )
}
