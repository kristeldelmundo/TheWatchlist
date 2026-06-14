"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import MovieCard from "@/components/ui/MovieCard";
import AddMovieForm from "@/components/ui/AddMovieForm";
import { WatchlistItem, MediaType, WatchlistUser } from "@/types";
import { supabase } from "@/lib/supabase";
import { fetchMovieInfo, fetchMovieById } from "@/lib/omdb";
import { Film, Tv, Filter } from "lucide-react";
import { clsx } from "clsx";
import RequireAuth from "@/components/auth/RequireAuth";

type FilterType = "all" | "movie" | "tv" | "Kristel" | "Eric" | "unwatched";

// Result returned to the add form so it can show feedback
export type AddResult = { ok: boolean; duplicate?: boolean; title?: string };

const SUBTITLES = [
  "ready to pop",
  "movie nights waiting",
  "picks in the queue",
  "ready for showtime",
  "waiting for the couch",
];

function WatchlistInner() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [subtitleIdx, setSubtitleIdx] = useState(0);

  useEffect(() => {
    loadItems();
  }, []);

  // Rotate the fun subtitle every few seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setSubtitleIdx((i) => (i + 1) % SUBTITLES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  async function loadItems() {
    const { data } = await supabase
      .from("watchlist_items")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setItems(data);
    setLoading(false);
  }

  async function handleAdd(
    title: string,
    type: MediaType,
    who: WatchlistUser,
    imdbID?: string,
  ): Promise<AddResult> {
    // If we have an exact imdbID (picked from suggestions), fetch by ID for accuracy.
    const info = imdbID
      ? await fetchMovieById(imdbID)
      : await fetchMovieInfo(title, type);

    const finalTitle = info?.Title || title;

    // Duplicate check — case-insensitive title + same type already on the list
    const isDuplicate = items.some(
      (i) =>
        i.title.toLowerCase().trim() === finalTitle.toLowerCase().trim() &&
        i.type === type,
    );
    if (isDuplicate) {
      return { ok: false, duplicate: true, title: finalTitle };
    }

    const newItem = {
      title: finalTitle,
      type,
      added_by: who,
      poster: info?.Poster && info.Poster !== "N/A" ? info.Poster : null,
      plot: info?.Plot && info.Plot !== "N/A" ? info.Plot : null,
      year: info?.Year || null,
      genre: info?.Genre || null,
      rating: info?.imdbRating || null,
      watched: false,
    };
    const { data } = await supabase
      .from("watchlist_items")
      .insert(newItem)
      .select()
      .single();
    if (data) {
      setItems((prev) => [data, ...prev]);
      return { ok: true, title: finalTitle };
    }
    return { ok: false };
  }

  async function handleDelete(id: string) {
    await supabase.from("watchlist_items").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleMarkWatched(id: string) {
    await supabase
      .from("watchlist_items")
      .update({ watched: true })
      .eq("id", id);
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, watched: true } : i)),
    );
  }

  const filtered = items.filter((i) => {
    if (filter === "movie") return i.type === "movie";
    if (filter === "tv") return i.type === "tv";
    if (filter === "Kristel") return i.added_by === "Kristel";
    if (filter === "Eric") return i.added_by === "Eric";
    if (filter === "unwatched") return !i.watched;
    return true;
  });

  const movies = filtered.filter((i) => i.type === "movie");
  const tvShows = filtered.filter((i) => i.type === "tv");
  const toWatchCount = items.filter((i) => !i.watched).length;

  const filters: { value: FilterType; label: string }[] = [
    { value: "all", label: "All" },
    { value: "unwatched", label: "To Watch" },
    { value: "movie", label: "Movies" },
    { value: "tv", label: "TV Shows" },
    { value: "Kristel", label: "Kristel's picks" },
    { value: "Eric", label: "Eric's picks" },
  ];

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-4xl font-bold text-gray-800 mb-1">
            What&apos;s <span className="gradient-text italic">Popping?</span>{" "}
            <span className="inline-block animate-bounce-slow">🍿</span>
          </h1>
          <p className="text-sm text-gray-400 transition-all duration-500">
            <span className="font-medium text-rose-400">{toWatchCount}</span>{" "}
            {SUBTITLES[subtitleIdx]}
          </p>
        </div>

        <AddMovieForm onAdd={handleAdd} />

        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          <Filter size={14} className="text-gray-400 flex-shrink-0" />
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={clsx(
                "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                filter === f.value
                  ? "bg-rose-500 text-white"
                  : "bg-white/80 text-gray-500 border border-rose-100 hover:border-rose-300",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl shimmer" />
            ))}
          </div>
        ) : (
          <>
            {movies.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <Film size={16} className="text-rose-400" />
                  <h2 className="font-medium text-gray-600 text-sm">Movies</h2>
                  <span className="bg-rose-100 text-rose-500 text-xs px-2 py-0.5 rounded-full">{movies.length}</span>
                </div>
                <div className="space-y-2">
                  {movies.map((item) => (
                    <MovieCard key={item.id} item={item} onDelete={handleDelete} onMarkWatched={handleMarkWatched} />
                  ))}
                </div>
              </section>
            )}
            {tvShows.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <Tv size={16} className="text-purple-400" />
                  <h2 className="font-medium text-gray-600 text-sm">TV Shows</h2>
                  <span className="bg-purple-100 text-purple-500 text-xs px-2 py-0.5 rounded-full">{tvShows.length}</span>
                </div>
                <div className="space-y-2">
                  {tvShows.map((item) => (
                    <MovieCard key={item.id} item={item} onDelete={handleDelete} onMarkWatched={handleMarkWatched} />
                  ))}
                </div>
              </section>
            )}
            {filtered.length === 0 && (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🍿</p>
                <p className="text-gray-400 text-sm">Nothing here yet — add your first title above!</p>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}

export default function WatchlistPage() {
  return (
    <RequireAuth>
      <WatchlistInner />
    </RequireAuth>
  );
}
