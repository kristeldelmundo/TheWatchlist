'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Navbar from '@/components/layout/Navbar'
import RequireAuth from '@/components/auth/RequireAuth'
import { useAuth } from '@/components/auth/AuthProvider'
import type { CustomPickItem } from '@/components/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { Loader2, Check, Camera, Pencil, Image as ImageIcon, Plus, X, Share2 } from 'lucide-react'
import { clsx } from 'clsx'
import { GENRES, genreByName, deriveViewerType } from '@/lib/profile'
import {
  ACCENTS, accentByValue, BG_PRESETS, resolveBgStyle, isDarkBg,
  FONTS, fontByValue, FONT_SCALES, fontScaleValue, TEXT_COLORS,
  DEFAULT_PICK_SLOTS, legacyPicksToCustom,
} from '@/lib/theme'
import CatalogPicker, { CatalogChoice } from '@/components/ui/CatalogPicker'
import ShareProfileModal from '@/components/profile/ShareProfileModal'

const BIO_MAX = 160
const TAGLINE_MAX = 80
const NOW_WATCHING_STALE_DAYS = 10

const REACTION_EMOJI: Record<string, string> = {
  Obsessed: '😍', 'So good': '🍿', 'We cried': '😭', 'Laughed so hard': '🤣',
  'Plot twist!': '🤯', 'Fell asleep': '😴', Meh: '😐', 'Would rewatch': '🔁',
  'Perfect date night': '💑', "So bad it's good": '💀',
}

interface Stats {
  watched: number
  reviews: number
  avg: number
  topReaction: string | null
}

function ProfileInner() {
  const { user, profile, refreshProfile } = useAuth()

  const [mode, setMode] = useState<'view' | 'edit'>('view')

  const [displayName, setDisplayName] = useState('')
  const [accent, setAccent] = useState('rose')
  const [bio, setBio] = useState('')
  const [tagline, setTagline] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [genres, setGenres] = useState<string[]>([])
  const [nowWatching, setNowWatching] = useState('')
  const [nowWatchingPoster, setNowWatchingPoster] = useState<string | null>(null)
  const [nowStartedAt, setNowStartedAt] = useState<string | null>(null)

  // Editable custom picks (replaces the fixed comfort/cry/guilty/hill slots).
  const [customPicks, setCustomPicks] = useState<CustomPickItem[]>([])

  // Theme background + style.
  const [bgType, setBgType] = useState<string | null>(null)
  const [bgImage, setBgImage] = useState<string | null>(null)
  const [fontFamily, setFontFamily] = useState('default')
  const [fontScale, setFontScale] = useState('base')
  const [textColor, setTextColor] = useState('default')

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [bgUploading, setBgUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const bgFileRef = useRef<HTMLInputElement>(null)

  // Share modal + ref to the view card (for image export).
  const [shareOpen, setShareOpen] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const [stats, setStats] = useState<Stats>({ watched: 0, reviews: 0, avg: 0, topReaction: null })

  // Index of the custom-pick slot whose CatalogPicker is open (lift z-index).
  const [openSlot, setOpenSlot] = useState<number | null>(null)
  const [nowOpen, setNowOpen] = useState(false)

  const hydrate = useCallback(() => {
    if (!profile) return
    setDisplayName(profile.display_name || '')
    setAccent(profile.accent_color || 'rose')
    setBio(profile.bio || '')
    setTagline(profile.tagline || '')
    setAvatarUrl(profile.avatar_url || null)
    setGenres(profile.fav_genres || [])
    setNowWatching(profile.now_watching || '')
    setNowStartedAt(profile.now_watching_started_at || null)
    setBgType(profile.bg_type || null)
    setBgImage(profile.bg_image || null)
    setFontFamily(profile.font_family || 'default')
    setFontScale(profile.font_scale || 'base')
    setTextColor(profile.text_color || 'default')
    setNowWatchingPoster(null)
    // Prefer custom_picks; otherwise convert legacy picks once so nothing is lost.
    if (profile.custom_picks && profile.custom_picks.length > 0) {
      setCustomPicks(profile.custom_picks)
    } else {
      setCustomPicks(legacyPicksToCustom(profile.picks))
    }
  }, [profile])

  useEffect(() => { hydrate() }, [hydrate])

  const loadStats = useCallback(async () => {
    if (!user) return
    const { data: reviews } = await supabase
      .from('reviews').select('rating, reactions').eq('reviewer_id', user.id)
    const { count: watchedCount } = await supabase
      .from('watchlist_items').select('id', { count: 'exact', head: true })
      .eq('added_by_id', user.id).eq('watched', true)

    let avg = 0
    let topReaction: string | null = null
    if (reviews && reviews.length > 0) {
      const rated = reviews.filter(r => (r.rating ?? 0) > 0)
      if (rated.length > 0) avg = rated.reduce((s, r) => s + (r.rating || 0), 0) / rated.length
      const counts: Record<string, number> = {}
      reviews.forEach(r => (r.reactions || []).forEach((lbl: string) => { counts[lbl] = (counts[lbl] || 0) + 1 }))
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
      if (top) topReaction = top[0]
    }
    setStats({ watched: watchedCount || 0, reviews: reviews?.length || 0, avg: Math.round(avg * 10) / 10, topReaction })
  }, [user])
  useEffect(() => { loadStats() }, [loadStats])

  const nowIsStale = (() => {
    if (!nowStartedAt) return false
    const days = (Date.now() - new Date(nowStartedAt).getTime()) / (1000 * 60 * 60 * 24)
    return days > NOW_WATCHING_STALE_DAYS
  })()
  const showNowWatching = nowWatching.trim() && !nowIsStale

  function daysAgoLabel(iso: string | null): string {
    if (!iso) return ''
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
    if (days <= 0) return 'today'
    if (days === 1) return 'yesterday'
    return `${days}d ago`
  }

  async function handlePickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadError(null)
    if (!file.type.startsWith('image/')) { setUploadError('Please choose an image file.'); return }
    if (file.size > 5 * 1024 * 1024) { setUploadError('Image must be under 5MB.'); return }
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${user.id}/avatar_${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, cacheControl: '3600' })
      if (upErr) throw upErr
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      setAvatarUrl(data.publicUrl)
    } catch {
      setUploadError('Upload failed — please try again.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleBgFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadError(null)
    if (!file.type.startsWith('image/')) { setUploadError('Please choose an image file.'); return }
    if (file.size > 5 * 1024 * 1024) { setUploadError('Background must be under 5MB.'); return }
    setBgUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${user.id}/bg_${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, cacheControl: '3600' })
      if (upErr) throw upErr
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      setBgImage(data.publicUrl)
      setBgType('upload')
    } catch {
      setUploadError('Background upload failed — please try again.')
    } finally {
      setBgUploading(false)
      if (bgFileRef.current) bgFileRef.current.value = ''
    }
  }

  function pickBgPreset(id: string) {
    setBgType('preset')
    setBgImage(`preset:${id}`)
  }

  function toggleGenre(name: string) {
    setGenres(prev => prev.includes(name) ? prev.filter(g => g !== name) : [...prev, name])
  }

  // ---- custom pick editing ----
  function updatePickField(idx: number, field: keyof CustomPickItem, value: string) {
    setCustomPicks(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p))
  }
  function setPickTitle(idx: number, choice: CatalogChoice | null) {
    setCustomPicks(prev => prev.map((p, i) => {
      if (i !== idx) return p
      if (!choice) return { ...p, title: '', year: null, poster: null, type: null }
      return { ...p, title: choice.title, year: choice.year, poster: choice.poster, type: choice.type }
    }))
  }
  function addPickSlot() {
    setCustomPicks(prev => [...prev, { emoji: '🎬', label: 'New category', title: '', year: null, poster: null, type: null }])
  }
  function removePickSlot(idx: number) {
    setCustomPicks(prev => prev.filter((_, i) => i !== idx))
    setOpenSlot(null)
  }
  function handleSlotOpenChange(idx: number, isOpen: boolean) {
    setOpenSlot(prev => (isOpen ? idx : (prev === idx ? null : prev)))
  }

  function setNowWatchingChoice(choice: CatalogChoice | null) {
    if (!choice) { setNowWatching(''); setNowWatchingPoster(null); setNowStartedAt(null); return }
    setNowWatching(choice.title)
    setNowWatchingPoster(choice.poster)
  }

  function cancelEdit() {
    hydrate()
    setOpenSlot(null)
    setNowOpen(false)
    setSaveError(null)
    setMode('view')
  }

  async function save() {
    if (!user) return
    setSaving(true)
    setSaveError(null)
    const viewerType = deriveViewerType(genres, stats.avg)
    const startedAt =
      nowWatching.trim() && nowWatching.trim() !== (profile?.now_watching || '').trim()
        ? new Date().toISOString()
        : nowStartedAt
    // Drop empty slots (no title) before saving.
    const cleanPicks = customPicks.filter(p => p.title && p.title.trim())
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        accent_color: accent,
        bio: bio.slice(0, BIO_MAX),
        tagline: tagline.slice(0, TAGLINE_MAX),
        avatar_url: avatarUrl,
        fav_genres: genres,
        viewer_type: viewerType,
        now_watching: nowWatching.trim() || null,
        now_watching_started_at: nowWatching.trim() ? startedAt : null,
        custom_picks: cleanPicks,
        bg_type: bgType,
        bg_image: bgImage,
        font_family: fontFamily,
        font_scale: fontScale,
        text_color: textColor,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) {
      setSaveError(error.message || 'Could not save. Please try again.')
      setSaving(false)
      return
    }

    await refreshProfile()
    setNowStartedAt(nowWatching.trim() ? startedAt : null)
    setSaving(false)
    setOpenSlot(null)
    setNowOpen(false)
    setMode('view')
  }

  const accentObj = accentByValue(accent)

  const initial = (displayName || user?.email || 'Y').charAt(0).toUpperCase()
  const viewerType = deriveViewerType(genres, stats.avg)

  const nowWatchingChoice: CatalogChoice | null = nowWatching.trim()
    ? { title: nowWatching, year: null, poster: nowWatchingPoster, type: 'movie' }
    : null

  const visiblePicks = customPicks.filter(p => p.title && p.title.trim())
  const hasAnyPick = visiblePicks.length > 0
  const aPickerIsOpen = openSlot !== null

  // Background + style.
  const bgStyle = resolveBgStyle(bgType, bgImage)
  const darkBg = isDarkBg(bgType, bgImage)
  const headingColor = darkBg ? 'text-white' : 'text-gray-800'

  const fontStack = fontByValue(fontFamily).stack
  const scale = fontScaleValue(fontScale)
  const customTextColor = textColor && textColor !== 'default'
    ? (TEXT_COLORS.find(c => c.value === textColor)?.hex || undefined)
    : undefined

  // The view card inherits font + base size + (optional) text color.
  const cardStyle: React.CSSProperties = {
    fontFamily: fontStack,
    fontSize: `${scale}em`,
    ...(customTextColor ? { color: customTextColor } : {}),
  }
  // When a custom text color is set, let it cascade to the normally-gray text.
  const nameColor = customTextColor || undefined
  const bodyColor = customTextColor || undefined

  // Public share URL for this profile — pretty /@<id> form (rewritten to /u/[id]).
  const shareUrl = user
    ? (typeof window !== 'undefined' ? `${window.location.origin}/@${user.id}` : `https://cinepop.live/@${user.id}`)
    : ''

  return (
    <div className="min-h-screen" style={bgStyle}>
      <Navbar />
      <style>{`
        @keyframes cp-pop { 0%,100%{transform:translateY(0) rotate(-3deg)} 50%{transform:translateY(-3px) rotate(3deg)} }
        @keyframes cp-pulse { 0%{box-shadow:0 0 0 0 rgba(74,222,128,0.6)} 70%{box-shadow:0 0 0 6px rgba(74,222,128,0)} 100%{box-shadow:0 0 0 0 rgba(74,222,128,0)} }
        .cp-pop{display:inline-block;animation:cp-pop 1.4s ease-in-out infinite}
        .cp-live{width:8px;height:8px;border-radius:50%;background:#4ade80;display:inline-block;animation:cp-pulse 2s infinite}
        .cp-card{background:rgba(255,255,255,0.78);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.55);}
      `}</style>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className={clsx('font-display text-3xl font-bold', headingColor)}>
            My <span className="gradient-text italic">Profile</span>
          </h1>
          {mode === 'view' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShareOpen(true)}
                className="flex items-center gap-1.5 bg-white/80 hover:bg-white text-rose-600 text-sm font-semibold px-4 py-2 rounded-full transition-all shadow-sm"
              >
                <Share2 size={14} /> Share
              </button>
              <button
                onClick={() => setMode('edit')}
                className="flex items-center gap-1.5 bg-white/80 hover:bg-white text-rose-600 text-sm font-semibold px-4 py-2 rounded-full transition-all shadow-sm"
              >
                <Pencil size={14} /> Edit
              </button>
            </div>
          )}
        </div>

        {/* ===================== VIEW MODE — one wide card ===================== */}
        {mode === 'view' && (
          <div ref={cardRef} className="cp-card rounded-[22px] p-7 shadow-lg shadow-black/5" style={cardStyle}>
            {/* Header row */}
            <div className="flex gap-5 items-center">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={displayName || 'You'} className="rounded-full object-cover flex-shrink-0 ring-2 ring-white shadow" style={{ width: 80, height: 80 }} />
              ) : (
                <span className="rounded-full flex items-center justify-center text-4xl font-bold text-white flex-shrink-0 font-display" style={{ width: 80, height: 80, background: accentObj.ring }}>
                  {initial}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-display text-3xl font-bold leading-tight" style={{ color: nameColor || '#1f2937' }}>{displayName || 'Your name'}</div>
                {genres.length > 0 && (
                  <div className="text-base font-display italic font-bold leading-tight mt-1" style={{ color: customTextColor || '#a855f7' }}>✨ {viewerType}</div>
                )}
                {tagline && <div className="text-[15px] italic truncate mt-1" style={{ color: customTextColor || '#fb7093' }}>&ldquo;{tagline}&rdquo;</div>}
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

            {bio && <p className="text-[15px] leading-relaxed mt-4" style={{ color: bodyColor || '#4b5563' }}>{bio}</p>}

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

            {/* If I had to pick — editable categories, 2-col grid */}
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
        )}

        {/* ===================== EDIT MODE ===================== */}
        {mode === 'edit' && (
          <>
            {/* Header edit */}
            <div className="cp-card rounded-[20px] p-5 mb-3 text-center">
              <div className="relative inline-block">
                <button type="button" onClick={() => fileRef.current?.click()} className="group relative block mx-auto" title="Change photo">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt={displayName || 'You'} className="rounded-full object-cover ring-2 ring-white shadow" style={{ width: 84, height: 84 }} />
                  ) : (
                    <span className="rounded-full flex items-center justify-center text-3xl font-bold text-white font-display" style={{ width: 84, height: 84, background: accentObj.ring }}>
                      {initial}
                    </span>
                  )}
                  <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    {uploading ? <Loader2 size={18} className="text-white animate-spin" /> : <Camera size={18} className="text-white" />}
                  </span>
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handlePickFile} className="hidden" />
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">Tap photo to change</p>
              {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}

              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name"
                className="w-full text-center bg-white/80 border border-rose-100 rounded-xl px-3 py-2 text-sm mt-2.5 outline-none focus:border-rose-300"
              />
              <input
                value={tagline}
                onChange={e => setTagline(e.target.value.slice(0, TAGLINE_MAX))}
                placeholder="Add a tagline…"
                className="w-full text-center bg-white/80 border border-rose-100 rounded-xl px-3 py-2 text-sm mt-2 outline-none focus:border-rose-300 italic text-rose-500"
              />
            </div>

            {/* Bio */}
            <div className="cp-card rounded-[20px] p-4 mb-3 relative z-10">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Bio</label>
                <span className={clsx('text-[11px]', bio.length > BIO_MAX - 20 ? 'text-rose-400' : 'text-gray-300')}>{bio.length}/{BIO_MAX}</span>
              </div>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
                rows={3}
                placeholder="A little about your movie taste..."
                className="w-full bg-white/80 border border-rose-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-rose-300 resize-none"
              />
            </div>

            {/* Theme: accent + background + style */}
            <div className="cp-card rounded-[20px] p-4 mb-3">
              <label className="block text-[10px] font-semibold text-gray-400 mb-2 uppercase tracking-wide">Accent color</label>
              <div className="flex flex-wrap gap-2 mb-4">
                {ACCENTS.map((a) => (
                  <button key={a.value} onClick={() => setAccent(a.value)}
                    className={clsx('w-8 h-8 rounded-full transition-all', accent === a.value ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'opacity-70 hover:opacity-100')}
                    style={{ background: a.ring }}
                    title={a.label} />
                ))}
              </div>

              <label className="block text-[10px] font-semibold text-gray-400 mb-2 uppercase tracking-wide">Background</label>
              <div className="grid grid-cols-4 gap-2">
                {BG_PRESETS.map(p => {
                  const on = bgType === 'preset' && bgImage === `preset:${p.id}`
                  return (
                    <button key={p.id} onClick={() => pickBgPreset(p.id)}
                      className={clsx('h-12 rounded-xl transition-all relative overflow-hidden', on ? 'ring-2 ring-offset-1 ring-rose-400 scale-105' : 'opacity-85 hover:opacity-100')}
                      style={{ background: p.css }} title={p.label}>
                      {on && <span className="absolute inset-0 flex items-center justify-center"><Check size={16} className="text-white drop-shadow" /></span>}
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={() => bgFileRef.current?.click()}
                className={clsx('mt-2.5 w-full flex items-center justify-center gap-2 border rounded-xl py-2 text-[12px] font-medium transition-all',
                  bgType === 'upload' ? 'border-rose-300 bg-rose-50 text-rose-600' : 'border-rose-100 text-gray-500 hover:border-rose-300')}
              >
                {bgUploading ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                {bgType === 'upload' ? 'Background photo set — tap to change' : 'Upload your own background'}
              </button>
              <input ref={bgFileRef} type="file" accept="image/*" onChange={handleBgFile} className="hidden" />
              {(bgType === 'upload' || bgType === 'preset') && (
                <button onClick={() => { setBgType(null); setBgImage(null) }} className="mt-1.5 text-[11px] text-gray-400 hover:text-rose-500">
                  Reset to default background
                </button>
              )}

              {/* Font */}
              <label className="block text-[10px] font-semibold text-gray-400 mb-2 mt-5 uppercase tracking-wide">Font</label>
              <div className="flex flex-wrap gap-2">
                {FONTS.map(f => (
                  <button key={f.value} onClick={() => setFontFamily(f.value)}
                    className={clsx('px-3 py-1.5 rounded-lg text-[13px] border transition-all',
                      fontFamily === f.value ? 'border-rose-300 bg-rose-50 text-rose-600' : 'border-rose-100 text-gray-500 hover:border-rose-300')}
                    style={{ fontFamily: f.stack }}>
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Size */}
              <label className="block text-[10px] font-semibold text-gray-400 mb-2 mt-4 uppercase tracking-wide">Text size</label>
              <div className="flex gap-2">
                {FONT_SCALES.map(s => (
                  <button key={s.value} onClick={() => setFontScale(s.value)}
                    className={clsx('w-10 h-9 rounded-lg border font-bold transition-all',
                      fontScale === s.value ? 'border-rose-300 bg-rose-50 text-rose-600' : 'border-rose-100 text-gray-400 hover:border-rose-300')}>
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Text color */}
              <label className="block text-[10px] font-semibold text-gray-400 mb-2 mt-4 uppercase tracking-wide">Text color</label>
              <div className="flex flex-wrap gap-2">
                {TEXT_COLORS.map(c => (
                  <button key={c.value} onClick={() => setTextColor(c.value)}
                    className={clsx('w-8 h-8 rounded-full border transition-all', textColor === c.value ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'opacity-80 hover:opacity-100', c.value === 'white' ? 'border-gray-200' : 'border-transparent')}
                    style={{ background: c.hex }} title={c.label} />
                ))}
              </div>
            </div>

            {/* Now watching */}
            <div className={clsx('cp-card rounded-[20px] p-4 mb-3 relative', nowOpen ? 'z-50' : 'z-10')}>
              <label className="block text-[10px] font-semibold text-gray-400 mb-2 uppercase tracking-wide">Now watching</label>
              <CatalogPicker
                value={nowWatchingChoice}
                onChange={setNowWatchingChoice}
                onOpenChange={setNowOpen}
                placeholder="Search any movie or show… 🍿"
              />
              {nowWatching && (
                <button
                  onClick={() => setNowWatchingChoice(null)}
                  className="mt-2 text-[11px] text-gray-400 hover:text-rose-500"
                >
                  Clear now watching
                </button>
              )}
            </div>

            {/* Genres grid */}
            <div className="cp-card rounded-[20px] p-4 mb-3">
              <label className="block text-[10px] font-semibold text-gray-400 mb-2 uppercase tracking-wide">My genres — tap to pick</label>
              <div className="flex flex-wrap gap-1.5">
                {GENRES.map(g => {
                  const on = genres.includes(g.name)
                  return (
                    <button key={g.name} onClick={() => toggleGenre(g.name)}
                      className={clsx('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-semibold border transition-all',
                        !on && 'bg-white/80 text-gray-400 border-rose-100 hover:border-rose-300')}
                      style={on ? { background: g.bg, color: g.text, borderColor: g.bg } : undefined}>
                      <span>{g.emoji}</span> {g.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* If I had to pick — editable categories */}
            <div className={clsx('cp-card rounded-[20px] p-4 mb-3 relative', aPickerIsOpen ? 'z-50' : 'z-10')}>
              <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wide">My categories</label>
              <p className="text-[11px] text-gray-400 mb-3">Name each one (emoji + label), pick a title, add as many as you like.</p>
              <div className="flex flex-col gap-3.5">
                {customPicks.map((p, i) => {
                  const choice: CatalogChoice | null = p.title
                    ? { title: p.title, year: p.year, poster: p.poster, type: (p.type as CatalogChoice['type']) || 'movie' }
                    : null
                  return (
                    <div key={i} className="rounded-xl border border-rose-100 bg-white/60 p-2.5">
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          value={p.emoji}
                          onChange={e => updatePickField(i, 'emoji', e.target.value.slice(0, 2))}
                          className="w-10 text-center bg-white border border-rose-100 rounded-lg px-1 py-1.5 text-base outline-none focus:border-rose-300"
                          aria-label="Emoji"
                        />
                        <input
                          value={p.label}
                          onChange={e => updatePickField(i, 'label', e.target.value.slice(0, 30))}
                          placeholder="Category name (e.g. Best soundtrack)"
                          className="flex-1 bg-white border border-rose-100 rounded-lg px-2.5 py-1.5 text-[13px] outline-none focus:border-rose-300"
                        />
                        <button onClick={() => removePickSlot(i)} className="text-gray-300 hover:text-rose-500 flex-shrink-0 p-1" aria-label="Remove category">
                          <X size={16} />
                        </button>
                      </div>
                      <CatalogPicker
                        value={choice}
                        onChange={(c) => setPickTitle(i, c)}
                        onOpenChange={(o) => handleSlotOpenChange(i, o)}
                        placeholder="Search any movie or show…"
                      />
                    </div>
                  )
                })}
              </div>
              <button
                onClick={addPickSlot}
                className="mt-3 w-full flex items-center justify-center gap-1.5 border border-dashed border-rose-200 rounded-xl py-2 text-[13px] font-medium text-rose-500 hover:bg-rose-50 transition-all"
              >
                <Plus size={15} /> Add a category
              </button>
            </div>

            {saveError && (
              <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-3">
                Couldn&apos;t save: {saveError}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={save}
                disabled={saving || uploading || bgUploading}
                className="flex-1 flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-medium py-2.5 rounded-xl text-sm transition-all"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save profile
              </button>
              <button
                onClick={cancelEdit}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl text-sm text-gray-600 bg-white/70 hover:bg-white transition-all"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </main>

      <ShareProfileModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        shareUrl={shareUrl}
        cardRef={cardRef}
        fileBaseName={displayName || 'profile'}
      />
    </div>
  )
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

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileInner />
    </RequireAuth>
  )
}
