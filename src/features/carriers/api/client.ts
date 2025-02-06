import { supabase } from '@lib/supabase/client';
import type { 
  CarrierProfile, 
  CarrierProfileInsert, 
  CarrierProfileUpdate,
  CarrierSearchParams,
  Vehicle,
  VehicleInsert,
  VehicleUpdate
} from '../types';

export async function getCarriers(params?: CarrierSearchParams) {
  let query = supabase
    .from('carrier_profiles')
    .select(`
      *,
      user:users(*),
      vehicles:carrier_vehicles(*)
    `);

  if (params) {
    const { equipment_types, service_areas, rating_min, mc_number, dot_number, page, limit, sort } = params;

    if (equipment_types && equipment_types.length > 0) {
      query = query.contains('equipment_types', equipment_types);
    }
    if (service_areas && service_areas.length > 0) {
      query = query.contains('service_areas', service_areas);
    }
    if (rating_min !== undefined) {
      query = query.gte('rating', rating_min);
    }
    if (mc_number) {
      query = query.eq('mc_number', mc_number);
    }
    if (dot_number) {
      query = query.eq('dot_number', dot_number);
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

export async function getCarrierById(id: string) {
  const { data, error } = await supabase
    .from('carrier_profiles')
    .select(`
      *,
      user:users(*),
      vehicles:carrier_vehicles(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createCarrier(carrier: CarrierProfileInsert) {
  const { data, error } = await supabase
    .from('carrier_profiles')
    .insert(carrier)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCarrier(id: string, updates: CarrierProfileUpdate) {
  const { data, error } = await supabase
    .from('carrier_profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCarrier(id: string) {
  const { error } = await supabase
    .from('carrier_profiles')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Vehicle Operations
export async function getVehicles(carrierId: string) {
  const { data, error } = await supabase
    .from('carrier_vehicles')
    .select('*')
    .eq('carrier_id', carrierId);

  if (error) throw error;
  return data;
}

export async function addVehicle(vehicle: VehicleInsert) {
  const { data, error } = await supabase
    .from('carrier_vehicles')
    .insert(vehicle)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateVehicle(id: string, updates: VehicleUpdate) {
  const { data, error } = await supabase
    .from('carrier_vehicles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteVehicle(id: string) {
  const { error } = await supabase
    .from('carrier_vehicles')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export function subscribeToCarrier(id: string, callback: (carrier: CarrierProfile) => void) {
  return supabase
    .channel(`carrier:${id}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'carrier_profiles',
        filter: `id=eq.${id}`,
      },
      (payload) => {
        callback(payload.new as CarrierProfile);
      }
    )
    .subscribe();
}
