import { supabase } from '@lib/supabase/client';
import type { Quote, QuoteInsert, QuoteUpdate, QuoteSearchParams } from '../types';

export async function getQuotes(params?: QuoteSearchParams) {
  let query = supabase
    .from('quotes')
    .select(`
      *,
      load(*),
      carrier:carrier_profiles(*)
    `);

  if (params) {
    const { load_id, carrier_id, status, rate_min, rate_max, page, limit, sort } = params;

    if (load_id) {
      query = query.eq('load_id', load_id);
    }
    if (carrier_id) {
      query = query.eq('carrier_id', carrier_id);
    }
    if (status && status.length > 0) {
      query = query.in('status', status);
    }
    if (rate_min !== undefined) {
      query = query.gte('rate', rate_min);
    }
    if (rate_max !== undefined) {
      query = query.lte('rate', rate_max);
    }
    if (sort) {
      query = query.order(sort.field, { ascending: sort.direction === 'asc' });
    }
    if (page && limit) {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
    }
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return { data, count };
}

export async function getQuoteById(id: string) {
  const { data, error } = await supabase
    .from('quotes')
    .select(`
      *,
      load(*),
      carrier:carrier_profiles(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createQuote(quote: QuoteInsert) {
  const { data, error } = await supabase
    .from('quotes')
    .insert(quote)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateQuote(id: string, updates: QuoteUpdate) {
  const { data, error } = await supabase
    .from('quotes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteQuote(id: string) {
  const { error } = await supabase
    .from('quotes')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export function subscribeToQuote(id: string, callback: (quote: Quote) => void) {
  return supabase
    .channel(`quote:${id}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'quotes',
        filter: `id=eq.${id}`,
      },
      (payload) => {
        callback(payload.new as Quote);
      }
    )
    .subscribe();
}
