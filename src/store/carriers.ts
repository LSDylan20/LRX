import { create } from 'zustand';

import { supabase } from '@lib/supabase/client';

import type { Database } from '@types/database';
import type { CarrierWithRelations } from '@types/models';

/**
 * Custom error class for carrier-related errors
 * Provides structured error information for better error handling
 */
class CarrierError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message)
    this.name = 'CarrierError'
  }
}

interface CarriersState {
  carriers: CarrierProfile[]
  selectedCarrier: CarrierWithRelations | null
  isLoading: boolean
  error: Error | null

  // Sync Actions
  setCarriers: (carriers: CarrierProfile[]) => void
  addCarrier: (carrier: CarrierProfile) => void
  updateCarrier: (id: string, updates: Partial<CarrierProfile>) => void
  removeCarrier: (id: string) => void
  setSelectedCarrier: (carrier: CarrierWithRelations | null) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: Error | null) => void

  // Async Actions
  fetchCarriers: () => Promise<void>
  fetchCarrierById: (id: string) => Promise<void>
  createCarrier: (carrier: CarrierProfileInsert) => Promise<void>
  addVehicle: (carrierId: string, vehicle: Omit<CarrierVehicle, 'id' | 'carrier_id'>) => Promise<void>
  updateVehicle: (vehicleId: string, updates: Partial<CarrierVehicle>) => Promise<void>
  subscribeToCarriers: () => () => void
}

/**
 * Carriers store managing carrier profiles and their vehicles
 * Implements real-time updates and complex relationships
 */
export const useCarriersStore = create<CarriersState>((set, get) => ({
  carriers: [],
  selectedCarrier: null,
  isLoading: false,
  error: null,

  // Sync Actions
  setCarriers: (carriers) => set({ carriers }),
  addCarrier: (carrier) => set((state) => ({ 
    carriers: [...state.carriers, carrier] 
  })),
  updateCarrier: (id, updates) => set((state) => ({
    carriers: state.carriers.map(carrier => 
      carrier.id === id ? { ...carrier, ...updates } : carrier
    )
  })),
  removeCarrier: (id) => set((state) => ({
    carriers: state.carriers.filter(carrier => carrier.id !== id)
  })),
  setSelectedCarrier: (carrier) => set({ selectedCarrier: carrier }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Async Actions
  fetchCarriers: async () => {
    const { setLoading, setError, setCarriers } = get()
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('carrier_profiles')
        .select(`
          *,
          user:users(*),
          vehicles:carrier_vehicles(*)
        `)
      
      if (error) {
        throw new CarrierError(
          'Failed to fetch carriers',
          'FETCH_ERROR',
          error
        )
      }
      
      setCarriers(data)
    } catch (error) {
      setError(error as Error)
      console.error('Error fetching carriers:', error)
    } finally {
      setLoading(false)
    }
  },

  fetchCarrierById: async (id: string) => {
    const { setLoading, setError, setSelectedCarrier } = get()
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('carrier_profiles')
        .select(`
          *,
          user:users(*),
          vehicles:carrier_vehicles(*)
        `)
        .eq('id', id)
        .single()
      
      if (error) {
        throw new CarrierError(
          'Failed to fetch carrier',
          'FETCH_ONE_ERROR',
          error
        )
      }
      
      setSelectedCarrier(data)
    } catch (error) {
      setError(error as Error)
      console.error('Error fetching carrier:', error)
    } finally {
      setLoading(false)
    }
  },

  createCarrier: async (carrier) => {
    const { setLoading, setError, addCarrier } = get()
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('carrier_profiles')
        .insert(carrier)
        .select()
        .single()
      
      if (error) {
        throw new CarrierError(
          'Failed to create carrier',
          'CREATE_ERROR',
          error
        )
      }
      
      if (data) addCarrier(data)
    } catch (error) {
      setError(error as Error)
      console.error('Error creating carrier:', error)
    } finally {
      setLoading(false)
    }
  },

  addVehicle: async (carrierId, vehicle) => {
    const { setLoading, setError, fetchCarrierById } = get()
    try {
      setLoading(true)
      const { error } = await supabase
        .from('carrier_vehicles')
        .insert({
          ...vehicle,
          carrier_id: carrierId,
        })
      
      if (error) {
        throw new CarrierError(
          'Failed to add vehicle',
          'ADD_VEHICLE_ERROR',
          error
        )
      }
      
      // Refresh carrier data to include new vehicle
      await fetchCarrierById(carrierId)
    } catch (error) {
      setError(error as Error)
      console.error('Error adding vehicle:', error)
    } finally {
      setLoading(false)
    }
  },

  updateVehicle: async (vehicleId, updates) => {
    const { setLoading, setError, selectedCarrier, fetchCarrierById } = get()
    try {
      setLoading(true)
      const { error } = await supabase
        .from('carrier_vehicles')
        .update(updates)
        .eq('id', vehicleId)
      
      if (error) {
        throw new CarrierError(
          'Failed to update vehicle',
          'UPDATE_VEHICLE_ERROR',
          error
        )
      }
      
      // Refresh carrier data to include updated vehicle
      if (selectedCarrier) {
        await fetchCarrierById(selectedCarrier.id)
      }
    } catch (error) {
      setError(error as Error)
      console.error('Error updating vehicle:', error)
    } finally {
      setLoading(false)
    }
  },

  subscribeToCarriers: () => {
    // Set up real-time subscription for carrier profile updates
    const subscription = supabase
      .channel('public:carrier_profiles')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'carrier_profiles' },
        (payload) => get().addCarrier(payload.new as CarrierProfile)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'carrier_profiles' },
        (payload) => get().updateCarrier(payload.new.id, payload.new as CarrierProfile)
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'carrier_profiles' },
        (payload) => get().removeCarrier(payload.old.id)
      )
      .subscribe()

    // Return cleanup function
    return () => {
      subscription.unsubscribe()
    }
  },
}))
