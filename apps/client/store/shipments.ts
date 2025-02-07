import { create } from 'zustand'
import { supabase } from '@lib/supabase/client'
import type { Database } from '@types/database'
import type { ShipmentWithRelations } from '@types/models'

type Shipment = Database['public']['Tables']['shipments']['Row']
type ShipmentInsert = Database['public']['Tables']['shipments']['Insert']
type ShipmentUpdate = Database['public']['Tables']['shipments']['Update']

/**
 * Custom error class for shipment-related errors
 * Helps maintain consistent error handling across the application
 */
class ShipmentError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ShipmentError'
  }
}

interface ShipmentsState {
  shipments: Shipment[]
  selectedShipment: ShipmentWithRelations | null
  isLoading: boolean
  error: Error | null

  // Sync Actions
  setShipments: (shipments: Shipment[]) => void
  addShipment: (shipment: Shipment) => void
  updateShipment: (id: string, updates: Partial<Shipment>) => void
  removeShipment: (id: string) => void
  setSelectedShipment: (shipment: ShipmentWithRelations | null) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: Error | null) => void

  // Async Actions
  fetchShipments: (loadId?: string) => Promise<void>
  createShipment: (shipment: ShipmentInsert) => Promise<void>
  updateLocation: (id: string, location: NonNullable<Shipment['current_location']>) => Promise<void>
  updateStatus: (id: string, status: Shipment['status']) => Promise<void>
  subscribeToShipments: () => () => void
}

/**
 * Shipments store managing shipment state and operations
 * Implements real-time updates via Supabase subscriptions
 */
export const useShipmentsStore = create<ShipmentsState>((set, get) => ({
  shipments: [],
  selectedShipment: null,
  isLoading: false,
  error: null,

  // Sync Actions
  setShipments: (shipments) => set({ shipments }),
  addShipment: (shipment) => set((state) => ({ 
    shipments: [...state.shipments, shipment] 
  })),
  updateShipment: (id, updates) => set((state) => ({
    shipments: state.shipments.map(shipment => 
      shipment.id === id ? { ...shipment, ...updates } : shipment
    )
  })),
  removeShipment: (id) => set((state) => ({
    shipments: state.shipments.filter(shipment => shipment.id !== id)
  })),
  setSelectedShipment: (shipment) => set({ selectedShipment: shipment }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Async Actions
  fetchShipments: async (loadId?: string) => {
    const { setLoading, setError, setShipments } = get()
    try {
      setLoading(true)
      let query = supabase
        .from('shipments')
        .select(`
          *,
          load:loads(*),
          carrier:carrier_profiles(*),
          documents:documents(*)
        `)
      
      if (loadId) {
        query = query.eq('load_id', loadId)
      }
      
      const { data, error } = await query
      
      if (error) {
        throw new ShipmentError(
          'Failed to fetch shipments',
          'FETCH_ERROR',
          error
        )
      }
      
      setShipments(data)
    } catch (error) {
      setError(error as Error)
      console.error('Error fetching shipments:', error)
    } finally {
      setLoading(false)
    }
  },

  createShipment: async (shipment) => {
    const { setLoading, setError, addShipment } = get()
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('shipments')
        .insert(shipment)
        .select()
        .single()
      
      if (error) {
        throw new ShipmentError(
          'Failed to create shipment',
          'CREATE_ERROR',
          error
        )
      }
      
      if (data) addShipment(data)
    } catch (error) {
      setError(error as Error)
      console.error('Error creating shipment:', error)
    } finally {
      setLoading(false)
    }
  },

  updateLocation: async (id, location) => {
    const { setLoading, setError, updateShipment } = get()
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('shipments')
        .update({ current_location: location })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new ShipmentError(
          'Failed to update shipment location',
          'UPDATE_LOCATION_ERROR',
          error
        )
      }
      
      if (data) updateShipment(id, data)
    } catch (error) {
      setError(error as Error)
      console.error('Error updating shipment location:', error)
    } finally {
      setLoading(false)
    }
  },

  updateStatus: async (id, status) => {
    const { setLoading, setError, updateShipment } = get()
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('shipments')
        .update({ status })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new ShipmentError(
          'Failed to update shipment status',
          'UPDATE_STATUS_ERROR',
          error
        )
      }
      
      if (data) updateShipment(id, data)
    } catch (error) {
      setError(error as Error)
      console.error('Error updating shipment status:', error)
    } finally {
      setLoading(false)
    }
  },

  subscribeToShipments: () => {
    // Set up real-time subscription for shipment updates
    const subscription = supabase
      .channel('public:shipments')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'shipments' },
        (payload) => get().addShipment(payload.new as Shipment)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'shipments' },
        (payload) => get().updateShipment(payload.new.id, payload.new as Shipment)
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'shipments' },
        (payload) => get().removeShipment(payload.old.id)
      )
      .subscribe()

    // Return cleanup function
    return () => {
      subscription.unsubscribe()
    }
  },
}))
