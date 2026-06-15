// Shared profile bits: the genre catalog, the viewer-type deriver, and a
// stats loader that works for any user id (used by the profile page, the
// public /u/[id] route, and circle member views).

import { supabase } from '@/lib/supabase'

export interface Genre {
  name: string
  emoji: string
  // light bg + text color for the pill when selected
  bg: string
  text: string
}

export const GENRES: Genre[] = [
  { name: 'Rom-Com', emoji: '💕', bg: '#fce8f0', text: '#c4577f' },
  { name: 'Horror', emoji: '🔪', bg: '#ede9fe', text: '#7c3aed' },
  { name: 'A24 indie', emoji: '🎭', bg: '#e0f2fe', text: '#0369a1' },
  { name: 'Ghibli', emoji: '🌸', bg: '#fce7f3', text: '#be185d' },
  { name: 'Thriller', emoji: '😰', bg: '#fef3c7', text: '#b45309' },
  { name: 'Sci-Fi', emoji: '🚀', bg: '#dbeafe', text: '#1d4ed8' },
  { name: 'K-Drama', emoji: '🇰🇷', bg: '#fae8ff', text: '#a21caf' },
  { name: 'Documentary', emoji: '🎥', bg: '#d1fae5', text: '#047857' },
  { name: 'Action', emoji: '💥', bg: '#ffedd5', text: '#c2410c' },
  { name: 'Animation', emoji: '🎨', bg: '#cffafe', text: '#0e7490' },
  { name: 'Drama', emoji: '🎬', bg: '#f1f5f9', text: '#475569' },
  { name: 'Comedy', emoji: '😂', bg: '#fef9c3', text: '#a16207' },
]

export function genreByName(name: string): Genre | undefined {
  return GENRES.find(g => g.name === name)
}

// Derive a fun "viewer type" label from genre picks + how the user rates.
// avgRating is 0 when there aren't enough reviews yet.
export function deriveViewerType(genres: string[], avgRating: number): string {
  const has = (n: string) => genres.includes(n)

  if (has('Horror') && has('Thriller')) return 'The 2am Horror Gremlin'
  if (has('Thriller')) return 'The Plot-Twist Hunter'
  if (has('Rom-Com') && has('K-Drama')) return 'The Hopeless Romantic'
  if (has('Rom-Com')) return 'The Cozy Rewatcher'
  if (has('A24 indie') || has('Documentary')) return 'The Indie Connoisseur'
  if (has('Ghibli') || has('Animation')) return 'The Animation Soul'
  if (has('Sci-Fi')) return 'The World-Builder'
  if (has('Action')) return 'The Popcorn Thrill-Seeker'

  // Fall back to rating habits if no strong genre signal
  if (avgRating >= 4.3) return 'The Generous Heart'
  if (avgRating > 0 && avgRating <= 2.8) return 'The Tough Critic'
  return 'The Curious Watcher'
}

// ----------------------------------------------------------------------------
// Stats — computed the same way for any user id.
// ----------------------------------------------------------------------------

export interface ProfileStats {
  watched: number
  reviews: number
  avg: number
  topReaction: string | null
}

export async function loadProfileStats(userId: string): Promise<ProfileStats> {
  const { data: reviews } = await supabase
    .from('reviews').select('rating, reactions').eq('reviewer_id', userId)
  const { count: watchedCount } = await supabase
    .from('watchlist_items').select('id', { count: 'exact', head: true })
    .eq('added_by_id', userId).eq('watched', true)

  let avg = 0
  let topReaction: string | null = null
  if (reviews && reviews.length > 0) {
    const rated = reviews.filter(r => (r.rating ?? 0) > 0)
    if (rated.length > 0) avg = rated.reduce((s, r) => s + (r.rating || 0), 0) / rated.length
    const counts: Record<string, number> = {}
    reviews.forEach(r => (r.reactions || []).forEach((lbl: string) => { counts[lbl] = (counts[lbl] || 0) + 1 }))
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    if (top) topReaction = top[0]
  }
  return {
    watched: watchedCount || 0,
    reviews: reviews?.length || 0,
    avg: Math.round(avg * 10) / 10,
    topReaction,
  }
}
