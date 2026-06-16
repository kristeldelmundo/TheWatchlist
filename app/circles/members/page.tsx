'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import RequireAuth from '@/components/auth/RequireAuth'
import { useAuth } from '@/components/auth/AuthProvider'
import { useCircle } from '@/components/auth/CircleProvider'
import { getCircleMembers } from '@/lib/circles'
import { loadProfileStats } from '@/lib/profile'
import { ChevronLeft, ChevronRight, Loader2, Users, Star } from 'lucide-react'
import { clsx } from 'clsx'

interface Member {
  user_id: string
  role: string
  profile: { id: string; display_name: string | null; avatar_url: string | null; accent_color: string | null } | null
}

// Lightweight activity hint per member — review count + their most common
// reaction, so the list gives a reason to tap in rather than just naming
// people.
interface MemberActivity {
  reviews: number
  topReaction: string | null
}

const REACTION_EMOJI: Record<string, string> = {
  Obsessed: '😍', 'So good': '🍿', 'We cried': '😭', 'Laughed so hard': '🤣',
  'Plot twist!': '🤯', 'Fell asleep': '😴', Meh: '😐', 'Would rewatch': '🔁',
  'Perfect date night': '💑', "So bad it's good": '💀',
}

function MembersInner() {
  const { user } = useAuth()
  const { activeCircle } = useCircle()
  const [members, setMembers] = useState<Member[]>([])
  const [activity, setActivity] = useState<Record<string, MemberActivity>>({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!activeCircle) { setLoading(false); return }
    setLoading(true)
    const m = await getCircleMembers(activeCircle.id)
    setMembers(m as Member[])
    setLoading(false)

    // Activity hints load in the background — don't block the list itself.
    const entries = await Promise.all(
      (m as Member[]).map(async (member) => {
        const stats = await loadProfileStats(member.user_id)
        return [member.user_id, { reviews: stats.reviews, topReaction: stats.topReaction }] as const
      }),
    )
    setActivity(Object.fromEntries(entries))
  }, [activeCircle])

  useEffect(() => { load() }, [load])

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/circles" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-rose-500 mb-4 transition-colors">
          <ChevronLeft size={16} /> Back to circles
        </Link>

        {!activeCircle ? (
          <div className="glass rounded-2xl p-8 text-center">
            <Users size={32} className="mx-auto mb-3 text-rose-300" />
            <p className="text-gray-600 font-medium mb-1">No circle selected</p>
            <p className="text-sm text-gray-400">Pick a circle first to see its members.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">{activeCircle.emoji}</span>
              <div>
                <h1 className="font-display text-2xl font-bold text-gray-800 leading-tight">{activeCircle.name}</h1>
                <p className="text-xs text-gray-400">{members.length} {members.length === 1 ? 'member' : 'members'} — tap to see their profile</p>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-2xl shimmer" />)}
              </div>
            ) : (
              <div className="space-y-2.5">
                {members.map((m) => {
                  const nm = m.profile?.display_name || 'Member'
                  const isPurple = m.profile?.accent_color === 'purple'
                  const isMe = m.user_id === user?.id
                  const act = activity[m.user_id]
                  return (
                    <Link
                      key={m.user_id}
                      href={`/@${m.user_id}`}
                      className="w-full glass rounded-2xl p-3.5 flex items-center gap-3 text-left transition-all hover:shadow-md hover:shadow-rose-50"
                    >
                      {m.profile?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.profile.avatar_url} alt={nm} className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow" />
                      ) : (
                        <span className={clsx(
                          'w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold',
                          isPurple ? 'bg-purple-100 text-purple-600' : 'bg-rose-100 text-rose-600',
                        )}>
                          {nm.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-800">{nm}{isMe ? ' (you)' : ''}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {m.role === 'owner' && <span className="text-[11px] text-rose-400 font-medium">owner</span>}
                          {act !== undefined && (
                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                              <Star size={10} className="text-amber-400" />
                              {act.reviews} {act.reviews === 1 ? 'review' : 'reviews'}
                              {act.topReaction && (
                                <span className="ml-0.5">{REACTION_EMOJI[act.topReaction] || ''}</span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-gray-300" />
                    </Link>
                  )
                })}
              </div>
            )}
          </>
        )}
      </main>
    </>
  )
}

export default function CircleMembersPage() {
  return (
    <RequireAuth>
      <MembersInner />
    </RequireAuth>
  )
}
