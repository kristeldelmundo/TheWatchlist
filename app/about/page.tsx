'use client'

import { useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthProvider'
import {
  Coffee, Heart, Send, Loader2, Check, Globe, Github, Instagram, Sparkles,
} from 'lucide-react'

// ⬇️ PLACEHOLDERS — swap these for the real thing anytime.
const KOFI_URL = 'https://ko-fi.com/yourname' // ← replace with your real Ko-fi handle
const PORTFOLIO_URL = 'https://kristeldelmundo.vercel.app'
const SOCIALS = [
  { label: 'Portfolio', href: PORTFOLIO_URL, icon: Globe },
  { label: 'Instagram', href: 'https://instagram.com/yourhandle', icon: Instagram },
  { label: 'GitHub', href: 'https://github.com/kristeldelmundo', icon: Github },
]

function AboutInner() {
  const { user } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submitSuggestion(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim() || sending) return
    setSending(true)
    setError(null)
    const { error: insErr } = await supabase.from('suggestions').insert({
      message: message.trim(),
      name: name.trim() || null,
      email: email.trim() || null,
      user_id: user?.id || null,
    })
    setSending(false)
    if (insErr) {
      setError('Hmm, that didn\u2019t go through. Please try again in a moment.')
      return
    }
    setSent(true)
    setName('')
    setEmail('')
    setMessage('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-sky-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-8">
          {/* PLACEHOLDER avatar — swap the emoji for a real photo later */}
          <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-gradient-to-br from-rose-200 to-purple-200 flex items-center justify-center text-4xl shadow-lg ring-2 ring-white">
            🎬
          </div>
          <h1 className="font-display text-3xl font-bold text-gray-800 mb-2">
            Hi, I&apos;m <span className="gradient-text italic">Kristel</span> 🍿
          </h1>
          <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
            {/* PLACEHOLDER one-liner */}
            I built CinePop so my favorite people and I could stop arguing about what to watch — and start actually watching it. 💕
          </p>
        </div>

        {/* The story */}
        <section className="glass rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">✨</span>
            <h2 className="font-display text-lg font-bold text-gray-800">The story</h2>
          </div>
          {/* PLACEHOLDER story copy — replace with your real words anytime */}
          <div className="space-y-3 text-[14px] text-gray-600 leading-relaxed">
            <p>
              CinePop started as a tiny side project: a shared watchlist for me and the people I watch movies with. No more &quot;I don&apos;t know, what do <em>you</em> want to watch?&quot; loops.
            </p>
            <p>
              It grew into something more — circles, profiles, a randomizer when we really can&apos;t decide, and a place to remember what we loved (and what made us cry). I&apos;m still building it, one cozy feature at a time.
            </p>
            <p>
              Thanks for being here. It means a lot. 🿿
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
            I&apos;m a creative who loves where fashion, film, and code meet. CinePop is one of my passion projects — you can find more of my work here:
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
            CinePop is free and made with love. If it&apos;s saved you from a movie-night standoff, you can fuel the next feature with a coffee. 💕
          </p>
          <a
            href={KOFI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-semibold px-6 py-3 rounded-full transition-all hover:scale-105 shadow-md shadow-rose-200"
          >
            <Coffee size={18} /> Buy me a coffee
          </a>
        </section>

        {/* Suggestion box */}
        <section className="glass rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">💡</span>
            <h2 className="font-display text-lg font-bold text-gray-800">Suggestion box</h2>
          </div>
          <p className="text-[13px] text-gray-500 leading-relaxed mb-4">
            Got an idea, a bug, or a feature you&apos;d love? Tell me — I read every one.
          </p>

          {sent ? (
            <div className="bg-green-50 border border-green-100 rounded-2xl p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <Check size={22} className="text-green-600" />
              </div>
              <p className="font-medium text-gray-800 mb-1">Thank you! 🿿</p>
              <p className="text-sm text-gray-500 mb-4">Your idea landed safely in my inbox.</p>
              <button
                onClick={() => setSent(false)}
                className="text-sm text-rose-500 hover:text-rose-600 font-medium"
              >
                Send another
              </button>
            </div>
          ) : (
            <form onSubmit={submitSuggestion} className="space-y-3">
              <div className="flex gap-2">
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
                  placeholder="Email (optional)"
                  className="flex-1 bg-white/90 border border-rose-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-rose-300"
                />
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="What's on your mind? ✨"
                className="w-full bg-white/90 border border-rose-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-rose-300 resize-none"
              />
              {error && <p className="text-xs text-red-500 px-1">{error}</p>}
              <button
                type="submit"
                disabled={!message.trim() || sending}
                className="w-full flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-medium py-3 rounded-xl text-sm transition-all"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {sending ? 'Sending…' : 'Send suggestion'}
              </button>
            </form>
          )}
        </section>

        {/* Footer */}
        <div className="text-center mt-8 mb-4">
          <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
            Made with <Heart size={11} className="text-rose-400 fill-rose-400" /> by Kristel · CinePop {new Date().getFullYear()}
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
