import { supabase } from '@lib/supabase/client';
import type { Load, LoadInsert, LoadUpdate, LoadSearchParams } from '../types';

export async function getLoads(params?: LoadSearchParams) {
  let query = supabase
    .from('loads')
    .select(`
      *,
      shipper:users(*),
      quotes(*),
      shipment(*)
    `);

  if (params) {
    const { origin, destination, equipment_type, status, page, limit, sort } = params;

    if (origin) {
      query = query.ilike('origin', `%${origin}%`);
    }
    if (destination) {
      query = query.ilike('destination', `%${destination}%`);
    }
    if (equipment_type) {
      query = query.eq('equipment_type', equipment_type);
    }
    if (status && status.length > 0) {
      query = query.in('status', status);
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

export async function getLoadById(id: string) {
  const { data, error } = await supabase
    .from('loads')
    .select(`
      *,
      shipper:users(*),
      quotes(*),
      shipment(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createLoad(load: LoadInsert) {
  const { data, error } = await supabase
    .from('loads')
    .insert(load)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateLoad(id: string, updates: LoadUpdate) {
  const { data, error } = await supabase
    .from('loads')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteLoad(id: string) {
  const { error } = await supabase
    .from('loads')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export function subscribeToLoad(id: string, callback: (load: Load) => void) {
  return supabase
    .channel(`load:${id}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'loads',
        filter: `id=eq.${id}`,
      },
      (payload) => {
        callback(payload.new as Load);
      }
    )
    .subscribe();
}
