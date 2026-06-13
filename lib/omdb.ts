import { OMDBMovie, OMDBSearchResult } from '@/types'

const OMDB_API_KEY = process.env.NEXT_PUBLIC_OMDB_API_KEY || 'b9a5e69d'

export async function fetchMovieInfo(title: string, type: 'movie' | 'tv'): Promise<OMDBMovie | null> {
  try {
    const omdbType = type === 'tv' ? 'series' : 'movie'
    const res = await fetch(
      `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${encodeURIComponent(title)}&type=${omdbType}`
    )
    const data: OMDBMovie = await res.json()
    if (data.Response === 'True') return data
    return null
  } catch {
    return null
  }
}

// Fetch full details by IMDb ID (used after picking a search suggestion)
export async function fetchMovieById(imdbID: string): Promise<OMDBMovie | null> {
  try {
    const res = await fetch(
      `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${encodeURIComponent(imdbID)}&plot=short`
    )
    const data: OMDBMovie = await res.json()
    if (data.Response === 'True') return data
    return null
  } catch {
    return null
  }
}

// Search for multiple matches (for autocomplete suggestions)
export async function searchMovies(query: string, type: 'movie' | 'tv'): Promise<OMDBSearchResult[]> {
  try {
    const omdbType = type === 'tv' ? 'series' : 'movie'
    const res = await fetch(
      `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(query)}&type=${omdbType}`
    )
    const data = await res.json()
    if (data.Response === 'True' && Array.isArray(data.Search)) {
      return data.Search.slice(0, 6)
    }
    return []
  } catch {
    return []
  }
}
