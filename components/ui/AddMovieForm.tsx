'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Plus, Loader2, Search, Film, Tv, AlertCircle, Check } from 'lucide-react'
import { MediaType, OMDBSearchResult } from '@/types'
import { searchMovies } from '@/lib/omdb'
import { clsx } from 'clsx'
import CuteSelect from '@/components/ui/CuteSelect'

type AddResult = { ok: boolean; duplicate?: boolean; title?: string }

interface Props {
  onAdd: (
    title: string,
    type: MediaType,
    imdbID?: string,
  ) => Promise<AddResult | void>
  // Name of the person currently adding (the logged-in user)
  addingAs?: string
}

type Feedback = { kind: 'added' | 'duplicate'; title: string } | null

export default function AddMovieForm({ onAdd, addingAs }: Props) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<MediaType>('movie')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  const [suggestions, setSuggestions] = useState<OMDBSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Debounced live search as the user types
  useEffect(() => {
    if (title.trim().length < 2) {
      setSuggestions([])
      return
    }
    setSearching(true)
    const timer = setTimeout(async () => {
      const results = await searchMovies(title.trim(), type)
      setSuggestions(results)
      setSearching(false)
      setShowDropdown(true)
    }, 350)
    return () => clearTimeout(timer)
  }, [title, type])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function showFeedback(result: AddResult | void) {
    if (result && result.duplicate) {
      setFeedback({ kind: 'duplicate', title: result.title || '' })
    } else if (result && result.ok) {
      setFeedback({ kind: 'added', title: result.title || '' })
    }
    setTimeout(() => setFeedback(null), 4000)
  }

  async function pickSuggestion(s: OMDBSearchResult) {
    setShowDropdown(false)
    setTitle('')
    setSuggestions([])
    setLoading(true)
    const result = await onAdd(s.Title, type, s.imdbID)
    setLoading(false)
    showFeedback(result)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || loading) return
    setShowDropdown(false)
    setLoading(true)
    const result = await onAdd(title.trim(), type)
    setLoading(false)
    showFeedback(result)
    if (result && result.ok) setTitle('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={clsx(
        'glass rounded-2xl p-4 mb-6 relative',
        showDropdown && suggestions.length > 0 ? 'z-50' : 'z-10',
      )}
    >
      {addingAs && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-medium text-gray-600">Adding as</span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-rose-500 text-white">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-white/30">
              {addingAs.charAt(0).toUpperCase()}
            </span>
            {addingAs}
          </span>
        </div>
      )}

      <div className="flex gap-2 mb-2">
        <div ref={wrapperRef} className="relative flex-1">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
              placeholder="Start typing a movie or show name..."
              className="w-full bg-white/80 border border-rose-100 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-700 placeholder-gray-300 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 transition-all"
            />
            {searching && (
              <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-300 animate-spin" />
            )}
          </div>

          {/* Suggestions dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl border border-rose-100 shadow-2xl shadow-rose-200/60 overflow-hidden max-h-80 overflow-y-auto">
              {suggestions.map(s => (
                <button
                  key={s.imdbID}
                  type="button"
                  onClick={() => pickSuggestion(s)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-rose-50 transition-colors text-left border-b border-rose-50 last:border-0 bg-white"
                >
                  <div className="rounded-md overflow-hidden flex-shrink-0 bg-rose-50 flex items-center justify-center" style={{ width: '36px', height: '52px' }}>
                    {s.Poster && s.Poster !== 'N/A' ? (
                      <Image src={s.Poster} alt={s.Title} width={36} height={52} className="w-full h-full object-cover" />
                    ) : (
                      type === 'tv' ? <Tv size={16} className="text-rose-200" /> : <Film size={16} className="text-rose-200" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">{s.Title}</p>
                    <p className="text-xs text-gray-400">{s.Year}</p>
                  </div>
                  <Plus size={16} className="text-rose-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        <CuteSelect
          variant="compact"
          value={type}
          onChange={v => setType(v as MediaType)}
          options={[
            { value: 'movie', label: 'Movie', leading: <Film size={14} className="text-rose-400 flex-shrink-0" /> },
            { value: 'tv', label: 'TV Show', leading: <Tv size={14} className="text-purple-400 flex-shrink-0" /> },
          ]}
        />
      </div>

      <button
        type="submit"
        disabled={!title.trim() || loading}
        className="w-full flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-medium py-2.5 rounded-xl text-sm transition-all"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        {loading ? 'Adding...' : 'Add to Library'}
      </button>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={clsx(
            'flex items-center gap-2 mt-3 px-3 py-2 rounded-xl text-xs font-medium burst',
            feedback.kind === 'duplicate'
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : 'bg-green-50 text-green-700 border border-green-200',
          )}
        >
          {feedback.kind === 'duplicate' ? (
            <>
              <AlertCircle size={15} className="flex-shrink-0" />
              <span>
                <strong>{feedback.title}</strong> is already in this library! 🍿
              </span>
            </>
          ) : (
            <>
              <Check size={15} className="flex-shrink-0" />
              <span>
                Added <strong>{feedback.title}</strong> to your library!
              </span>
            </>
          )}
        </div>
      )}

      {!feedback && (
        <p className="text-xs text-gray-300 text-center mt-2">Pick a suggestion above, or type a full title and hit add</p>
      )}
    </form>
  )
}
