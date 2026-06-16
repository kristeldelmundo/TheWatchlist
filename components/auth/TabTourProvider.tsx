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

const BASE_STEPS: TabTourStep[] = [
  { targetId: 'tour-nav-library', title: '📚 Library', body: 'Your shared watchlist lives here — add movies & shows and mark what you\'ve watched.' },
  { targetId: 'tour-nav-trending', title: '🔥 Trending', body: 'See what\'s popular right now and add it straight to your list.' },
  { targetId: 'tour-nav-randomizer', title: '🎲 Pick for us!', body: "Can't decide what to watch? Let CinePop randomly pick from your list." },
  { targetId: 'tour-nav-review', title: '⭐ Rate & Share', body: 'Rate what you watch and react with emoji — see what everyone thought.' },
  { targetId: 'tour-nav-profile-chip', title: '✨ Your profile', body: 'Edit your profile, switch circles, or sign out from here.' },
]

const CIRCLE_STEP: TabTourStep = {
  targetId: 'tour-nav-circle-switcher',
  title: '🍿 Circle switcher',
  body: 'Switch between circles here — each one has its own shared watchlist.',
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

  // Circle switcher only renders (and only gets a step) once the user has
  // an active circle — put it first since it's top-left, near the logo.
  const steps: TabTourStep[] = activeCircle ? [CIRCLE_STEP, ...BASE_STEPS] : BASE_STEPS

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
