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

// Join a circle by its invite code. Returns the circle id if joined, or an error string.
export async function joinCircleByCode(
  code: string,
  userId: string,
): Promise<{ circleId?: string; error?: string }> {
  const clean = code.trim().toLowerCase()
  if (!clean) return { error: 'Please enter an invite code.' }

  // Find the circle with this invite code
  const { data: circle, error } = await supabase
    .from('circles')
    .select('id, name')
    .eq('invite_code', clean)
    .maybeSingle()

  if (error || !circle) {
    return { error: "That invite code didn't match any circle." }
  }

  // Already a member?
  const { data: existing } = await supabase
    .from('circle_members')
    .select('id')
    .eq('circle_id', circle.id)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    return { circleId: circle.id, error: "You're already in this circle!" }
  }

  // Join
  const { error: joinError } = await supabase.from('circle_members').insert({
    circle_id: circle.id,
    user_id: userId,
    role: 'member',
  })

  if (joinError) return { error: 'Could not join the circle. Try again.' }
  return { circleId: circle.id }
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
