import type { Database } from '@types/database';
import type { ShipmentWithRelations } from '@types/models';
import type { PaginationParams, SortOptions, DateRange, Location } from '@types/common';

export type Shipment = Database['public']['Tables']['shipments']['Row'];
export type ShipmentInsert = Database['public']['Tables']['shipments']['Insert'];
export type ShipmentUpdate = Database['public']['Tables']['shipments']['Update'];

export type ShipmentStatus = 
  | 'pending' 
  | 'in_transit' 
  | 'at_pickup' 
  | 'picked_up' 
  | 'at_delivery' 
  | 'delivered' 
  | 'cancelled';

export interface ShipmentFilters {
  load_id?: string;
  carrier_id?: string;
  status?: ShipmentStatus[];
  pickup_dates?: DateRange;
  delivery_dates?: DateRange;
}

export type ShipmentSortOptions = SortOptions<Shipment>;

export interface ShipmentSearchParams extends ShipmentFilters, PaginationParams {
  sort?: ShipmentSortOptions;
}

export { ShipmentWithRelations };
