'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { Film, Shuffle, Star, TrendingUp, LogOut, User as UserIcon, ChevronDown } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '@/components/auth/AuthProvider'

const navItems = [
  { href: '/watchlist', label: 'Watchlist', icon: Film },
  { href: '/trending', label: 'Trending', icon: TrendingUp },
  { href: '/randomizer', label: 'Pick for us!', icon: Shuffle },
  { href: '/review', label: 'Rate & Share', icon: Star },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, profile, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  const name = profile?.display_name || user?.email?.split('@')[0] || 'You'
  const initial = name.charAt(0).toUpperCase()
  const accent = profile?.accent_color === 'purple' ? 'purple' : 'rose'

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

        {/* Profile chip + menu */}
        {user ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full hover:bg-rose-50 transition-colors"
            >
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={name}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <span
                  className={clsx(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold',
                    accent === 'purple'
                      ? 'bg-purple-100 text-purple-500'
                      : 'bg-rose-100 text-rose-500',
                  )}
                >
                  {initial}
                </span>
              )}
              <ChevronDown size={12} className="text-gray-400" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl border border-rose-100 shadow-xl shadow-rose-100/50 overflow-hidden">
                <div className="px-3 py-2 border-b border-rose-50">
                  <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
                <Link
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-rose-50 transition-colors"
                >
                  <UserIcon size={14} /> My Profile
                </Link>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={14} /> Log out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            className="text-sm font-medium text-rose-500 hover:text-rose-600"
          >
            Log in
          </Link>
        )}
      </div>
    </nav>
  )
}
