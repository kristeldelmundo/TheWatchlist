'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import Navbar from '@/components/layout/Navbar'
import { WatchlistItem, Review } from '@/types'
import { supabase } from '@/lib/supabase'
import { Star, Copy, Share2, Check, Film, Tv, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import RequireAuth from '@/components/auth/RequireAuth'
import { useCircle } from '@/components/auth/CircleProvider'
import { useAuth } from '@/components/auth/AuthProvider'

const REACTIONS = [
  { emoji: '😍', label: 'Obsessed' },
  { emoji: '🍿', label: 'So good' },
  { emoji: '😭', label: 'We cried' },
  { emoji: '🤣', label: 'Laughed so hard' },
  { emoji: '🤯', label: 'Plot twist!' },
  { emoji: '😴', label: 'Fell asleep' },
  { emoji: '😐', label: 'Meh' },
  { emoji: '🔁', label: 'Would rewatch' },
  { emoji: '💑', label: 'Perfect date night' },
  { emoji: '💀', label: "So bad it's good" },
]

const RATING_WORDS = ['', 'Terrible', 'Not great', 'It was ok', 'Really good', 'Loved it!']

function StarRating({ value, onChange, size = 'text-2xl' }: { value: number; onChange: (v: number) => void; size?: string }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1 star-group">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          className={clsx('star transition-transform hover:scale-110', size)}
          style={{ color: i <= (hover || value) ? '#f59e0b' : '#e5e7eb' }}
        >
          ★
        </button>
      ))}
    </div>
  )
}

// Small colored avatar circle for a reviewer.
function ReviewerAvatar({ name, avatar, accent, size = 7 }: { name: string; avatar?: string | null; accent?: string | null; size?: number }) {
  const dim = `${size * 4}px`
  if (avatar) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatar} alt={name} className="rounded-full object-cover flex-shrink-0" style={{ width: dim, height: dim }} />
  }
  const isPurple = accent === 'purple'
  return (
    <span
      className={clsx(
        'rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0',
        isPurple ? 'bg-purple-100 text-purple-600' : 'bg-rose-100 text-rose-600',
      )}
      style={{ width: dim, height: dim }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

// Normalize any review row (new or legacy) into a list of displayable takes.
interface Take {
  name: string
  accent: string | null
  avatar: string | null
  rating: number
  thoughts: string
}
function takesFromReview(r: Review): Take[] {
  // New model: a single reviewer per row.
  if (r.reviewer_name || r.rating != null || r.thoughts) {
    return [{
      name: r.reviewer_name || 'Someone',
      accent: r.reviewer_accent ?? null,
      avatar: r.reviewer_avatar ?? null,
      rating: r.rating ?? 0,
      thoughts: r.thoughts ?? '',
    }]
  }
  // Legacy model: up to two fixed reviewers per row.
  const takes: Take[] = []
  if ((r.rating_k ?? 0) > 0 || r.thoughts_k) {
    takes.push({ name: 'Kristel', accent: 'rose', avatar: null, rating: r.rating_k ?? 0, thoughts: r.thoughts_k ?? '' })
  }
  if ((r.rating_j ?? 0) > 0 || r.thoughts_j) {
    takes.push({ name: 'Eric', accent: 'purple', avatar: null, rating: r.rating_j ?? 0, thoughts: r.thoughts_j ?? '' })
  }
  return takes
}

function ReviewInner() {
  const { activeCircle } = useCircle()
  const { user, profile } = useAuth()
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [feed, setFeed] = useState<Review[]>([])
  const [loadingFeed, setLoadingFeed] = useState(true)

  // Compose form
  const [selectedId, setSelectedId] = useState('')
  const [rating, setRating] = useState(0)
  const [thoughts, setThoughts] = useState('')
  const [reactions, setReactions] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  const myName = profile?.display_name || user?.email?.split('@')[0] || 'You'

  const loadData = useCallback(async () => {
    if (!activeCircle) {
      setItems([])
      setFeed([])
      setLoadingFeed(false)
      return
    }
    setLoadingFeed(true)
    const { data: itemData } = await supabase
      .from('watchlist_items')
      .select('*')
      .eq('circle_id', activeCircle.id)
    if (itemData) setItems(itemData)

    const { data: reviewData } = await supabase
      .from('reviews')
      .select('*')
      .eq('circle_id', activeCircle.id)
      .order('created_at', { ascending: false })
    setFeed(reviewData || [])
    setLoadingFeed(false)
  }, [activeCircle])

  useEffect(() => {
    loadData()
  }, [loadData])

  const selected = items.find(i => i.id === selectedId)

  function toggleReaction(label: string) {
    setReactions(prev => prev.includes(label) ? prev.filter(r => r !== label) : [...prev, label])
  }

  function resetForm() {
    setSelectedId('')
    setRating(0)
    setThoughts('')
    setReactions([])
  }

  async function saveReview() {
    if (!selectedId || !activeCircle || !user) return
    setSaving(true)
    const review = {
      watchlist_item_id: selectedId,
      circle_id: activeCircle.id,
      title: selected?.title || '',
      poster: selected?.poster || null,
      reviewer_id: user.id,
      reviewer_name: myName,
      reviewer_avatar: profile?.avatar_url || null,
      reviewer_accent: profile?.accent_color || 'rose',
      rating,
      thoughts,
      reactions,
    }
    const { data } = await supabase.from('reviews').insert(review).select().single()
    if (data) setFeed(prev => [data, ...prev])
    setSaving(false)
    setSaved(true)
    resetForm()
    setTimeout(() => setSaved(false), 3000)
  }

  async function copyShareText() {
    if (!selected) return
    const text = [
      `🍿 ${myName} watched: ${selected.title}`,
      rating ? `⭐ ${rating}/5` : '',
      reactions.length ? reactions.map(r => REACTIONS.find(x => x.label === r)?.emoji + ' ' + r).join(' · ') : '',
      thoughts ? `"${thoughts}"` : '',
      '#CinePop #MovieNight',
    ].filter(Boolean).join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function nativeShare() {
    if (!selected) return
    const text = `🍿 ${myName} watched ${selected.title} — ${rating}/5 stars! ${reactions.join(' ')} #CinePop`
    if (navigator.share) {
      await navigator.share({ title: 'CinePop', text })
    } else {
      copyShareText()
    }
  }

  function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d ago`
    return new Date(iso).toLocaleDateString()
  }

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold text-gray-800 mb-1">
            <span className="gradient-text italic">Rate &amp; Share</span>
          </h1>
          <p className="text-sm text-gray-400">
            {activeCircle && (
              <span className="text-rose-400 font-medium">{activeCircle.emoji} {activeCircle.name}</span>
            )}{' '}· Share your take — everyone&apos;s reviews live here
          </p>
        </div>

        {/* Compose a review */}
        <div className="glass rounded-2xl p-4 mb-4">
          <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">What did you watch?</label>
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            className="w-full bg-white/80 border border-rose-100 rounded-xl px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-rose-300 cursor-pointer"
          >
            <option value="">Choose a movie or show...</option>
            {items.map(i => (
              <option key={i.id} value={i.id}>{i.title} ({i.type === 'tv' ? 'TV' : 'Movie'})</option>
            ))}
          </select>

          {selected && (
            <>
              <div className="flex items-center gap-3 mt-3 p-3 bg-rose-50/60 rounded-xl">
                {selected.poster ? (
                  <Image src={selected.poster} alt={selected.title} width={40} height={56} className="rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-14 rounded-lg bg-rose-100 flex items-center justify-center flex-shrink-0">
                    {selected.type === 'tv' ? <Tv size={16} className="text-rose-300" /> : <Film size={16} className="text-rose-300" />}
                  </div>
                )}
                <div>
                  <p className="font-medium text-sm text-gray-800">{selected.title}</p>
                  <p className="text-xs text-gray-400">{selected.year} {selected.genre && `· ${selected.genre.split(',')[0]}`}</p>
                </div>
              </div>

              {/* Your rating */}
              <div className="mt-4 flex items-center gap-2">
                <ReviewerAvatar name={myName} avatar={profile?.avatar_url} accent={profile?.accent_color} size={7} />
                <span className="text-sm font-medium text-gray-600">Your rating</span>
              </div>
              <div className="mt-2">
                <StarRating value={rating} onChange={setRating} />
                {rating > 0 && <p className="text-xs text-gray-400 mt-1">{RATING_WORDS[rating]}</p>}
              </div>
              <textarea
                value={thoughts}
                onChange={e => setThoughts(e.target.value)}
                placeholder="Your thoughts..."
                rows={3}
                className="w-full mt-3 bg-white/60 border border-rose-100 rounded-xl px-3 py-2 text-sm text-gray-600 placeholder-gray-300 outline-none focus:border-rose-300 resize-none"
              />

              {/* Reactions */}
              <label className="block text-xs font-medium text-gray-500 mt-4 mb-2 uppercase tracking-wide">Reactions</label>
              <div className="flex flex-wrap gap-2">
                {REACTIONS.map(({ emoji, label }) => (
                  <button
                    key={label}
                    onClick={() => toggleReaction(label)}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                      reactions.includes(label)
                        ? 'bg-rose-500 text-white border-rose-500'
                        : 'bg-white/80 text-gray-600 border-rose-100 hover:border-rose-300',
                    )}
                  >
                    <span>{emoji}</span> {label}
                  </button>
                ))}
              </div>

              {/* Share + Save */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={copyShareText}
                  className="flex items-center justify-center gap-1.5 bg-white/80 border border-rose-100 hover:bg-rose-50 text-gray-600 px-3 py-2.5 rounded-xl text-xs font-medium transition-all"
                >
                  {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={nativeShare}
                  className="flex items-center justify-center gap-1.5 bg-white/80 border border-rose-100 hover:bg-rose-50 text-gray-600 px-3 py-2.5 rounded-xl text-xs font-medium transition-all"
                >
                  <Share2 size={14} /> Share
                </button>
                <button
                  onClick={saveReview}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-medium py-2.5 rounded-xl text-sm transition-all"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <><Check size={16} /> Posted!</> : <><Star size={16} /> Post review</>}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Everyone's reviews — latest first */}
        <section>
          <h2 className="font-display text-xl font-bold text-gray-700 mb-4 italic">
            Latest reviews
          </h2>

          {loadingFeed ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl shimmer" />)}
            </div>
          ) : feed.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center">
              <div className="text-4xl mb-3">🍿</div>
              <p className="text-gray-600 font-medium mb-1">No reviews yet!</p>
              <p className="text-sm text-gray-400">
                Watched something together? Be the first to post a review above.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {feed.map(r => {
                const takes = takesFromReview(r)
                return (
                  <div key={r.id} className="glass rounded-2xl p-4 flex items-start gap-3">
                    {r.poster ? (
                      <Image src={r.poster} alt={r.title} width={44} height={62} className="rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-11 h-[62px] rounded-lg bg-rose-100 flex items-center justify-center flex-shrink-0">
                        <Film size={16} className="text-rose-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <h4 className="font-medium text-gray-800 text-sm">{r.title}</h4>
                        <span className="text-[11px] text-gray-300 flex-shrink-0">{timeAgo(r.created_at)}</span>
                      </div>

                      {r.reactions?.length > 0 && (
                        <p className="text-sm mt-1">{r.reactions.map(label => REACTIONS.find(x => x.label === label)?.emoji).filter(Boolean).join(' ')}</p>
                      )}

                      <div className="mt-2 space-y-2">
                        {takes.map((t, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <ReviewerAvatar name={t.name} avatar={t.avatar} accent={t.accent} size={6} />
                            <div className="min-w-0">
                              <p className="text-xs">
                                <span className={clsx('font-semibold', t.accent === 'purple' ? 'text-purple-500' : 'text-rose-500')}>{t.name}</span>
                                {t.rating > 0 && (
                                  <span className="text-amber-500 ml-1.5">{'★'.repeat(t.rating)}<span className="text-gray-300">{'★'.repeat(5 - t.rating)}</span></span>
                                )}
                              </p>
                              {t.thoughts && (
                                <p className="text-xs text-gray-500 italic leading-relaxed mt-0.5">&quot;{t.thoughts}&quot;</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </>
  )
}

export default function ReviewPage() {
  return (
    <RequireAuth>
      <ReviewInner />
    </RequireAuth>
  )
}
