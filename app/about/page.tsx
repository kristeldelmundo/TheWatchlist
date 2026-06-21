'use client'

import { useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthProvider'
import {
  Coffee, Heart, Send, Loader2, Check, Globe, Github, Instagram, Sparkles, X,
} from 'lucide-react'

const KOFI_URL = 'https://ko-fi.com/kristeldelmundo'
const PHOTO_URL =
  'https://lscjqfqpnquielxncybb.supabase.co/storage/v1/object/public/avatars/site/kristel.jpg'
const THEO_URL =
  'https://lscjqfqpnquielxncybb.supabase.co/storage/v1/object/public/avatars/site/theo.jpg'
const SOCIALS = [
  { label: 'Portfolio', href: 'https://kristeldelmundo.vercel.app', icon: Globe },
  { label: 'Instagram', href: 'https://www.instagram.com/kristeldelmundo/', icon: Instagram },
  { label: 'GitHub', href: 'https://github.com/kristeldelmundo', icon: Github },
]

interface LightboxProps {
  src: string
  alt: string
  caption: string
  onClose: () => void
}

function Lightbox({ src, alt, caption, onClose }: LightboxProps) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-500 hover:text-rose-500 transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="w-full rounded-3xl shadow-2xl shadow-black/40 object-cover"
        />
        <p className="text-center text-white/80 text-sm mt-3 font-medium">{caption}</p>
      </div>
    </div>
  )
}

function AboutInner() {
  const { user } = useAuth()

  const [lightbox, setLightbox] = useState<{ src: string; alt: string; caption: string } | null>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submitSuggestion(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim() || !email.trim() || sending) return
    setSending(true)
    setError(null)

    const payload = {
      message: message.trim(),
      name: name.trim() || null,
      email: email.trim(),
    }

    const { error: insErr } = await supabase.from('suggestions').insert({
      ...payload,
      user_id: user?.id || null,
    })

    if (insErr) {
      setSending(false)
      setError('Hmm, that didn\u2019t go through. Please try again in a moment.')
      return
    }

    try {
      await supabase.functions.invoke('notify-suggestion', { body: payload })
    } catch {
      // ignore — suggestion is already saved in the table
    }

    setSending(false)
    setSent(true)
    setName('')
    setEmail('')
    setMessage('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-sky-50">
      {lightbox && (
        <Lightbox
          src={lightbox.src}
          alt={lightbox.alt}
          caption={lightbox.caption}
          onClose={() => setLightbox(null)}
        />
      )}

      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="flex items-end justify-center gap-4 mb-4">
            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={() => setLightbox({ src: PHOTO_URL, alt: 'Kristel', caption: 'Kristel 👩‍💻 — the builder behind CinePop 🍿' })}
                className="w-28 h-28 rounded-full overflow-hidden shadow-lg ring-2 ring-white hover:ring-rose-300 hover:scale-105 transition-all cursor-zoom-in"
                title="Tap to view"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={PHOTO_URL} alt="Kristel" className="w-full h-full object-cover" />
              </button>
              <span className="text-[11px] text-gray-400 font-medium">Kristel 👩‍💻</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 mb-1">
              <button
                onClick={() => setLightbox({ src: THEO_URL, alt: 'Theo the cat', caption: 'Theo 🐾 — CinePop\'s chief nap officer' })}
                className="w-20 h-20 rounded-full overflow-hidden shadow-lg ring-2 ring-rose-100 hover:ring-rose-300 hover:scale-105 transition-all cursor-zoom-in"
                title="Tap to view"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={THEO_URL} alt="Theo the cat" className="w-full h-full object-cover" />
              </button>
              <span className="text-[11px] text-gray-400 font-medium">Theo 🐾</span>
            </div>
          </div>

          <h1 className="font-display text-3xl font-bold text-gray-800 mb-2">
            Hi, I&apos;m <span className="gradient-text italic">Kristel</span> 🍿
          </h1>
          <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
            I built CinePop so my boyfriend and I could stop arguing about what to watch, and start actually watching it. 💕
          </p>
        </div>

        {/* The story */}
        <section className="glass rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">✨</span>
            <h2 className="font-display text-lg font-bold text-gray-800">The story</h2>
          </div>
          <div className="space-y-3 text-[14px] text-gray-600 leading-relaxed">
            <p>
              CinePop started as a tiny side project: a shared watchlist for me and my boyfriend, who love movies and shows but could <em>never</em> decide what to put on. No more &quot;I don&apos;t know, what do <em>you</em> want to watch?&quot; loops.
            </p>
            <p>
              So one night I hopped on Claude and just… made it happen. It grew into something more — circles, profiles, a randomizer for when we really can&apos;t decide, and a place to remember what we loved (and what made us cry). I&apos;m still building it, one cozy feature at a time.
            </p>
            <p>
              Thanks for being here. It means a lot — from me, my boyfriend, and our adorable kitten Theo. 🐈‍⬛
            </p>
          </div>
        </section>

        {/* Made by */}
        <section className="glass rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">👩‍💻</span>
            <h2 className="font-display text-lg font-bold text-gray-800">Made by me</h2>
          </div>
          <p className="text-[14px] text-gray-600 leading-relaxed mb-4">
            CinePop is one of my passion projects — something I made for me and the people I love watching with. You can find more of my work here:
          </p>
          <div className="flex flex-wrap gap-2">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-white/80 hover:bg-white text-rose-600 text-sm font-medium px-4 py-2 rounded-full transition-all shadow-sm"
              >
                <s.icon size={15} /> {s.label}
              </a>
            ))}
          </div>
        </section>

        {/* Support — Ko-fi */}
        <section className="glass rounded-2xl p-6 mb-4 text-center">
          <div className="text-3xl mb-2">☕</div>
          <h2 className="font-display text-lg font-bold text-gray-800 mb-1">
            Enjoying CinePop?
          </h2>
          <p className="text-[14px] text-gray-500 leading-relaxed max-w-sm mx-auto mb-4">
            CinePop is free and made with love. No pressure at all — but if it&apos;s saved you from a movie-night standoff, you can support the project (and Theo&apos;s treats 🐾) with a little coffee. 💕
          </p>
          <a
            href={KOFI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-semibold px-6 py-3 rounded-full transition-all hover:scale-105 shadow-md shadow-rose-200"
          >
            <Coffee size={18} /> Buy us a coffee
          </a>
        </section>

        {/* Suggestion box */}
        <section className="glass rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">💡</span>
            <h2 className="font-display text-lg font-bold text-gray-800">Suggestion box</h2>
          </div>
          <p className="text-[13px] text-gray-500 leading-relaxed mb-4">
            Got an idea, a bug, or a feature you&apos;d love? Tell me — I read every one. Drop your email and I&apos;ll write back personally. 💌
          </p>

          {sent ? (
            <div className="bg-green-50 border border-green-100 rounded-2xl p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <Check size={22} className="text-green-600" />
              </div>
              <p className="font-medium text-gray-800 mb-1">Thank you! 🍿</p>
              <p className="text-sm text-gray-500 mb-4">Your idea landed safely in my inbox — check your email for a note back from me. 💕</p>
              <button
                onClick={() => setSent(false)}
                className="text-sm text-rose-500 hover:text-rose-600 font-medium"
              >
                Send another
              </button>
            </div>
          ) : (
            <form onSubmit={submitSuggestion} className="space-y-3">
              {/* Stacked on mobile, side by side on sm+ */}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name (optional)"
                  className="flex-1 bg-white/90 border border-rose-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-rose-300"
                />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="Your email *"
                  required
                  className="flex-1 bg-white/90 border border-rose-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-rose-300"
                />
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="What's on your mind? ✨"
                required
                className="w-full bg-white/90 border border-rose-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-rose-300 resize-none"
              />
              {error && <p className="text-xs text-red-500 px-1">{error}</p>}
              <button
                type="submit"
                disabled={!message.trim() || !email.trim() || sending}
                className="w-full flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-medium py-3 rounded-xl text-sm transition-all"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {sending ? 'Sending…' : 'Send suggestion'}
              </button>
              <p className="text-[11px] text-gray-400 text-center">* Required so I can write back to you 💌</p>
            </form>
          )}
        </section>

        {/* Footer */}
        <div className="text-center mt-8 mb-4">
          <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
            Made with <Heart size={11} className="text-rose-400 fill-rose-400" /> by Kristel & Theo · CinePop {new Date().getFullYear()}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-rose-500 hover:text-rose-600 text-sm font-medium mt-3"
          >
            <Sparkles size={14} /> Back to CinePop
          </Link>
        </div>
      </main>
    </div>
  )
}

export default function AboutPage() {
  return <AboutInner />
}
