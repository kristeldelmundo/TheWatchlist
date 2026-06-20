"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import MoviePoster from "@/components/ui/MoviePoster";
import MovieDetailModal from "@/components/ui/MovieDetailModal";
import AddMovieForm from "@/components/ui/AddMovieForm";
import { WatchlistItem, MediaType } from "@/types";
import { supabase } from "@/lib/supabase";
import { fetchMovieInfo, fetchMovieById } from "@/lib/omdb";
import { getCircleMembers } from "@/lib/circles";
import { Film, Tv, Filter, Users } from "lucide-react";
import { clsx } from "clsx";
import RequireAuth from "@/components/auth/RequireAuth";
import { useCircle } from "@/components/auth/CircleProvider";
import { useAuth } from "@/components/auth/AuthProvider";

// Result returned to the add form so it can show feedback
export type AddResult = { ok: boolean; duplicate?: boolean; title?: string };

const SUBTITLES = [
  "ready to pop",
  "movie nights waiting",
  "picks in the queue",
  "ready for showtime",
  "waiting for the couch",
];

interface MemberLite {
  user_id: string;
  name: string;
  avatar_url: string | null;
}

function WatchlistInner() {
  const { activeCircle, loading: circlesLoading } = useCircle();
  const { user, profile } = useAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [subtitleIdx, setSubtitleIdx] = useState(0);
  const [members, setMembers] = useState<MemberLite[]>([]);
  const [openItem, setOpenItem] = useState<WatchlistItem | null>(null);

  const myName =
    profile?.display_name || user?.email?.split("@")[0] || "Me";

  const loadItems = useCallback(async () => {
    if (!activeCircle) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("watchlist_items")
      .select("*")
      .eq("circle_id", activeCircle.id)
      .order("created_at", { ascending: false });
    if (data) setItems(data);
    setLoading(false);
  }, [activeCircle]);

  const loadMembers = useCallback(async () => {
    if (!activeCircle) {
      setMembers([]);
      return;
    }
    const m = await getCircleMembers(activeCircle.id);
    setMembers(
      m.map((x) => ({
        user_id: x.user_id,
        name: x.profile?.display_name || "Member",
        avatar_url: x.profile?.avatar_url ?? null,
      })),
    );
  }, [activeCircle]);

  useEffect(() => {
    loadItems();
    loadMembers();
  }, [loadItems, loadMembers]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSubtitleIdx((i) => (i + 1) % SUBTITLES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  async function handleAdd(
    title: string,
    type: MediaType,
    imdbID?: string,
  ): Promise<AddResult> {
    if (!activeCircle || !user) return { ok: false };

    const info = imdbID
      ? await fetchMovieById(imdbID)
      : await fetchMovieInfo(title, type);

    const finalTitle = info?.Title || title;

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
      added_by: myName,
      added_by_id: user.id,
      circle_id: activeCircle.id,
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
    if (filter === "unwatched") return !i.watched;
    if (filter.startsWith("member:")) {
      const id = filter.slice("member:".length);
      return i.added_by_id === id;
    }
    return true;
  });

  const movies = filtered.filter((i) => i.type === "movie");
  const tvShows = filtered.filter((i) => i.type === "tv");
  const toWatchCount = items.filter((i) => !i.watched).length;

  // Map of user_id -> avatar_url for the poster dot.
  const avatarMap: Record<string, string | null> = Object.fromEntries(
    members.map((m) => [m.user_id, m.avatar_url]),
  );
  // Also include the signed-in user's own avatar so their own adds show a photo.
  if (user && profile?.avatar_url) {
    avatarMap[user.id] = profile.avatar_url;
  }

  // Base filters + one per circle member
  const baseFilters: { value: string; label: string }[] = [
    { value: "all", label: "All" },
    { value: "unwatched", label: "To Watch" },
    { value: "movie", label: "Movies" },
    { value: "tv", label: "TV Shows" },
  ];
  const memberFilters = members.map((m) => ({
    value: `member:${m.user_id}`,
    label: `${m.name}'s picks`,
  }));
  const filters = [...baseFilters, ...memberFilters];

  // No circle yet — nudge them to create/join one
  if (!circlesLoading && !activeCircle) {
    return (
      <>
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-5xl mb-4">🍿</p>
          <h1 className="font-display text-2xl font-bold text-gray-800 mb-2">
            Let&apos;s set up your first circle!
          </h1>
          <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
            A circle is your shared movie group. Create one for you and your
            partner, family, or friends — then everyone can add to the same
            library.
          </p>
          <Link
            href="/circles"
            className="inline-flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-medium px-6 py-3 rounded-full transition-all"
          >
            <Users size={18} /> Go to Circles
          </Link>
        </main>
      </>
    );
  }

  // A reusable grid section for a media type
  const gridSection = (
    label: string,
    icon: React.ReactNode,
    list: WatchlistItem[],
    pillClass: string,
  ) =>
    list.length > 0 && (
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <h2 className="font-medium text-gray-600 text-sm">{label}</h2>
          <span className={clsx("text-xs px-2 py-0.5 rounded-full", pillClass)}>
            {list.length}
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {list.map((item) => (
            <MoviePoster key={item.id} item={item} onOpen={setOpenItem} avatarMap={avatarMap} />
          ))}
        </div>
      </section>
    );

  return (
    <>
      <Navbar />

      {openItem && (
        <MovieDetailModal
          item={openItem}
          onClose={() => setOpenItem(null)}
          onDelete={handleDelete}
          onMarkWatched={handleMarkWatched}
        />
      )}

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-4xl font-bold text-gray-800 mb-1">
            What&apos;s <span className="gradient-text italic">Popping?</span>{" "}
            <span className="inline-block animate-bounce-slow">🍿</span>
          </h1>
          <p className="text-sm text-gray-400 transition-all duration-500">
            {activeCircle && (
              <span className="text-rose-400 font-medium">
                {activeCircle.emoji} {activeCircle.name}
              </span>
            )}{" "}
            · <span className="font-medium text-rose-400">{toWatchCount}</span>{" "}
            {SUBTITLES[subtitleIdx]}
          </p>
        </div>

        <AddMovieForm onAdd={handleAdd} addingAs={myName} />

        <div className="flex flex-wrap items-center gap-2 mb-6 pb-1">
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
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="aspect-[2/3] rounded-xl shimmer" />
            ))}
          </div>
        ) : (
          <>
            {gridSection(
              "Movies",
              <Film size={16} className="text-rose-400" />,
              movies,
              "bg-rose-100 text-rose-500",
            )}
            {gridSection(
              "TV Shows",
              <Tv size={16} className="text-purple-400" />,
              tvShows,
              "bg-purple-100 text-purple-500",
            )}
            {filtered.length === 0 && (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🍿</p>
                <p className="text-gray-400 text-sm">
                  Nothing here yet — add your first title above!
                </p>
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
