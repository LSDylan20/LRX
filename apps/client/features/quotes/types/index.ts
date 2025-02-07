import type { Database } from '@types/database';
import type { QuoteWithRelations } from '@types/models';
import type { PaginationParams, SortOptions, DateRange } from '@types/common';

export type Quote = Database['public']['Tables']['quotes']['Row'];
export type QuoteInsert = Database['public']['Tables']['quotes']['Insert'];
export type QuoteUpdate = Database['public']['Tables']['quotes']['Update'];

export type QuoteStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

export interface QuoteFilters {
  load_id?: string;
  carrier_id?: string;
  status?: QuoteStatus[];
  rate_min?: number;
  rate_max?: number;
  created_at?: DateRange;
}

export type QuoteSortOptions = SortOptions<Quote>;

export interface QuoteSearchParams extends QuoteFilters, PaginationParams {
  sort?: QuoteSortOptions;
}

export { QuoteWithRelations };
