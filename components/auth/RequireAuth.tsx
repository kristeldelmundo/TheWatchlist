'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from './AuthProvider'
import { Loader2 } from 'lucide-react'

// Paths that should never redirect into onboarding (onboarding itself, plus
// the invite-join flow which should complete uninterrupted).
const ONBOARDING_EXEMPT_PREFIXES = ['/onboarding', '/join']

// Wrap any page that requires login. Redirects to /login if not authenticated,
// and to /onboarding if the user hasn't completed onboarding yet.
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const exempt = ONBOARDING_EXEMPT_PREFIXES.some(p => pathname?.startsWith(p))

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/login')
      return
    }
    if (!exempt && profile && profile.onboarding_completed === false) {
      router.replace('/onboarding')
    }
  }, [loading, user, profile, exempt, router])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 size={32} className="animate-spin text-rose-400" />
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!user) {
    // Redirecting — render nothing to avoid a flash of protected content
    return null
  }

  if (!exempt && profile && profile.onboarding_completed === false) {
    // Redirecting to onboarding — render nothing to avoid a flash of protected content
    return null
  }

  return <>{children}</>
}
