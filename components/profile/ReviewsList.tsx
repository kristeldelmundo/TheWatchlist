'use client'

import { useEffect, useState } from 'react'
import { loadUserReviews, type UserReview } from '@/lib/profile'
import { Film } from 'lucide-react'
import { clsx } from 'clsx'

// Same reaction -> emoji mapping used on /review and the profile stats strip.
const REACTION_EMOJI: Record<string, string> = {
  Obsessed: '😍', 'So good': '🍿', 'We cried': '😭', 'Laughed so hard': '🤣',
  'Plot twist!': '🤯', 'Fell asleep': '😴', Meh: '😐', 'Would rewatch': '🔁',
  'Perfect date night': '💑', "So bad it's good": '💀',
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

function ReviewRow({ review }: { review: UserReview }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-rose-50 last:border-b-0">
      {review.poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={review.poster} alt={review.title} className="w-11 h-[62px] rounded-lg object-cover flex-shrink-0" />
      ) : (
        <div className="w-11 h-[62px] rounded-lg bg-rose-100 flex items-center justify-center flex-shrink-0">
          <Film size={16} className="text-rose-300" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <h4 className="font-medium text-gray-800 text-sm truncate">{review.title}</h4>
          <span className="text-[11px] text-gray-300 flex-shrink-0">{timeAgo(review.created_at)}</span>
        </div>
        {(review.rating ?? 0) > 0 && (
          <p className="text-amber-500 text-xs mt-1">
            {'★'.repeat(review.rating || 0)}
            <span className="text-gray-300">{'★'.repeat(5 - (review.rating || 0))}</span>
          </p>
        )}
        {review.reactions && review.reactions.length > 0 && (
          <p className="text-sm mt-1">
            {review.reactions.map((label) => REACTION_EMOJI[label] || '').filter(Boolean).join(' ')}
          </p>
        )}
        {review.thoughts && (
          <p className="text-xs text-gray-500 italic leading-relaxed mt-1">&quot;{review.thoughts}&quot;</p>
        )}
      </div>
    </div>
  )
}

export default function ReviewsList({
  userId,
  className,
}: {
  userId: string
  className?: string
}) {
  const [reviews, setReviews] = useState<UserReview[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadUserReviews(userId).then((r) => {
      if (!cancelled) {
        setReviews(r)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [userId])

  if (loading) {
    return (
      <div className={clsx('space-y-2', className)}>
        {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl shimmer" />)}
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className={clsx('text-center py-6', className)}>
        <p className="text-sm text-gray-400">No reviews yet.</p>
      </div>
    )
  }

  return (
    <div className={className}>
      {reviews.map((r) => <ReviewRow key={r.id} review={r} />)}
    </div>
  )
}
