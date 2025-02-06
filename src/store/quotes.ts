import { create } from 'zustand';

import { supabase } from '../lib/supabase/client';

import type { Database } from '../types/database';
import type { QuoteWithRelations } from '../types/models';

type Quote = Database['public']['Tables']['quotes']['Row']
type QuoteInsert = Database['public']['Tables']['quotes']['Insert']
type QuoteUpdate = Database['public']['Tables']['quotes']['Update']

interface QuotesState {
  quotes: Quote[]
  selectedQuote: QuoteWithRelations | null
  isLoading: boolean
  error: Error | null
  // Actions
  setQuotes: (quotes: Quote[]) => void
  addQuote: (quote: Quote) => void
  updateQuote: (id: string, updates: Partial<Quote>) => void
  removeQuote: (id: string) => void
  setSelectedQuote: (quote: QuoteWithRelations | null) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: Error | null) => void
  // Async Actions
  fetchQuotes: (loadId?: string) => Promise<void>
  createQuote: (quote: QuoteInsert) => Promise<void>
  subscribeToQuotes: () => () => void
}

export const useQuotesStore = create<QuotesState>((set, get) => ({
  quotes: [],
  selectedQuote: null,
  isLoading: false,
  error: null,

  // Sync Actions
  setQuotes: (quotes) => set({ quotes }),
  addQuote: (quote) => set((state) => ({ 
    quotes: [...state.quotes, quote] 
  })),
  updateQuote: (id, updates) => set((state) => ({
    quotes: state.quotes.map(quote => 
      quote.id === id ? { ...quote, ...updates } : quote
    )
  })),
  removeQuote: (id) => set((state) => ({
    quotes: state.quotes.filter(quote => quote.id !== id)
  })),
  setSelectedQuote: (quote) => set({ selectedQuote: quote }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Async Actions
  fetchQuotes: async (loadId?: string) => {
    const { setLoading, setError, setQuotes } = get()
    try {
      setLoading(true)
      let query = supabase.from('quotes').select('*')
      if (loadId) {
        query = query.eq('load_id', loadId)
      }
      const { data, error } = await query
      
      if (error) throw error
      setQuotes(data)
    } catch (error) {
      setError(error as Error)
    } finally {
      setLoading(false)
    }
  },

  createQuote: async (quote) => {
    const { setLoading, setError, addQuote } = get()
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('quotes')
        .insert(quote)
        .select()
        .single()
      
      if (error) throw error
      if (data) addQuote(data)
    } catch (error) {
      setError(error as Error)
    } finally {
      setLoading(false)
    }
  },

  subscribeToQuotes: () => {
    const subscription = supabase
      .channel('public:quotes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'quotes' },
        (payload) => get().addQuote(payload.new as Quote)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'quotes' },
        (payload) => get().updateQuote(payload.new.id, payload.new as Quote)
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'quotes' },
        (payload) => get().removeQuote(payload.old.id)
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  },
}))
