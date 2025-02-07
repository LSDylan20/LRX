import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import type { Database } from '../database.types';

type Load = Database['public']['Tables']['loads']['Row'];
type Shipment = Database['public']['Tables']['shipments']['Row'];

interface LoadTrackingState {
  load: Load | null;
  shipment: Shipment | null;
  currentLocation: string | null;
  eta: string | null;
  status: 'loading' | 'error' | 'success';
  error: string | null;
}

interface LoadUpdate {
  location?: string;
  eta?: string;
  status?: Load['status'];
}

/**
 * Custom hook for real-time load tracking and updates
 * @param loadId - The ID of the load to track
 * @returns LoadTrackingState and update functions
 */
export function useLoadTracking(loadId: string) {
  const [state, setState] = useState<LoadTrackingState>({
    load: null,
    shipment: null,
    currentLocation: null,
    eta: null,
    status: 'loading',
    error: null,
  });

  useEffect(() => {
    // Initial data fetch
    fetchLoadData();

    // Set up real-time subscription
    const subscription = supabase
      .channel(`load-${loadId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'shipments',
        filter: `load_id=eq.${loadId}`,
      }, (payload) => {
        handleShipmentUpdate(payload.new as Shipment);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [loadId]);

  const fetchLoadData = async () => {
    try {
      // Fetch load and shipment data
      const [loadResult, shipmentResult] = await Promise.all([
        supabase
          .from('loads')
          .select('*')
          .eq('id', loadId)
          .single(),
        supabase
          .from('shipments')
          .select('*')
          .eq('load_id', loadId)
          .single(),
      ]);

      if (loadResult.error) throw loadResult.error;
      if (shipmentResult.error && shipmentResult.error.code !== 'PGRST116') {
        throw shipmentResult.error;
      }

      setState(prev => ({
        ...prev,
        load: loadResult.data,
        shipment: shipmentResult.data,
        currentLocation: shipmentResult.data?.current_location || null,
        eta: shipmentResult.data?.eta || null,
        status: 'success',
      }));
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: err.message,
      }));
    }
  };

  const handleShipmentUpdate = (shipment: Shipment) => {
    setState(prev => ({
      ...prev,
      shipment,
      currentLocation: shipment.current_location,
      eta: shipment.eta,
    }));
  };

  const updateLoadStatus = async (status: Load['status']) => {
    try {
      const { error } = await supabase
        .from('loads')
        .update({ status })
        .eq('id', loadId);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        load: prev.load ? { ...prev.load, status } : null,
      }));
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: err.message,
      }));
    }
  };

  const updateShipment = async (updates: LoadUpdate) => {
    if (!state.shipment) return;

    try {
      const { error } = await supabase
        .from('shipments')
        .update({
          current_location: updates.location || state.shipment.current_location,
          eta: updates.eta || state.shipment.eta,
          status: updates.status || state.shipment.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', state.shipment.id);

      if (error) throw error;
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: err.message,
      }));
    }
  };

  return {
    ...state,
    updateLoadStatus,
    updateShipment,
    refresh: fetchLoadData,
  };
}
