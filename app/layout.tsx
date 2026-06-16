import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { CircleProvider } from '@/components/auth/CircleProvider'
import { OnboardingProvider } from '@/components/auth/OnboardingProvider'
import { TabTourProvider } from '@/components/auth/TabTourProvider'

export const metadata: Metadata = {
  title: 'CinePop 🍿',
  description: 'Pick, watch, and feel — your shared movie night app.',
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
        <AuthProvider>
          <CircleProvider>
            <TabTourProvider>
              <OnboardingProvider>{children}</OnboardingProvider>
            </TabTourProvider>
          </CircleProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
