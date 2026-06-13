"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Navbar from "@/components/layout/Navbar";
import { WatchlistUser } from "@/types";
import { supabase } from "@/lib/supabase";
import {
  fetchTrendingMovies,
  fetchTrendingTV,
  TrendingItem,
} from "@/lib/tmdb";
import { Film, Tv, Plus, Check, TrendingUp, Clapperboard } from "lucide-react";
import { clsx } from "clsx";

type Tab = "movie" | "tv";

export default function TrendingPage() {
  const [tab, setTab] = useState<Tab>("movie");
  const [movies, setMovies] = useState<TrendingItem[]>([]);
  const [shows, setShows] = useState<TrendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [who, setWho] = useState<WatchlistUser>("Kristel");
  // Track which items were just added (by tmdb id) and by whom
  const [added, setAdded] = useState<Record<number, WatchlistUser>>({});
  const [existingTitles, setExistingTitles] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([fetchTrendingMovies(), fetchTrendingTV()]).then(
      ([m, t]) => {
        setMovies(m);
        setShows(t);
        setLoading(false);
      },
    );
    // Load existing watchlist titles so we can show what's already added
    supabase
      .from("watchlist_items")
      .select("title")
      .then(({ data }) => {
        if (data) {
          setExistingTitles(
            new Set(data.map((d) => d.title.toLowerCase())),
          );
        }
      });
  }, []);

  async function addToWatchlist(item: TrendingItem) {
    const newItem = {
      title: item.title,
      type: item.type,
      added_by: who,
      poster: item.poster,
      plot: item.overview,
      year: item.year,
      genre: null,
      rating: item.rating,
      watched: false,
    };
    const { error } = await supabase.from("watchlist_items").insert(newItem);
    if (!error) {
      setAdded((prev) => ({ ...prev, [item.id]: who }));
      setExistingTitles((prev) =>
        new Set(prev).add(item.title.toLowerCase()),
      );
    }
  }

  const list = tab === "movie" ? movies : shows;
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
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Adding-as toggle */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="text-sm font-medium text-gray-500">Add picks as:</span>
          {(["Kristel", "Eric"] as WatchlistUser[]).map((u) => (
            <button
              key={u}
              onClick={() => setWho(u)}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-all",
                who === u
                  ? u === "Kristel"
                    ? "bg-rose-500 text-white shadow-md shadow-rose-200"
                    : "bg-purple-500 text-white shadow-md shadow-purple-200"
                  : "bg-gray-100 text-gray-400 hover:bg-gray-200",
              )}
            >
              <span
                className={clsx(
                  "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold",
                  who === u ? "bg-white/30" : "bg-gray-200",
                )}
              >
                {u.charAt(0)}
              </span>
              {u}
            </button>
          ))}
        </div>

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
              const isAdded =
                added[item.id] ||
                existingTitles.has(item.title.toLowerCase());
              const addedBy = added[item.id];
              return (
                <div
                  key={item.id}
                  className="glass rounded-2xl p-3 flex gap-3 items-center hover:shadow-lg hover:shadow-rose-100 transition-all"
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
                    {isAdded ? (
                      <div
                        className={clsx(
                          "flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium",
                          addedBy === "Eric"
                            ? "bg-purple-100 text-purple-600"
                            : "bg-rose-100 text-rose-600",
                        )}
                      >
                        <Check size={14} />
                        {addedBy ? `${addedBy.charAt(0)} added` : "On list"}
                      </div>
                    ) : (
                      <button
                        onClick={() => addToWatchlist(item)}
                        className={clsx(
                          "flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-white transition-all hover:scale-105",
                          who === "Kristel"
                            ? "bg-rose-500 hover:bg-rose-600"
                            : "bg-purple-500 hover:bg-purple-600",
                        )}
                      >
                        <Plus size={14} /> Add
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
