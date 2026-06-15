'use client'

import { useState, useEffect, useRef } from 'react'
import Navbar from '@/components/layout/Navbar'
import RequireAuth from '@/components/auth/RequireAuth'
import { useAuth } from '@/components/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { Loader2, Check, Camera, X } from 'lucide-react'
import { clsx } from 'clsx'

const BIO_MAX = 160

function ProfileInner() {
  const { user, profile, refreshProfile } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [accent, setAccent] = useState('rose')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '')
      setAccent(profile.accent_color || 'rose')
      setBio(profile.bio || '')
      setAvatarUrl(profile.avatar_url || null)
    }
  }, [profile])

  async function handlePickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadError(null)

    // Basic guards: image type + size cap (5MB)
    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be under 5MB.')
      return
    }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      // Stored under the user's own folder so storage policies allow it.
      const path = `${user.id}/avatar_${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, cacheControl: '3600' })
      if (upErr) throw upErr

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      setAvatarUrl(data.publicUrl)
    } catch (err) {
      setUploadError('Upload failed — please try again.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function removePhoto() {
    setAvatarUrl(null)
  }

  async function save() {
    if (!user) return
    setSaving(true)
    await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        accent_color: accent,
        bio: bio.slice(0, BIO_MAX),
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
    await refreshProfile()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const accents = [
    { value: 'rose', label: 'Rose', cls: 'bg-rose-500' },
    { value: 'purple', label: 'Plum', cls: 'bg-purple-500' },
    { value: 'amber', label: 'Amber', cls: 'bg-amber-500' },
    { value: 'teal', label: 'Teal', cls: 'bg-teal-500' },
  ]

  const accentBg =
    accent === 'purple' ? 'bg-purple-500'
      : accent === 'amber' ? 'bg-amber-500'
      : accent === 'teal' ? 'bg-teal-500'
      : 'bg-rose-500'

  const initial = (displayName || user?.email || 'Y').charAt(0).toUpperCase()

  return (
    <>
      <Navbar />
      <main className="max-w-md mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-gray-800 mb-6">
          My <span className="gradient-text italic">Profile</span>
        </h1>

        <div className="glass rounded-2xl p-6">
          {/* Avatar with upload */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="group relative block"
                title="Change photo"
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={displayName || 'You'}
                    className="w-20 h-20 rounded-full object-cover ring-2 ring-white shadow"
                  />
                ) : (
                  <span
                    className={clsx(
                      'w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white',
                      accentBg,
                    )}
                  >
                    {initial}
                  </span>
                )}
                {/* Camera overlay */}
                <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  {uploading ? (
                    <Loader2 size={20} className="text-white animate-spin" />
                  ) : (
                    <Camera size={20} className="text-white" />
                  )}
                </span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handlePickFile}
                className="hidden"
              />
            </div>

            <div className="min-w-0">
              <p className="font-medium text-gray-800 truncate">{displayName || 'Your name'}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="text-xs text-rose-500 hover:text-rose-600 font-medium"
                >
                  {avatarUrl ? 'Change photo' : 'Add photo'}
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-0.5"
                  >
                    <X size={11} /> Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {uploadError && (
            <p className="text-xs text-red-500 mb-4 -mt-2">{uploadError}</p>
          )}

          <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Display name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-white/80 border border-rose-100 rounded-xl px-3 py-2.5 text-sm mb-4 outline-none focus:border-rose-300"
          />

          <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Accent color</label>
          <div className="flex gap-2 mb-4">
            {accents.map((a) => (
              <button
                key={a.value}
                onClick={() => setAccent(a.value)}
                className={clsx(
                  'w-9 h-9 rounded-full transition-all',
                  a.cls,
                  accent === a.value ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'opacity-60',
                )}
                title={a.label}
              />
            ))}
          </div>

          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Bio</label>
            <span className={clsx('text-[11px]', bio.length > BIO_MAX - 20 ? 'text-rose-400' : 'text-gray-300')}>
              {bio.length}/{BIO_MAX}
            </span>
          </div>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
            rows={3}
            placeholder="A little about your movie taste..."
            className="w-full bg-white/80 border border-rose-100 rounded-xl px-3 py-2.5 text-sm mb-4 outline-none focus:border-rose-300 resize-none"
          />

          <button
            onClick={save}
            disabled={saving || uploading}
            className="w-full flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-medium py-2.5 rounded-xl text-sm transition-all"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <><Check size={16} /> Saved!</> : 'Save profile'}
          </button>
        </div>

        <p className="text-xs text-gray-300 text-center mt-3">
          Your photo and bio are visible to people in your circles.
        </p>
      </main>
    </>
  )
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileInner />
    </RequireAuth>
  )
}
