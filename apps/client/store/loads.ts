import { create } from 'zustand';

import { supabase } from '../lib/supabase/client';

import type { Database } from '../types/database';
import type { LoadWithRelations } from '../types/models';

type Load = Database['public']['Tables']['loads']['Row']
type LoadInsert = Database['public']['Tables']['loads']['Insert']
type LoadUpdate = Database['public']['Tables']['loads']['Update']

interface LoadsState {
  loads: Load[]
  selectedLoad: LoadWithRelations | null
  isLoading: boolean
  error: Error | null
  // Actions
  setLoads: (loads: Load[]) => void
  addLoad: (load: Load) => void
  updateLoad: (id: string, updates: Partial<Load>) => void
  removeLoad: (id: string) => void
  setSelectedLoad: (load: LoadWithRelations | null) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: Error | null) => void
  // Async Actions
  fetchLoads: () => Promise<void>
  createLoad: (load: LoadInsert) => Promise<void>
  subscribeToLoads: () => () => void
}

export const useLoadsStore = create<LoadsState>((set, get) => ({
  loads: [],
  selectedLoad: null,
  isLoading: false,
  error: null,

  // Sync Actions
  setLoads: (loads) => set({ loads }),
  addLoad: (load) => set((state) => ({ 
    loads: [...state.loads, load] 
  })),
  updateLoad: (id, updates) => set((state) => ({
    loads: state.loads.map(load => 
      load.id === id ? { ...load, ...updates } : load
    )
  })),
  removeLoad: (id) => set((state) => ({
    loads: state.loads.filter(load => load.id !== id)
  })),
  setSelectedLoad: (load) => set({ selectedLoad: load }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Async Actions
  fetchLoads: async () => {
    const { setLoading, setError, setLoads } = get()
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('loads')
        .select('*')
      
      if (error) throw error
      setLoads(data)
    } catch (error) {
      setError(error as Error)
    } finally {
      setLoading(false)
    }
  },

  createLoad: async (load) => {
    const { setLoading, setError, addLoad } = get()
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('loads')
        .insert(load)
        .select()
        .single()
      
      if (error) throw error
      if (data) addLoad(data)
    } catch (error) {
      setError(error as Error)
    } finally {
      setLoading(false)
    }
  },

  subscribeToLoads: () => {
    const subscription = supabase
      .channel('public:loads')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'loads' },
        (payload) => get().addLoad(payload.new as Load)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'loads' },
        (payload) => get().updateLoad(payload.new.id, payload.new as Load)
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'loads' },
        (payload) => get().removeLoad(payload.old.id)
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  },
}))
