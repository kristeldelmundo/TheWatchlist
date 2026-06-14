'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Navbar from '@/components/layout/Navbar'
import { WatchlistItem, Review } from '@/types'
import { supabase } from '@/lib/supabase'
import { Star, Copy, Share2, Check, Film, Tv, Heart } from 'lucide-react'
import { clsx } from 'clsx'
import RequireAuth from '@/components/auth/RequireAuth'

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

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
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
          className="star text-2xl transition-transform hover:scale-110"
          style={{ color: i <= (hover || value) ? '#f59e0b' : '#e5e7eb' }}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function ReviewInner() {
  const shareRef = useRef<HTMLDivElement>(null)
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [pastReviews, setPastReviews] = useState<Review[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [ratingK, setRatingK] = useState(0)
  const [ratingJ, setRatingJ] = useState(0)
  const [thoughtsK, setThoughtsK] = useState('')
  const [thoughtsJ, setThoughtsJ] = useState('')
  const [reactions, setReactions] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    supabase.from('watchlist_items').select('*').then(({ data }) => { if (data) setItems(data) })
    supabase.from('reviews').select('*').order('created_at', { ascending: false }).then(({ data }) => { if (data) setPastReviews(data) })
  }, [])

  const selected = items.find(i => i.id === selectedId)
  const avgRating = ratingK && ratingJ ? ((ratingK + ratingJ) / 2).toFixed(1) : ratingK || ratingJ || 0

  function toggleReaction(label: string) {
    setReactions(prev => prev.includes(label) ? prev.filter(r => r !== label) : [...prev, label])
  }

  async function saveReview() {
    if (!selectedId) return
    setSaving(true)
    const review = {
      watchlist_item_id: selectedId,
      title: selected?.title || '',
      poster: selected?.poster || null,
      rating_k: ratingK,
      rating_j: ratingJ,
      thoughts_k: thoughtsK,
      thoughts_j: thoughtsJ,
      reactions,
    }
    const { data } = await supabase.from('reviews').insert(review).select().single()
    if (data) setPastReviews(prev => [data, ...prev])
    setSaving(false)
    setSaved(true)
    // Reset the form so it's ready for the next review
    setSelectedId('')
    setRatingK(0)
    setRatingJ(0)
    setThoughtsK('')
    setThoughtsJ('')
    setReactions([])
    setTimeout(() => setSaved(false), 3000)
  }

  async function copyShareText() {
    if (!selected) return
    const text = [
      `🍿 We watched: ${selected.title}`,
      avgRating ? `⭐ ${avgRating}/5` : '',
      reactions.length ? reactions.map(r => REACTIONS.find(x => x.label === r)?.emoji + ' ' + r).join(' · ') : '',
      thoughtsK ? `Kristel: "${thoughtsK}"` : '',
      thoughtsJ ? `Eric: "${thoughtsJ}"` : '',
      '#CinePop #MovieNight',
    ].filter(Boolean).join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function nativeShare() {
    if (!selected) return
    const text = `🍿 We watched ${selected.title} — ${avgRating}/5 stars! ${reactions.join(' ')} #CinePop`
    if (navigator.share) {
      await navigator.share({ title: 'CinePop', text })
    } else {
      copyShareText()
    }
  }

  const reviewerData = [
    { label: 'Kristel', initial: 'K', color: 'rose', rating: ratingK, setRating: setRatingK, thoughts: thoughtsK, setThoughts: setThoughtsK },
    { label: 'Eric', initial: 'E', color: 'purple', rating: ratingJ, setRating: setRatingJ, thoughts: thoughtsJ, setThoughts: setThoughtsJ },
  ]

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold text-gray-800 mb-1">
            <span className="gradient-text italic">Rate & Share</span>
          </h1>
          <p className="text-sm text-gray-400">Review what you watched together</p>
        </div>

        {/* Movie picker */}
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
          )}
        </div>

        {/* Ratings */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {reviewerData.map(({ label, initial, color, rating, setRating, thoughts, setThoughts }) => (
            <div key={label} className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className={clsx(
                  'w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold',
                  color === 'rose' ? 'bg-rose-100 text-rose-600' : 'bg-purple-100 text-purple-600'
                )}>{initial}</span>
                <span className="text-sm font-medium text-gray-600">{label}&apos;s rating</span>
              </div>
              <StarRating value={rating} onChange={setRating} />
              {rating > 0 && (
                <p className="text-xs text-gray-400 mt-1">{['', 'Terrible', 'Not great', 'It was ok', 'Really good', 'Loved it!'][rating]}</p>
              )}
              <textarea
                value={thoughts}
                onChange={e => setThoughts(e.target.value)}
                placeholder={`${label}'s thoughts...`}
                rows={3}
                className="w-full mt-3 bg-white/60 border border-rose-100 rounded-xl px-3 py-2 text-xs text-gray-600 placeholder-gray-300 outline-none focus:border-rose-300 resize-none"
              />
            </div>
          ))}
        </div>

        {/* Reactions */}
        <div className="glass rounded-2xl p-4 mb-4">
          <label className="block text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">Reactions</label>
          <div className="flex flex-wrap gap-2">
            {REACTIONS.map(({ emoji, label }) => (
              <button
                key={label}
                onClick={() => toggleReaction(label)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                  reactions.includes(label)
                    ? 'bg-rose-500 text-white border-rose-500'
                    : 'bg-white/80 text-gray-600 border-rose-100 hover:border-rose-300'
                )}
              >
                <span>{emoji}</span> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Share card preview */}
        {selected && (
          <div ref={shareRef} className="glass rounded-2xl p-4 mb-4">
            <label className="block text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">Share card preview</label>
            <div className="bg-gradient-to-br from-rose-50 to-purple-50 rounded-2xl p-5 border border-rose-100">
              <div className="flex items-start gap-4">
                {selected.poster && (
                  <Image src={selected.poster} alt={selected.title} width={56} height={80} className="rounded-xl object-cover shadow-md flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-rose-400 font-medium mb-0.5">🍿 we watched</p>
                  <h3 className="font-display text-lg font-bold text-gray-800 leading-tight mb-1">{selected.title}</h3>
                  {avgRating ? (
                    <p className="text-amber-500 text-sm font-medium mb-1">{'★'.repeat(Math.round(Number(avgRating)))} <span className="text-gray-400 text-xs">{avgRating}/5</span></p>
                  ) : null}
                  {reactions.length > 0 && (
                    <p className="text-sm mb-1">{reactions.map(r => REACTIONS.find(x => x.label === r)?.emoji).join(' ')}</p>
                  )}
                  {(thoughtsK || thoughtsJ) && (
                    <p className="text-xs text-gray-500 italic line-clamp-2">&quot;{thoughtsK || thoughtsJ}&quot;</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-rose-100">
                <div className="flex items-center gap-1">
                  <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center text-xs font-semibold">K</span>
                  <Heart size={8} className="text-rose-300" fill="currentColor" />
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-500 flex items-center justify-center text-xs font-semibold">E</span>
                </div>
                <span className="text-xs text-gray-400 font-mono">#CinePop</span>
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={copyShareText}
                className="flex-1 flex items-center justify-center gap-1.5 bg-white/80 border border-rose-100 hover:bg-rose-50 text-gray-600 py-2 rounded-xl text-xs font-medium transition-all"
              >
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy text'}
              </button>
              <button
                onClick={nativeShare}
                className="flex-1 flex items-center justify-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white py-2 rounded-xl text-xs font-medium transition-all"
              >
                <Share2 size={14} /> Share with friends
              </button>
            </div>
          </div>
        )}

        {/* Save button */}
        <button
          onClick={saveReview}
          disabled={!selectedId || saving}
          className="w-full flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-medium py-3.5 rounded-2xl transition-all mb-8"
        >
          {saving ? 'Saving...' : saved ? <><Check size={18} /> Saved!</> : <><Star size={18} /> Save our review</>}
        </button>

        {/* Past reviews */}
        {pastReviews.length > 0 && (
          <section>
            <h2 className="font-display text-xl font-bold text-gray-700 mb-4 italic">Past reviews</h2>
            <div className="space-y-3">
              {pastReviews.map(r => (
                <div key={r.id} className="glass rounded-2xl p-4 flex items-start gap-3">
                  {r.poster && (
                    <Image src={r.poster} alt={r.title} width={40} height={56} className="rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-800 text-sm">{r.title}</h4>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      {r.rating_k > 0 && <span>Kristel: {'★'.repeat(r.rating_k)}</span>}
                      {r.rating_j > 0 && <span>Eric: {'★'.repeat(r.rating_j)}</span>}
                    </div>
                    {r.reactions?.length > 0 && (
                      <p className="text-sm mt-1">{r.reactions.map(label => REACTIONS.find(x => x.label === label)?.emoji).join(' ')}</p>
                    )}
                    {(r.thoughts_k || r.thoughts_j) && (
                      <div className="mt-2 space-y-1.5">
                        {r.thoughts_k && (
                          <p className="text-xs text-gray-500 leading-relaxed">
                            <span className="font-semibold text-rose-500">Kristel:</span>{' '}
                            <span className="italic">&quot;{r.thoughts_k}&quot;</span>
                          </p>
                        )}
                        {r.thoughts_j && (
                          <p className="text-xs text-gray-500 leading-relaxed">
                            <span className="font-semibold text-purple-500">Eric:</span>{' '}
                            <span className="italic">&quot;{r.thoughts_j}&quot;</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
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
