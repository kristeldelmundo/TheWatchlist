import { OMDBMovie } from '@/types'

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || ''
const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500'

export interface TrendingItem {
  id: number
  title: string
  type: 'movie' | 'tv'
  poster: string | null
  year: string | null
  overview: string | null
  rating: string | null
}

interface TmdbResult {
  id: number
  title?: string
  name?: string
  poster_path: string | null
  release_date?: string
  first_air_date?: string
  overview?: string
  vote_average?: number
}

function mapResults(results: TmdbResult[], type: 'movie' | 'tv'): TrendingItem[] {
  return results.slice(0, 10).map((r) => {
    const date = r.release_date || r.first_air_date || ''
    return {
      id: r.id,
      title: r.title || r.name || 'Untitled',
      type,
      poster: r.poster_path ? `${TMDB_IMG}${r.poster_path}` : null,
      year: date ? date.split('-')[0] : null,
      overview: r.overview || null,
      rating: r.vote_average ? r.vote_average.toFixed(1) : null,
    }
  })
}

export async function fetchTrendingMovies(): Promise<TrendingItem[]> {
  if (!TMDB_API_KEY) return []
  try {
    const res = await fetch(
      `${TMDB_BASE}/trending/movie/week?api_key=${TMDB_API_KEY}`,
    )
    const data = await res.json()
    if (Array.isArray(data.results)) return mapResults(data.results, 'movie')
    return []
  } catch {
    return []
  }
}

export async function fetchTrendingTV(): Promise<TrendingItem[]> {
  if (!TMDB_API_KEY) return []
  try {
    const res = await fetch(
      `${TMDB_BASE}/trending/tv/week?api_key=${TMDB_API_KEY}`,
    )
    const data = await res.json()
    if (Array.isArray(data.results)) return mapResults(data.results, 'tv')
    return []
  } catch {
    return []
  }
}

// Convert a trending item into the shape used by our watchlist
export function trendingToWatchlistItem(t: TrendingItem): Partial<OMDBMovie> & {
  title: string
  poster: string | null
  plot: string | null
  year: string | null
  rating: string | null
} {
  return {
    title: t.title,
    poster: t.poster,
    plot: t.overview,
    year: t.year,
    rating: t.rating,
  }
}
