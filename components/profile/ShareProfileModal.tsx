'use client'

import { useState } from 'react'
import { Link2, Download, Check, X, Loader2 } from 'lucide-react'
import { toPng } from 'html-to-image'

// A small modal with two actions: copy the public link, and download the
// profile card as a PNG. `cardRef` points at the node to snapshot.
export default function ShareProfileModal({
  open,
  onClose,
  shareUrl,
  cardRef,
  fileBaseName,
}: {
  open: boolean
  onClose: () => void
  shareUrl: string
  cardRef: React.RefObject<HTMLElement>
  fileBaseName: string
}) {
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  async function copyLink() {
    setError(null)
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setError('Could not copy — long-press the link to copy it.')
    }
  }

  async function downloadCard() {
    if (!cardRef.current) return
    setError(null)
    setDownloading(true)
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        // Give the PNG a soft CinePop backdrop so the frosted card has context.
        backgroundColor: '#fdeef5',
        style: { margin: '0' },
      })
      const link = document.createElement('a')
      const safe = (fileBaseName || 'cinepop').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()
      link.download = `cinepop-${safe}.png`
      link.href = dataUrl
      link.click()
    } catch {
      setError('Could not make the image — try again, or just share the link.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-sm bg-white rounded-t-[28px] sm:rounded-[28px] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-display text-xl font-bold text-gray-800">Share your profile</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <p className="text-[13px] text-gray-500 mb-5">Anyone with the link can see your card — no login needed. 🍿</p>

        {/* Link row */}
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2.5 mb-3">
          <Link2 size={16} className="text-rose-400 flex-shrink-0" />
          <span className="text-[13px] text-gray-600 truncate flex-1">{shareUrl.replace(/^https?:\/\//, '')}</span>
        </div>

        <button
          onClick={copyLink}
          className="w-full flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-medium py-3 rounded-xl text-sm transition-all mb-2.5"
        >
          {copied ? <Check size={16} /> : <Link2 size={16} />}
          {copied ? 'Link copied!' : 'Copy link'}
        </button>

        <button
          onClick={downloadCard}
          disabled={downloading}
          className="w-full flex items-center justify-center gap-2 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-60 font-medium py-3 rounded-xl text-sm transition-all"
        >
          {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {downloading ? 'Making your card…' : 'Download card image'}
        </button>

        {error && <p className="text-xs text-red-500 mt-3 text-center">{error}</p>}
      </div>
    </div>
  )
}
