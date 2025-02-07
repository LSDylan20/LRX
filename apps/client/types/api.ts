import type { Database } from './database'

// Base API Response Types
export interface ApiResponse<T> {
  data: T
  error: null | {
    message: string
    code: string
  }
}

// Load Service Types
export interface LoadService {
  getLoads(): Promise<ApiResponse<Database['public']['Tables']['loads']['Row'][]>>
  createLoad(load: Database['public']['Tables']['loads']['Insert']): Promise<ApiResponse<Database['public']['Tables']['loads']['Row']>>
  updateLoad(id: string, updates: Database['public']['Tables']['loads']['Update']): Promise<ApiResponse<Database['public']['Tables']['loads']['Row']>>
}

// Quote Service Types
export interface QuoteService {
  getQuotes(loadId: string): Promise<ApiResponse<Database['public']['Tables']['quotes']['Row'][]>>
  createQuote(quote: Database['public']['Tables']['quotes']['Insert']): Promise<ApiResponse<Database['public']['Tables']['quotes']['Row']>>
  updateQuote(id: string, updates: Database['public']['Tables']['quotes']['Update']): Promise<ApiResponse<Database['public']['Tables']['quotes']['Row']>>
}

// Shipment Service Types
export interface ShipmentService {
  getShipments(loadId: string): Promise<ApiResponse<Database['public']['Tables']['shipments']['Row'][]>>
  updateLocation(id: string, location: Database['public']['Tables']['shipments']['Row']['current_location']): Promise<ApiResponse<void>>
  updateStatus(id: string, status: Database['public']['Tables']['shipments']['Row']['status']): Promise<ApiResponse<void>>
}

// Carrier Service Types
export interface CarrierService {
  getCarriers(): Promise<ApiResponse<Database['public']['Tables']['carrier_profiles']['Row'][]>>
  getCarrier(id: string): Promise<ApiResponse<Database['public']['Tables']['carrier_profiles']['Row']>>
  updateCarrier(id: string, updates: Database['public']['Tables']['carrier_profiles']['Update']): Promise<ApiResponse<Database['public']['Tables']['carrier_profiles']['Row']>>
}

// Message Service Types
export interface MessageService {
  getMessages(userId: string): Promise<ApiResponse<Database['public']['Tables']['messages']['Row'][]>>
  sendMessage(message: Database['public']['Tables']['messages']['Insert']): Promise<ApiResponse<Database['public']['Tables']['messages']['Row']>>
  markAsRead(id: string): Promise<ApiResponse<void>>
}
