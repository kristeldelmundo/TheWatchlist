import { supabase } from '@/lib/supabase'

// Update an existing review (the author's own). Sets edited_at so the UI
// can show an "edited" marker. RLS already limits writes to circle members;
// the UI only surfaces edit controls on the author's own reviews.
export async function updateReview(
  id: string,
  updates: { rating?: number; thoughts?: string; reactions?: string[] },
): Promise<boolean> {
  const { error } = await supabase
    .from('reviews')
    .update({ ...updates, edited_at: new Date().toISOString() })
    .eq('id', id)
  return !error
}

// Delete a review by id.
export async function deleteReview(id: string): Promise<boolean> {
  const { error } = await supabase.from('reviews').delete().eq('id', id)
  return !error
}
