'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Film, Users, Shuffle, Star, ChevronRight, X } from 'lucide-react'
import { clsx } from 'clsx'

// A friendly first-time welcome walkthrough. Shows once, then remembers
// it's been seen (per browser) via localStorage.
const SEEN_KEY = 'cinepop_onboarded'

const STEPS = [
  {
    icon: <Users size={28} className="text-rose-500" />,
    emoji: '👋',
    title: 'Welcome to CinePop!',
    body: "It's your shared movie-night home. Build watchlists together, let fate pick what to watch, then rate it as a crew. Here's the quick tour.",
  },
  {
    icon: <Users size={28} className="text-rose-500" />,
    emoji: '🍿',
    title: 'Start with a Circle',
    body: 'A circle is your movie group — you and your partner, family, or friends. Everyone in a circle shares the same watchlist. Make one, name it, pick an emoji.',
  },
  {
    icon: <Film size={28} className="text-rose-500" />,
    emoji: '🎬',
    title: 'Add movies & shows',
    body: 'Search any title and add it to your circle\'s watchlist. Browse the Trending tab for this week\'s top 10 and add with one tap.',
  },
  {
    icon: <Shuffle size={28} className="text-rose-500" />,
    emoji: '✨',
    title: 'Can\'t decide? Pop it!',
    body: 'Hit "Pick for us!" and watch the popcorn pop — it picks a title for you, with a trailer link so you can preview before you commit.',
  },
  {
    icon: <Star size={28} className="text-rose-500" />,
    emoji: '💬',
    title: 'Rate & share together',
    body: 'After watching, rate it, drop your thoughts and reactions, and share a cute movie card. Invite friends to your circle anytime from the Circles page!',
  },
]

export default function Onboarding() {
  const router = useRouter()
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    try {
      const seen = window.localStorage.getItem(SEEN_KEY)
      if (!seen) setShow(true)
    } catch {
      // ignore
    }
  }, [])

  function finish() {
    try {
      window.localStorage.setItem(SEEN_KEY, '1')
    } catch {}
    setShow(false)
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      finish()
      router.push('/circles')
    }
  }

  if (!show) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl shadow-rose-200/50 overflow-hidden">
        {/* Top accent */}
        <div className="bg-gradient-to-br from-rose-100 to-purple-100 px-6 pt-8 pb-6 text-center relative">
          <button
            onClick={finish}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Skip"
          >
            <X size={18} />
          </button>
          <div className="text-5xl mb-2">{current.emoji}</div>
          <h2 className="font-display text-2xl font-bold text-gray-800">{current.title}</h2>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-sm text-gray-500 leading-relaxed text-center mb-5">
            {current.body}
          </p>

          {/* Step dots */}
          <div className="flex justify-center gap-1.5 mb-5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={clsx(
                  'h-1.5 rounded-full transition-all',
                  i === step ? 'w-6 bg-rose-500' : 'w-1.5 bg-rose-200',
                )}
              />
            ))}
          </div>

          <button
            onClick={next}
            className="w-full flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-medium py-3 rounded-2xl text-sm transition-all"
          >
            {isLast ? "Let's go! 🍿" : 'Next'}
            {!isLast && <ChevronRight size={16} />}
          </button>

          {!isLast && (
            <button
              onClick={finish}
              className="w-full text-center text-xs text-gray-400 hover:text-gray-600 mt-3 transition-colors"
            >
              Skip tour
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
