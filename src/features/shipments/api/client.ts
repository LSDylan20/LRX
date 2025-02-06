import { supabase } from '@lib/supabase/client';
import type { 
  Shipment, 
  ShipmentInsert, 
  ShipmentUpdate, 
  ShipmentSearchParams,
  Location 
} from '../types';

export async function getShipments(params?: ShipmentSearchParams) {
  let query = supabase
    .from('shipments')
    .select(`
      *,
      load(*),
      carrier:carrier_profiles(*),
      documents(*)
    `);

  if (params) {
    const { load_id, carrier_id, status, page, limit, sort } = params;

    if (load_id) {
      query = query.eq('load_id', load_id);
    }
    if (carrier_id) {
      query = query.eq('carrier_id', carrier_id);
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

export async function getShipmentById(id: string) {
  const { data, error } = await supabase
    .from('shipments')
    .select(`
      *,
      load(*),
      carrier:carrier_profiles(*),
      documents(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createShipment(shipment: ShipmentInsert) {
  const { data, error } = await supabase
    .from('shipments')
    .insert(shipment)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateShipment(id: string, updates: ShipmentUpdate) {
  const { data, error } = await supabase
    .from('shipments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateShipmentLocation(id: string, location: Location) {
  const { data, error } = await supabase
    .from('shipments')
    .update({
      current_location: location,
      last_updated: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateShipmentStatus(id: string, status: Shipment['status']) {
  const { data, error } = await supabase
    .from('shipments')
    .update({
      status,
      last_updated: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteShipment(id: string) {
  const { error } = await supabase
    .from('shipments')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export function subscribeToShipment(id: string, callback: (shipment: Shipment) => void) {
  return supabase
    .channel(`shipment:${id}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'shipments',
        filter: `id=eq.${id}`,
      },
      (payload) => {
        callback(payload.new as Shipment);
      }
    )
    .subscribe();
}
