"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { WatchlistItem } from "@/types";
import { supabase } from "@/lib/supabase";
import { fetchTrailerUrl } from "@/lib/tmdb";
import { getCircleMembers } from "@/lib/circles";
import {
  Shuffle,
  CheckCircle,
  Star,
  RotateCcw,
  Film,
  Tv,
  Play,
  Tv2,
} from "lucide-react";
import { clsx } from "clsx";
import Popcorn from "@/components/ui/Popcorn";
import RequireAuth from "@/components/auth/RequireAuth";
import { useCircle } from "@/components/auth/CircleProvider";

const COOKING_MESSAGES = [
  "Heating up the kettle...",
  "Buttering the picks...",
  "Shaking the kernels...",
  "Almost popping...",
  "Picking the tastiest one...",
];

const KERNELS = [
  { x: "-55px", delay: "0s", size: 34 },
  { x: "45px", delay: "0.15s", size: 40 },
  { x: "-25px", delay: "0.3s", size: 30 },
  { x: "60px", delay: "0.45s", size: 36 },
  { x: "-65px", delay: "0.6s", size: 32 },
  { x: "20px", delay: "0.75s", size: 38 },
];

const CONFETTI = ["🍿", "🎬", "✨", "🎉", "⭐", "💕"];

interface MemberLite {
  user_id: string;
  name: string;
}

function youtubeSearchUrl(title: string, year?: string | null) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${title} ${year || ""} trailer`,
  )}`;
}

// "Where to watch" search links
function justwatchUrl(title: string) {
  return `https://www.justwatch.com/ph/search?q=${encodeURIComponent(title)}`;
}
function tubiUrl(title: string) {
  return `https://tubitv.com/search/${encodeURIComponent(title)}`;
}
function plexUrl(title: string) {
  return `https://www.plex.tv/search/?q=${encodeURIComponent(title)}`;
}
function crackleUrl(title: string) {
  return `https://www.crackle.com/search?term=${encodeURIComponent(title)}`;
}
// Viu — works in PH, great for K-drama and Asian content
function viuUrl(title: string) {
  return `https://www.viu.com/ott/ph/en-us/search?q=${encodeURIComponent(title)}`;
}

function RandomizerInner() {
  const router = useRouter();
  const { activeCircle } = useCircle();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [members, setMembers] = useState<MemberLite[]>([]);
  const [pick, setPick] = useState<WatchlistItem | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [picked, setPicked] = useState(false);
  const [msgIdx, setMsgIdx] = useState(0);
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [loadingTrailer, setLoadingTrailer] = useState(false);
  const [confetti, setConfetti] = useState(false);

  const loadItems = useCallback(async () => {
    if (!activeCircle) { setItems([]); return; }
    const { data } = await supabase
      .from("watchlist_items")
      .select("*")
      .eq("circle_id", activeCircle.id)
      .eq("watched", false);
    if (data) setItems(data);
  }, [activeCircle]);

  const loadMembers = useCallback(async () => {
    if (!activeCircle) { setMembers([]); return; }
    const m = await getCircleMembers(activeCircle.id);
    setMembers(m.map((x) => ({ user_id: x.user_id, name: x.profile?.display_name || "Member" })));
  }, [activeCircle]);

  useEffect(() => { loadItems(); loadMembers(); }, [loadItems, loadMembers]);

  useEffect(() => {
    if (!spinning) return;
    const timer = setInterval(() => { setMsgIdx((i) => (i + 1) % COOKING_MESSAGES.length); }, 500);
    return () => clearInterval(timer);
  }, [spinning]);

  function getPool() {
    return items.filter((i) => {
      if (filter === "movie") return i.type === "movie";
      if (filter === "tv") return i.type === "tv";
      if (filter.startsWith("member:")) return i.added_by_id === filter.slice("member:".length);
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
    setTrailerUrl(null);
    setConfetti(false);

    await new Promise((r) => setTimeout(r, 2600));
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    setPick(chosen);
    setSpinning(false);
    setPicked(true);
    setConfetti(true);
    setTimeout(() => setConfetti(false), 1600);

    setLoadingTrailer(true);
    try {
      const url = await fetchTrailerUrl(chosen.title, chosen.type, chosen.year);
      setTrailerUrl(url);
    } catch {
      setTrailerUrl(youtubeSearchUrl(chosen.title, chosen.year));
    }
    setLoadingTrailer(false);
  }

  function openTrailer() {
    if (!pick) return;
    const url = trailerUrl || youtubeSearchUrl(pick.title, pick.year);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function markWatched() {
    if (!pick) return;
    await supabase.from("watchlist_items").update({ watched: true }).eq("id", pick.id);
    setItems((prev) => prev.filter((i) => i.id !== pick.id));
    setPick(null);
    setPicked(false);
    setTrailerUrl(null);
  }

  const filters: { value: string; label: string }[] = [
    { value: "all", label: "Any" },
    { value: "movie", label: "Movies only" },
    { value: "tv", label: "TV only" },
    ...members.map((m) => ({ value: `member:${m.user_id}`, label: `${m.name}'s picks` })),
  ];

  const pool = getPool();

  return (
    <>
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-10 text-center">
        <style>{`
          @keyframes cp-confetti-fall {
            0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
            100% { transform: translateY(220px) rotate(360deg); opacity: 0; }
          }
          .cp-confetti-piece {
            position: absolute;
            top: 0;
            font-size: 20px;
            animation: cp-confetti-fall 1.5s ease-in forwards;
            will-change: transform, opacity;
          }
        `}</style>

        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-gray-800 mb-2">
            <span className="gradient-text italic">Pick for us!</span> 🍿
          </h1>
          <p className="text-sm text-gray-400">
            {activeCircle && (
              <span className="text-rose-400 font-medium">
                {activeCircle.emoji} {activeCircle.name}
              </span>
            )}{" "}
            · {pool.length} titles in the pool
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
        <div className={clsx(
          "glass rounded-3xl p-8 mb-6 min-h-64 flex flex-col items-center justify-center transition-all relative overflow-hidden",
          picked && "shadow-xl shadow-rose-100",
        )}>
          {confetti && (
            <div className="pointer-events-none absolute inset-0 z-20">
              {Array.from({ length: 18 }).map((_, i) => (
                <span
                  key={i}
                  className="cp-confetti-piece"
                  style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 0.4}s` }}
                >
                  {CONFETTI[i % CONFETTI.length]}
                </span>
              ))}
            </div>
          )}

          {!pick && !spinning && (
            <div className="text-gray-300">
              <Shuffle size={48} className="mx-auto mb-3" />
              <p className="text-sm">Hit the button and let fate decide!</p>
            </div>
          )}

          {spinning && (
            <div className="flex flex-col items-center">
              <div className="relative w-44 h-36 flex items-end justify-center">
                {KERNELS.map((k, i) => (
                  <span key={i} className="kernel" style={{ "--pop-x": k.x, animationDelay: k.delay } as React.CSSProperties}>
                    <Popcorn size={k.size} />
                  </span>
                ))}
                <div className="pot-shake relative z-10">
                  <svg width="84" height="80" viewBox="0 0 84 80" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 26 L70 26 L62 78 L22 78 Z" fill="#f43f72" />
                    <path d="M26 26 L31 26 L25 78 L20.5 78 Z" fill="#ffffff" opacity="0.9" />
                    <path d="M40 26 L45 26 L43 78 L38 78 Z" fill="#ffffff" opacity="0.9" />
                    <path d="M54 26 L59 26 L61 78 L56 78 Z" fill="#ffffff" opacity="0.9" />
                    <rect x="10" y="20" width="64" height="9" rx="3" fill="#be1246" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-rose-400 font-medium mt-4 transition-all duration-300">
                {COOKING_MESSAGES[msgIdx]}
              </p>
            </div>
          )}

          {pick && !spinning && (
            <div className="burst relative z-10">
              <div className="w-24 h-36 rounded-2xl overflow-hidden mx-auto mb-4 shadow-lg title-bob">
                {pick.poster ? (
                  <Image src={pick.poster} alt={pick.title} width={96} height={144} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-rose-100 flex items-center justify-center">
                    {pick.type === "tv" ? <Tv size={28} className="text-rose-300" /> : <Film size={28} className="text-rose-300" />}
                  </div>
                )}
              </div>

              <p className="text-xs text-rose-400 font-medium mb-1">🍿 tonight you&apos;re watching</p>
              <h2 className="font-display text-2xl font-bold text-gray-800 mb-1">{pick.title}</h2>

              <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
                <span className={clsx("text-xs px-2 py-0.5 rounded-full", pick.type === "movie" ? "pill-movie" : "pill-tv")}>
                  {pick.type === "tv" ? "TV Show" : "Movie"}
                </span>
                {pick.year && <span className="text-xs text-gray-400">{pick.year}</span>}
                {pick.rating && pick.rating !== "N/A" && (
                  <span className="text-xs text-amber-500 font-medium">★ {pick.rating}</span>
                )}
                {pick.added_by && (
                  <span className="flex items-center gap-1">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-rose-100 text-rose-500">
                      {pick.added_by.charAt(0).toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-400">{pick.added_by}</span>
                  </span>
                )}
              </div>

              {pick.plot && (
                <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto mb-4">{pick.plot}</p>
              )}

              {/* Trailer button */}
              <button
                onClick={openTrailer}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-all hover:scale-105 shadow-md shadow-red-200 mb-4"
              >
                <Play size={16} fill="currentColor" />
                {loadingTrailer ? "Watch Trailer (searching...)" : "Watch Trailer"}
              </button>

              {/* Where to watch free */}
              <div className="mt-1">
                <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold mb-2">
                  🎬 Where to watch free
                </p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <a
                    href={justwatchUrl(pick.title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#1c1c1c] hover:bg-[#333] text-[#f5c518] transition-all hover:scale-105"
                  >
                    🔍 JustWatch
                  </a>
                  <a
                    href={tubiUrl(pick.title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#fa3f03] hover:bg-[#d93500] text-white transition-all hover:scale-105"
                  >
                    <Tv2 size={12} /> Tubi
                  </a>
                  <a
                    href={plexUrl(pick.title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#e5a00d] hover:bg-[#c98c00] text-black transition-all hover:scale-105"
                  >
                    <Play size={12} /> Plex
                  </a>
                  <a
                    href={crackleUrl(pick.title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#ff6600] hover:bg-[#e05500] text-white transition-all hover:scale-105"
                  >
                    <Film size={12} /> Crackle
                  </a>
                  <a
                    href={viuUrl(pick.title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#00c853] hover:bg-[#00a844] text-white transition-all hover:scale-105"
                  >
                    <Tv size={12} /> Viu 🇵🇭
                  </a>
                </div>
                <p className="text-[10px] text-gray-300 mt-2">
                  availability varies by region · JustWatch shows all options in PH 🇵🇭
                </p>
              </div>
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
          {spinning ? "Popping..." : pick ? "Pop again!" : "Pop something on tonight!"}
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
            This circle&apos;s watchlist is empty!{" "}
            <a href="/watchlist" className="text-rose-500 underline">Add some titles first</a>.
          </p>
        )}
      </main>
    </>
  );
}

export default function RandomizerPage() {
  return (
    <RequireAuth>
      <RandomizerInner />
    </RequireAuth>
  );
}
