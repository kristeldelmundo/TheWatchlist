'use client'

import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { WatchlistUser, MediaType } from '@/types'
import { clsx } from 'clsx'

interface Props {
  onAdd: (title: string, type: MediaType, who: WatchlistUser) => Promise<void>
}

const USERS: { value: WatchlistUser; initial: string; label: string }[] = [
  { value: 'Kristel', initial: 'K', label: 'Kristel' },
  { value: 'Eric', initial: 'E', label: 'Eric' },
]

export default function AddMovieForm({ onAdd }: Props) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<MediaType>('movie')
  const [who, setWho] = useState<WatchlistUser>('Kristel')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || loading) return
    setLoading(true)
    await onAdd(title.trim(), type, who)
    setTitle('')
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="glass rounded-2xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-medium text-gray-600">Adding as:</span>
        {USERS.map(u => (
          <button
            key={u.value}
            type="button"
            onClick={() => setWho(u.value)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-all',
              who === u.value
                ? u.value === 'Kristel'
                  ? 'bg-rose-500 text-white scale-105 shadow-md shadow-rose-200'
                  : 'bg-purple-500 text-white scale-105 shadow-md shadow-purple-200'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            )}
          >
            <span className={clsx(
              'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold',
              who === u.value ? 'bg-white/30' : 'bg-gray-200'
            )}>
              {u.initial}
            </span>
            {u.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Search for a movie or show..."
          className="flex-1 bg-white/80 border border-rose-100 rounded-xl px-4 py-2.5 text-sm text-gray-700 placeholder-gray-300 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 transition-all"
        />
        <select
          value={type}
          onChange={e => setType(e.target.value as MediaType)}
          className="bg-white/80 border border-rose-100 rounded-xl px-3 py-2.5 text-sm text-gray-600 outline-none focus:border-rose-300 cursor-pointer"
        >
          <option value="movie">Movie</option>
          <option value="tv">TV Show</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={!title.trim() || loading}
        className="w-full flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-medium py-2.5 rounded-xl text-sm transition-all"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        {loading ? 'Fetching info...' : 'Add to Watchlist'}
      </button>
    </form>
  )
}
