'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Film, Shuffle, Star, Heart } from 'lucide-react'
import { clsx } from 'clsx'

const navItems = [
  { href: '/watchlist', label: 'Watchlist', icon: Film },
  { href: '/randomizer', label: 'Pick for us!', icon: Shuffle },
  { href: '/review', label: 'Rate & Share', icon: Star },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-rose-100">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-xl">🍿</span>
          <span className="font-display text-lg font-medium text-rose-600 italic group-hover:text-rose-700 transition-colors">
            CinePop
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                pathname === href
                  ? 'bg-rose-500 text-white shadow-sm shadow-rose-200'
                  : 'text-gray-500 hover:bg-rose-50 hover:text-rose-500'
              )}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center text-xs font-semibold">K</span>
          <Heart size={10} className="text-rose-300" fill="currentColor" />
          <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-500 flex items-center justify-center text-xs font-semibold">E</span>
        </div>
      </div>
    </nav>
  )
}
