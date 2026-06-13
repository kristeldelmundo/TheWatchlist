"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { WatchlistItem } from "@/types";
import { supabase } from "@/lib/supabase";
import { Shuffle, CheckCircle, Star, RotateCcw, Film, Tv } from "lucide-react";
import { clsx } from "clsx";

type Filter = "all" | "movie" | "tv" | "Kristel" | "Eric";

// Fun messages that cycle while the popcorn is "cooking"
const COOKING_MESSAGES = [
  "Heating up the kettle...",
  "Buttering the picks...",
  "Shaking the kernels...",
  "Almost popping...",
  "Picking the tastiest one...",
];

// Kernel emojis + horizontal offsets so they pop in different directions
const KERNELS = [
  { emoji: "🍿", x: "-50px", delay: "0s" },
  { emoji: "🍿", x: "40px", delay: "0.15s" },
  { emoji: "🍿", x: "-20px", delay: "0.3s" },
  { emoji: "🍿", x: "55px", delay: "0.45s" },
  { emoji: "🍿", x: "-60px", delay: "0.6s" },
  { emoji: "🍿", x: "15px", delay: "0.75s" },
];

export default function RandomizerPage() {
  const router = useRouter();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [pick, setPick] = useState<WatchlistItem | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [picked, setPicked] = useState(false);
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    supabase
      .from("watchlist_items")
      .select("*")
      .eq("watched", false)
      .then(({ data }) => {
        if (data) setItems(data);
      });
  }, []);

  // Cycle the cooking messages while spinning
  useEffect(() => {
    if (!spinning) return;
    const timer = setInterval(() => {
      setMsgIdx((i) => (i + 1) % COOKING_MESSAGES.length);
    }, 500);
    return () => clearInterval(timer);
  }, [spinning]);

  function getPool() {
    return items.filter((i) => {
      if (filter === "movie") return i.type === "movie";
      if (filter === "tv") return i.type === "tv";
      if (filter === "Kristel") return i.added_by === "Kristel";
      if (filter === "Eric") return i.added_by === "Eric";
      return true;
    });
  }

  async function spin() {
    const pool = getPool();
    if (!pool.length) return;
    setSpinning(true);
    setPicked(false);
    setPick(null);
    setMsgIdx(0);

    // Longer, suspenseful "cooking" time so the popcorn animation shines
    await new Promise((r) => setTimeout(r, 2600));
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    setPick(chosen);
    setSpinning(false);
    setPicked(true);
  }

  async function markWatched() {
    if (!pick) return;
    await supabase
      .from("watchlist_items")
      .update({ watched: true })
      .eq("id", pick.id);
    setItems((prev) => prev.filter((i) => i.id !== pick.id));
    setPick(null);
    setPicked(false);
  }

  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: "Any" },
    { value: "movie", label: "Movies only" },
    { value: "tv", label: "TV only" },
    { value: "Kristel", label: "Kristel's picks" },
    { value: "Eric", label: "Eric's picks" },
  ];

  const pool = getPool();

  return (
    <>
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-10 text-center">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-gray-800 mb-2">
            <span className="gradient-text italic">Pick for us!</span> 🍿
          </h1>
          <p className="text-sm text-gray-400">
            {pool.length} titles in the pool
          </p>
        </div>

        {/* Filter pills */}
        <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={clsx(
                "px-4 py-1.5 rounded-full text-xs font-medium transition-all",
                filter === f.value
                  ? "bg-rose-500 text-white"
                  : "bg-white/80 text-gray-500 border border-rose-100 hover:border-rose-300",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Spin card */}
        <div
          className={clsx(
            "glass rounded-3xl p-8 mb-6 min-h-64 flex flex-col items-center justify-center transition-all",
            picked && "shadow-xl shadow-rose-100",
          )}
        >
          {!pick && !spinning && (
            <div className="text-gray-300">
              <Shuffle size={48} className="mx-auto mb-3" />
              <p className="text-sm">Hit the button and let fate decide!</p>
            </div>
          )}

          {/* Popcorn cooking loader */}
          {spinning && (
            <div className="flex flex-col items-center">
              <div className="relative w-40 h-32 flex items-end justify-center">
                {/* Popping kernels */}
                {KERNELS.map((k, i) => (
                  <span
                    key={i}
                    className="kernel"
                    style={
                      {
                        "--pop-x": k.x,
                        animationDelay: k.delay,
                      } as React.CSSProperties
                    }
                  >
                    {k.emoji}
                  </span>
                ))}

                {/* The pot / kettle */}
                <div className="pot-shake relative z-10 text-6xl">🍲</div>
              </div>
              <p className="text-sm text-rose-400 font-medium mt-4 transition-all duration-300">
                {COOKING_MESSAGES[msgIdx]}
              </p>
            </div>
          )}

          {pick && !spinning && (
            <div className="burst">
              <div className="w-24 h-36 rounded-2xl overflow-hidden mx-auto mb-4 shadow-lg title-bob">
                {pick.poster ? (
                  <Image
                    src={pick.poster}
                    alt={pick.title}
                    width={96}
                    height={144}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-rose-100 flex items-center justify-center">
                    {pick.type === "tv" ? (
                      <Tv size={28} className="text-rose-300" />
                    ) : (
                      <Film size={28} className="text-rose-300" />
                    )}
                  </div>
                )}
              </div>

              <p className="text-xs text-rose-400 font-medium mb-1">
                🍿 tonight you&apos;re watching
              </p>
              <h2 className="font-display text-2xl font-bold text-gray-800 mb-1">
                {pick.title}
              </h2>
              <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
                <span
                  className={clsx(
                    "text-xs px-2 py-0.5 rounded-full",
                    pick.type === "movie" ? "pill-movie" : "pill-tv",
                  )}
                >
                  {pick.type === "tv" ? "TV Show" : "Movie"}
                </span>
                {pick.year && (
                  <span className="text-xs text-gray-400">{pick.year}</span>
                )}
                {pick.rating && pick.rating !== "N/A" && (
                  <span className="text-xs text-amber-500 font-medium">
                    ★ {pick.rating}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <span
                    className={clsx(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                      pick.added_by === "Kristel"
                        ? "bg-rose-100 text-rose-500"
                        : "bg-purple-100 text-purple-500",
                    )}
                  >
                    {pick.added_by.charAt(0)}
                  </span>
                  <span className="text-xs text-gray-400">{pick.added_by}</span>
                </span>
              </div>

              {pick.plot && (
                <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">
                  {pick.plot}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Spin button */}
        <button
          onClick={spin}
          disabled={spinning || pool.length === 0}
          className="w-full flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-medium py-4 rounded-2xl text-base transition-all hover:scale-[1.02] shadow-lg shadow-rose-200 mb-4"
        >
          <Shuffle size={20} />
          {spinning
            ? "Popping..."
            : pick
              ? "Pop again!"
              : "Pop something on tonight!"}
        </button>

        {/* Post-pick actions */}
        {pick && !spinning && (
          <div className="flex gap-2">
            <button
              onClick={markWatched}
              className="flex-1 flex items-center justify-center gap-2 bg-green-100 hover:bg-green-200 text-green-700 font-medium py-2.5 rounded-xl text-sm transition-all"
            >
              <CheckCircle size={16} /> We watched this!
            </button>
            <button
              onClick={() => router.push("/review")}
              className="flex-1 flex items-center justify-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-700 font-medium py-2.5 rounded-xl text-sm transition-all"
            >
              <Star size={16} /> Rate it now
            </button>
            <button
              onClick={spin}
              className="flex-1 flex items-center justify-center gap-2 bg-purple-100 hover:bg-purple-200 text-purple-700 font-medium py-2.5 rounded-xl text-sm transition-all"
            >
              <RotateCcw size={16} /> Different pick
            </button>
          </div>
        )}

        {pool.length === 0 && (
          <p className="text-sm text-gray-400 mt-4">
            Your watchlist is empty!{" "}
            <a href="/watchlist" className="text-rose-500 underline">
              Add some titles first
            </a>
            .
          </p>
        )}
      </main>
    </>
  );
}
