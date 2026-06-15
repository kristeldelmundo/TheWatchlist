"use client";

import Image from "next/image";
import { Trash2, Check, Film, Tv } from "lucide-react";
import { WatchlistItem } from "@/types";
import { clsx } from "clsx";

interface Props {
  item: WatchlistItem;
  onDelete: (id: string) => void;
  onMarkWatched: (id: string) => void;
}

// Give each person a stable color based on their name, so every member
// gets a consistent avatar color (not just Kristel/Eric).
const PALETTE = [
  { bg: "bg-rose-100", text: "text-rose-500" },
  { bg: "bg-purple-100", text: "text-purple-500" },
  { bg: "bg-amber-100", text: "text-amber-600" },
  { bg: "bg-teal-100", text: "text-teal-600" },
  { bg: "bg-sky-100", text: "text-sky-600" },
  { bg: "bg-fuchsia-100", text: "text-fuchsia-600" },
];

function colorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export default function MovieCard({ item, onDelete, onMarkWatched }: Props) {
  const addedBy = item.added_by || "Someone";
  const initial = addedBy.charAt(0).toUpperCase();
  const color = colorFor(addedBy);

  return (
    <div
      className={clsx(
        "glass rounded-2xl p-3 flex gap-3 group hover:shadow-lg hover:shadow-rose-100 transition-all",
        item.watched && "opacity-60",
      )}
    >
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
      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-medium text-gray-800 text-sm leading-tight truncate">
            {item.title}
          </h3>
          <span
            className={clsx(
              "text-xs px-2 py-0.5 rounded-full flex-shrink-0",
              item.type === "movie" ? "pill-movie" : "pill-tv",
            )}
          >
            {item.type === "tv" ? "TV" : "Movie"}
          </span>
        </div>

        <div className="flex items-center gap-2 mb-1.5">
          {item.year && (
            <span className="text-xs text-gray-400">{item.year}</span>
          )}
          {item.genre && (
            <span className="text-xs text-gray-400 truncate">
              {item.genre.split(",")[0]}
            </span>
          )}
          {item.rating && item.rating !== "N/A" && (
            <span className="text-xs text-amber-500 font-medium">
              ★ {item.rating}
            </span>
          )}
        </div>

        {item.plot && (
          <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
            {item.plot}
          </p>
        )}

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5">
            <span
              className={clsx(
                "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                color.bg,
                color.text,
              )}
            >
              {initial}
            </span>
            <span className="text-xs text-gray-400">
              <span className={clsx("font-medium", color.text)}>{addedBy}</span>{" "}
              added this
            </span>
            {item.watched && (
              <span className="ml-1 text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-medium">
                Watched ✓
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!item.watched && (
              <button
                onClick={() => onMarkWatched(item.id)}
                className="w-7 h-7 rounded-full bg-green-100 text-green-600 hover:bg-green-200 flex items-center justify-center transition-colors"
                title="Mark as watched"
              >
                <Check size={12} />
              </button>
            )}
            <button
              onClick={() => onDelete(item.id)}
              className="w-7 h-7 rounded-full bg-red-100 text-red-400 hover:bg-red-200 flex items-center justify-center transition-colors"
              title="Remove"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
