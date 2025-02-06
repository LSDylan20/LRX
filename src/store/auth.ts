import { create } from 'zustand';

import { supabase } from '../lib/supabase/client';

import type { User } from '../types/supabase';
import type { Database } from '../types/database';

interface AuthState {
  user: User | null
  isLoading: boolean
  error: Error | null
  // Actions
  setUser: (user: User | null) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: Error | null) => void
  // Async Actions
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  checkSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  error: null,

  // Sync Actions
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Async Actions
  signIn: async (email: string, password: string) => {
    const { setLoading, setError, setUser } = get()
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      setUser(data.user)
    } catch (error) {
      setError(error as Error)
    } finally {
      setLoading(false)
    }
  },

  signOut: async () => {
    const { setLoading, setError, setUser } = get()
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
    } catch (error) {
      setError(error as Error)
    } finally {
      setLoading(false)
    }
  },

  checkSession: async () => {
    const { setLoading, setError, setUser } = get()
    try {
      setLoading(true)
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error
      setUser(session?.user ?? null)
    } catch (error) {
      setError(error as Error)
    } finally {
      setLoading(false)
    }
  },
}))
