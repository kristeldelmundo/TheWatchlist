// Shared theme bits: accent presets + background presets + font/size/color
// customization for the profile.

export interface Accent {
  value: string
  label: string
  cls: string      // tailwind bg- class (legacy; swatches now use `ring` inline)
  ring: string     // hex used for the swatch, selected ring, stat numbers, avatar
}

// Expanded accent set.
export const ACCENTS: Accent[] = [
  { value: 'rose', label: 'Rose', cls: 'bg-rose-500', ring: '#f43f5e' },
  { value: 'purple', label: 'Plum', cls: 'bg-purple-500', ring: '#a855f7' },
  { value: 'pink', label: 'Bubblegum', cls: 'bg-pink-500', ring: '#ec4899' },
  { value: 'fuchsia', label: 'Fuchsia', cls: 'bg-fuchsia-500', ring: '#d946ef' },
  { value: 'red', label: 'Cherry', cls: 'bg-red-500', ring: '#ef4444' },
  { value: 'amber', label: 'Amber', cls: 'bg-amber-500', ring: '#f59e0b' },
  { value: 'orange', label: 'Sunset', cls: 'bg-orange-500', ring: '#f97316' },
  { value: 'teal', label: 'Teal', cls: 'bg-teal-500', ring: '#14b8a6' },
  { value: 'emerald', label: 'Mint', cls: 'bg-emerald-500', ring: '#10b981' },
  { value: 'sky', label: 'Sky', cls: 'bg-sky-500', ring: '#0ea5e9' },
  { value: 'indigo', label: 'Indigo', cls: 'bg-indigo-500', ring: '#6366f1' },
  { value: 'slate', label: 'Graphite', cls: 'bg-slate-600', ring: '#475569' },
]

export function accentByValue(value: string | null | undefined): Accent {
  return ACCENTS.find(a => a.value === value) || ACCENTS[0]
}

export interface BgPreset {
  id: string
  label: string
  css: string   // a CSS background value (gradient)
}

// On-brand background presets. The id is stored as `preset:<id>`.
export const BG_PRESETS: BgPreset[] = [
  { id: 'cinepop', label: 'CinePop', css: 'linear-gradient(135deg,#fff1f6,#f6f0ff 60%,#eef4ff)' },
  { id: 'sunset', label: 'Sunset', css: 'linear-gradient(135deg,#ffe9d6,#ffd1dc 55%,#f5c6ec)' },
  { id: 'dusk', label: 'Dusk', css: 'linear-gradient(135deg,#e0c3fc,#8ec5fc)' },
  { id: 'rose-gold', label: 'Rose gold', css: 'linear-gradient(135deg,#fbd7e6,#fbe2c8)' },
  { id: 'mint', label: 'Mint', css: 'linear-gradient(135deg,#d8f3e6,#d6eefc)' },
  { id: 'midnight', label: 'Midnight', css: 'linear-gradient(135deg,#2b2150,#4a3a82 60%,#7d5ba6)' },
  { id: 'cocoa', label: 'Cocoa', css: 'linear-gradient(135deg,#3a2a32,#5c4452)' },
  { id: 'noir', label: 'Noir', css: 'linear-gradient(135deg,#1f2937,#374151)' },
]

export function bgPresetById(id: string): BgPreset | undefined {
  return BG_PRESETS.find(p => p.id === id)
}

export function isDarkBg(bgType: string | null | undefined, bgImage: string | null | undefined): boolean {
  if (bgType === 'preset' && bgImage) {
    const id = bgImage.replace(/^preset:/, '')
    return ['midnight', 'cocoa', 'noir'].includes(id)
  }
  return bgType === 'upload'
}

export function resolveBgStyle(
  bgType: string | null | undefined,
  bgImage: string | null | undefined,
): React.CSSProperties {
  if (bgType === 'upload' && bgImage) {
    return {
      backgroundImage: `url(${bgImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
    }
  }
  if (bgType === 'preset' && bgImage) {
    const preset = bgPresetById(bgImage.replace(/^preset:/, ''))
    if (preset) return { background: preset.css, backgroundAttachment: 'fixed' }
  }
  return { background: BG_PRESETS[0].css, backgroundAttachment: 'fixed' }
}

// ----------------------------------------------------------------------------
// MySpace-style customization: fonts, sizes, text color, editable pick slots.
// ----------------------------------------------------------------------------

export interface FontChoice {
  value: string
  label: string
  stack: string   // CSS font-family value
}

// Curated fonts. The two Google fonts (Playfair/DM-serif via --font-playfair,
// Space Mono via --font-space-mono) are already loaded by the app; the rest are
// safe system stacks so nothing extra needs fetching.
export const FONTS: FontChoice[] = [
  { value: 'default', label: 'Default', stack: 'var(--font-inter), system-ui, sans-serif' },
  { value: 'serif', label: 'Elegant serif', stack: 'var(--font-playfair), Georgia, serif' },
  { value: 'mono', label: 'Typewriter', stack: 'var(--font-space-mono), monospace' },
  { value: 'rounded', label: 'Rounded', stack: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif' },
  { value: 'classic', label: 'Classic', stack: 'Georgia, "Times New Roman", serif' },
  { value: 'system', label: 'Clean sans', stack: '"Helvetica Neue", Arial, sans-serif' },
]

export function fontByValue(value: string | null | undefined): FontChoice {
  return FONTS.find(f => f.value === value) || FONTS[0]
}

// Text size scale — multiplies the card's base font size.
export const FONT_SCALES: { value: string; label: string; scale: number }[] = [
  { value: 'sm', label: 'S', scale: 0.9 },
  { value: 'base', label: 'M', scale: 1 },
  { value: 'lg', label: 'L', scale: 1.15 },
]

export function fontScaleValue(value: string | null | undefined): number {
  return (FONT_SCALES.find(s => s.value === value) || FONT_SCALES[1]).scale
}

// Text color options for card text (name/bio/labels). null = default theme colors.
export const TEXT_COLORS: { value: string; label: string; hex: string }[] = [
  { value: 'default', label: 'Default', hex: '#3a2a32' },
  { value: 'ink', label: 'Ink', hex: '#1f2937' },
  { value: 'rose', label: 'Rose', hex: '#be185d' },
  { value: 'plum', label: 'Plum', hex: '#7e22ce' },
  { value: 'teal', label: 'Teal', hex: '#0f766e' },
  { value: 'amber', label: 'Amber', hex: '#b45309' },
  { value: 'white', label: 'White', hex: '#ffffff' },
]

// One editable "if I had to pick" slot.
export interface CustomPick {
  emoji: string
  label: string
  title: string
  year: string | null
  poster: string | null
  type: string | null
}

// Default slots used when a profile has nothing yet.
export const DEFAULT_PICK_SLOTS: { emoji: string; label: string }[] = [
  { emoji: '🛋️', label: 'Comfort movie' },
  { emoji: '😢', label: 'Last great cry' },
  { emoji: '🙈', label: 'Guilty pleasure' },
  { emoji: '⛰️', label: "Hill I'll die on" },
]

// Convert the legacy fixed `picks` object → ordered custom_picks array, so
// existing profiles keep their choices when the UI switches to editable slots.
export function legacyPicksToCustom(
  picks: Record<string, { title: string; year: string | null; poster: string | null; type: string | null }> | null | undefined,
): CustomPick[] {
  const order: { key: string; emoji: string; label: string }[] = [
    { key: 'comfort', emoji: '🛋️', label: 'Comfort movie' },
    { key: 'cry', emoji: '😢', label: 'Last great cry' },
    { key: 'guilty', emoji: '🙈', label: 'Guilty pleasure' },
    { key: 'hill', emoji: '⛰️', label: "Hill I'll die on" },
  ]
  if (!picks) return []
  const out: CustomPick[] = []
  for (const slot of order) {
    const p = picks[slot.key]
    if (p && p.title) {
      out.push({ emoji: slot.emoji, label: slot.label, title: p.title, year: p.year, poster: p.poster, type: p.type })
    }
  }
  return out
}
