'use client'

import Link from 'next/link'
import { Film, Shuffle, Star, Heart, Users, Sparkles, ArrowRight } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { clsx } from 'clsx'

const PHOTO_URL = 'https://lscjqfqpnquielxncybb.supabase.co/storage/v1/object/public/avatars/site/kristel.jpg'
const THEO_URL = 'https://lscjqfqpnquielxncybb.supabase.co/storage/v1/object/public/avatars/site/theo.jpg'

// Floating poster movies — real posters from OMDB
const FLOATING_POSTERS = [
  { title: 'Titanic', poster: 'https://m.media-amazon.com/images/M/MV5BMDdmZGU3NDQtY2E5My00ZTliLWIzOTUtMTY4ZGI1YjdiNjk3XkEyXkFqcGdeQXVyNTA4NzY1MzY@._V1_SX300.jpg', rotate: '-6deg', delay: '0s', x: '-60px', y: '20px' },
  { title: 'La La Land', poster: 'https://m.media-amazon.com/images/M/MV5BMzUzNDM2NzM2MV5BMl5BanBnXkFtZTgwNTM3NTg4OTE@._V1_SX300.jpg', rotate: '5deg', delay: '0.4s', x: '55px', y: '-10px' },
  { title: 'The Notebook', poster: 'https://m.media-amazon.com/images/M/MV5BODcwNWE3OTMtMDc3MS00NDFjLWIyMTEtNTVhYjI4NjczMGM0XkEyXkFqcGdeQXVyNjU0OTQ0OTY@._V1_SX300.jpg', rotate: '-4deg', delay: '0.8s', x: '-55px', y: '-30px' },
  { title: 'Interstellar', poster: 'https://m.media-amazon.com/images/M/MV5BZjdkOTU3MDktN2IxOS00OGEyLWFmMjktY2FiMmZkNWIyODZiXkEyXkFqcGdeQXVyMTMxODk2OTU@._V1_SX300.jpg', rotate: '7deg', delay: '1.2s', x: '60px', y: '30px' },
  { title: 'Your Name', poster: 'https://m.media-amazon.com/images/M/MV5BODRmZDVmNzUtZjU5ZC00YzU3LWI2ZGQtZThkMjg2NjkzNGNhXkEyXkFqcGdeQXVyNTk0MzMzODA@._V1_SX300.jpg', rotate: '-8deg', delay: '1.6s', x: '0px', y: '-50px' },
]

export default function HomePage() {
  const { user, profile } = useAuth()

  const name = profile?.display_name || user?.email?.split('@')[0] || null
  const initial = (name || 'U').charAt(0).toUpperCase()
  const accent = profile?.accent_color === 'purple' ? 'purple' : 'rose'

  return (
    <main className="min-h-screen flex flex-col overflow-x-hidden bg-gradient-to-br from-rose-50 via-white to-purple-50">
      <style>{`
        @keyframes float-a { 0%,100%{transform:translateY(0px) rotate(var(--r))} 50%{transform:translateY(-14px) rotate(var(--r))} }
        @keyframes float-b { 0%,100%{transform:translateY(0px) rotate(var(--r))} 50%{transform:translateY(-10px) rotate(var(--r))} }
        @keyframes float-c { 0%,100%{transform:translateY(0px) rotate(var(--r))} 50%{transform:translateY(-18px) rotate(var(--r))} }
        @keyframes pop-in { 0%{opacity:0;transform:scale(0.85) translateY(20px)} 100%{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes drift { 0%,100%{transform:translateX(0)} 50%{transform:translateX(6px)} }
        .float-a{animation:float-a 4s ease-in-out infinite}
        .float-b{animation:float-b 5s ease-in-out infinite}
        .float-c{animation:float-c 3.5s ease-in-out infinite}
        .pop-in{animation:pop-in 0.6s cubic-bezier(0.34,1.56,0.64,1) both}
        .drift{animation:drift 3s ease-in-out infinite}
        .delay-1{animation-delay:0.1s} .delay-2{animation-delay:0.2s} .delay-3{animation-delay:0.3s}
        .delay-4{animation-delay:0.4s} .delay-5{animation-delay:0.5s}
      `}</style>

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🍿</span>
          <span className="font-display text-xl font-medium text-rose-600 italic">CinePop</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/about" className="text-sm text-gray-400 hover:text-rose-500 transition-colors hidden sm:block">About</Link>
          {user ? (
            <Link
              href="/watchlist"
              className="flex items-center gap-2 bg-white/80 border border-rose-100 rounded-full px-4 py-1.5 text-sm text-gray-500 hover:border-rose-300 transition-colors"
            >
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={name || 'You'} className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <span className={clsx('w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium', accent === 'purple' ? 'bg-purple-100 text-purple-600' : 'bg-rose-100 text-rose-600')}>
                  {initial}
                </span>
              )}
              <span className="ml-1">{name}</span>
            </Link>
          ) : (
            <Link href="/login" className="flex items-center gap-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full px-5 py-1.5 text-sm font-medium transition-colors">
              Log in
            </Link>
          )}
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-8 pb-24 max-w-5xl mx-auto w-full">

        {/* Floating posters — decorative, behind the text */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {FLOATING_POSTERS.map((p, i) => (
            <div
              key={p.title}
              className={clsx('absolute w-20 sm:w-24 rounded-xl shadow-xl opacity-80', i % 3 === 0 ? 'float-a' : i % 3 === 1 ? 'float-b' : 'float-c')}
              style={{
                '--r': p.rotate,
                animationDelay: p.delay,
                left: i < 3 ? `${5 + i * 5}%` : `${60 + (i - 3) * 15}%`,
                top: i % 2 === 0 ? '10%' : '35%',
                transform: `rotate(${p.rotate})`,
              } as React.CSSProperties}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.poster} alt={p.title} className="w-full rounded-xl object-cover aspect-[2/3]" />
            </div>
          ))}
        </div>

        {/* Badge */}
        <div className="pop-in inline-flex items-center gap-2 bg-white/80 border border-rose-200 rounded-full px-4 py-1.5 text-sm text-rose-500 mb-6 font-medium shadow-sm backdrop-blur-sm relative z-10">
          <Heart size={14} fill="currentColor" /> your shared movie night app
        </div>

        {/* Headline */}
        <h1 className="pop-in delay-1 font-display text-6xl md:text-8xl font-bold leading-tight mb-4 relative z-10">
          <span className="gradient-text italic">CinePop</span>
        </h1>

        <p className="pop-in delay-2 text-base text-rose-400 font-medium mb-5 italic relative z-10">
          Stop debating. Start watching. 🍿
        </p>

        <p className="pop-in delay-3 text-lg text-gray-500 mb-10 max-w-md leading-relaxed relative z-10">
          Build a shared watchlist with your circle, let fate pick tonight&apos;s movie, then rate and gush about it together.
        </p>

        <div className="pop-in delay-4 flex flex-col sm:flex-row gap-3 mb-6 relative z-10">
          <Link
            href="/watchlist"
            className="flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-medium px-8 py-3.5 rounded-full transition-all hover:scale-105 shadow-lg shadow-rose-200"
          >
            <Film size={18} /> Browse Library
          </Link>
          <Link
            href="/randomizer"
            className="flex items-center justify-center gap-2 bg-white hover:bg-rose-50 text-rose-500 font-medium px-8 py-3.5 rounded-full border border-rose-200 transition-all hover:scale-105 shadow-sm"
          >
            <Shuffle size={18} /> Pick Tonight&apos;s Watch
          </Link>
        </div>

        {!user && (
          <p className="pop-in delay-5 text-xs text-gray-400 relative z-10">
            Free forever · No ads · Made with 💕
          </p>
        )}
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section className="py-16 px-6 max-w-4xl mx-auto w-full">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-rose-400">How it works</span>
          <h2 className="font-display text-3xl font-bold text-gray-800 mt-2">Movie nights, upgraded ✨</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              step: '01',
              emoji: '🍿',
              color: 'rose',
              title: 'Create a circle',
              desc: 'Invite your partner, family, or friends. Everyone adds movies and shows they want to watch.',
            },
            {
              step: '02',
              emoji: '🎲',
              color: 'purple',
              title: 'Let fate decide',
              desc: 'Can\'t agree? Hit "Pick for us!" and CinePop picks randomly from your unwatched list.',
            },
            {
              step: '03',
              emoji: '⭐',
              color: 'amber',
              title: 'Rate & remember',
              desc: 'After watching, rate it and react with emoji. Your reviews live on your profile forever.',
            },
          ].map((f) => (
            <div key={f.step} className="glass rounded-2xl p-6 text-left hover:-translate-y-1 transition-transform">
              <div className="flex items-center gap-3 mb-4">
                <span className={clsx('text-xs font-bold', f.color === 'rose' ? 'text-rose-300' : f.color === 'purple' ? 'text-purple-300' : 'text-amber-300')}>
                  {f.step}
                </span>
                <span className="text-2xl">{f.emoji}</span>
              </div>
              <h3 className="font-display font-bold text-gray-800 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES STRIP ───────────────────────────────────────────── */}
      <section className="py-12 px-6 bg-white/60 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {[
            { icon: '📚', label: 'Shared Library' },
            { icon: '🎲', label: 'Random Picker' },
            { icon: '⭐', label: 'Ratings & Reviews' },
            { icon: '👥', label: 'Circle Profiles' },
          ].map((f) => (
            <div key={f.label} className="flex flex-col items-center gap-2 py-4">
              <span className="text-3xl">{f.icon}</span>
              <span className="text-xs font-semibold text-gray-500">{f.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── MADE BY SECTION ──────────────────────────────────────────── */}
      <section className="py-20 px-6 max-w-3xl mx-auto w-full text-center">
        <div className="glass rounded-3xl p-10 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-rose-50/80 to-purple-50/80 rounded-3xl" />

          <div className="relative z-10">
            <div className="flex items-end justify-center gap-4 mb-6">
              <div className="flex flex-col items-center gap-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={PHOTO_URL} alt="Kristel" className="w-20 h-20 rounded-full object-cover ring-2 ring-white shadow-lg" />
                <span className="text-[11px] text-gray-400 font-medium">Kristel 👩‍💻</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 mb-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={THEO_URL} alt="Theo" className="w-14 h-14 rounded-full object-cover ring-2 ring-rose-100 shadow-lg" />
                <span className="text-[11px] text-gray-400 font-medium">Theo 🐾</span>
              </div>
            </div>

            <h2 className="font-display text-2xl font-bold text-gray-800 mb-3">
              Made with love, not VC money 💕
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed max-w-md mx-auto mb-6">
              CinePop was built by Kristel — a developer who made this for her boyfriend and herself so they&apos;d never argue about what to watch again. It&apos;s free, ad-free, and built one cozy feature at a time. Oh, and Theo (the kitten) supervised the whole thing. 🐈‍⬛
            </p>
            <Link
              href="/about"
              className="inline-flex items-center gap-2 text-rose-500 hover:text-rose-600 text-sm font-semibold transition-colors"
            >
              Read our story <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────── */}
      {!user && (
        <section className="py-16 px-6 text-center">
          <h2 className="font-display text-3xl font-bold text-gray-800 mb-3">
            Ready for your next movie night? 🎬
          </h2>
          <p className="text-gray-400 text-sm mb-8 max-w-sm mx-auto">
            Join for free and start your circle in under a minute.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-semibold px-10 py-4 rounded-full transition-all hover:scale-105 shadow-lg shadow-rose-200 text-base"
          >
            <Sparkles size={18} /> Get started — it&apos;s free
          </Link>
        </section>
      )}

      {/* Footer */}
      <footer className="text-center py-8 text-xs text-gray-400 border-t border-rose-50">
        <p className="flex items-center justify-center gap-1 mb-2">
          made with <Heart size={10} className="inline text-rose-400" fill="currentColor" /> by Kristel & Theo · CinePop {new Date().getFullYear()}
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/about" className="hover:text-rose-400 transition-colors">About</Link>
          <Link href="/help" className="hover:text-rose-400 transition-colors">Help</Link>
          <Link href="/login" className="hover:text-rose-400 transition-colors">Log in</Link>
        </div>
      </footer>
    </main>
  )
}
