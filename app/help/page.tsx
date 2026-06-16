'use client'

import { useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import RequireAuth from '@/components/auth/RequireAuth'
import {
  ChevronDown, Users, Film, Shuffle, Star, TrendingUp, Share2, Sparkles,
} from 'lucide-react'
import { clsx } from 'clsx'

interface HelpItem {
  q: string
  a: React.ReactNode
}

interface HelpSection {
  id: string
  icon: typeof Users
  emoji: string
  title: string
  items: HelpItem[]
}

const SECTIONS: HelpSection[] = [
  {
    id: 'circles',
    icon: Users,
    emoji: '🍿',
    title: 'Circles',
    items: [
      {
        q: 'How do I create a circle?',
        a: 'Go to My Circles (from your profile chip, top right), tap "Create a new circle," give it a name and an emoji, then tap "Create circle." You\'ll land in it right away.',
      },
      {
        q: 'How do I add someone to my circle?',
        a: 'Open My Circles, make sure the right circle is selected, then either tap "Copy invite link" and send it to them, or use "Invite by email" if they already have a CinePop account — they\'ll get a notification to accept.',
      },
      {
        q: 'How do I join a circle someone invited me to?',
        a: 'Tap the invite link they sent — it\'ll open straight to the join screen. Or paste the invite code (or the whole link) into the "Join a circle" box on My Circles.',
      },
      {
        q: 'Can I be in more than one circle?',
        a: 'Yes — use the circle switcher in the top-left of the navbar to jump between circles. Each one has its own separate watchlist.',
      },
      {
        q: 'How do I remove someone or leave a circle?',
        a: 'On My Circles, tap the small X next to a member to remove them (owners can\'t be removed). If you want to leave a circle yourself, use the "Leave this circle" button — circle owners can\'t leave their own circle.',
      },
    ],
  },
  {
    id: 'movies',
    icon: Film,
    emoji: '📚',
    title: 'Adding movies & shows',
    items: [
      {
        q: 'How do I add a movie or show?',
        a: 'Go to Library and use the search box near the top — type a title, pick it from the results, and it\'s added to your circle\'s shared watchlist instantly.',
      },
      {
        q: 'How do I add something from Trending?',
        a: 'Go to Trending, find a title, and tap its + button — it\'s added straight to your library without needing to search.',
      },
      {
        q: 'How do I mark something as watched?',
        a: 'Tap a poster in Library to open it, then use the "Mark as watched" action. You can also mark something watched right after picking it with "Pick for us!"',
      },
      {
        q: 'Can I filter my library?',
        a: 'Yes — use the filter pills above the grid to show only movies, only TV shows, only what\'s unwatched, or only what a specific circle member added.',
      },
    ],
  },
  {
    id: 'randomizer',
    icon: Shuffle,
    emoji: '🎲',
    title: 'Pick for us!',
    items: [
      {
        q: 'How does "Pick for us!" work?',
        a: 'Go to Pick for us! and tap the big button — CinePop randomly picks one unwatched title from your circle\'s library and shows it with a trailer link.',
      },
      {
        q: 'Can I narrow down what it picks from?',
        a: 'Yes — use the filter pills (Movies only, TV only, or a specific person\'s picks) before spinning to limit the pool.',
      },
      {
        q: 'I don\'t like the pick — what now?',
        a: 'Tap "Different pick" to spin again, or "We watched this!" to mark it watched, or "Rate it now" to jump straight to Rate & Share.',
      },
    ],
  },
  {
    id: 'rate',
    icon: Star,
    emoji: '⭐',
    title: 'Rating & sharing',
    items: [
      {
        q: 'How do I rate something I watched?',
        a: 'Go to Rate & Share, find the title, and give it a star rating plus an emoji reaction (like "So good 🍿" or "We cried 😭"). Everyone in your circle can see what you thought.',
      },
    ],
  },
  {
    id: 'trending',
    icon: TrendingUp,
    emoji: '🔥',
    title: 'Trending',
    items: [
      {
        q: 'What is the Trending page?',
        a: 'A list of what\'s popular right now, refreshed regularly. Tap + on anything to add it to your circle\'s library without searching.',
      },
    ],
  },
  {
    id: 'profile',
    icon: Share2,
    emoji: '✨',
    title: 'Profile & sharing',
    items: [
      {
        q: 'How do I customize my profile?',
        a: 'Go to My Profile and tap Edit — you can set a display name, username, avatar, accent color, background, font, favorite genres, and custom "If I had to pick" categories.',
      },
      {
        q: 'What is my share link?',
        a: 'It\'s a public, read-only view of your profile at cinepop.live/@yourusername (or cinepop.live/@your-id if you haven\'t set a username yet). Tap Share on your profile to copy it or save a shareable image.',
      },
      {
        q: 'Can I replay the welcome tour?',
        a: 'Yes — on My Profile, tap "View onboarding" to replay the welcome wizard and the navbar walkthrough from the start.',
      },
    ],
  },
]

function HelpAccordionItem({ item }: { item: HelpItem }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-rose-50 last:border-b-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 py-3 text-left"
      >
        <span className="text-sm font-medium text-gray-700">{item.q}</span>
        <ChevronDown
          size={16}
          className={clsx('text-gray-400 flex-shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <p className="text-[13px] text-gray-500 leading-relaxed pb-3 pr-6">{item.a}</p>
      )}
    </div>
  )
}

function HelpInner() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-sky-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🍿</div>
          <h1 className="font-display text-3xl font-bold text-gray-800 mb-2">
            Help <span className="gradient-text italic">Center</span>
          </h1>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Everything you need to know about creating circles, adding movies, and getting the most out of CinePop.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {SECTIONS.map(s => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="flex items-center gap-1.5 bg-white/80 hover:bg-white text-rose-600 text-xs font-semibold px-3 py-1.5 rounded-full transition-all shadow-sm"
            >
              <span>{s.emoji}</span> {s.title}
            </a>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          {SECTIONS.map(({ id, icon: Icon, emoji, title, items }) => (
            <section key={id} id={id} className="glass rounded-2xl p-5 scroll-mt-20">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{emoji}</span>
                <h2 className="font-display text-lg font-bold text-gray-800">{title}</h2>
              </div>
              <div className="mt-2">
                {items.map((item, i) => (
                  <HelpAccordionItem key={i} item={item} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="text-center mt-10">
          <p className="text-sm text-gray-400 mb-3">Still stuck, or have feedback?</p>
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium px-5 py-2.5 rounded-full transition-all"
          >
            <Sparkles size={14} /> Back to your profile
          </Link>
        </div>
      </main>
    </div>
  )
}

export default function HelpPage() {
  return (
    <RequireAuth>
      <HelpInner />
    </RequireAuth>
  )
}
