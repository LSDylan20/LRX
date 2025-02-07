/**
 * Re-export all domain types
 */
export * from './domain/user.types';
export * from './domain/load.types';
export * from './domain/market.types';

/**
 * Common utility types
 */
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type AsyncResult<T> = Promise<Result<T>>;

/**
 * API result type
 */
export interface Result<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * API error
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

/**
 * WebSocket event types
 */
export type WebSocketEvent =
  | 'load.created'
  | 'load.updated'
  | 'load.deleted'
  | 'negotiation.started'
  | 'negotiation.updated'
  | 'negotiation.completed'
  | 'market.updated'
  | 'user.connected'
  | 'user.disconnected';

/**
 * WebSocket message payload
 */
export interface WebSocketPayload<T> {
  event: WebSocketEvent;
  data: T;
  timestamp: string;
  meta?: Record<string, unknown>;
}

/**
 * Repository interface
 */
export interface Repository<T extends { id: string }> {
  findOne(id: string): Promise<T | null>;
  findMany(filter: Partial<T>): Promise<T[]>;
  create(data: Omit<T, 'id'>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

/**
 * Service result
 */
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: Record<string, unknown>;
}
