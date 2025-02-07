import { useEffect } from 'react'
import { supabase } from './client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function useSupabaseSubscription<T>(
  table: string,
  onInsert?: (data: T) => void,
  onUpdate?: (data: T) => void,
  onDelete?: (data: T) => void
): void {
  useEffect(() => {
    let subscription: RealtimeChannel

    const setupSubscription = async () => {
      subscription = supabase
        .channel(`public:${table}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table },
          (payload) => onInsert?.(payload.new as T)
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table },
          (payload) => onUpdate?.(payload.new as T)
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table },
          (payload) => onDelete?.(payload.old as T)
        )
        .subscribe()
    }

    setupSubscription()

    return () => {
      subscription?.unsubscribe()
    }
  }, [table, onInsert, onUpdate, onDelete])
}
