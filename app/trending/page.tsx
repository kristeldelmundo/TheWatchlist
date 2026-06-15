"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Navbar from "@/components/layout/Navbar";
import { supabase } from "@/lib/supabase";
import {
  fetchTrendingMovies,
  fetchTrendingTV,
  TrendingItem,
} from "@/lib/tmdb";
import { Film, Tv, Plus, Check, TrendingUp, Clapperboard } from "lucide-react";
import { clsx } from "clsx";
import RequireAuth from "@/components/auth/RequireAuth";
import { useCircle } from "@/components/auth/CircleProvider";
import { useAuth } from "@/components/auth/AuthProvider";

type Tab = "movie" | "tv";

const VISIBLE = 10; // how many to show at once

function TrendingInner() {
  const { activeCircle } = useCircle();
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<Tab>("movie");
  const [movies, setMovies] = useState<TrendingItem[]>([]);
  const [shows, setShows] = useState<TrendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  // ids that have been added so they drop out and the next slides up
  const [removedIds, setRemovedIds] = useState<Set<number>>(new Set());
  // briefly show a tick on the item just added before it slides away
  const [justAdded, setJustAdded] = useState<number | null>(null);
  // titles already in this circle's watchlist (normalized "title|type")
  const [existingKeys, setExistingKeys] = useState<Set<string>>(new Set());

  const myName = profile?.display_name || user?.email?.split("@")[0] || "Me";

  const keyFor = (title: string, type: string) =>
    `${title.trim().toLowerCase()}|${type}`;

  useEffect(() => {
    Promise.all([fetchTrendingMovies(), fetchTrendingTV()]).then(([m, t]) => {
      setMovies(m);
      setShows(t);
      setLoading(false);
    });
  }, []);

  // Load what's already in this circle so we can flag duplicates
  const loadExisting = useCallback(async () => {
    if (!activeCircle) {
      setExistingKeys(new Set());
      return;
    }
    const { data } = await supabase
      .from("watchlist_items")
      .select("title, type")
      .eq("circle_id", activeCircle.id);
    if (data) {
      setExistingKeys(new Set(data.map((d) => keyFor(d.title, d.type))));
    }
  }, [activeCircle]);

  useEffect(() => {
    loadExisting();
  }, [loadExisting]);

  async function addToWatchlist(item: TrendingItem) {
    if (!activeCircle || !user) return;

    // Already in the list? Don't add a duplicate.
    if (existingKeys.has(keyFor(item.title, item.type))) {
      return;
    }

    // Show the tick immediately
    setJustAdded(item.id);

    const newItem = {
      title: item.title,
      type: item.type,
      added_by: myName,
      added_by_id: user.id,
      circle_id: activeCircle.id,
      poster: item.poster,
      plot: item.overview,
      year: item.year,
      genre: null,
      rating: item.rating,
      watched: false,
    };

    const { error } = await supabase.from("watchlist_items").insert(newItem);

    // Mark it as existing now (covers the rare race where the DB rejects a dup)
    setExistingKeys((prev) =>
      new Set(prev).add(keyFor(item.title, item.type)),
    );

    if (error) {
      // Most likely a duplicate caught by the database — just flag it as added/known.
      setJustAdded(null);
      return;
    }

    // After a short beat, remove it so the next trending title slides up
    setTimeout(() => {
      setRemovedIds((prev) => new Set(prev).add(item.id));
      setJustAdded(null);
    }, 800);
  }

  const fullPool = tab === "movie" ? movies : shows;
  // Drop removed ones, then take the top 10 — the next trending title fills the gap
  const list = fullPool.filter((i) => !removedIds.has(i.id)).slice(0, VISIBLE);
  const noKey = !loading && movies.length === 0 && shows.length === 0;

  return (
    <>
      <Navbar />
      {/* Movie theater themed hero */}
      <div className="bg-gradient-to-b from-gray-900 via-gray-900 to-rose-950 text-white">
        <div className="max-w-2xl mx-auto px-4 py-10 text-center relative overflow-hidden">
          {/* marquee lights */}
          <div className="flex justify-center gap-2 mb-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full bg-amber-300"
                style={{
                  animation: "title-bob 1.5s ease-in-out infinite",
                  animationDelay: `${i * 0.15}s`,
                  opacity: 0.5 + (i % 3) * 0.25,
                }}
              />
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clapperboard size={26} className="text-amber-300" />
            <h1 className="font-display text-4xl font-bold italic">
              Now Trending
            </h1>
          </div>
          <p className="text-sm text-gray-300">
            This week&apos;s top 10 — straight from the box office 🍿
          </p>
          {activeCircle && (
            <p className="text-xs text-rose-300 mt-2">
              Adding to {activeCircle.emoji} {activeCircle.name} as {myName}
            </p>
          )}
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Movie / TV tabs */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <button
            onClick={() => setTab("movie")}
            className={clsx(
              "flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-medium transition-all",
              tab === "movie"
                ? "bg-rose-500 text-white"
                : "bg-white/80 text-gray-500 border border-rose-100 hover:border-rose-300",
            )}
          >
            <Film size={15} /> Top 10 Movies
          </button>
          <button
            onClick={() => setTab("tv")}
            className={clsx(
              "flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-medium transition-all",
              tab === "tv"
                ? "bg-purple-500 text-white"
                : "bg-white/80 text-gray-500 border border-rose-100 hover:border-rose-300",
            )}
          >
            <Tv size={15} /> Top 10 Shows
          </button>
        </div>

        {noKey && (
          <div className="glass rounded-2xl p-8 text-center">
            <TrendingUp size={40} className="mx-auto mb-3 text-rose-300" />
            <p className="text-gray-600 font-medium mb-1">
              Trending data needs a TMDB key
            </p>
            <p className="text-sm text-gray-400">
              Add <code className="bg-rose-50 px-1 rounded">NEXT_PUBLIC_TMDB_API_KEY</code>{" "}
              in your Vercel settings, then redeploy and the top 10s will appear here.
            </p>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-2xl shimmer" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((item, idx) => {
              const added = justAdded === item.id;
              const alreadyInList = existingKeys.has(keyFor(item.title, item.type));
              return (
                <div
                  key={item.id}
                  className={clsx(
                    "glass rounded-2xl p-3 flex gap-3 items-center transition-all burst",
                    added
                      ? "opacity-50 scale-95"
                      : "hover:shadow-lg hover:shadow-rose-100",
                  )}
                >
                  {/* Rank number */}
                  <div className="flex-shrink-0 w-8 text-center">
                    <span className="font-display text-2xl font-bold gradient-text italic">
                      {idx + 1}
                    </span>
                  </div>

                  {/* Poster */}
                  <div className="w-14 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-rose-50">
                    {item.poster ? (
                      <Image
                        src={item.poster}
                        alt={item.title}
                        width={56}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-rose-200">
                        {item.type === "tv" ? <Tv size={20} /> : <Film size={20} />}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-800 text-sm leading-tight">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.year && (
                        <span className="text-xs text-gray-400">{item.year}</span>
                      )}
                      {item.rating && (
                        <span className="text-xs text-amber-500 font-medium">
                          ★ {item.rating}
                        </span>
                      )}
                    </div>
                    {item.overview && (
                      <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 mt-1">
                        {item.overview}
                      </p>
                    )}
                  </div>

                  {/* Add button */}
                  <div className="flex-shrink-0">
                    {added ? (
                      <div className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium bg-rose-100 text-rose-600">
                        <Check size={14} /> Added!
                      </div>
                    ) : alreadyInList ? (
                      <div className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium bg-gray-100 text-gray-400">
                        <Check size={14} /> In list
                      </div>
                    ) : (
                      <button
                        onClick={() => addToWatchlist(item)}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-white transition-all hover:scale-105 bg-rose-500 hover:bg-rose-600"
                      >
                        <Plus size={14} /> Add
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {list.length === 0 && !noKey && (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🍿</p>
                <p className="text-gray-400 text-sm">
                  You&apos;ve added them all! Check back next week for fresh trending picks.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}

export default function TrendingPage() {
  return (
    <RequireAuth>
      <TrendingInner />
    </RequireAuth>
  );
}
