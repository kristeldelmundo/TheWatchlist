'use client'

import {
  createContext, useContext, useState, ReactNode, useCallback,
} from 'react'
import { useAuth } from './AuthProvider'
import { useCircle } from './CircleProvider'
import { supabase } from '@/lib/supabase'
import TabTour, { TabTourStep } from '@/components/tour/TabTour'

interface TabTourContextValue {
  open: boolean
  openTour: () => void
  closeTour: () => void
}

const TabTourContext = createContext<TabTourContextValue>({
  open: false,
  openTour: () => {},
  closeTour: () => {},
})

// Steps are written as actionable how-tos (not just "what is this tab") so
// the tour also teaches the core flows: creating a circle, inviting people,
// adding a movie, and using the randomizer — not just naming each tab.
const BASE_STEPS: TabTourStep[] = [
  {
    targetId: 'tour-nav-library',
    title: '📚 Library',
    body: "Your circle's shared watchlist. Tap the search box at the top to add any movie or show — everyone in your circle sees it instantly.",
  },
  {
    targetId: 'tour-nav-trending',
    title: '🔥 Trending',
    body: "What's popular right now. Tap any poster's + button to add it straight to your library — no searching needed.",
  },
  {
    targetId: 'tour-nav-randomizer',
    title: '🎲 Pick for us!',
    body: 'Can\'t decide? Tap "Pick for us!" and CinePop randomly picks something from your unwatched list, with a trailer link to preview first.',
  },
  {
    targetId: 'tour-nav-review',
    title: '⭐ Rate & Share',
    body: 'After watching something, come here to rate it and react with emoji — then share a cute movie card with your circle.',
  },
  {
    targetId: 'tour-nav-profile-chip',
    title: '✨ Your profile',
    body: 'Edit your profile, grab your share link (cinepop.live/@you), switch circles, or sign out — all from here.',
  },
]

// Shown instead of the circle switcher when the user has no circle yet —
// teaches circle creation since that's the very first thing they need to do.
const NO_CIRCLE_STEP: TabTourStep = {
  targetId: 'tour-nav-library',
  title: '🍿 Create your first circle',
  body: 'Circles are shared movie groups — you and a partner, family, or friends. Head to "My Circles" from your profile chip, tap "Create a new circle," name it, and you\'re ready to add movies together.',
}

// Shown instead when the user already has one — teaches inviting more
// people in, since that's the natural next step once a circle exists.
const HAS_CIRCLE_STEP: TabTourStep = {
  targetId: 'tour-nav-circle-switcher',
  title: '🍿 Circle switcher',
  body: 'Switch between circles here. To bring someone else in, go to "My Circles" and tap "Copy invite link" (or invite by email) — they\'ll join with one click.',
}

export function TabTourProvider({ children }: { children: ReactNode }) {
  const { user, profile, refreshProfile } = useAuth()
  const { activeCircle } = useCircle()
  const [open, setOpen] = useState(false)

  const openTour = useCallback(() => setOpen(true), [])

  const closeTour = useCallback(async () => {
    setOpen(false)
    if (user) {
      await supabase
        .from('profiles')
        .update({ tab_tour_completed: true, updated_at: new Date().toISOString() })
        .eq('id', user.id)
      await refreshProfile()
    }
  }, [user, refreshProfile])

  // Lead with circle guidance (create or invite, depending on whether they
  // have one), then walk the rest of the navbar.
  const leadStep = activeCircle ? HAS_CIRCLE_STEP : NO_CIRCLE_STEP
  const steps: TabTourStep[] = [leadStep, ...BASE_STEPS]

  return (
    <TabTourContext.Provider value={{ open, openTour, closeTour }}>
      {children}
      <TabTour open={open} steps={steps} onClose={closeTour} />
    </TabTourContext.Provider>
  )
}

export function useTabTour() {
  return useContext(TabTourContext)
}
