'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import RequireAuth from '@/components/auth/RequireAuth'
import { useAuth } from '@/components/auth/AuthProvider'
import { useCircle } from '@/components/auth/CircleProvider'
import { getCircleMembers } from '@/lib/circles'
import { supabase } from '@/lib/supabase'
import { GENRES } from '@/lib/profile'
import { ACCENTS, accentByValue } from '@/lib/theme'
import {
  Loader2, Camera, ChevronRight, Film, Users, Shuffle, Star, TrendingUp, Share2,
} from 'lucide-react'
import { clsx } from 'clsx'

const MAX_ONBOARDING_GENRES = 5

interface CircleMemberPreview {
  user_id: string
  profile: { display_name: string | null; avatar_url: string | null; accent_color: string | null } | null
}

const TOUR_CARDS: { icon: typeof Film; title: string; body: string; emoji: string }[] = [
  { icon: Film, emoji: '📚', title: 'Library', body: 'Keep a shared watchlist — add movies & shows, mark what you\'ve watched.' },
  { icon: Users, emoji: '🍿', title: 'Circles', body: 'Create or join circles with friends, family, or your partner to share watchlists.' },
  { icon: Shuffle, emoji: '🎲', title: 'Pick for us!', body: "Can't decide what to watch? Let CinePop randomly pick from your list." },
  { icon: Star, emoji: '⭐', title: 'Rate & Share', body: 'Rate what you watch and react with emoji — see what everyone thought.' },
  { icon: TrendingUp, emoji: '🔥', title: 'Trending', body: 'Browse what\'s popular right now and add it straight to your list.' },
  { icon: Share2, emoji: '✨', title: 'Your profile', body: "Customize your profile and share it with a pretty link like cinepop.live/@you." },
]

type Step = 'welcome' | 'profile' | 'circle' | 'tour'

function OnboardingInner() {
  const router = useRouter()
  const { user, profile, refreshProfile } = useAuth()
  const { activeCircle, loading: circlesLoading } = useCircle()

  const hasCircle = !circlesLoading && !!activeCircle

  const steps: Step[] = hasCircle
    ? ['welcome', 'profile', 'circle', 'tour']
    : ['welcome', 'profile', 'tour']
  const [stepIndex, setStepIndex] = useState(0)
  const step = steps[stepIndex]

  // Profile setup state
  const [displayName, setDisplayName] = useState('')
  const [accent, setAccent] = useState('rose')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [genres, setGenres] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Circle members preview
  const [members, setMembers] = useState<CircleMemberPreview[]>([])

  const [finishing, setFinishing] = useState(false)

  useEffect(() => {
    if (!profile) return
    setDisplayName(profile.display_name || '')
    setAccent(profile.accent_color || 'rose')
    setAvatarUrl(profile.avatar_url || null)
    setGenres(profile.fav_genres || [])
  }, [profile])

  useEffect(() => {
    if (step !== 'circle' || !activeCircle) return
    let cancelled = false
    getCircleMembers(activeCircle.id).then((m) => {
      if (!cancelled) setMembers(m as CircleMemberPreview[])
    })
    return () => { cancelled = true }
  }, [step, activeCircle])

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
    setGenres(prev => {
      if (prev.includes(name)) return prev.filter(g => g !== name)
      if (prev.length >= MAX_ONBOARDING_GENRES) return prev
      return [...prev, name]
    })
  }

  // Save whatever profile fields were touched in step 2 (best-effort —
  // doesn't block navigation on failure since this is "quick setup").
  async function saveProfileStep() {
    if (!user) return
    await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        accent_color: accent,
        avatar_url: avatarUrl,
        fav_genres: genres,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
    await refreshProfile()
  }

  async function finish() {
    if (!user || finishing) return
    setFinishing(true)
    await supabase
      .from('profiles')
      .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
      .eq('id', user.id)
    await refreshProfile()
    router.replace('/watchlist')
  }

  async function next() {
    if (step === 'profile') await saveProfileStep()
    if (stepIndex < steps.length - 1) {
      setStepIndex(i => i + 1)
    } else {
      await finish()
    }
  }

  async function skipAll() {
    await finish()
  }

  const accentObj = accentByValue(accent)
  const initial = (displayName || user?.email || 'Y').charAt(0).toUpperCase()

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-gradient-to-br from-rose-50 via-purple-50 to-sky-50">
      <div className="w-full max-w-md">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          {steps.map((s, i) => (
            <span
              key={s}
              className={clsx(
                'h-1.5 rounded-full transition-all',
                i === stepIndex ? 'w-6 bg-rose-400' : 'w-1.5 bg-rose-200',
              )}
            />
          ))}
        </div>

        <div className="glass rounded-3xl p-7 shadow-xl shadow-rose-100/50">
          {/* ===================== WELCOME ===================== */}
          {step === 'welcome' && (
            <div className="text-center">
              <div className="text-5xl mb-3">🍿</div>
              <h1 className="font-display text-2xl font-bold text-gray-800 mb-2">
                Welcome to <span className="gradient-text italic">CinePop</span>!
              </h1>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                Your shared movie &amp; TV night app — keep a watchlist with friends, rate what you watch, and let CinePop pick something when no one can decide. Let&apos;s get you set up — it only takes a minute. 💕
              </p>
            </div>
          )}

          {/* ===================== PROFILE SETUP ===================== */}
          {step === 'profile' && (
            <div>
              <h2 className="font-display text-xl font-bold text-gray-800 mb-1 text-center">
                Make it <span className="gradient-text italic">yours</span>
              </h2>
              <p className="text-sm text-gray-400 text-center mb-5">
                Add a name, photo, and a few favorite genres. You can always change this later.
              </p>

              <div className="text-center mb-4">
                <div className="relative inline-block">
                  <button type="button" onClick={() => fileRef.current?.click()} className="group relative block" title="Add photo">
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
                <p className="text-[11px] text-gray-400 mt-1.5">Tap to add a photo</p>
                {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
              </div>

              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name"
                className="w-full text-center bg-white/80 border border-rose-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-rose-300 mb-4"
              />

              <label className="block text-[10px] font-semibold text-gray-400 mb-2 uppercase tracking-wide text-center">Accent color</label>
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {ACCENTS.map((a) => (
                  <button key={a.value} onClick={() => setAccent(a.value)}
                    className={clsx('w-8 h-8 rounded-full transition-all', accent === a.value ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'opacity-70 hover:opacity-100')}
                    style={{ background: a.ring }}
                    title={a.label} />
                ))}
              </div>

              <label className="block text-[10px] font-semibold text-gray-400 mb-2 uppercase tracking-wide text-center">
                Favorite genres — pick up to {MAX_ONBOARDING_GENRES}
              </label>
              <div className="flex flex-wrap justify-center gap-1.5">
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
          )}

          {/* ===================== CIRCLE CONTEXT ===================== */}
          {step === 'circle' && activeCircle && (
            <div className="text-center">
              <div className="text-5xl mb-3">{activeCircle.emoji}</div>
              <h2 className="font-display text-xl font-bold text-gray-800 mb-1">
                You&apos;re in <span className="gradient-text italic">{activeCircle.name}</span>!
              </h2>
              <p className="text-sm text-gray-400 mb-5">
                This circle shares one watchlist — anything anyone adds, everyone can see, watch, and rate together.
              </p>
              {members.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2">
                  {members.slice(0, 8).map((m) => {
                    const nm = m.profile?.display_name || 'Member'
                    const isPurple = m.profile?.accent_color === 'purple'
                    return (
                      <div key={m.user_id} className="flex items-center gap-1.5 bg-white/70 border border-rose-100 rounded-full pl-1 pr-2.5 py-1">
                        {m.profile?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.profile.avatar_url} alt={nm} className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <span className={clsx('w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold',
                            isPurple ? 'bg-purple-100 text-purple-600' : 'bg-rose-100 text-rose-600')}>
                            {nm.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span className="text-xs text-gray-600">{nm}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ===================== FEATURE TOUR ===================== */}
          {step === 'tour' && (
            <div>
              <h2 className="font-display text-xl font-bold text-gray-800 mb-1 text-center">
                Here&apos;s what you can <span className="gradient-text italic">do</span>
              </h2>
              <p className="text-sm text-gray-400 text-center mb-5">A quick look around CinePop.</p>
              <div className="flex flex-col gap-2.5 max-h-[340px] overflow-y-auto pr-1">
                {TOUR_CARDS.map((c) => (
                  <div key={c.title} className="flex items-start gap-3 bg-white/70 border border-rose-100 rounded-2xl p-3">
                    <span className="text-2xl flex-shrink-0">{c.emoji}</span>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-gray-800">{c.title}</div>
                      <div className="text-[12px] text-gray-500 leading-relaxed">{c.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={skipAll}
              disabled={finishing}
              className="text-xs text-gray-400 hover:text-rose-500 transition-colors disabled:opacity-60"
            >
              Skip for now
            </button>
            <button
              onClick={next}
              disabled={finishing}
              className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-medium px-5 py-2.5 rounded-full text-sm transition-all"
            >
              {finishing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : stepIndex < steps.length - 1 ? (
                <>{step === 'welcome' ? 'Get started' : 'Continue'} <ChevronRight size={15} /></>
              ) : (
                "Let's go! 🍿"
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function OnboardingPage() {
  return (
    <RequireAuth>
      <OnboardingInner />
    </RequireAuth>
  )
}
