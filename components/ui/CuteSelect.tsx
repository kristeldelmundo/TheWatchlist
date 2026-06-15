'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'
import { ChevronDown, Check, Search } from 'lucide-react'
import { clsx } from 'clsx'

export interface CuteOption {
  value: string
  label: string
  // Optional left-side visual: an icon, emoji, or small poster element.
  leading?: ReactNode
  // Optional second line under the label (e.g. year).
  sublabel?: string
  // Optional right-side badge (e.g. a Movie/TV pill).
  trailing?: ReactNode
}

interface Props {
  value: string
  onChange: (value: string) => void
  options: CuteOption[]
  placeholder?: string
  // 'compact' = small inline pill (Movie/TV); 'full' = full-width field (poster picker)
  variant?: 'compact' | 'full'
  // When true, shows a search box at the top of the open list to filter by label.
  searchable?: boolean
  className?: string
}

// A cute, on-brand replacement for native <select>. Rounded, rose-themed,
// animated open/close, check on the selected option, click-outside to close.
// Optionally searchable. When open, the whole wrapper is lifted above
// sibling content so the panel never hides behind following cards.
export default function CuteSelect({
  value,
  onChange,
  options,
  placeholder = 'Choose…',
  variant = 'full',
  searchable = false,
  className,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selected = options.find(o => o.value === value)

  const filtered = searchable && query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  // Clear the query and focus the search box each time we open.
  useEffect(() => {
    if (open) {
      setQuery('')
      if (searchable) {
        // focus after the panel paints
        const t = setTimeout(() => searchRef.current?.focus(), 30)
        return () => clearTimeout(t)
      }
    }
  }, [open, searchable])

  return (
    <div
      ref={ref}
      className={clsx(
        'relative',
        variant === 'full' && 'w-full',
        // Lift the whole control above sibling cards while open so the
        // floating panel is never covered by content beneath it.
        open ? 'z-[100]' : 'z-10',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={clsx(
          'flex items-center gap-2 bg-white/80 border rounded-xl text-sm transition-all outline-none',
          'focus:ring-2 focus:ring-rose-100',
          open ? 'border-rose-300' : 'border-rose-100 hover:border-rose-200',
          variant === 'full' ? 'w-full px-3 py-2.5 text-left' : 'px-3 py-2.5',
        )}
      >
        {selected?.leading}
        <span className={clsx('flex-1 min-w-0 truncate', selected ? 'text-gray-700' : 'text-gray-400')}>
          {selected ? selected.label : placeholder}
        </span>
        {selected?.trailing}
        <ChevronDown
          size={15}
          className={clsx('text-gray-400 flex-shrink-0 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-[100] left-0 right-0 mt-1.5 bg-white rounded-2xl border border-rose-100 shadow-2xl shadow-rose-200/50 overflow-hidden burst"
        >
          {searchable && (
            <div className="p-2 border-b border-rose-50 bg-white sticky top-0">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search your library…"
                  className="w-full bg-rose-50/60 border border-rose-100 rounded-lg pl-8 pr-3 py-2 text-sm text-gray-700 placeholder-gray-300 outline-none focus:border-rose-300"
                />
              </div>
            </div>
          )}

          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-gray-300">
                {options.length === 0 ? 'Nothing to choose yet 🍿' : 'No matches — try another title'}
              </p>
            )}
            {filtered.map(o => {
              const isSel = o.value === value
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={isSel}
                  onClick={() => {
                    onChange(o.value)
                    setOpen(false)
                  }}
                  className={clsx(
                    'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-rose-50 last:border-0',
                    isSel ? 'bg-rose-50' : 'hover:bg-rose-50/60',
                  )}
                >
                  {o.leading}
                  <div className="flex-1 min-w-0">
                    <p className={clsx('text-sm truncate', isSel ? 'font-semibold text-rose-600' : 'text-gray-700')}>
                      {o.label}
                    </p>
                    {o.sublabel && <p className="text-xs text-gray-400">{o.sublabel}</p>}
                  </div>
                  {o.trailing}
                  {isSel && <Check size={15} className="text-rose-500 flex-shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
