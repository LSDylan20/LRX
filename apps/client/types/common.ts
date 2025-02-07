// Common types used across features

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface SortOptions<T> {
  field: keyof T;
  direction: 'asc' | 'desc';
}

export interface SearchResult<T> {
  data: T[];
  count: number;
}

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  timestamp: string;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface FileUpload {
  id: string;
  url: string;
  filename: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

export type ErrorCode = 
  | 'not_found'
  | 'unauthorized'
  | 'forbidden'
  | 'validation_error'
  | 'server_error'
  | 'network_error';

export interface ApiError extends Error {
  code: ErrorCode;
  details?: unknown;
}
