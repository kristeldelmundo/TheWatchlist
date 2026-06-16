'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useCircle } from '@/components/auth/CircleProvider'
import { useTabTour } from '@/components/auth/TabTourProvider'
import { getCircleMembers } from '@/lib/circles'
import { supabase } from '@/lib/supabase'
import {
  GENRES, normalizeUsername, isValidUsername, isUsernameAvailable,
} from '@/lib/profile'
import { ACCENTS, accentByValue } from '@/lib/theme'
import {
  Loader2, Camera, ChevronRight, Film, Users, Shuffle, Star, TrendingUp, Share2, AtSign, Check,
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
type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export default function OnboardingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, profile, refreshProfile } = useAuth()
  const { activeCircle, loading: circlesLoading } = useCircle()
  const { openTour } = useTabTour()

  const hasCircle = !circlesLoading && !!activeCircle

  const steps: Step[] = hasCircle
    ? ['welcome', 'profile', 'circle', 'tour']
    : ['welcome', 'profile', 'tour']
  const [stepIndex, setStepIndex] = useState(0)
  const step = steps[stepIndex]

  // Profile setup state — name + username are required to continue.
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle')
  const usernameCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [accent, setAccent] = useState('rose')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [genres, setGenres] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Circle members preview
  const [members, setMembers] = useState<CircleMemberPreview[]>([])

  const [finishing, setFinishing] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  // Reset to step 0 each time the modal is opened fresh.
  useEffect(() => {
    if (open) setStepIndex(0)
  }, [open])

  useEffect(() => {
    if (!profile) return
    setDisplayName(profile.display_name || '')
    setUsername(profile.username || '')
    setUsernameStatus('idle')
    setAccent(profile.accent_color || 'rose')
    setAvatarUrl(profile.avatar_url || null)
    setGenres(profile.fav_genres || [])
  }, [profile, open])

  useEffect(() => {
    if (step !== 'circle' || !activeCircle) return
    let cancelled = false
    getCircleMembers(activeCircle.id).then((m) => {
      if (!cancelled) setMembers(m as CircleMemberPreview[])
    })
    return () => { cancelled = true }
  }, [step, activeCircle])

  if (!open) return null

  // ---- username editing ----
  function handleUsernameChange(raw: string) {
    const clean = normalizeUsername(raw)
    setUsername(clean)

    if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current)

    if (clean === (profile?.username || '')) {
      setUsernameStatus(clean ? 'available' : 'idle')
      return
    }
    if (!clean) {
      setUsernameStatus('idle')
      return
    }
    if (!isValidUsername(clean)) {
      setUsernameStatus('invalid')
      return
    }
    setUsernameStatus('checking')
    usernameCheckTimer.current = setTimeout(async () => {
      const ok = await isUsernameAvailable(clean, user?.id)
      setUsernameStatus(ok ? 'available' : 'taken')
    }, 450)
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
    setGenres(prev => {
      if (prev.includes(name)) return prev.filter(g => g !== name)
      if (prev.length >= MAX_ONBOARDING_GENRES) return prev
      return [...prev, name]
    })
  }

  // Profile step requires a name + a valid, available username.
  const profileStepValid =
    displayName.trim().length > 0 &&
    username.length > 0 &&
    isValidUsername(username) &&
    (usernameStatus === 'available' || usernameStatus === 'idle')

  // Save whatever profile fields were touched in step 2.
  async function saveProfileStep(): Promise<boolean> {
    if (!user) return false
    setProfileError(null)
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim(),
        username: username || null,
        accent_color: accent,
        avatar_url: avatarUrl,
        fav_genres: genres,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
    if (error) {
      const msg = (error.message || '').toLowerCase().includes('username')
        ? 'That username was just taken — try another.'
        : (error.message || 'Could not save. Please try again.')
      setProfileError(msg)
      return false
    }
    await refreshProfile()
    return true
  }

  async function finish() {
    if (!user || finishing) return
    setFinishing(true)
    const wasTourSeen = profile?.tab_tour_completed ?? true
    await supabase
      .from('profiles')
      .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
      .eq('id', user.id)
    await refreshProfile()
    setFinishing(false)
    onClose()
    // Chain straight into the navbar spotlight tour if they haven't seen it yet.
    if (!wasTourSeen) {
      openTour()
    }
  }

  async function next() {
    if (step === 'profile') {
      if (!profileStepValid) return
      const ok = await saveProfileStep()
      if (!ok) return
    }
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
  const isLastStep = stepIndex === steps.length - 1
  const continueDisabled = finishing || (step === 'profile' && !profileStepValid)

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-0 sm:p-6 bg-black/40 backdrop-blur-sm">
      <div className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl bg-gradient-to-br from-rose-50 via-purple-50 to-sky-50 sm:rounded-3xl shadow-2xl overflow-y-auto">
        <div className="px-6 sm:px-10 py-8 sm:py-10 min-h-full flex flex-col">
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mb-8">
            {steps.map((s, i) => (
              <span
                key={s}
                className={clsx(
                  'h-1.5 rounded-full transition-all',
                  i === stepIndex ? 'w-8 bg-rose-400' : 'w-1.5 bg-rose-200',
                )}
              />
            ))}
          </div>

          <div className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto">
            {/* ===================== WELCOME ===================== */}
            {step === 'welcome' && (
              <div className="text-center">
                <div className="text-6xl mb-4">🍿</div>
                <h1 className="font-display text-3xl font-bold text-gray-800 mb-3">
                  Welcome to <span className="gradient-text italic">CinePop</span>!
                </h1>
                <p className="text-base text-gray-500 leading-relaxed mb-6">
                  Your shared movie &amp; TV night app — keep a watchlist with friends, rate what you watch, and let CinePop pick something when no one can decide. Let&apos;s get you set up — it only takes a minute. 💕
                </p>
              </div>
            )}

            {/* ===================== PROFILE SETUP ===================== */}
            {step === 'profile' && (
              <div>
                <h2 className="font-display text-2xl font-bold text-gray-800 mb-1 text-center">
                  Make it <span className="gradient-text italic">yours</span>
                </h2>
                <p className="text-sm text-gray-400 text-center mb-6">
                  Pick a name and username so friends can find and tag you. You can fine-tune everything else later.
                </p>

                <div className="text-center mb-5">
                  <div className="relative inline-block">
                    <button type="button" onClick={() => fileRef.current?.click()} className="group relative block" title="Add photo">
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarUrl} alt={displayName || 'You'} className="rounded-full object-cover ring-2 ring-white shadow" style={{ width: 96, height: 96 }} />
                      ) : (
                        <span className="rounded-full flex items-center justify-center text-4xl font-bold text-white font-display" style={{ width: 96, height: 96, background: accentObj.ring }}>
                          {initial}
                        </span>
                      )}
                      <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        {uploading ? <Loader2 size={20} className="text-white animate-spin" /> : <Camera size={20} className="text-white" />}
                      </span>
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" onChange={handlePickFile} className="hidden" />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5">Tap to add a photo (optional)</p>
                  {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
                </div>

                {/* Display name — required */}
                <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wide text-center">
                  Display name <span className="text-rose-400">*</span>
                </label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="w-full text-center bg-white/80 border border-rose-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-rose-300 mb-4"
                />

                {/* Username — required */}
                <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wide text-center">
                  Username <span className="text-rose-400">*</span>
                </label>
                <div className="relative mb-1">
                  <AtSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="username"
                    maxLength={20}
                    className={clsx(
                      'w-full text-center bg-white/80 border rounded-xl pl-8 pr-8 py-2.5 text-sm outline-none transition-colors',
                      usernameStatus === 'taken' || usernameStatus === 'invalid'
                        ? 'border-red-300 focus:border-red-400'
                        : usernameStatus === 'available'
                          ? 'border-green-300 focus:border-green-400'
                          : 'border-rose-100 focus:border-rose-300',
                    )}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    {usernameStatus === 'checking' && <Loader2 size={14} className="text-gray-300 animate-spin" />}
                    {usernameStatus === 'available' && <Check size={14} className="text-green-500" />}
                  </span>
                </div>
                <p className={clsx(
                  'text-[11px] mb-4 text-center',
                  usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'text-red-500' : 'text-gray-400',
                )}>
                  {usernameStatus === 'invalid' && 'Use 3-20 lowercase letters, numbers, or underscores — start with a letter.'}
                  {usernameStatus === 'taken' && 'That username is already taken.'}
                  {usernameStatus === 'available' && `cinepop.live/@${username} is available!`}
                  {usernameStatus === 'idle' && (username ? `Your share link: cinepop.live/@${username}` : 'This becomes your share link: cinepop.live/@username')}
                  {usernameStatus === 'checking' && 'Checking availability…'}
                </p>

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
                  Favorite genres — pick up to {MAX_ONBOARDING_GENRES} (optional)
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

                {profileError && (
                  <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 mt-4 text-center">{profileError}</p>
                )}
              </div>
            )}

            {/* ===================== CIRCLE CONTEXT ===================== */}
            {step === 'circle' && activeCircle && (
              <div className="text-center">
                <div className="text-6xl mb-4">{activeCircle.emoji}</div>
                <h2 className="font-display text-2xl font-bold text-gray-800 mb-2">
                  You&apos;re in <span className="gradient-text italic">{activeCircle.name}</span>!
                </h2>
                <p className="text-base text-gray-400 mb-6">
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
                <h2 className="font-display text-2xl font-bold text-gray-800 mb-1 text-center">
                  Here&apos;s what you can <span className="gradient-text italic">do</span>
                </h2>
                <p className="text-sm text-gray-400 text-center mb-6">A quick look around CinePop.</p>
                <div className="flex flex-col gap-2.5">
                  {TOUR_CARDS.map((c) => (
                    <div key={c.title} className="flex items-start gap-3 bg-white/70 border border-rose-100 rounded-2xl p-3.5">
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
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-8 max-w-md w-full mx-auto">
            <button
              onClick={skipAll}
              disabled={finishing}
              className="text-xs text-gray-400 hover:text-rose-500 transition-colors disabled:opacity-60"
            >
              Skip for now
            </button>
            <button
              onClick={next}
              disabled={continueDisabled}
              className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 disabled:cursor-not-allowed text-white font-medium px-6 py-2.5 rounded-full text-sm transition-all"
            >
              {finishing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : !isLastStep ? (
                <>{step === 'welcome' ? 'Get started' : 'Continue'} <ChevronRight size={15} /></>
              ) : (
                "Let's go! 🍿"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
