'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { postLoginDestination } from '@/lib/circles'
import { Loader2 } from 'lucide-react'

// Google (and other OAuth) providers redirect back here after sign-in.
// We wait for Supabase to establish the session, then send the user on.
export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    // Supabase auto-detects the session from the URL on load.
    // Once it's ready, send them on — to an invite-link join if one is
    // pending (they opened an invite link while logged out), else watchlist.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          router.replace(postLoginDestination())
        }
      },
    )

    // Fallback: check immediately in case the event already fired
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace(postLoginDestination())
      else {
        // No session after a short wait → send back to login
        setTimeout(() => router.replace('/login'), 2000)
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-rose-50 via-purple-50 to-sky-50">
      <div className="text-4xl">🍿</div>
      <Loader2 size={28} className="animate-spin text-rose-400" />
      <p className="text-sm text-gray-400">Signing you in...</p>
    </main>
  )
}
