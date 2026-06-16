'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { loadProfileStats, findProfileIdentifier, type ProfileStats } from '@/lib/profile'
import { resolveBgStyle } from '@/lib/theme'
import ProfileCard, { type ProfileCardData } from '@/components/profile/ProfileCard'
import ReviewsList from '@/components/profile/ReviewsList'
import { Loader2 } from 'lucide-react'

export default function PublicProfilePage() {
  const params = useParams()
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string | undefined)

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<ProfileCardData | null>(null)
  const [stats, setStats] = useState<ProfileStats>({ watched: 0, reviews: 0, avg: 0, topReaction: null })
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!id) { setNotFound(true); setLoading(false); return }
      // /@<username> and /@<uuid> both route here — figure out which we got.
      const { column, value } = await findProfileIdentifier(decodeURIComponent(id))
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url, accent_color, bio, tagline, fav_genres, now_watching, now_watching_started_at, custom_picks, picks, font_family, font_scale, text_color, bg_type, bg_image')
        .eq(column, value)
        .single()
      if (cancelled) return
      if (error || !data) { setNotFound(true); setLoading(false); return }
      setProfile(data as ProfileCardData)
      const s = await loadProfileStats(data.id)
      if (cancelled) return
      setStats(s)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [id])

  // Background: use the profile's own bg if it has one, else the CinePop default.
  const bgStyle = resolveBgStyle(
    (profile as unknown as { bg_type?: string | null })?.bg_type,
    (profile as unknown as { bg_image?: string | null })?.bg_image,
  )

  return (
    <div className="min-h-screen" style={bgStyle}>
      <style>{`
        @keyframes cp-pulse { 0%{box-shadow:0 0 0 0 rgba(74,222,128,0.6)} 70%{box-shadow:0 0 0 6px rgba(74,222,128,0)} 100%{box-shadow:0 0 0 0 rgba(74,222,128,0)} }
        .cp-live{width:8px;height:8px;border-radius:50%;background:#4ade80;display:inline-block;animation:cp-pulse 2s infinite}
        .cp-card{background:rgba(255,255,255,0.78);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.55);}
      `}</style>

      {/* Lightweight top bar with the CinePop wordmark (links home). */}
      <header className="max-w-2xl mx-auto px-4 pt-6 pb-2 flex items-center justify-between">
        <Link href="/" className="font-display text-2xl font-bold text-gray-800">
          Cine<span className="gradient-text italic">Pop</span>
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {loading && (
          <div className="flex items-center justify-center py-24 text-rose-400">
            <Loader2 size={28} className="animate-spin" />
          </div>
        )}

        {!loading && notFound && (
          <div className="cp-card rounded-[22px] p-10 text-center shadow-lg shadow-black/5">
            <div className="text-4xl mb-3">🍿</div>
            <div className="font-display text-xl font-bold text-gray-800">Profile not found</div>
            <p className="text-sm text-gray-500 mt-1.5">This link may be broken or the profile no longer exists.</p>
            <Link href="/" className="inline-block mt-5 bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium px-5 py-2.5 rounded-full transition-all">
              Go to CinePop
            </Link>
          </div>
        )}

        {!loading && profile && (
          <>
            <ProfileCard profile={profile} stats={stats} />

            {/* Past reviews — what they actually thought, not just a count */}
            <div className="cp-card rounded-[22px] p-6 mt-4 shadow-lg shadow-black/5">
              <div className="text-[12px] font-bold uppercase tracking-wide mb-1 text-gray-400">
                {profile.display_name || 'Their'} reviews
              </div>
              <ReviewsList userId={profile.id} />
            </div>

            {/* CTA for visitors */}
            <div className="mt-5 text-center">
              <p className="text-[13px] text-gray-500">
                Made with <Link href="/" className="font-semibold text-rose-500 hover:underline">CinePop</Link> — your movie &amp; TV watchlist with friends.
              </p>
              <Link
                href="/"
                className="inline-block mt-3 bg-white/80 hover:bg-white text-rose-600 text-sm font-semibold px-5 py-2.5 rounded-full transition-all shadow-sm"
              >
                Make your own profile
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
