'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Navbar from '@/components/layout/Navbar'
import RequireAuth from '@/components/auth/RequireAuth'
import { useAuth } from '@/components/auth/AuthProvider'
import type { ProfilePicks, ProfilePick } from '@/components/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { Loader2, Check, Camera, Pencil, Image as ImageIcon } from 'lucide-react'
import { clsx } from 'clsx'
import { GENRES, genreByName, deriveViewerType } from '@/lib/profile'
import { ACCENTS, accentByValue, BG_PRESETS, resolveBgStyle, isDarkBg } from '@/lib/theme'
import CatalogPicker, { CatalogChoice } from '@/components/ui/CatalogPicker'

const BIO_MAX = 160
const TAGLINE_MAX = 80
const NOW_WATCHING_STALE_DAYS = 10

const REACTION_EMOJI: Record<string, string> = {
  Obsessed: '😍', 'So good': '🍿', 'We cried': '😭', 'Laughed so hard': '🤣',
  'Plot twist!': '🤯', 'Fell asleep': '😴', Meh: '😐', 'Would rewatch': '🔁',
  'Perfect date night': '💑', "So bad it's good": '💀',
}

const PICK_SLOTS: { key: string; emoji: string; label: string; short: string }[] = [
  { key: 'comfort', emoji: '🛋️', label: 'Comfort movie', short: 'Comfort' },
  { key: 'cry', emoji: '😢', label: 'Last great cry', short: 'Last cry' },
  { key: 'guilty', emoji: '🙈', label: 'Guilty pleasure', short: 'Guilty' },
  { key: 'hill', emoji: '⛰️', label: "Hill I'll die on", short: "Hill I'll die on" },
]

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
  const [picks, setPicks] = useState<ProfilePicks>({})

  // Theme background.
  const [bgType, setBgType] = useState<string | null>(null)
  const [bgImage, setBgImage] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [bgUploading, setBgUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const bgFileRef = useRef<HTMLInputElement>(null)

  const [stats, setStats] = useState<Stats>({ watched: 0, reviews: 0, avg: 0, topReaction: null })

  const [openSlot, setOpenSlot] = useState<string | null>(null)
  const [nowOpen, setNowOpen] = useState(false)

  function handleSlotOpenChange(slotKey: string, isOpen: boolean) {
    setOpenSlot(prev => {
      if (isOpen) return slotKey
      return prev === slotKey ? null : prev
    })
  }

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
    setPicks(profile.picks || {})
    setBgType(profile.bg_type || null)
    setBgImage(profile.bg_image || null)
    setNowWatchingPoster(null)
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

  function setPick(slotKey: string, choice: CatalogChoice | null) {
    if (!choice) {
      setPicks(prev => { const next = { ...prev }; delete next[slotKey]; return next })
      return
    }
    const pick: ProfilePick = { title: choice.title, year: choice.year, poster: choice.poster, type: choice.type }
    setPicks(prev => ({ ...prev, [slotKey]: pick }))
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
        picks,
        bg_type: bgType,
        bg_image: bgImage,
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
  const accentBg = accentObj.cls

  const initial = (displayName || user?.email || 'Y').charAt(0).toUpperCase()
  const viewerType = deriveViewerType(genres, stats.avg)

  const nowWatchingChoice: CatalogChoice | null = nowWatching.trim()
    ? { title: nowWatching, year: null, poster: nowWatchingPoster, type: 'movie' }
    : null

  const hasAnyPick = PICK_SLOTS.some(s => picks[s.key])
  const aPickerIsOpen = openSlot !== null

  // Background applied behind the whole page.
  const bgStyle = resolveBgStyle(bgType, bgImage)
  const darkBg = isDarkBg(bgType, bgImage)
  const headingColor = darkBg ? 'text-white' : 'text-gray-800'

  return (
    <div className="min-h-screen" style={bgStyle}>
      <Navbar />
      <style>{`
        @keyframes cp-pop { 0%,100%{transform:translateY(0) rotate(-3deg)} 50%{transform:translateY(-3px) rotate(3deg)} }
        @keyframes cp-pulse { 0%{box-shadow:0 0 0 0 rgba(74,222,128,0.6)} 70%{box-shadow:0 0 0 6px rgba(74,222,128,0)} 100%{box-shadow:0 0 0 0 rgba(74,222,128,0)} }
        .cp-pop{display:inline-block;animation:cp-pop 1.4s ease-in-out infinite}
        .cp-live{width:9px;height:9px;border-radius:50%;background:#4ade80;display:inline-block;animation:cp-pulse 2s infinite}
        .cp-card{background:rgba(255,255,255,0.78);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.55);}
      `}</style>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className={clsx('font-display text-4xl font-bold', headingColor)}>
            My <span className="gradient-text italic">Profile</span>
          </h1>
          {mode === 'view' && (
            <button
              onClick={() => setMode('edit')}
              className="flex items-center gap-2 bg-white/80 hover:bg-white text-rose-600 text-sm font-semibold px-5 py-2.5 rounded-full transition-all shadow-sm"
            >
              <Pencil size={16} /> Edit
            </button>
          )}
        </div>

        {/* ===================== VIEW MODE — one big card ===================== */}
        {mode === 'view' && (
          <div className="cp-card rounded-[28px] p-8 shadow-xl shadow-black/5">
            {/* Header row */}
            <div className="flex gap-6 items-center">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={displayName || 'You'} className="rounded-full object-cover flex-shrink-0 ring-4 ring-white shadow-lg" style={{ width: 112, height: 112 }} />
              ) : (
                <span className={clsx('rounded-full flex items-center justify-center text-5xl font-bold text-white flex-shrink-0 font-display shadow-lg', accentBg)} style={{ width: 112, height: 112 }}>
                  {initial}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-display text-3xl font-bold text-gray-800 leading-tight">{displayName || 'Your name'}</div>
                {genres.length > 0 && (
                  <div className="text-lg text-purple-500 font-display italic font-bold leading-tight mt-1">✨ {viewerType}</div>
                )}
                {tagline && <div className="text-base text-rose-400 italic truncate mt-1">&ldquo;{tagline}&rdquo;</div>}
              </div>
            </div>

            {bio && <p className="text-base text-gray-600 leading-relaxed mt-5">{bio}</p>}

            {/* Stats strip */}
            <div className="flex items-center mt-6 py-5 border-t border-b" style={{ borderColor: 'rgba(243,216,226,0.8)' }}>
              <MiniStat icon="🍿" n={stats.watched} label="Watched" ring={accentObj.ring} />
              <MiniDiv />
              <MiniStat icon="⭐" n={stats.reviews} label="Reviews" ring={accentObj.ring} />
              <MiniDiv />
              <MiniStat icon="📊" n={stats.avg > 0 ? stats.avg : '—'} label="Avg" ring={accentObj.ring} />
              <MiniDiv />
              <MiniStat icon={stats.topReaction ? REACTION_EMOJI[stats.topReaction] || '🍿' : '✨'} n="" label="React" ring={accentObj.ring} />
            </div>

            {/* Now watching */}
            {showNowWatching && (
              <div className="mt-6 rounded-[20px] p-5 flex items-center gap-5" style={{ background: 'linear-gradient(100deg,#e0457b,#a855f7)' }}>
                <div className="rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden" style={{ width: 60, height: 86, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)' }}>
                  {nowWatchingPoster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={nowWatchingPoster} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="cp-pop text-2xl">🍿</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="cp-live" />
                    <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.9)' }}>Watching now</span>
                  </div>
                  <div className="text-2xl font-bold text-white leading-tight truncate mt-1">{nowWatching}</div>
                </div>
                <span className="text-sm flex-shrink-0" style={{ color: 'rgba(255,255,255,0.7)' }}>{daysAgoLabel(nowStartedAt)}</span>
              </div>
            )}

            {/* Genres */}
            {genres.length > 0 && (
              <div className="mt-6">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Genres</div>
                <div className="flex flex-wrap gap-2.5">
                  {genres.map(name => {
                    const g = genreByName(name)
                    return (
                      <span key={name} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-base font-semibold"
                        style={g ? { background: g.bg, color: g.text } : undefined}>
                        {g ? `${g.emoji} ` : ''}{name}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            {/* If I had to pick — 2-col grid */}
            {hasAnyPick && (
              <div className="mt-6">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">If I had to pick…</div>
                <div className="grid grid-cols-2 gap-5">
                  {PICK_SLOTS.filter(s => picks[s.key]).map(s => {
                    const p = picks[s.key]
                    return (
                      <div key={s.key} className="flex gap-3.5 items-center min-w-0">
                        <div className="rounded-lg flex-shrink-0 flex items-center justify-center bg-rose-50 overflow-hidden" style={{ width: 60, height: 86 }}>
                          {p.poster ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.poster} alt={p.title} className="w-full h-full object-cover" />
                          ) : <span className="text-2xl">{s.emoji}</span>}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs uppercase tracking-wide text-rose-400 font-bold leading-tight">{s.short}</div>
                          <div className="text-lg font-semibold text-gray-800 leading-tight truncate mt-0.5">{p.title}</div>
                        </div>
                      </div>
                    )
                  })}
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
                    <img src={avatarUrl} alt={displayName || 'You'} className="rounded-full object-cover ring-2 ring-white shadow" style={{ width: 96, height: 96 }} />
                  ) : (
                    <span className={clsx('rounded-full flex items-center justify-center text-4xl font-bold text-white font-display', accentBg)} style={{ width: 96, height: 96 }}>
                      {initial}
                    </span>
                  )}
                  <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    {uploading ? <Loader2 size={20} className="text-white animate-spin" /> : <Camera size={20} className="text-white" />}
                  </span>
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handlePickFile} className="hidden" />
              </div>
              <p className="text-xs text-gray-400 mt-2">Tap photo to change</p>
              {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}

              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name"
                className="w-full text-center bg-white/80 border border-rose-100 rounded-xl px-3 py-2.5 text-base mt-3 outline-none focus:border-rose-300"
              />
              <input
                value={tagline}
                onChange={e => setTagline(e.target.value.slice(0, TAGLINE_MAX))}
                placeholder="Add a tagline…"
                className="w-full text-center bg-white/80 border border-rose-100 rounded-xl px-3 py-2.5 text-base mt-2 outline-none focus:border-rose-300 italic text-rose-500"
              />
            </div>

            {/* Theme: accent + background */}
            <div className="cp-card rounded-[20px] p-5 mb-3">
              <label className="block text-[11px] font-semibold text-gray-400 mb-2.5 uppercase tracking-wide">Accent color</label>
              <div className="flex flex-wrap gap-2.5 mb-5">
                {ACCENTS.map((a) => (
                  <button key={a.value} onClick={() => setAccent(a.value)}
                    className={clsx('w-9 h-9 rounded-full transition-all', a.cls, accent === a.value ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'opacity-60 hover:opacity-100')}
                    title={a.label} />
                ))}
              </div>

              <label className="block text-[11px] font-semibold text-gray-400 mb-2.5 uppercase tracking-wide">Background</label>
              <div className="grid grid-cols-4 gap-2.5">
                {BG_PRESETS.map(p => {
                  const on = bgType === 'preset' && bgImage === `preset:${p.id}`
                  return (
                    <button key={p.id} onClick={() => pickBgPreset(p.id)}
                      className={clsx('h-14 rounded-xl transition-all relative overflow-hidden', on ? 'ring-2 ring-offset-1 ring-rose-400 scale-105' : 'opacity-85 hover:opacity-100')}
                      style={{ background: p.css }} title={p.label}>
                      {on && <span className="absolute inset-0 flex items-center justify-center"><Check size={18} className="text-white drop-shadow" /></span>}
                    </button>
                  )
                })}
              </div>

              {/* Upload background */}
              <button
                type="button"
                onClick={() => bgFileRef.current?.click()}
                className={clsx('mt-3 w-full flex items-center justify-center gap-2 border rounded-xl py-2.5 text-sm font-medium transition-all',
                  bgType === 'upload' ? 'border-rose-300 bg-rose-50 text-rose-600' : 'border-rose-100 text-gray-500 hover:border-rose-300')}
              >
                {bgUploading ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
                {bgType === 'upload' ? 'Background photo set — tap to change' : 'Upload your own background'}
              </button>
              <input ref={bgFileRef} type="file" accept="image/*" onChange={handleBgFile} className="hidden" />
              {(bgType === 'upload' || bgType === 'preset') && (
                <button onClick={() => { setBgType(null); setBgImage(null) }} className="mt-2 text-xs text-gray-400 hover:text-rose-500">
                  Reset to default background
                </button>
              )}
            </div>

            {/* Now watching */}
            <div className={clsx('cp-card rounded-[20px] p-5 mb-3 relative', nowOpen ? 'z-50' : 'z-10')}>
              <label className="block text-[11px] font-semibold text-gray-400 mb-2.5 uppercase tracking-wide">Now watching</label>
              <CatalogPicker
                value={nowWatchingChoice}
                onChange={setNowWatchingChoice}
                onOpenChange={setNowOpen}
                placeholder="Search any movie or show… 🍿"
              />
              {nowWatching && (
                <button
                  onClick={() => setNowWatchingChoice(null)}
                  className="mt-2 text-xs text-gray-400 hover:text-rose-500"
                >
                  Clear now watching
                </button>
              )}
            </div>

            {/* Genres grid */}
            <div className="cp-card rounded-[20px] p-5 mb-3">
              <label className="block text-[11px] font-semibold text-gray-400 mb-2.5 uppercase tracking-wide">My genres — tap to pick</label>
              <div className="flex flex-wrap gap-2">
                {GENRES.map(g => {
                  const on = genres.includes(g.name)
                  return (
                    <button key={g.name} onClick={() => toggleGenre(g.name)}
                      className={clsx('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-all',
                        !on && 'bg-white/80 text-gray-400 border-rose-100 hover:border-rose-300')}
                      style={on ? { background: g.bg, color: g.text, borderColor: g.bg } : undefined}>
                      <span>{g.emoji}</span> {g.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* If I had to pick */}
            <div className={clsx('cp-card rounded-[20px] p-5 mb-3 relative', aPickerIsOpen ? 'z-50' : 'z-10')}>
              <label className="block text-[11px] font-semibold text-gray-400 mb-2.5 uppercase tracking-wide">If I had to pick…</label>
              <div className="flex flex-col gap-3">
                {PICK_SLOTS.map(s => {
                  const p = picks[s.key]
                  const choice: CatalogChoice | null = p
                    ? { title: p.title, year: p.year, poster: p.poster, type: (p.type as CatalogChoice['type']) || 'movie' }
                    : null
                  return (
                    <div key={s.key}>
                      <div className="text-sm text-rose-500 font-semibold mb-1">{s.emoji} {s.label}</div>
                      <CatalogPicker
                        value={choice}
                        onChange={(c) => setPick(s.key, c)}
                        onOpenChange={(o) => handleSlotOpenChange(s.key, o)}
                        placeholder="Search any movie or show…"
                      />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Bio */}
            <div className={clsx('cp-card rounded-[20px] p-5 mb-3 relative', (aPickerIsOpen || nowOpen) ? 'z-0' : 'z-10')}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Bio</label>
                <span className={clsx('text-xs', bio.length > BIO_MAX - 20 ? 'text-rose-400' : 'text-gray-300')}>{bio.length}/{BIO_MAX}</span>
              </div>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
                rows={3}
                placeholder="A little about your movie taste..."
                className="w-full bg-white/80 border border-rose-100 rounded-xl px-3 py-2.5 text-base outline-none focus:border-rose-300 resize-none"
              />
            </div>

            {saveError && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-3">
                Couldn&apos;t save: {saveError}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={save}
                disabled={saving || uploading || bgUploading}
                className="flex-1 flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-medium py-3 rounded-xl text-base transition-all"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} Save profile
              </button>
              <button
                onClick={cancelEdit}
                disabled={saving}
                className="px-6 py-3 rounded-xl text-base text-gray-600 bg-white/70 hover:bg-white transition-all"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function MiniStat({ icon, n, label, ring }: { icon: string; n: number | string; label: string; ring: string }) {
  return (
    <div className="text-center flex-1 min-w-0">
      <div className="text-2xl leading-none">{icon}</div>
      {n !== '' && <div className="text-3xl font-bold leading-none mt-1.5" style={{ color: ring }}>{n}</div>}
      <div className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mt-1.5">{label}</div>
    </div>
  )
}

function MiniDiv() {
  return <div className="w-px self-stretch my-1.5" style={{ background: 'rgba(243,216,226,0.8)' }} />
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileInner />
    </RequireAuth>
  )
}
