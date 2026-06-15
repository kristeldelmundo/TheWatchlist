'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'
import { useOnboarding } from './OnboardingProvider'
import { Loader2 } from 'lucide-react'

// Wrap any page that requires login. Redirects to /login if not authenticated.
// Once authenticated, if the user hasn't completed onboarding yet, opens the
// onboarding modal on top of the page instead of redirecting.
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const { open: onboardingOpen, openOnboarding } = useOnboarding()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [loading, user, router])

  useEffect(() => {
    if (!loading && user && profile && profile.onboarding_completed === false && !onboardingOpen) {
      openOnboarding()
    }
  }, [loading, user, profile, onboardingOpen, openOnboarding])

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

  return <>{children}</>
}
