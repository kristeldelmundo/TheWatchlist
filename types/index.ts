// Legacy alias — kept so older imports don't break. Anyone can be a member now,
// so "added_by" is just a display name string.
export type WatchlistUser = string

export type MediaType = 'movie' | 'tv'

export interface WatchlistItem {
  id: string
  title: string
  type: MediaType
  added_by: string
  added_by_id: string | null
  circle_id: string | null
  poster: string | null
  plot: string | null
  year: string | null
  genre: string | null
  rating: string | null
  watched: boolean
  created_at: string
}

export interface Review {
  id: string
  watchlist_item_id: string
  circle_id: string | null
  title: string
  poster: string | null
  rating_k: number
  rating_j: number
  thoughts_k: string
  thoughts_j: string
  reactions: string[]
  created_at: string
}

export interface OMDBMovie {
  Title: string
  Year: string
  Plot: string
  Poster: string
  Genre: string
  imdbRating: string
  imdbID: string
  Response: string
  Type: string
}

export interface OMDBSearchResult {
  Title: string
  Year: string
  imdbID: string
  Type: string
  Poster: string
}
