'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'
import { ChevronDown, Check } from 'lucide-react'
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
  className?: string
}

// A cute, on-brand replacement for native <select>. Rounded, rose-themed,
// animated open/close, check on the selected option, click-outside to close.
export default function CuteSelect({
  value,
  onChange,
  options,
  placeholder = 'Choose…',
  variant = 'full',
  className,
}: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value)

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

  return (
    <div ref={ref} className={clsx('relative', variant === 'full' && 'w-full', className)}>
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
          className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-2xl border border-rose-100 shadow-2xl shadow-rose-200/50 overflow-hidden max-h-72 overflow-y-auto burst"
        >
          {options.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-gray-300">Nothing to choose yet 🍿</p>
          )}
          {options.map(o => {
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
      )}
    </div>
  )
}
