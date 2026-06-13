'use client'

import Link from 'next/link'
import { Film, Shuffle, Star, Heart, Popcorn } from 'lucide-react'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🍿</span>
          <span className="font-display text-xl font-medium text-rose-600 italic">CinePop</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white/80 border border-rose-100 rounded-full px-4 py-1.5 text-sm text-gray-500">
            <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-medium">K</span>
            <span className="mx-1 text-gray-300">&amp;</span>
            <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-medium">E</span>
            <span className="ml-1">Kristel &amp; Eric</span>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-white/60 border border-rose-200 rounded-full px-4 py-1.5 text-sm text-rose-500 mb-6 font-medium">
          <Heart size={14} fill="currentColor" /> your shared movie night app
        </div>

        <h1 className="font-display text-6xl md:text-7xl font-bold leading-tight mb-4">
          <span className="gradient-text italic">CinePop</span>
        </h1>

        <p className="text-base text-rose-400 font-medium mb-4 italic">Pop something on tonight 🍿</p>

        <p className="text-lg text-gray-500 mb-10 max-w-md leading-relaxed">
          Add movies and shows, let fate decide what you watch,
          then rate and share the experience together.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-16">
          <Link
            href="/watchlist"
            className="flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-medium px-8 py-3.5 rounded-full transition-all hover:scale-105 shadow-lg shadow-rose-200"
          >
            <Film size={18} /> Browse Watchlist
          </Link>
          <Link
            href="/randomizer"
            className="flex items-center justify-center gap-2 bg-white hover:bg-rose-50 text-rose-500 font-medium px-8 py-3.5 rounded-full border border-rose-200 transition-all hover:scale-105"
          >
            <Shuffle size={18} /> Pick Tonight&apos;s Watch
          </Link>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
          {[
            { icon: <Film size={22} />, color: 'rose', title: 'Shared Watchlist', desc: 'Everyone adds movies & shows, sorted by category' },
            { icon: <Shuffle size={22} />, color: 'plum', title: 'CinePop Picker', desc: "Can't decide? Let the spinner pop something on for you" },
            { icon: <Star size={22} />, color: 'amber', title: 'Rate & Share', desc: 'Review together and share your movie card with friends' },
          ].map((f, i) => (
            <div key={i} className="glass rounded-2xl p-5 text-left hover:scale-105 transition-transform">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                f.color === 'rose' ? 'bg-rose-100 text-rose-500' :
                f.color === 'plum' ? 'bg-purple-100 text-purple-500' :
                'bg-amber-100 text-amber-500'
              }`}>
                {f.icon}
              </div>
              <h3 className="font-medium text-gray-800 mb-1 text-sm">{f.title}</h3>
              <p className="text-xs text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-gray-400">
        made with <Heart size={10} className="inline text-rose-400" fill="currentColor" /> for movie nights &nbsp;🍿
      </footer>
    </main>
  )
}
