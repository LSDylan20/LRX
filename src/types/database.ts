export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          role: 'shipper' | 'carrier' | 'broker' | 'admin'
          company_name: string
          contact_name: string
          phone: string | null
          created_at: string
        }
        Insert: {
          id?: string
          role: 'shipper' | 'carrier' | 'broker' | 'admin'
          company_name: string
          contact_name: string
          phone?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          role?: 'shipper' | 'carrier' | 'broker' | 'admin'
          company_name?: string
          contact_name?: string
          phone?: string | null
          created_at?: string
        }
      }
      loads: {
        Row: {
          id: string
          shipper_id: string
          origin: string
          destination: string
          pickup_date: string
          delivery_date: string
          equipment_type: string
          weight: number
          dimensions?: Json // length, width, height
          special_instructions?: string
          load_type?: 'FCL' | 'LTL'
          customer_reference?: string
          bill_of_lading_number?: string
          status: 'posted' | 'assigned' | 'in_transit' | 'delivered'
          rate: number | null
          created_at: string
        }
        Insert: {
          id?: string
          shipper_id: string
          origin: string
          destination: string
          pickup_date: string
          delivery_date: string
          equipment_type: string
          weight: number
          dimensions?: Json
          special_instructions?: string
          load_type?: 'FCL' | 'LTL'
          customer_reference?: string
          bill_of_lading_number?: string
          status?: 'posted' | 'assigned' | 'in_transit' | 'delivered'
          rate?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          shipper_id?: string
          origin?: string
          destination?: string
          pickup_date?: string
          delivery_date?: string
          equipment_type?: string
          weight?: number
          dimensions?: Json
          special_instructions?: string
          load_type?: 'FCL' | 'LTL'
          customer_reference?: string
          bill_of_lading_number?: string
          status?: 'posted' | 'assigned' | 'in_transit' | 'delivered'
          rate?: number | null
          created_at?: string
        }
      }
      carrier_profiles: {
        Row: {
          id: string
          user_id: string
          mc_number: string | null
          dot_number: string | null
          insurance_expiry: string | null
          insurance_coverage: number | null
          equipment_types: string[]
          service_areas: string[]
          capacity: number | null
          rating: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          mc_number?: string | null
          dot_number?: string | null
          insurance_expiry?: string | null
          insurance_coverage?: number | null
          equipment_types?: string[]
          service_areas?: string[]
          capacity?: number | null
          rating?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          mc_number?: string | null
          dot_number?: string | null
          insurance_expiry?: string | null
          insurance_coverage?: number | null
          equipment_types?: string[]
          service_areas?: string[]
          capacity?: number | null
          rating?: number | null
          created_at?: string
        }
      }
      quotes: {
        Row: {
          id: string
          load_id: string
          carrier_id: string
          price: number
          delivery_date: string
          terms_and_conditions: string | null
          status: 'pending' | 'accepted' | 'rejected'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          load_id: string
          carrier_id: string
          price: number
          delivery_date: string
          terms_and_conditions?: string | null
          status?: 'pending' | 'accepted' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          load_id?: string
          carrier_id?: string
          price?: number
          delivery_date?: string
          terms_and_conditions?: string | null
          status?: 'pending' | 'accepted' | 'rejected'
          created_at?: string
          updated_at?: string
        }
      }
      shipments: {
        Row: {
          id: string
          load_id: string
          carrier_id: string
          driver_id: string
          current_location: Json | null // { lat: number, lng: number }
          eta: string | null
          status: 'pending' | 'in_transit' | 'delivered' | 'completed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          load_id: string
          carrier_id: string
          driver_id: string
          current_location?: Json | null
          eta?: string | null
          status?: 'pending' | 'in_transit' | 'delivered' | 'completed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          load_id?: string
          carrier_id?: string
          driver_id?: string
          current_location?: Json | null
          eta?: string | null
          status?: 'pending' | 'in_transit' | 'delivered' | 'completed'
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          load_id: string
          carrier_id: string | null
          document_type: string
          file_path: string
          created_at: string
        }
        Insert: {
          id?: string
          load_id: string
          carrier_id?: string | null
          document_type: string
          file_path: string
          created_at?: string
        }
        Update: {
          id?: string
          load_id?: string
          carrier_id?: string | null
          document_type?: string
          file_path?: string
          created_at?: string
        }
      }
      carrier_vehicles: {
        Row: {
          id: string
          carrier_id: string
          vehicle_type: string
          vehicle_id: string
          capacity: number | null
          equipment_type: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          carrier_id: string
          vehicle_type: string
          vehicle_id: string
          capacity?: number | null
          equipment_type: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          carrier_id?: string
          vehicle_type?: string
          vehicle_id?: string
          capacity?: number | null
          equipment_type?: string
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          recipient_id: string
          load_id: string | null
          message_text: string
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          recipient_id: string
          load_id?: string | null
          message_text: string
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          recipient_id?: string
          load_id?: string | null
          message_text?: string
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          message: string
          read_status: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          message: string
          read_status?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          message?: string
          read_status?: boolean
          created_at?: string
        }
      }
    }
  }
}