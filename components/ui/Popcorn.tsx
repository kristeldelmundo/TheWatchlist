"use client";

// Cute SVG popcorn piece — soft cream puff with buttery yellow edges,
// inspired by illustrated popcorn (not the emoji).
export default function Popcorn({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Buttery yellow base lobes (slightly offset behind the cream) */}
      <circle cx="38" cy="42" r="20" fill="#fcd34d" />
      <circle cx="60" cy="38" r="22" fill="#fbbf24" />
      <circle cx="54" cy="62" r="19" fill="#fcd34d" />
      <circle cx="34" cy="60" r="16" fill="#fde68a" />

      {/* Cream/white fluffy puffs on top */}
      <circle cx="36" cy="40" r="16" fill="#fffdf7" />
      <circle cx="56" cy="36" r="17" fill="#fffaf0" />
      <circle cx="50" cy="58" r="15" fill="#fffdf7" />
      <circle cx="32" cy="56" r="12" fill="#fff8e7" />
      <circle cx="62" cy="54" r="13" fill="#fffaf0" />

      {/* Tiny highlight pops for a fluffy look */}
      <circle cx="44" cy="46" r="9" fill="#ffffff" opacity="0.9" />
      <circle cx="54" cy="44" r="7" fill="#ffffff" opacity="0.8" />
    </svg>
  );
}
