export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      loads: {
        Row: {
          id: string;
          user_id: string;
          origin: string;
          destination: string;
          equipment_type: string;
          weight: number;
          dimensions: Json;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Tables['loads']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Tables['loads']['Insert']>;
      };
      negotiations: {
        Row: {
          id: string;
          load_id: string;
          carrier_id: string;
          shipper_id: string;
          status: string;
          current_offer: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Tables['negotiations']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Tables['negotiations']['Insert']>;
      };
      market_data: {
        Row: {
          id: string;
          origin_region: string;
          destination_region: string;
          equipment_type: string;
          rate: number;
          volume: number;
          timestamp: string;
        };
        Insert: Omit<Tables['market_data']['Row'], 'id'>;
        Update: Partial<Tables['market_data']['Insert']>;
      };
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          company_id: string;
          role: string;
          preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Tables['user_profiles']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Tables['user_profiles']['Insert']>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: 'admin' | 'shipper' | 'carrier' | 'broker';
      load_status: 'draft' | 'posted' | 'matching' | 'negotiating' | 'booked' | 'in_transit' | 'delivered' | 'completed';
      negotiation_status: 'pending' | 'active' | 'accepted' | 'rejected' | 'expired';
    };
  };
}
