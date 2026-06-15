'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, Search, Loader2, Film, Tv, Check } from 'lucide-react'
import { clsx } from 'clsx'
import { searchMovies } from '@/lib/omdb'
import { MediaType, OMDBSearchResult } from '@/types'

// What a chosen title looks like when handed back to the parent.
export interface CatalogChoice {
  title: string
  year: string | null
  poster: string | null
  type: MediaType
}

interface Props {
  // Currently chosen title (for display in the closed button), or null.
  value: CatalogChoice | null
  onChange: (choice: CatalogChoice | null) => void
  placeholder?: string
  // Notifies parent of open/close so it can manage z-index of sibling cards.
  onOpenChange?: (open: boolean) => void
  className?: string
}

// A rose-themed dropdown that searches the FULL movie/TV catalog (OMDB) as you
// type — not just the user's Library. Selecting a result hands the parent a
// { title, year, poster, type } choice; it does NOT add anything to the Library.
export default function CatalogPicker({
  value,
  onChange,
  placeholder = 'Search any movie or show…',
  onOpenChange,
  className,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [type, setType] = useState<MediaType>('movie')
  const [results, setResults] = useState<OMDBSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  function setOpenState(next: boolean) {
    setOpen(next)
    onOpenChange?.(next)
  }

  // Debounced live search as the user types.
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    const timer = setTimeout(async () => {
      const found = await searchMovies(query.trim(), type)
      setResults(found)
      setSearching(false)
    }, 350)
    return () => clearTimeout(timer)
  }, [query, type])

  // Close on outside click / Escape.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpenState(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenState(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Focus the search field when opening.
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => searchRef.current?.focus(), 30)
      return () => clearTimeout(t)
    }
  }, [open])

  const choose = useCallback((r: OMDBSearchResult) => {
    const poster = r.Poster && r.Poster !== 'N/A' ? r.Poster : null
    const choiceType: MediaType = r.Type === 'series' ? 'tv' : 'movie'
    onChange({ title: r.Title, year: r.Year || null, poster, type: choiceType })
    setOpenState(false)
    setQuery('')
    setResults([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onChange])

  return (
    <div
      ref={ref}
      className={clsx('relative w-full', open ? 'z-[100]' : 'z-10', className)}
    >
      <button
        type="button"
        onClick={() => setOpenState(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={clsx(
          'flex items-center gap-2 w-full bg-white/80 border rounded-xl text-sm transition-all outline-none px-3 py-2.5 text-left',
          'focus:ring-2 focus:ring-rose-100',
          open ? 'border-rose-300' : 'border-rose-100 hover:border-rose-200',
        )}
      >
        {value?.poster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value.poster} alt="" className="rounded object-cover flex-shrink-0" style={{ width: 24, height: 34 }} />
        )}
        <span className={clsx('flex-1 min-w-0 truncate', value ? 'text-gray-700' : 'text-gray-400')}>
          {value ? value.title : placeholder}
        </span>
        <ChevronDown size={15} className={clsx('text-gray-400 flex-shrink-0 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-[100] left-0 right-0 mt-1.5 bg-white rounded-2xl border border-rose-100 shadow-2xl shadow-rose-200/50 overflow-hidden burst"
        >
          {/* Search + type toggle */}
          <div className="p-2 border-b border-rose-50 bg-white sticky top-0">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search any movie or show…"
                  className="w-full bg-rose-50/60 border border-rose-100 rounded-lg pl-8 pr-8 py-2 text-sm text-gray-700 placeholder-gray-300 outline-none focus:border-rose-300"
                />
                {searching && <Loader2 size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-rose-300 animate-spin" />}
              </div>
              {/* Movie / TV toggle */}
              <div className="flex rounded-lg overflow-hidden border border-rose-100 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setType('movie')}
                  className={clsx('flex items-center gap-1 px-2.5 text-xs font-semibold transition-colors',
                    type === 'movie' ? 'bg-rose-500 text-white' : 'bg-white text-gray-400 hover:bg-rose-50')}
                >
                  <Film size={13} /> Movie
                </button>
                <button
                  type="button"
                  onClick={() => setType('tv')}
                  className={clsx('flex items-center gap-1 px-2.5 text-xs font-semibold transition-colors',
                    type === 'tv' ? 'bg-purple-500 text-white' : 'bg-white text-gray-400 hover:bg-purple-50')}
                >
                  <Tv size={13} /> TV
                </button>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="max-h-64 overflow-y-auto">
            {query.trim().length < 2 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-300">Type at least 2 letters to search 🍿</p>
            ) : !searching && results.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-300">No matches — try another title or switch Movie/TV</p>
            ) : (
              results.map(r => {
                const isSel = value?.title === r.Title
                const poster = r.Poster && r.Poster !== 'N/A' ? r.Poster : null
                return (
                  <button
                    key={r.imdbID}
                    type="button"
                    role="option"
                    aria-selected={isSel}
                    onClick={() => choose(r)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-rose-50 last:border-0',
                      isSel ? 'bg-rose-50' : 'hover:bg-rose-50/60',
                    )}
                  >
                    <div className="rounded-md overflow-hidden flex-shrink-0 bg-rose-50 flex items-center justify-center" style={{ width: 28, height: 40 }}>
                      {poster ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={poster} alt="" className="w-full h-full object-cover" />
                      ) : (
                        type === 'tv' ? <Tv size={14} className="text-rose-200" /> : <Film size={14} className="text-rose-200" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={clsx('text-sm truncate', isSel ? 'font-semibold text-rose-600' : 'text-gray-700')}>{r.Title}</p>
                      {r.Year && <p className="text-xs text-gray-400">{r.Year}</p>}
                    </div>
                    {isSel && <Check size={15} className="text-rose-500 flex-shrink-0" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
