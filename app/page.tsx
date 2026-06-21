'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Film, Shuffle, Star, Heart, Sparkles, ChevronLeft, ChevronRight, Users, Coffee } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { clsx } from 'clsx'

const PHOTO_URL = 'https://lscjqfqpnquielxncybb.supabase.co/storage/v1/object/public/avatars/site/kristel.jpg'
const THEO_URL = 'https://lscjqfqpnquielxncybb.supabase.co/storage/v1/object/public/avatars/site/theo.jpg'
const KOFI_URL = 'https://ko-fi.com/kristeldelmundo'

const TOTAL = 3

export default function HomePage() {
  const { user, profile } = useAuth()
  const [cur, setCur] = useState(0)
  const [animating, setAnimating] = useState(false)

  const name = profile?.display_name || user?.email?.split('@')[0] || null
  const initial = (name || 'U').charAt(0).toUpperCase()
  const accent = profile?.accent_color === 'purple' ? 'purple' : 'rose'

  function go(d: number) {
    if (animating) return
    setAnimating(true)
    setTimeout(() => {
      setCur((c) => (c + d + TOTAL) % TOTAL)
      setAnimating(false)
    }, 300)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  useEffect(() => {
    let startX = 0
    function onStart(e: TouchEvent) { startX = e.touches[0].clientX }
    function onEnd(e: TouchEvent) {
      const dx = e.changedTouches[0].clientX - startX
      if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
    }
    window.addEventListener('touchstart', onStart)
    window.addEventListener('touchend', onEnd)
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchend', onEnd)
    }
  })

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-gradient-to-br from-rose-50 via-purple-50 to-sky-50">
      <style>{`
        @keyframes pop-in{0%{opacity:0;transform:translateY(12px) scale(0.97)}100%{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        .pop{animation:pop-in 0.45s cubic-bezier(0.34,1.3,0.64,1) both}
        .d1{animation-delay:0.04s}.d2{animation-delay:0.1s}.d3{animation-delay:0.17s}.d4{animation-delay:0.24s}.d5{animation-delay:0.31s}
        .bob{animation:bob 3s ease-in-out infinite}
        .slide-out{opacity:0;transform:translateY(6px);transition:all 0.25s ease}
        .slide-in{opacity:1;transform:translateY(0);transition:all 0.3s ease}
        .dot{width:6px;height:6px;border-radius:50%;background:rgba(244,63,94,0.2);transition:all 0.3s;cursor:pointer;}
        .dot.active{width:18px;border-radius:4px;background:#f43f5e;}
        .glass{background:rgba(255,255,255,0.72);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,0.85);}
      `}</style>

      {/* ── NAVBAR ──────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 max-w-5xl mx-auto w-full flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl sm:text-2xl bob inline-block">🍿</span>
          <span className="font-display text-lg sm:text-xl font-medium text-rose-600 italic">CinePop</span>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <Link
              href="/profile"
              className="flex items-center gap-2 bg-white/80 border border-rose-100 rounded-full px-3 sm:px-4 py-1.5 text-xs sm:text-sm text-gray-500 hover:border-rose-300 transition-colors"
            >
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={name || 'You'} className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover" />
              ) : (
                <span className={clsx('w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-medium', accent === 'purple' ? 'bg-purple-100 text-purple-600' : 'bg-rose-100 text-rose-600')}>
                  {initial}
                </span>
              )}
              <span className="ml-0.5 max-w-[80px] truncate">{name}</span>
            </Link>
          ) : (
            <Link href="/login" className="flex items-center gap-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full px-4 sm:px-5 py-1.5 text-xs sm:text-sm font-medium transition-colors">
              Log in
            </Link>
          )}
        </div>
      </nav>

      {/* ── SLIDE AREA ──────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">
        {/* On mobile: vertically centered. On desktop: shifted up with pt */}
        <div className={clsx(
          'absolute inset-0 flex flex-col items-center text-center px-5 sm:px-8',
          'justify-center sm:justify-start sm:pt-16',
          animating ? 'slide-out' : 'slide-in'
        )}>

          {/* ── SLIDE 1: HERO ── */}
          {cur === 0 && (
            <>
              <div className="pop d1 inline-flex items-center gap-1.5 bg-white/60 border border-rose-200 rounded-full px-3 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm text-rose-500 mb-4 sm:mb-5 font-medium">
                <Heart size={11} fill="currentColor" /> your shared movie night app
              </div>
              <h1 className="pop d2 font-display font-bold text-gray-800 leading-tight mb-3 sm:mb-4" style={{ fontSize: 'clamp(32px,8vw,86px)' }}>
                <span className="gradient-text italic">CinePop</span>{' '}
                <span className="not-italic" style={{ WebkitTextFillColor: 'initial' }}>🍿</span>
              </h1>
              <p className="pop d3 text-sm sm:text-base text-rose-400 font-medium italic mb-2 sm:mb-3">Pop something on tonight 🍿</p>
              {/* Gray body text — smaller on desktop too */}
              <p className="pop d4 text-sm text-gray-500 max-w-xs sm:max-w-md leading-relaxed mb-6 sm:mb-8">
                Add movies and shows, let fate decide what you watch, then rate and share the experience together.
              </p>
              <div className="pop d5 flex flex-col sm:flex-row gap-2 sm:gap-3 w-full max-w-xs sm:max-w-none sm:w-auto">
                <Link href="/watchlist" className="flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-medium px-6 sm:px-8 py-3 sm:py-3.5 rounded-full transition-all hover:scale-105 shadow-lg shadow-rose-200 text-sm sm:text-base">
                  <Film size={16} /> Browse Library
                </Link>
                <Link href="/randomizer" className="flex items-center justify-center gap-2 bg-white hover:bg-rose-50 text-rose-500 font-medium px-6 sm:px-8 py-3 sm:py-3.5 rounded-full border border-rose-200 transition-all hover:scale-105 shadow-sm text-sm sm:text-base">
                  <Shuffle size={16} /> Pick Tonight&apos;s Watch
                </Link>
              </div>
              {!user && (
                <p className="pop mt-4 text-xs text-gray-400">Free forever · No ads · Made with 💕</p>
              )}
            </>
          )}

          {/* ── SLIDE 2: HOW IT WORKS ── */}
          {cur === 1 && (
            <>
              <div className="pop d1 text-rose-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1 sm:mb-2">How it works</div>
              <h2 className="pop d2 font-display text-2xl sm:text-4xl font-bold text-gray-800 mb-1 sm:mb-2">Movie nights, upgraded ✨</h2>
              <p className="pop d3 text-xs sm:text-sm text-gray-400 max-w-xs sm:max-w-sm mb-4 sm:mb-8">Everything you need for a perfect watch night, built in.</p>
              <div className="pop d4 grid grid-cols-3 gap-2 sm:gap-5 max-w-xs sm:max-w-2xl w-full">
                {[
                  { emoji: '🍿', step: '01', title: 'Create a circle', desc: 'Invite your people. Everyone adds to one shared watchlist.' },
                  { emoji: '🎲', step: '02', title: 'Let fate decide', desc: 'Hit "Pick for us!" for a random pick with a trailer preview.' },
                  { emoji: '⭐', step: '03', title: 'Rate & remember', desc: 'Rate with emoji. Reviews live on your profile forever.' },
                ].map((f) => (
                  <div key={f.step} className="glass rounded-xl sm:rounded-2xl p-3 sm:p-6 text-center hover:-translate-y-1 transition-transform flex flex-col items-center">
                    <span className="text-[9px] sm:text-[11px] font-bold text-gray-300 mb-0.5 sm:mb-1">{f.step}</span>
                    <span className="text-xl sm:text-3xl mb-1 sm:mb-3">{f.emoji}</span>
                    <h3 className="font-bold text-gray-800 text-[11px] sm:text-base mb-1 sm:mb-2 leading-tight">{f.title}</h3>
                    <p className="text-[10px] sm:text-sm text-gray-500 leading-relaxed hidden sm:block">{f.desc}</p>
                    <p className="text-[10px] text-gray-500 leading-tight sm:hidden">{f.desc.split('.')[0]}.</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── SLIDE 3: MADE BY ── */}
          {cur === 2 && (
            <>
              <div className="pop d1 flex items-end justify-center gap-3 sm:gap-5 mb-4 sm:mb-6">
                <div className="flex flex-col items-center gap-1 sm:gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={PHOTO_URL} alt="Kristel" className="w-16 h-16 sm:w-24 sm:h-24 rounded-full object-cover shadow-lg ring-2 ring-white" />
                  <span className="text-[10px] sm:text-sm text-gray-400 font-medium">Kristel 👩‍💻</span>
                </div>
                <div className="flex flex-col items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={THEO_URL} alt="Theo" className="w-11 h-11 sm:w-16 sm:h-16 rounded-full object-cover shadow-lg ring-2 ring-rose-100" />
                  <span className="text-[10px] sm:text-sm text-gray-400 font-medium">Theo 🐾</span>
                </div>
              </div>
              <h2 className="pop d2 font-display text-lg sm:text-3xl font-bold text-gray-800 mb-2 sm:mb-3">Made with love, not VC money 💕</h2>
              <p className="pop d3 text-xs sm:text-sm text-gray-500 max-w-xs sm:max-w-lg leading-relaxed mb-1 sm:mb-2">
                CinePop was built by Kristel for her boyfriend and herself so they&apos;d never argue about what to watch again. Free, ad-free, one cozy feature at a time.
              </p>
              <p className="pop d3 text-xs sm:text-sm text-gray-400 max-w-xs sm:max-w-sm leading-relaxed mb-5 sm:mb-8">
                Oh, and Theo (the kitten) supervised the whole thing. 🐈‍⬛
              </p>
              <div className="pop d4 flex flex-col sm:flex-row gap-2 sm:gap-3 items-center justify-center w-full max-w-xs sm:max-w-none sm:w-auto">
                {!user ? (
                  <Link href="/login" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-medium px-6 sm:px-8 py-3 sm:py-3.5 rounded-full transition-all hover:scale-105 shadow-lg shadow-rose-200 text-sm sm:text-base">
                    <Sparkles size={16} /> Get started — it&apos;s free
                  </Link>
                ) : (
                  <Link href="/watchlist" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-medium px-6 sm:px-8 py-3 sm:py-3.5 rounded-full transition-all hover:scale-105 shadow-lg shadow-rose-200 text-sm sm:text-base">
                    <Film size={16} /> Go to my library
                  </Link>
                )}
                <a href={KOFI_URL} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white hover:bg-rose-50 text-rose-500 font-medium px-6 sm:px-8 py-3 sm:py-3.5 rounded-full border border-rose-200 transition-all hover:scale-105 shadow-sm text-sm sm:text-base">
                  <Coffee size={16} /> Buy us a coffee
                </a>
              </div>
              <p className="pop d5 mt-3 sm:mt-5 text-xs text-gray-400 flex items-center gap-1">
                Made with <Heart size={9} className="text-rose-400" fill="currentColor" /> · CinePop {new Date().getFullYear()}
              </p>
            </>
          )}
        </div>

        {/* Arrows */}
        <button onClick={() => go(-1)} className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-rose-400 hover:text-rose-600 transition-all hover:scale-110 bg-white/70 border border-rose-100 shadow-sm" aria-label="Previous">
          <ChevronLeft size={16} />
        </button>
        <button onClick={() => go(1)} className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-rose-400 hover:text-rose-600 transition-all hover:scale-110 bg-white/70 border border-rose-100 shadow-sm" aria-label="Next">
          <ChevronRight size={16} />
        </button>

        {/* Dots */}
        <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <button
              key={i}
              onClick={() => { if (!animating) { setAnimating(true); setTimeout(() => { setCur(i); setAnimating(false) }, 300) } }}
              className={clsx('dot', i === cur && 'active')}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
