'use client'

// The friends list now lives inline on the /circles page, so this standalone
// screen is retired. Kept as a redirect so any old bookmarks/links still resolve.
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CircleMembersRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/circles')
  }, [router])
  return null
}
