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
  return results.map((r) => {
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

// Fetch multiple pages so we have a big pool (~40) to rotate fresh picks from
async function fetchTrendingPool(
  kind: 'movie' | 'tv',
): Promise<TrendingItem[]> {
  if (!TMDB_API_KEY) return []
  try {
    const [p1, p2] = await Promise.all([
      fetch(`${TMDB_BASE}/trending/${kind}/week?api_key=${TMDB_API_KEY}&page=1`),
      fetch(`${TMDB_BASE}/trending/${kind}/week?api_key=${TMDB_API_KEY}&page=2`),
    ])
    const d1 = await p1.json()
    const d2 = await p2.json()
    const combined = [
      ...(Array.isArray(d1.results) ? d1.results : []),
      ...(Array.isArray(d2.results) ? d2.results : []),
    ]
    return mapResults(combined, kind)
  } catch {
    return []
  }
}

export async function fetchTrendingMovies(): Promise<TrendingItem[]> {
  return fetchTrendingPool('movie')
}

export async function fetchTrendingTV(): Promise<TrendingItem[]> {
  return fetchTrendingPool('tv')
}

interface TmdbVideo {
  key: string
  site: string
  type: string
  official: boolean
}

// Pick the best YouTube trailer from a list of videos
function bestTrailer(videos: TmdbVideo[]): string | null {
  const yt = videos.filter((v) => v.site === 'YouTube')
  if (!yt.length) return null
  // Prefer an official Trailer, then any Trailer, then any Teaser, else first
  const pick =
    yt.find((v) => v.type === 'Trailer' && v.official) ||
    yt.find((v) => v.type === 'Trailer') ||
    yt.find((v) => v.type === 'Teaser') ||
    yt[0]
  return pick ? `https://www.youtube.com/watch?v=${pick.key}` : null
}

// Search TMDB by title, then fetch that title's trailer (YouTube link).
// Falls back to a YouTube search URL if no exact trailer is found.
export async function fetchTrailerUrl(
  title: string,
  type: 'movie' | 'tv',
  year?: string | null,
): Promise<string> {
  const ytSearch = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${title} ${year || ''} trailer`,
  )}`

  if (!TMDB_API_KEY) return ytSearch

  try {
    // 1. Find the TMDB id for this title
    const searchRes = await fetch(
      `${TMDB_BASE}/search/${type}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
        title,
      )}`,
    )
    const searchData = await searchRes.json()
    const match =
      Array.isArray(searchData.results) && searchData.results.length
        ? searchData.results[0]
        : null
    if (!match) return ytSearch

    // 2. Fetch its videos
    const vidRes = await fetch(
      `${TMDB_BASE}/${type}/${match.id}/videos?api_key=${TMDB_API_KEY}`,
    )
    const vidData = await vidRes.json()
    const url = Array.isArray(vidData.results)
      ? bestTrailer(vidData.results)
      : null

    return url || ytSearch
  } catch {
    return ytSearch
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
