'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import RequireAuth from '@/components/auth/RequireAuth'
import { useAuth } from '@/components/auth/AuthProvider'
import { useCircle } from '@/components/auth/CircleProvider'
import { createCircle, joinCircleByCode, getCircleMembers } from '@/lib/circles'
import { Plus, Users, Check, LogIn, Loader2, Sparkles } from 'lucide-react'
import { clsx } from 'clsx'

const EMOJI_CHOICES = ['🍿', '🎬', '❤️', '👨‍👩‍👧', '🎉', '🌙', '🛋️', '🥂']

function CirclesInner() {
  const router = useRouter()
  const { user } = useAuth()
  const { circles, activeCircle, setActiveCircle, refreshCircles, loading } = useCircle()

  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('🍿')
  const [busy, setBusy] = useState(false)

  const [joinCode, setJoinCode] = useState('')
  const [joinMsg, setJoinMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [joining, setJoining] = useState(false)

  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    // Load member counts for each circle
    async function loadCounts() {
      const counts: Record<string, number> = {}
      for (const c of circles) {
        const members = await getCircleMembers(c.id)
        counts[c.id] = members.length
      }
      setMemberCounts(counts)
    }
    if (circles.length) loadCounts()
  }, [circles])

  async function handleCreate() {
    if (!newName.trim() || !user || busy) return
    setBusy(true)
    const id = await createCircle(newName.trim(), newEmoji, user.id)
    const updated = await refreshCircles()
    const justMade = updated.find((c) => c.id === id)
    if (justMade) setActiveCircle(justMade)
    setBusy(false)
    setCreating(false)
    setNewName('')
    setNewEmoji('🍿')
  }

  async function handleJoin() {
    if (!joinCode.trim() || !user || joining) return
    setJoining(true)
    setJoinMsg(null)
    const result = await joinCircleByCode(joinCode, user.id)
    if (result.circleId && !result.error) {
      const updated = await refreshCircles()
      const joined = updated.find((c) => c.id === result.circleId)
      if (joined) setActiveCircle(joined)
      setJoinMsg({ kind: 'ok', text: 'Joined! 🍿' })
      setJoinCode('')
    } else if (result.circleId && result.error) {
      setJoinMsg({ kind: 'ok', text: result.error })
    } else {
      setJoinMsg({ kind: 'err', text: result.error || 'Could not join.' })
    }
    setJoining(false)
  }

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold text-gray-800 mb-1">
            Your <span className="gradient-text italic">Circles</span> 🍿
          </h1>
          <p className="text-sm text-gray-400">
            Circles are your shared movie groups — family, friends, your partner.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 rounded-2xl shimmer" />
            ))}
          </div>
        ) : (
          <>
            {/* Circle list */}
            <div className="space-y-3 mb-6">
              {circles.map((c) => {
                const isActive = activeCircle?.id === c.id
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveCircle(c)}
                    className={clsx(
                      'w-full glass rounded-2xl p-4 flex items-center gap-3 text-left transition-all',
                      isActive
                        ? 'ring-2 ring-rose-400 shadow-lg shadow-rose-100'
                        : 'hover:shadow-md hover:shadow-rose-50',
                    )}
                  >
                    <span className="text-3xl">{c.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-800">{c.name}</h3>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Users size={11} />
                        {memberCounts[c.id] ?? '…'}{' '}
                        {(memberCounts[c.id] ?? 0) === 1 ? 'member' : 'members'}
                      </p>
                    </div>
                    {isActive && (
                      <span className="flex items-center gap-1 text-xs font-medium text-rose-500 bg-rose-50 px-2 py-1 rounded-full">
                        <Check size={12} /> Active
                      </span>
                    )}
                  </button>
                )
              })}

              {circles.length === 0 && (
                <div className="glass rounded-2xl p-8 text-center">
                  <Sparkles size={32} className="mx-auto mb-3 text-rose-300" />
                  <p className="text-gray-600 font-medium mb-1">No circles yet!</p>
                  <p className="text-sm text-gray-400">
                    Create your first circle below to start building a shared watchlist.
                  </p>
                </div>
              )}
            </div>

            {/* Create a circle */}
            {creating ? (
              <div className="glass rounded-2xl p-4 mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                  New circle name
                </label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Movie Squad, Family Nights"
                  className="w-full bg-white/80 border border-rose-100 rounded-xl px-3 py-2.5 text-sm mb-3 outline-none focus:border-rose-300"
                />
                <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                  Pick an emoji
                </label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {EMOJI_CHOICES.map((e) => (
                    <button
                      key={e}
                      onClick={() => setNewEmoji(e)}
                      className={clsx(
                        'w-10 h-10 rounded-xl text-xl transition-all',
                        newEmoji === e
                          ? 'bg-rose-100 ring-2 ring-rose-400 scale-110'
                          : 'bg-white/60 hover:bg-rose-50',
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreate}
                    disabled={!newName.trim() || busy}
                    className="flex-1 flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-medium py-2.5 rounded-xl text-sm transition-all"
                  >
                    {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    Create circle
                  </button>
                  <button
                    onClick={() => setCreating(false)}
                    className="px-4 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="w-full flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-medium py-3 rounded-2xl text-sm transition-all mb-4"
              >
                <Plus size={18} /> Create a new circle
              </button>
            )}

            {/* Join by code */}
            <div className="glass rounded-2xl p-4">
              <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                Join a circle with an invite code
              </label>
              <div className="flex gap-2">
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Paste invite code..."
                  className="flex-1 bg-white/80 border border-rose-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-rose-300"
                />
                <button
                  onClick={handleJoin}
                  disabled={!joinCode.trim() || joining}
                  className="flex items-center gap-1.5 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white font-medium px-4 rounded-xl text-sm transition-all"
                >
                  {joining ? <Loader2 size={15} className="animate-spin" /> : <LogIn size={15} />}
                  Join
                </button>
              </div>
              {joinMsg && (
                <p
                  className={clsx(
                    'text-xs mt-2 px-3 py-2 rounded-lg',
                    joinMsg.kind === 'ok'
                      ? 'bg-green-50 text-green-600'
                      : 'bg-red-50 text-red-500',
                  )}
                >
                  {joinMsg.text}
                </p>
              )}
            </div>
          </>
        )}
      </main>
    </>
  )
}

export default function CirclesPage() {
  return (
    <RequireAuth>
      <CirclesInner />
    </RequireAuth>
  )
}
