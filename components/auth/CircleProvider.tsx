'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'

export interface Circle {
  id: string
  name: string
  emoji: string
  owner_id: string
  invite_code: string
  created_at: string
}

interface CircleContextValue {
  circles: Circle[]
  activeCircle: Circle | null
  setActiveCircle: (c: Circle) => void
  loading: boolean
  refreshCircles: () => Promise<Circle[]>
}

const CircleContext = createContext<CircleContextValue>({
  circles: [],
  activeCircle: null,
  setActiveCircle: () => {},
  loading: true,
  refreshCircles: async () => [],
})

const ACTIVE_KEY = 'cinepop_active_circle'

export function CircleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [circles, setCircles] = useState<Circle[]>([])
  const [activeCircle, setActiveCircleState] = useState<Circle | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshCircles = useCallback(async (): Promise<Circle[]> => {
    if (!user) {
      setCircles([])
      setActiveCircleState(null)
      setLoading(false)
      return []
    }

    // Get circle IDs the user is a member of
    const { data: memberships } = await supabase
      .from('circle_members')
      .select('circle_id')
      .eq('user_id', user.id)

    const ids = (memberships || []).map((m) => m.circle_id)
    if (ids.length === 0) {
      setCircles([])
      setActiveCircleState(null)
      setLoading(false)
      return []
    }

    const { data: circleRows } = await supabase
      .from('circles')
      .select('*')
      .in('id', ids)
      .order('created_at', { ascending: true })

    const list = (circleRows || []) as Circle[]
    setCircles(list)

    // Restore previously active circle, or default to first
    let saved: string | null = null
    try {
      saved = window.localStorage.getItem(ACTIVE_KEY)
    } catch {
      saved = null
    }
    const found = list.find((c) => c.id === saved) || list[0] || null
    setActiveCircleState(found)
    setLoading(false)
    return list
  }, [user])

  useEffect(() => {
    setLoading(true)
    refreshCircles()
  }, [refreshCircles])

  function setActiveCircle(c: Circle) {
    setActiveCircleState(c)
    try {
      window.localStorage.setItem(ACTIVE_KEY, c.id)
    } catch {
      // ignore storage errors
    }
  }

  return (
    <CircleContext.Provider
      value={{ circles, activeCircle, setActiveCircle, loading, refreshCircles }}
    >
      {children}
    </CircleContext.Provider>
  )
}

export function useCircle() {
  return useContext(CircleContext)
}
