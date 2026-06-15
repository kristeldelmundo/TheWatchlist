'use client'

import { clsx } from 'clsx'
import { GENRES, genreByName, deriveViewerType, type ProfileStats } from '@/lib/profile'
import {
  accentByValue, fontByValue, fontScaleValue, TEXT_COLORS,
  legacyPicksToCustom,
} from '@/lib/theme'
import type { CustomPickItem } from '@/components/auth/AuthProvider'

const NOW_WATCHING_STALE_DAYS = 10

const REACTION_EMOJI: Record<string, string> = {
  Obsessed: '😍', 'So good': '🍿', 'We cried': '😭', 'Laughed so hard': '🤣',
  'Plot twist!': '🤯', 'Fell asleep': '😴', Meh: '😐', 'Would rewatch': '🔁',
  'Perfect date night': '💑', "So bad it's good": '💀',
}

// A profile-like shape — works for the signed-in user's Profile or any row
// fetched from the `profiles` table.
export interface ProfileCardData {
  id: string
  display_name: string | null
  avatar_url: string | null
  accent_color: string | null
  bio: string | null
  tagline: string | null
  fav_genres: string[] | null
  now_watching: string | null
  now_watching_started_at: string | null
  custom_picks: CustomPickItem[] | null
  picks: Record<string, { title: string; year: string | null; poster: string | null; type: string | null }> | null
  font_family: string | null
  font_scale: string | null
  text_color: string | null
}

function MiniStat({ icon, n, label, ring }: { icon: string; n: number | string; label: string; ring: string }) {
  return (
    <div className="text-center flex-1 min-w-0">
      <div className="text-[17px] leading-none">{icon}</div>
      {n !== '' && <div className="text-[20px] font-bold leading-none mt-1.5" style={{ color: ring }}>{n}</div>}
      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mt-1.5">{label}</div>
    </div>
  )
}

function MiniDiv() {
  return <div className="w-px self-stretch my-1" style={{ background: 'rgba(243,216,226,0.8)' }} />
}

// forwardRef so callers (e.g. the share-to-image flow) can snapshot the node.
import { forwardRef } from 'react'

const ProfileCard = forwardRef<HTMLDivElement, { profile: ProfileCardData; stats: ProfileStats }>(
  function ProfileCard({ profile, stats }, ref) {
    const accentObj = accentByValue(profile.accent_color)
    const displayName = profile.display_name || 'CinePop watcher'
    const initial = displayName.charAt(0).toUpperCase()
    const genres = profile.fav_genres || []
    const viewerType = deriveViewerType(genres, stats.avg)

    const customPicks: CustomPickItem[] =
      profile.custom_picks && profile.custom_picks.length > 0
        ? profile.custom_picks
        : legacyPicksToCustom(profile.picks)
    const visiblePicks = customPicks.filter(p => p.title && p.title.trim())
    const hasAnyPick = visiblePicks.length > 0

    const nowWatching = (profile.now_watching || '').trim()
    const nowIsStale = (() => {
      if (!profile.now_watching_started_at) return false
      const days = (Date.now() - new Date(profile.now_watching_started_at).getTime()) / (1000 * 60 * 60 * 24)
      return days > NOW_WATCHING_STALE_DAYS
    })()
    const showNowWatching = !!nowWatching && !nowIsStale

    const fontStack = fontByValue(profile.font_family).stack
    const scale = fontScaleValue(profile.font_scale)
    const customTextColor = profile.text_color && profile.text_color !== 'default'
      ? (TEXT_COLORS.find(c => c.value === profile.text_color)?.hex || undefined)
      : undefined
    const nameColor = customTextColor || undefined
    const bodyColor = customTextColor || undefined

    const cardStyle: React.CSSProperties = {
      fontFamily: fontStack,
      fontSize: `${scale}em`,
      ...(customTextColor ? { color: customTextColor } : {}),
    }

    return (
      <div ref={ref} className="cp-card rounded-[22px] p-7 shadow-lg shadow-black/5" style={cardStyle}>
        {/* Header row */}
        <div className="flex gap-5 items-center">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt={displayName} className="rounded-full object-cover flex-shrink-0 ring-2 ring-white shadow" style={{ width: 80, height: 80 }} />
          ) : (
            <span className="rounded-full flex items-center justify-center text-4xl font-bold text-white flex-shrink-0 font-display" style={{ width: 80, height: 80, background: accentObj.ring }}>
              {initial}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="font-display text-3xl font-bold leading-tight" style={{ color: nameColor || '#1f2937' }}>{displayName}</div>
            {genres.length > 0 && (
              <div className="text-base font-display italic font-bold leading-tight mt-1" style={{ color: customTextColor || '#a855f7' }}>✨ {viewerType}</div>
            )}
            {profile.tagline && <div className="text-[15px] italic truncate mt-1" style={{ color: customTextColor || '#fb7093' }}>&ldquo;{profile.tagline}&rdquo;</div>}
            {showNowWatching && (
              <div className="flex items-center gap-1.5 mt-1.5 min-w-0">
                <span className="cp-live flex-shrink-0" />
                <span className="text-[13px] truncate" style={{ color: bodyColor || '#6b7280' }}>
                  watching <span className="font-semibold" style={{ color: nameColor || '#374151' }}>{nowWatching}</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {profile.bio && <p className="text-[15px] leading-relaxed mt-4" style={{ color: bodyColor || '#4b5563' }}>{profile.bio}</p>}

        {/* Stats strip */}
        <div className="flex items-center mt-5 py-4 border-t border-b" style={{ borderColor: 'rgba(243,216,226,0.8)' }}>
          <MiniStat icon="🍿" n={stats.watched} label="Watched" ring={accentObj.ring} />
          <MiniDiv />
          <MiniStat icon="⭐" n={stats.reviews} label="Reviews" ring={accentObj.ring} />
          <MiniDiv />
          <MiniStat icon="📊" n={stats.avg > 0 ? stats.avg : '—'} label="Avg" ring={accentObj.ring} />
          <MiniDiv />
          <MiniStat icon={stats.topReaction ? REACTION_EMOJI[stats.topReaction] || '🍿' : '✨'} n="" label="React" ring={accentObj.ring} />
        </div>

        {/* Genres */}
        {genres.length > 0 && (
          <div className="mt-5">
            <div className="text-[12px] font-bold uppercase tracking-wide mb-2.5" style={{ color: customTextColor || '#9ca3af' }}>Genres</div>
            <div className="flex flex-wrap gap-2">
              {genres.map(name => {
                const g = genreByName(name)
                return (
                  <span key={name} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[14px] font-semibold"
                    style={g ? { background: g.bg, color: g.text } : undefined}>
                    {g ? `${g.emoji} ` : ''}{name}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* If I had to pick */}
        {hasAnyPick && (
          <div className="mt-5">
            <div className="text-[12px] font-bold uppercase tracking-wide mb-2.5" style={{ color: customTextColor || '#9ca3af' }}>If I had to pick…</div>
            <div className="grid grid-cols-2 gap-4">
              {visiblePicks.map((p, i) => (
                <div key={i} className="flex gap-2.5 items-center min-w-0">
                  <div className="rounded-md flex-shrink-0 flex items-center justify-center bg-rose-50 overflow-hidden" style={{ width: 44, height: 64 }}>
                    {p.poster ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.poster} alt={p.title} className="w-full h-full object-cover" />
                    ) : <span className="text-xl">{p.emoji || '🎬'}</span>}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wide font-bold leading-tight" style={{ color: customTextColor || '#fb7093' }}>{p.emoji} {p.label}</div>
                    <div className="text-[15px] font-semibold leading-tight truncate mt-0.5" style={{ color: nameColor || '#1f2937' }}>{p.title}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }
)

export default ProfileCard
