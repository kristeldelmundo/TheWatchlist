// Shared theme bits: accent presets + background presets for the profile.

export interface Accent {
  value: string
  label: string
  cls: string      // tailwind bg- class for the avatar/initials circle
  ring: string     // hex used for selected ring (and small accents)
}

// Expanded accent set (was rose/plum/amber/teal).
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

// True when a background is dark (so the header text outside the card should be light).
export function isDarkBg(bgType: string | null | undefined, bgImage: string | null | undefined): boolean {
  if (bgType === 'preset' && bgImage) {
    const id = bgImage.replace(/^preset:/, '')
    return ['midnight', 'cocoa', 'noir'].includes(id)
  }
  // Uploaded photos: assume potentially dark, but we keep the card legible regardless.
  return bgType === 'upload'
}

// Resolve the stored bg fields into a React style object for the page wrapper.
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
  // Default CinePop gradient.
  return { background: BG_PRESETS[0].css, backgroundAttachment: 'fixed' }
}
