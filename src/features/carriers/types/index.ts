import type { Database } from '@types/database';
import type { CarrierWithRelations } from '@types/models';
import type { PaginationParams, SortOptions, Location } from '@types/common';

export type CarrierProfile = Database['public']['Tables']['carrier_profiles']['Row'];
export type CarrierProfileInsert = Database['public']['Tables']['carrier_profiles']['Insert'];
export type CarrierProfileUpdate = Database['public']['Tables']['carrier_profiles']['Update'];

export type Vehicle = Database['public']['Tables']['carrier_vehicles']['Row'];
export type VehicleInsert = Database['public']['Tables']['carrier_vehicles']['Insert'];
export type VehicleUpdate = Database['public']['Tables']['carrier_vehicles']['Update'];

export interface CarrierFilters {
  equipment_types?: string[];
  service_areas?: string[];
  rating_min?: number;
  insurance_status?: 'active' | 'expired' | 'pending';
  mc_number?: string;
  dot_number?: string;
}

export interface VehicleFilters {
  type?: string[];
  status?: VehicleStatus[];
  location?: {
    coordinates: Location;
    radius: number; // in miles
  };
}

export type VehicleStatus = 'available' | 'in_use' | 'maintenance' | 'inactive';

export type CarrierSortOptions = SortOptions<CarrierProfile>;

export interface CarrierSearchParams extends CarrierFilters, PaginationParams {
  sort?: CarrierSortOptions;
}

export { CarrierWithRelations };
