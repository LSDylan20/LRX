import type { Database } from './database'

// Load Types
export interface LoadWithRelations extends Database['public']['Tables']['loads']['Row'] {
  shipper: Database['public']['Tables']['users']['Row']
  quotes: Database['public']['Tables']['quotes']['Row'][]
  shipment?: Database['public']['Tables']['shipments']['Row']
}

// Quote Types
export interface QuoteWithRelations extends Database['public']['Tables']['quotes']['Row'] {
  load: Database['public']['Tables']['loads']['Row']
  carrier: Database['public']['Tables']['carrier_profiles']['Row']
}

// Shipment Types
export interface ShipmentWithRelations extends Database['public']['Tables']['shipments']['Row'] {
  load: Database['public']['Tables']['loads']['Row']
  carrier: Database['public']['Tables']['carrier_profiles']['Row']
  documents: Database['public']['Tables']['documents']['Row'][]
}

// Carrier Types
export interface CarrierWithRelations extends Database['public']['Tables']['carrier_profiles']['Row'] {
  user: Database['public']['Tables']['users']['Row']
  vehicles: Database['public']['Tables']['carrier_vehicles']['Row'][]
}

// Message Types
export interface MessageWithRelations extends Database['public']['Tables']['messages']['Row'] {
  sender: Database['public']['Tables']['users']['Row']
  recipient: Database['public']['Tables']['users']['Row']
  load?: Database['public']['Tables']['loads']['Row']
}
