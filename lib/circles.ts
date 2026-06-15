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

// Join a circle by its invite code.
// Uses a secure DB function so new joiners can find the circle even though
// RLS only lets members SELECT circles directly.
export async function joinCircleByCode(
  code: string,
  _userId: string,
): Promise<{ circleId?: string; error?: string }> {
  const clean = code.trim().toLowerCase()
  if (!clean) return { error: 'Please enter an invite code.' }

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

// Invite a found user to a circle by adding them as a member (owner-only).
export async function addMemberByUserId(
  circleId: string,
  userId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const { data, error } = await supabase.rpc('add_member_to_circle', {
    target_circle: circleId,
    target_user: userId,
  })
  if (error) return { ok: false, reason: 'error' }
  if (data === 'added') return { ok: true }
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
