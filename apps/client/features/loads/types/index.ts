import type { Database } from '@types/database';
import type { LoadWithRelations } from '@types/models';
import type { PaginationParams, SortOptions, DateRange } from '@types/common';

export type Load = Database['public']['Tables']['loads']['Row'];
export type LoadInsert = Database['public']['Tables']['loads']['Insert'];
export type LoadUpdate = Database['public']['Tables']['loads']['Update'];

export interface LoadFilters {
  origin?: string;
  destination?: string;
  equipment_type?: string;
  weight_min?: number;
  weight_max?: number;
  pickup_dates?: DateRange;
  delivery_dates?: DateRange;
  status?: LoadStatus[];
}

export type LoadStatus = 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled';

export type LoadSortOptions = SortOptions<Load>;

export interface LoadSearchParams extends LoadFilters, PaginationParams {
  sort?: LoadSortOptions;
}

export { LoadWithRelations };
