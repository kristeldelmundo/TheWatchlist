export type WatchlistUser = 'Kristel' | 'Eric'

export type MediaType = 'movie' | 'tv'

export interface WatchlistItem {
  id: string
  title: string
  type: MediaType
  added_by: WatchlistUser
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
  Response: string
  Type: string
}
