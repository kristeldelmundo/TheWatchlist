'use client'

import { useState, useEffect, useCallback } from 'react'
import Navbar from '@/components/layout/Navbar'
import RequireAuth from '@/components/auth/RequireAuth'
import { useAuth } from '@/components/auth/AuthProvider'
import { useCircle } from '@/components/auth/CircleProvider'
import {
  createCircle,
  updateCircle,
  joinCircleByCode,
  getCircleMembers,
  inviteLink,
  searchUserByEmail,
  addMemberByUserId,
} from '@/lib/circles'
import {
  Plus, Users, Check, LogIn, Loader2, Sparkles, Link2, UserPlus, Search, Pencil, X,
} from 'lucide-react'
import { clsx } from 'clsx'

const EMOJI_CHOICES = ['🍿', '🎬', '❤️', '👨‍👩‍👧', '🎉', '🌙', '🛋️', '🥂']

interface Member {
  user_id: string
  role: string
  profile: { id: string; display_name: string | null; avatar_url: string | null; accent_color: string | null } | null
}

function CirclesInner() {
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
  const [members, setMembers] = useState<Member[]>([])
  const [copied, setCopied] = useState(false)

  // Invite by email
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  // Editing the active circle
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editEmoji, setEditEmoji] = useState('🍿')
  const [savingEdit, setSavingEdit] = useState(false)

  const loadMembers = useCallback(async () => {
    if (!activeCircle) return
    const m = await getCircleMembers(activeCircle.id)
    setMembers(m as Member[])
  }, [activeCircle])

  useEffect(() => {
    async function loadCounts() {
      const counts: Record<string, number> = {}
      for (const c of circles) {
        const m = await getCircleMembers(c.id)
        counts[c.id] = m.length
      }
      setMemberCounts(counts)
    }
    if (circles.length) loadCounts()
  }, [circles])

  useEffect(() => {
    loadMembers()
    // Reset edit mode when switching circles
    setEditing(false)
  }, [loadMembers])

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

  function startEditing() {
    if (!activeCircle) return
    setEditName(activeCircle.name)
    setEditEmoji(activeCircle.emoji)
    setEditing(true)
  }

  async function handleSaveEdit() {
    if (!editName.trim() || !activeCircle || savingEdit) return
    setSavingEdit(true)
    const ok = await updateCircle(activeCircle.id, {
      name: editName.trim(),
      emoji: editEmoji,
    })
    if (ok) {
      const updated = await refreshCircles()
      const refreshed = updated.find((c) => c.id === activeCircle.id)
      if (refreshed) setActiveCircle(refreshed)
    }
    setSavingEdit(false)
    setEditing(false)
  }

  async function handleJoin() {
    if (!joinCode.trim() || !user || joining) return
    setJoining(true)
    setJoinMsg(null)
    const result = await joinCircleByCode(joinCode, user.id)
    if (result.circleId) {
      const updated = await refreshCircles()
      const joined = updated.find((c) => c.id === result.circleId)
      if (joined) setActiveCircle(joined)
      setJoinMsg({ kind: 'ok', text: result.error || 'Joined! 🍿' })
      setJoinCode('')
    } else {
      setJoinMsg({ kind: 'err', text: result.error || 'Could not join.' })
    }
    setJoining(false)
  }

  async function copyInvite() {
    if (!activeCircle) return
    const link = inviteLink(activeCircle.invite_code)
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleInviteByEmail() {
    if (!inviteEmail.trim() || !activeCircle || inviting) return
    setInviting(true)
    setInviteMsg(null)

    const found = await searchUserByEmail(inviteEmail)
    if (!found) {
      setInviteMsg({
        kind: 'err',
        text: "No CinePop account with that email yet. Send them an invite link instead!",
      })
      setInviting(false)
      return
    }

    const result = await addMemberByUserId(activeCircle.id, found.id)
    if (result.ok) {
      setInviteMsg({ kind: 'ok', text: `Added ${found.display_name || 'them'}! 🍿` })
      setInviteEmail('')
      loadMembers()
    } else if (result.reason === 'already_member') {
      setInviteMsg({ kind: 'ok', text: "They're already in this circle!" })
    } else if (result.reason === 'not_owner') {
      setInviteMsg({ kind: 'err', text: 'Only the circle owner can add members by email. Share the invite link instead!' })
    } else {
      setInviteMsg({ kind: 'err', text: 'Could not add them. Try the invite link.' })
    }
    setInviting(false)
  }

  const isOwner = activeCircle?.owner_id === user?.id

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

            {/* Active circle: invite + members panel */}
            {activeCircle && (
              <div className="glass rounded-2xl p-4 mb-4">
                {editing ? (
                  /* Edit mode */
                  <div className="mb-1">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Edit circle
                      </label>
                      <button
                        onClick={() => setEditing(false)}
                        className="text-gray-400 hover:text-gray-600"
                        aria-label="Cancel edit"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Circle name"
                      className="w-full bg-white/80 border border-rose-100 rounded-xl px-3 py-2.5 text-sm mb-3 outline-none focus:border-rose-300"
                    />
                    <div className="flex flex-wrap gap-2 mb-3">
                      {EMOJI_CHOICES.map((e) => (
                        <button
                          key={e}
                          onClick={() => setEditEmoji(e)}
                          className={clsx(
                            'w-10 h-10 rounded-xl text-xl transition-all',
                            editEmoji === e
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
                        onClick={handleSaveEdit}
                        disabled={!editName.trim() || savingEdit}
                        className="flex-1 flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-medium py-2.5 rounded-xl text-sm transition-all"
                      >
                        {savingEdit ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                        Save changes
                      </button>
                      <button
                        onClick={() => setEditing(false)}
                        className="px-4 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{activeCircle.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-medium text-gray-800">{activeCircle.name}</h2>
                      <p className="text-xs text-gray-400">Invite people to share this watchlist</p>
                    </div>
                    {isOwner && (
                      <button
                        onClick={startEditing}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-rose-500 bg-white/60 hover:bg-rose-50 px-2.5 py-1.5 rounded-full transition-all"
                        title="Edit circle name & emoji"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                    )}
                  </div>
                )}

                {!editing && (
                  <>
                    {/* Invite link */}
                    <button
                      onClick={copyInvite}
                      className="w-full flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-medium py-2.5 rounded-xl text-sm transition-all mb-3"
                    >
                      {copied ? <Check size={15} /> : <Link2 size={15} />}
                      {copied ? 'Invite link copied!' : 'Copy invite link'}
                    </button>

                    {/* Invite by email (owner only) */}
                    {isOwner && (
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                          Add by email
                        </label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                            <input
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              placeholder="friend@email.com"
                              className="w-full bg-white/80 border border-rose-100 rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:border-rose-300"
                            />
                          </div>
                          <button
                            onClick={handleInviteByEmail}
                            disabled={!inviteEmail.trim() || inviting}
                            className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-medium px-3 rounded-xl text-sm transition-all"
                          >
                            {inviting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                            Add
                          </button>
                        </div>
                        {inviteMsg && (
                          <p
                            className={clsx(
                              'text-xs mt-2 px-3 py-2 rounded-lg',
                              inviteMsg.kind === 'ok' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-700',
                            )}
                          >
                            {inviteMsg.text}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Member list */}
                    <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                      Members ({members.length})
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {members.map((m) => {
                        const nm = m.profile?.display_name || 'Member'
                        const isPurple = m.profile?.accent_color === 'purple'
                        return (
                          <div
                            key={m.user_id}
                            className="flex items-center gap-2 bg-white/70 border border-rose-100 rounded-full pl-1 pr-3 py-1"
                          >
                            {m.profile?.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={m.profile.avatar_url} alt={nm} className="w-6 h-6 rounded-full object-cover" />
                            ) : (
                              <span
                                className={clsx(
                                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold',
                                  isPurple ? 'bg-purple-100 text-purple-600' : 'bg-rose-100 text-rose-600',
                                )}
                              >
                                {nm.charAt(0).toUpperCase()}
                              </span>
                            )}
                            <span className="text-xs text-gray-600">{nm}</span>
                            {m.role === 'owner' && (
                              <span className="text-[10px] text-rose-400 font-medium">owner</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

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
                    joinMsg.kind === 'ok' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500',
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
