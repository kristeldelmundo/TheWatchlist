import { supabase } from '@/lib/supabase'

// Create a new circle and add the creator as owner-member.
// Returns the new circle's id, or null on failure.
export async function createCircle(
  name: string,
  emoji: string,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('circles')
    .insert({ name, emoji, owner_id: userId })
    .select()
    .single()

  if (error || !data) return null

  // Add the creator as a member (owner role)
  await supabase.from('circle_members').insert({
    circle_id: data.id,
    user_id: userId,
    role: 'owner',
  })

  return data.id as string
}

// Update a circle's name and/or emoji (owner-only, enforced by RLS).
export async function updateCircle(
  circleId: string,
  updates: { name?: string; emoji?: string },
): Promise<boolean> {
  const { error } = await supabase
    .from('circles')
    .update(updates)
    .eq('id', circleId)
  return !error
}

// Pull a bare invite code out of whatever the user pasted — a full invite
// link, a code with stray slashes, or the bare code. We take the last
// non-empty path-ish segment and strip anything that isn't part of a code.
export function extractInviteCode(input: string): string {
  let s = (input || '').trim()
  if (!s) return ''
  // Drop any query string or hash.
  s = s.split(/[?#]/)[0]
  // If it looks like a URL or has slashes, take the last non-empty segment.
  if (s.includes('/')) {
    const parts = s.split('/').filter(Boolean)
    s = parts[parts.length - 1] || ''
  }
  // Codes are alphanumeric; strip anything else (spaces, punctuation).
  s = s.replace(/[^a-zA-Z0-9]/g, '')
  return s.toLowerCase()
}

// Join a circle by its invite code.
// Uses a secure DB function so new joiners can find the circle even though
// RLS only lets members SELECT circles directly.
export async function joinCircleByCode(
  code: string,
  _userId: string,
): Promise<{ circleId?: string; error?: string }> {
  const clean = extractInviteCode(code)
  if (!clean) return { error: 'Please enter an invite code or link.' }

  const { data, error } = await supabase.rpc('join_circle_by_code', {
    code: clean,
  })

  if (error || !data || data.length === 0) {
    return { error: 'Could not join the circle. Try again.' }
  }

  const row = data[0] as { circle_id: string | null; circle_name: string | null; status: string }

  switch (row.status) {
    case 'joined':
      return { circleId: row.circle_id! }
    case 'already_member':
      return { circleId: row.circle_id!, error: "You're already in this circle!" }
    case 'not_found':
      return { error: "That invite code didn't match any circle." }
    case 'not_logged_in':
      return { error: 'Please log in first.' }
    default:
      return { error: 'Could not join the circle. Try again.' }
  }
}

// Get the members of a circle, with their profile info
export async function getCircleMembers(circleId: string) {
  const { data: members } = await supabase
    .from('circle_members')
    .select('user_id, role, joined_at')
    .eq('circle_id', circleId)

  if (!members || members.length === 0) return []

  const ids = members.map((m) => m.user_id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, accent_color')
    .in('id', ids)

  return members.map((m) => ({
    ...m,
    profile: profiles?.find((p) => p.id === m.user_id) || null,
  }))
}

// Build a shareable invite link for a circle
export function inviteLink(code: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/join/${code}`
  }
  return `/join/${code}`
}

// localStorage key where the join page stashes an invite code when a
// logged-out user opens an invite link. Consumed right after they log in.
export const PENDING_INVITE_KEY = 'cinepop_pending_invite'

// Where should we send the user right after a successful login?
// If they arrived via an invite link while logged out, finish the join;
// otherwise go to the watchlist. Reads (and clears) the saved invite code.
export function postLoginDestination(): string {
  if (typeof window === 'undefined') return '/watchlist'
  let code: string | null = null
  try {
    code = window.localStorage.getItem(PENDING_INVITE_KEY)
    if (code) window.localStorage.removeItem(PENDING_INVITE_KEY)
  } catch {
    code = null
  }
  return code ? `/join/${code}` : '/watchlist'
}

interface FoundUser {
  id: string
  display_name: string | null
  avatar_url: string | null
}

// Search for a registered user by their exact email
export async function searchUserByEmail(email: string): Promise<FoundUser | null> {
  const clean = email.trim()
  if (!clean) return null
  const { data, error } = await supabase.rpc('find_user_by_email', {
    lookup_email: clean,
  })
  if (error || !data || data.length === 0) return null
  return data[0] as FoundUser
}

// Invite a found user to a circle. Creates a PENDING invite they must accept.
export async function inviteUserToCircle(
  circleId: string,
  userId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const { data, error } = await supabase.rpc('invite_user_to_circle', {
    target_circle: circleId,
    target_user: userId,
  })
  if (error) return { ok: false, reason: 'error' }
  if (data === 'invited') return { ok: true }
  return { ok: false, reason: data as string }
}

export interface PendingInvite {
  invite_id: string
  circle_id: string
  circle_name: string
  circle_emoji: string
  invited_by_name: string
  created_at: string
}

// Get my pending invitations (circles others have invited me to).
export async function getMyPendingInvites(): Promise<PendingInvite[]> {
  const { data, error } = await supabase.rpc('my_pending_invites')
  if (error || !data) return []
  return data as PendingInvite[]
}

// Accept an invitation — joins the circle.
export async function acceptInvite(
  inviteId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const { data, error } = await supabase.rpc('accept_circle_invite', {
    invite_id: inviteId,
  })
  if (error) return { ok: false, reason: 'error' }
  if (data === 'accepted') return { ok: true }
  return { ok: false, reason: data as string }
}

// Decline an invitation.
export async function declineInvite(
  inviteId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const { data, error } = await supabase.rpc('decline_circle_invite', {
    invite_id: inviteId,
  })
  if (error) return { ok: false, reason: 'error' }
  if (data === 'declined') return { ok: true }
  return { ok: false, reason: data as string }
}

// Leave a circle yourself. The owner can't leave (it would orphan the circle).
export async function leaveCircle(
  circleId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const { data, error } = await supabase.rpc('leave_circle', {
    target_circle: circleId,
  })
  if (error) return { ok: false, reason: 'error' }
  if (data === 'left') return { ok: true }
  return { ok: false, reason: data as string }
}

// Remove another member from a circle. Any member can remove anyone except the owner.
export async function removeCircleMember(
  circleId: string,
  userId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const { data, error } = await supabase.rpc('remove_circle_member', {
    target_circle: circleId,
    target_user: userId,
  })
  if (error) return { ok: false, reason: 'error' }
  if (data === 'removed') return { ok: true }
  return { ok: false, reason: data as string }
}
