'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Navbar from '@/components/layout/Navbar'
import RequireAuth from '@/components/auth/RequireAuth'
import { useAuth } from '@/components/auth/AuthProvider'
import type { ProfilePicks, ProfilePick } from '@/components/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { Loader2, Check, Camera, Sparkles, Pencil } from 'lucide-react'
import { clsx } from 'clsx'
import { GENRES, genreByName, deriveViewerType } from '@/lib/profile'
import CatalogPicker, { CatalogChoice } from '@/components/ui/CatalogPicker'

const BIO_MAX = 160
const TAGLINE_MAX = 80
const NOW_WATCHING_STALE_DAYS = 10

const REACTION_EMOJI: Record<string, string> = {
  Obsessed: '😍', 'So good': '🍿', 'We cried': '😭', 'Laughed so hard': '🤣',
  'Plot twist!': '🤯', 'Fell asleep': '😴', Meh: '😐', 'Would rewatch': '🔁',
  'Perfect date night': '💑', "So bad it's good": '💀',
}

// The four "if I had to pick" slots.
const PICK_SLOTS: { key: string; emoji: string; label: string }[] = [
  { key: 'comfort', emoji: '🛋️', label: 'Comfort movie' },
  { key: 'cry', emoji: '😢', label: 'Last great cry' },
  { key: 'guilty', emoji: '🙈', label: 'Guilty pleasure' },
  { key: 'hill', emoji: '⛰️', label: "Hill I'll die on" },
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

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [stats, setStats] = useState<Stats>({ watched: 0, reviews: 0, avg: 0, topReaction: null })

  // Which pick slot's dropdown is open (so we can lift its card above the Bio).
  const [openSlot, setOpenSlot] = useState<string | null>(null)
  // True while the Now Watching picker is open.
  const [nowOpen, setNowOpen] = useState(false)

  function handleSlotOpenChange(slotKey: string, isOpen: boolean) {
    setOpenSlot(prev => {
      if (isOpen) return slotKey
      return prev === slotKey ? null : prev
    })
  }

  // Hydrate local state from the profile.
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
    // Recover the now-watching poster from picks if one matches (best effort).
    setNowWatchingPoster(null)
  }, [profile])

  useEffect(() => { hydrate() }, [hydrate])

  // Auto stats.
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
    if (days <= 0) return 'started today'
    if (days === 1) return 'started yesterday'
    return `started ${days} days ago`
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

  function toggleGenre(name: string) {
    setGenres(prev => prev.includes(name) ? prev.filter(g => g !== name) : [...prev, name])
  }

  // Set a pick slot from a catalog choice (or clear it).
  function setPick(slotKey: string, choice: CatalogChoice | null) {
    if (!choice) {
      setPicks(prev => { const next = { ...prev }; delete next[slotKey]; return next })
      return
    }
    const pick: ProfilePick = { title: choice.title, year: choice.year, poster: choice.poster, type: choice.type }
    setPicks(prev => ({ ...prev, [slotKey]: pick }))
  }

  // Set now-watching from a catalog choice (store title + poster), or clear it.
  function setNowWatchingChoice(choice: CatalogChoice | null) {
    if (!choice) { setNowWatching(''); setNowWatchingPoster(null); setNowStartedAt(null); return }
    setNowWatching(choice.title)
    setNowWatchingPoster(choice.poster)
  }

  function cancelEdit() {
    hydrate() // discard unsaved changes
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

  const accents = [
    { value: 'rose', label: 'Rose', cls: 'bg-rose-500' },
    { value: 'purple', label: 'Plum', cls: 'bg-purple-500' },
    { value: 'amber', label: 'Amber', cls: 'bg-amber-500' },
    { value: 'teal', label: 'Teal', cls: 'bg-teal-500' },
  ]
  const accentBg =
    accent === 'purple' ? 'bg-purple-500'
      : accent === 'amber' ? 'bg-amber-500'
      : accent === 'teal' ? 'bg-teal-500'
      : 'bg-rose-500'

  const initial = (displayName || user?.email || 'Y').charAt(0).toUpperCase()
  const viewerType = deriveViewerType(genres, stats.avg)

  // The current now-watching as a CatalogChoice (for the picker's display value).
  const nowWatchingChoice: CatalogChoice | null = nowWatching.trim()
    ? { title: nowWatching, year: null, poster: nowWatchingPoster, type: 'movie' }
    : null

  const hasAnyPick = PICK_SLOTS.some(s => picks[s.key])
  const aPickerIsOpen = openSlot !== null

  return (
    <>
      <Navbar />
      <style>{`
        @keyframes cp-pop { 0%,100%{transform:translateY(0) rotate(-3deg)} 50%{transform:translateY(-3px) rotate(3deg)} }
        @keyframes cp-pulse { 0%{box-shadow:0 0 0 0 rgba(74,222,128,0.6)} 70%{box-shadow:0 0 0 7px rgba(74,222,128,0)} 100%{box-shadow:0 0 0 0 rgba(74,222,128,0)} }
        .cp-pop{display:inline-block;animation:cp-pop 1.4s ease-in-out infinite}
        .cp-live{width:8px;height:8px;border-radius:50%;background:#4ade80;display:inline-block;animation:cp-pulse 2s infinite}
      `}</style>

      <main className="max-w-md mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-3xl font-bold text-gray-800">
            My <span className="gradient-text italic">Profile</span>
          </h1>
          {mode === 'view' && (
            <button
              onClick={() => setMode('edit')}
              className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold px-3.5 py-2 rounded-full transition-all"
            >
              <Pencil size={13} /> Edit profile
            </button>
          )}
        </div>

        {/* ===================== VIEW MODE ===================== */}
        {mode === 'view' && (
          <>
            {/* Header */}
            <div className="glass rounded-[22px] p-6 mb-4 text-center">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={displayName || 'You'} className="rounded-full object-cover mx-auto ring-2 ring-white shadow" style={{ width: 88, height: 88 }} />
              ) : (
                <span className={clsx('rounded-full flex items-center justify-center text-4xl font-bold text-white mx-auto font-display', accentBg)} style={{ width: 88, height: 88 }}>
                  {initial}
                </span>
              )}
              <div className="mt-3 font-display text-2xl font-bold text-gray-800">{displayName || 'Your name'}</div>
              {tagline && <div className="text-sm text-rose-400 italic mt-1">&ldquo;{tagline}&rdquo;</div>}
              {genres.length > 0 && (
                <div className="mt-3 inline-flex items-center gap-1.5 bg-purple-50 px-3.5 py-1.5 rounded-full">
                  <Sparkles size={13} className="text-purple-400" />
                  <span className="text-[13px] font-display italic font-bold text-purple-500">{viewerType}</span>
                </div>
              )}
              {bio && <p className="text-[13px] text-gray-500 leading-relaxed mt-3.5">{bio}</p>}
            </div>

            {/* Stats */}
            <div className="glass rounded-[22px] p-4 mb-4">
              <div className="flex items-center">
                <Stat icon="🍿" n={stats.watched} label="Watched" />
                <Div />
                <Stat icon="⭐" n={stats.reviews} label="Reviews" />
                <Div />
                <Stat icon="📊" n={stats.avg > 0 ? stats.avg : '—'} label="Avg" />
                <Div />
                <Stat icon={stats.topReaction ? REACTION_EMOJI[stats.topReaction] || '🍿' : '✨'} n={stats.topReaction || '—'} label="Top react" small />
              </div>
            </div>

            {/* Now watching (only if set) */}
            {showNowWatching && (
              <div className="glass rounded-[22px] p-4 mb-4">
                <div className="text-[10px] font-semibold text-gray-400 mb-2.5 uppercase tracking-wide">Now watching</div>
                <div className="rounded-2xl p-3.5 flex items-center gap-3.5" style={{ background: 'linear-gradient(100deg,#e0457b,#a855f7)' }}>
                  <div className="w-12 h-[68px] rounded-lg flex-shrink-0 flex items-center justify-center text-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)' }}>
                    {nowWatchingPoster ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={nowWatchingPoster} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="cp-pop">🍿</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="cp-live" />
                      <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.9)' }}>Watching now</span>
                    </div>
                    <div className="text-[17px] font-bold text-white mt-0.5 truncate">{nowWatching}</div>
                    <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.75)' }}>{daysAgoLabel(nowStartedAt)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Genres (only picked) */}
            {genres.length > 0 && (
              <div className="glass rounded-[22px] p-4 mb-4">
                <div className="text-[10px] font-semibold text-gray-400 mb-3 uppercase tracking-wide">My genres</div>
                <div className="flex flex-wrap gap-2">
                  {genres.map(name => {
                    const g = genreByName(name)
                    return (
                      <span key={name} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold"
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
              <div className="glass rounded-[22px] p-4 mb-4">
                <div className="text-[10px] font-semibold text-gray-400 mb-3 uppercase tracking-wide">If I had to pick…</div>
                <div className="flex flex-col gap-3.5">
                  {PICK_SLOTS.filter(s => picks[s.key]).map(s => {
                    const p = picks[s.key]
                    return (
                      <div key={s.key} className="flex gap-3 items-center">
                        <div className="w-[46px] h-[66px] rounded-lg flex-shrink-0 flex items-center justify-center text-xl bg-rose-50 overflow-hidden">
                          {p.poster ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.poster} alt={p.title} className="w-full h-full object-cover" />
                          ) : <span>{s.emoji}</span>}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] uppercase tracking-wide text-rose-400 font-bold">{s.emoji} {s.label}</div>
                          <div className="text-[15px] font-semibold text-gray-800 truncate">{p.title}</div>
                          {p.year && <div className="text-[11px] text-gray-400">{p.year}{p.type === 'tv' ? ' · TV' : ''}</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ===================== EDIT MODE ===================== */}
        {mode === 'edit' && (
          <>
            {/* Header edit */}
            <div className="glass rounded-[22px] p-6 mb-4 text-center">
              <div className="relative inline-block">
                <button type="button" onClick={() => fileRef.current?.click()} className="group relative block mx-auto" title="Change photo">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt={displayName || 'You'} className="rounded-full object-cover ring-2 ring-white shadow" style={{ width: 88, height: 88 }} />
                  ) : (
                    <span className={clsx('rounded-full flex items-center justify-center text-4xl font-bold text-white font-display', accentBg)} style={{ width: 88, height: 88 }}>
                      {initial}
                    </span>
                  )}
                  <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    {uploading ? <Loader2 size={20} className="text-white animate-spin" /> : <Camera size={20} className="text-white" />}
                  </span>
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handlePickFile} className="hidden" />
              </div>
              <p className="text-[11px] text-gray-300 mt-2">Tap photo to change</p>
              {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}

              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name"
                className="w-full text-center bg-white/80 border border-rose-100 rounded-xl px-3 py-2.5 text-sm mt-3 outline-none focus:border-rose-300"
              />
              <input
                value={tagline}
                onChange={e => setTagline(e.target.value.slice(0, TAGLINE_MAX))}
                placeholder="Add a tagline…"
                className="w-full text-center bg-white/80 border border-rose-100 rounded-xl px-3 py-2 text-sm mt-2 outline-none focus:border-rose-300 italic text-rose-500"
              />
            </div>

            {/* Accent */}
            <div className="glass rounded-[22px] p-5 mb-4">
              <label className="block text-[10px] font-semibold text-gray-400 mb-2 uppercase tracking-wide">Accent color</label>
              <div className="flex gap-2">
                {accents.map((a) => (
                  <button key={a.value} onClick={() => setAccent(a.value)}
                    className={clsx('w-9 h-9 rounded-full transition-all', a.cls, accent === a.value ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'opacity-60')}
                    title={a.label} />
                ))}
              </div>
            </div>

            {/* Now watching — search the full catalog. Lifted while open. */}
            <div className={clsx('glass rounded-[22px] p-5 mb-4 relative', nowOpen ? 'z-50' : 'z-10')}>
              <label className="block text-[10px] font-semibold text-gray-400 mb-2.5 uppercase tracking-wide">Now watching</label>
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
            <div className="glass rounded-[22px] p-5 mb-4">
              <label className="block text-[10px] font-semibold text-gray-400 mb-3 uppercase tracking-wide">My genres — tap to pick</label>
              <div className="flex flex-wrap gap-2">
                {GENRES.map(g => {
                  const on = genres.includes(g.name)
                  return (
                    <button key={g.name} onClick={() => toggleGenre(g.name)}
                      className={clsx('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-all',
                        !on && 'bg-white/80 text-gray-400 border-rose-100 hover:border-rose-300')}
                      style={on ? { background: g.bg, color: g.text, borderColor: g.bg } : undefined}>
                      <span>{g.emoji}</span> {g.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* If I had to pick — search the full catalog. Lifted above Bio while open. */}
            <div className={clsx('glass rounded-[22px] p-5 mb-4 relative', aPickerIsOpen ? 'z-50' : 'z-10')}>
              <label className="block text-[10px] font-semibold text-gray-400 mb-3 uppercase tracking-wide">If I had to pick…</label>
              <div className="flex flex-col gap-3">
                {PICK_SLOTS.map(s => {
                  const p = picks[s.key]
                  const choice: CatalogChoice | null = p
                    ? { title: p.title, year: p.year, poster: p.poster, type: (p.type as CatalogChoice['type']) || 'movie' }
                    : null
                  return (
                    <div key={s.key}>
                      <div className="text-[11px] text-rose-500 font-semibold mb-1">{s.emoji} {s.label}</div>
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

            {/* Bio. Pushed behind the picker cards while a picker is open. */}
            <div className={clsx('glass rounded-[22px] p-5 mb-4 relative', (aPickerIsOpen || nowOpen) ? 'z-0' : 'z-10')}>
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

            {/* Save error */}
            {saveError && (
              <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-3">
                Couldn&apos;t save: {saveError}
              </p>
            )}

            {/* Save / cancel */}
            <div className="flex gap-2">
              <button
                onClick={save}
                disabled={saving || uploading}
                className="flex-1 flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-medium py-3 rounded-xl text-sm transition-all"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save profile
              </button>
              <button
                onClick={cancelEdit}
                disabled={saving}
                className="px-5 py-3 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </main>
    </>
  )
}

function Stat({ icon, n, label, small }: { icon: string; n: number | string; label: string; small?: boolean }) {
  return (
    <div className="text-center flex-1 min-w-0">
      <span className="text-[15px] block mb-0.5">{icon}</span>
      <div className={clsx('font-bold text-rose-500 tracking-tight truncate', small ? 'text-[13px] pt-1' : 'text-[21px]')}>{n}</div>
      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mt-0.5">{label}</div>
    </div>
  )
}

function Div() {
  return <div className="w-px self-stretch my-0.5" style={{ background: '#f3d8e2' }} />
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileInner />
    </RequireAuth>
  )
}
