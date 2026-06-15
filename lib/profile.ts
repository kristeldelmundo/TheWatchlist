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

// ----------------------------------------------------------------------------
// Viewer type — a fun label derived from someone's full taste profile, not
// just whichever genre happens to be checked first. Every genre votes for one
// or more candidate types (with weights), rating habits cast their own votes,
// and the highest-scoring type wins. Ties favor the more specific/combo types
// (listed first in PRIORITY) so e.g. someone into both Horror + Thriller gets
// the combo label over either genre's solo label.
// ----------------------------------------------------------------------------

// Genre -> { viewer type label: vote weight }. A genre can support more than
// one type; combo bonuses below add extra votes when genres pair up.
const GENRE_VOTES: Record<string, Record<string, number>> = {
  'Rom-Com': { 'The Cozy Rewatcher': 2, 'The Hopeless Romantic': 1 },
  'Horror': { 'The Plot-Twist Hunter': 1, 'The 2am Horror Gremlin': 1, 'The Adrenaline Junkie': 1 },
  'A24 indie': { 'The Indie Connoisseur': 2 },
  'Ghibli': { 'The Animation Soul': 2, 'The Cozy Rewatcher': 1 },
  'Thriller': { 'The Plot-Twist Hunter': 2, 'The 2am Horror Gremlin': 1 },
  'Sci-Fi': { 'The World-Builder': 2, 'The Indie Connoisseur': 1 },
  'K-Drama': { 'The Hopeless Romantic': 2, 'The Cozy Rewatcher': 1 },
  'Documentary': { 'The Indie Connoisseur': 2, 'The Curious Mind': 2 },
  'Action': { 'The Popcorn Thrill-Seeker': 2, 'The Adrenaline Junkie': 1 },
  'Animation': { 'The Animation Soul': 2 },
  'Drama': { 'The Emotional Deep-Diver': 2, 'The Curious Mind': 1 },
  'Comedy': { 'The Feel-Good Fan': 2, 'The Cozy Rewatcher': 1 },
}

// Extra votes when specific genre pairs show up together — captures the
// "this combo of tastes really means something specific" cases.
const COMBO_BONUSES: { genres: [string, string]; type: string; bonus: number }[] = [
  { genres: ['Horror', 'Thriller'], type: 'The 2am Horror Gremlin', bonus: 2 },
  { genres: ['Rom-Com', 'K-Drama'], type: 'The Hopeless Romantic', bonus: 2 },
  { genres: ['A24 indie', 'Documentary'], type: 'The Indie Connoisseur', bonus: 2 },
  { genres: ['Ghibli', 'Animation'], type: 'The Animation Soul', bonus: 1 },
  { genres: ['Action', 'Sci-Fi'], type: 'The Popcorn Thrill-Seeker', bonus: 1 },
  { genres: ['Drama', 'Documentary'], type: 'The Emotional Deep-Diver', bonus: 1 },
  { genres: ['Comedy', 'Rom-Com'], type: 'The Feel-Good Fan', bonus: 1 },
]

// Display-order priority used only to break ties deterministically — earlier
// entries win ties over later ones.
const TYPE_PRIORITY: string[] = [
  'The 2am Horror Gremlin',
  'The Hopeless Romantic',
  'The Indie Connoisseur',
  'The Animation Soul',
  'The World-Builder',
  'The Emotional Deep-Diver',
  'The Plot-Twist Hunter',
  'The Popcorn Thrill-Seeker',
  'The Adrenaline Junkie',
  'The Feel-Good Fan',
  'The Curious Mind',
  'The Cozy Rewatcher',
  'The Generous Heart',
  'The Tough Critic',
  'The Curious Watcher',
]

// Derive a fun "viewer type" label from genre picks + how the user rates.
// avgRating is 0 when there aren't enough reviews yet.
export function deriveViewerType(genres: string[], avgRating: number): string {
  const scores: Record<string, number> = {}
  const add = (type: string, amount: number) => { scores[type] = (scores[type] || 0) + amount }

  for (const g of genres) {
    const votes = GENRE_VOTES[g]
    if (!votes) continue
    for (const [type, weight] of Object.entries(votes)) add(type, weight)
  }

  for (const combo of COMBO_BONUSES) {
    if (combo.genres.every(g => genres.includes(g))) add(combo.type, combo.bonus)
  }

  // Rating habits always cast a (smaller) vote, so they can nudge close
  // calls or carry the result when genre signal is weak/absent.
  if (avgRating >= 4.3) add('The Generous Heart', 1.5)
  else if (avgRating > 0 && avgRating <= 2.8) add('The Tough Critic', 1.5)

  // Baseline fallback always has a tiny presence so it can win when nothing
  // else has any signal at all.
  add('The Curious Watcher', 0.1)

  let best = 'The Curious Watcher'
  let bestScore = -Infinity
  for (const type of TYPE_PRIORITY) {
    const score = scores[type] || 0
    if (score > bestScore) { bestScore = score; best = type }
  }
  return best
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

// ----------------------------------------------------------------------------
// Usernames — for pretty share links: cinepop.live/@<username>
// Rules (mirrored in the DB check constraint): 3-20 chars, lowercase
// letters/digits/underscore, must start with a letter.
// ----------------------------------------------------------------------------

export const USERNAME_PATTERN = /^[a-z][a-z0-9_]{2,19}$/

export function isValidUsername(name: string): boolean {
  return USERNAME_PATTERN.test(name)
}

// Normalize user input into a candidate username (lowercase, strip invalid
// chars). Used both to suggest a username from a display name and to clean
// up whatever someone types in the field.
export function normalizeUsername(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20)
}

// Checks whether a username is free. `currentUserId` lets a user "claim"
// their own existing username without it counting as taken.
export async function isUsernameAvailable(username: string, currentUserId?: string): Promise<boolean> {
  if (!isValidUsername(username)) return false
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .ilike('username', username)
    .maybeSingle()
  if (error) return false
  if (!data) return true
  return data.id === currentUserId
}

// Looks up a profile by username (case-insensitive) OR by uuid. Used by the
// public /u/[id] route so /@<username> and /@<uuid> both resolve.
export async function findProfileIdentifier(idOrUsername: string): Promise<{ column: 'id' | 'username'; value: string }> {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (UUID_RE.test(idOrUsername)) return { column: 'id', value: idOrUsername }
  return { column: 'username', value: idOrUsername.toLowerCase() }
}
