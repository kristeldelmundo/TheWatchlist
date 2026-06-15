'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Bell, Check, X, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '@/components/auth/AuthProvider'
import { useCircle } from '@/components/auth/CircleProvider'
import {
  getMyPendingInvites,
  acceptInvite,
  declineInvite,
  PendingInvite,
} from '@/lib/circles'

export default function InviteBell() {
  const { user } = useAuth()
  const { refreshCircles, setActiveCircle } = useCircle()
  const [open, setOpen] = useState(false)
  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (!user) {
      setInvites([])
      return
    }
    const data = await getMyPendingInvites()
    setInvites(data)
  }, [user])

  // Load on mount and poll every 30s so new invites show up
  useEffect(() => {
    load()
    const timer = setInterval(load, 30000)
    return () => clearInterval(timer)
  }, [load])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleAccept(invite: PendingInvite) {
    if (busyId) return
    setBusyId(invite.invite_id)
    const result = await acceptInvite(invite.invite_id)
    if (result.ok) {
      const updated = await refreshCircles()
      const joined = updated.find((c) => c.id === invite.circle_id)
      if (joined) setActiveCircle(joined)
    }
    await load()
    setBusyId(null)
  }

  async function handleDecline(invite: PendingInvite) {
    if (busyId) return
    setBusyId(invite.invite_id)
    await declineInvite(invite.invite_id)
    await load()
    setBusyId(null)
  }

  if (!user) return null

  const count = invites.length

  return (
    <div className="relative flex-shrink-0" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center justify-center w-8 h-8 rounded-full hover:bg-rose-50 transition-colors"
        aria-label="Invitations"
      >
        <Bell size={18} className={count > 0 ? 'text-rose-500' : 'text-gray-400'} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-rose-100 shadow-xl shadow-rose-100/50 overflow-hidden z-50">
          <div className="px-4 py-2.5 border-b border-rose-50 flex items-center gap-2">
            <Bell size={14} className="text-rose-400" />
            <span className="text-sm font-medium text-gray-700">Invitations</span>
          </div>

          {count === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="text-3xl mb-2">🍿</div>
              <p className="text-sm text-gray-400">No invitations right now.</p>
              <p className="text-xs text-gray-300 mt-1">
                When someone invites you to a circle, it&apos;ll pop up here!
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {invites.map((inv) => {
                const busy = busyId === inv.invite_id
                return (
                  <div key={inv.invite_id} className="px-4 py-3 border-b border-rose-50 last:border-0">
                    <div className="flex items-start gap-2.5 mb-2.5">
                      <span className="text-2xl flex-shrink-0">{inv.circle_emoji}</span>
                      <p className="text-sm text-gray-600 leading-snug">
                        <span className="font-semibold text-rose-500">{inv.invited_by_name}</span>{' '}
                        invited you to join{' '}
                        <span className="font-semibold text-gray-800">{inv.circle_name}</span> 🍿
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAccept(inv)}
                        disabled={busy}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-medium py-2 rounded-xl text-xs transition-all"
                      >
                        {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                        Accept
                      </button>
                      <button
                        onClick={() => handleDecline(inv)}
                        disabled={busy}
                        className="flex items-center justify-center gap-1.5 bg-white border border-rose-100 hover:bg-gray-50 text-gray-500 font-medium px-3 py-2 rounded-xl text-xs transition-all"
                      >
                        <X size={13} /> Decline
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
