# LaneRunner Types Architecture

## 1. Types Structure

```typescript
packages/
  shared/
    src/
      types/
        // Core domain types
        domain/
          user.types.ts      // User, Profile, Role types
          load.types.ts      // Load, Equipment types
          company.types.ts   // Company, Insurance types
          market.types.ts    // Market data, Rate types
          ai.types.ts        // AI models, Results types
          
        // API types
        api/
          requests/          // Request DTOs
          responses/         // Response DTOs
          errors.ts         // Error types
          
        // Database types
        database/
          schema.types.ts   // Supabase schema types
          models.types.ts   // ORM model types
          
        // Real-time types
        realtime/
          events.types.ts   // WebSocket event types
          payloads.types.ts // Message payload types
          
        // Integration types
        integrations/
          maps.types.ts     // Google Maps types
          twilio.types.ts   // Twilio types
          stripe.types.ts   // Stripe types
          
        // Utility types
        utils/
          common.types.ts   // Shared utility types
          guards.types.ts   // Type guards
          
        // State management types
        store/
          actions.types.ts  // Store action types
          state.types.ts    // Store state types
          
        // Export barrel files
        index.ts           // Public API exports
```

## 2. Core Type Definitions

### 2.1 Domain Types

```typescript
// types/domain/user.types.ts
export type UserRole = 'admin' | 'shipper' | 'carrier' | 'broker' | 'driver';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  profile?: UserProfile;
  company?: Company;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  preferences: UserPreferences;
  notifications: NotificationSettings;
}

// types/domain/load.types.ts
export type LoadStatus = 
  | 'draft'
  | 'posted'
  | 'matching'
  | 'negotiating'
  | 'booked'
  | 'in_transit'
  | 'delivered'
  | 'completed';

export interface Load {
  id: string;
  user_id: string;
  company_id: string;
  origin: Location;
  destination: Location;
  equipment_type: string;
  status: LoadStatus;
  pickup_date: string;
  delivery_date: string;
  weight: number;
  dimensions: Dimensions;
  special_requirements?: SpecialRequirements;
  rate: Rate;
  documents: Document[];
  tracking: TrackingInfo;
  created_at: string;
  updated_at: string;
}

export interface Location {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

// types/domain/market.types.ts
export interface MarketRate {
  origin_region: string;
  destination_region: string;
  equipment_type: string;
  rate: number;
  confidence: number;
  last_updated: string;
  historical_trend: RateTrend[];
  seasonal_factors: SeasonalFactor[];
  market_conditions: MarketConditions;
}

export interface Rate {
  base_rate: number;
  fuel_surcharge: number;
  accessorials: Accessorial[];
  total_rate: number;
  currency: string;
  rate_basis: 'per_mile' | 'flat' | 'hourly';
}
```

### 2.2 API Types

```typescript
// types/api/requests/load.requests.ts
export interface CreateLoadRequest {
  origin: Location;
  destination: Location;
  equipment_type: string;
  weight?: number;
  dimensions?: Dimensions;
  special_requirements?: SpecialRequirements;
  rate_preferences?: RatePreferences;
  matching_criteria?: MatchingCriteria;
}

export interface UpdateLoadRequest {
  status?: LoadStatus;
  rate?: Partial<Rate>;
  documents?: Document[];
  tracking?: Partial<TrackingInfo>;
}

// types/api/responses/load.responses.ts
export interface LoadResponse {
  data: Load;
  matches?: CarrierMatch[];
  market_data?: MarketRate;
  suggested_rates?: SuggestedRate[];
  next_actions?: Action[];
}

// types/api/errors.ts
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  request_id: string;
  http_status: number;
}

export interface ValidationError extends ApiError {
  field_errors: Record<string, string[]>;
}
```

### 2.3 Real-time Types

```typescript
// types/realtime/events.types.ts
export type WebSocketEvent =
  | 'load.created'
  | 'load.updated'
  | 'negotiation.started'
  | 'negotiation.updated'
  | 'market.updated'
  | 'tracking.updated'
  | 'message.received'
  | 'notification.created';

export interface WebSocketMessage<T> {
  type: WebSocketEvent;
  payload: T;
  metadata: MessageMetadata;
}

// types/realtime/payloads.types.ts
export interface WebSocketPayload<T> {
  event: WebSocketEvent;
  data: T;
  timestamp: string;
  sequence_number: number;
  client_id: string;
}

export interface MessageMetadata {
  user_id: string;
  session_id: string;
  timestamp: string;
  version: string;
}
```

## 3. Type Utilities

```typescript
// types/utils/common.types.ts
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type AsyncResult<T> = Promise<Result<T>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export interface Result<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: ResultMetadata;
}

export interface ResultMetadata {
  duration: number;
  cache_hit: boolean;
  rate_limit: RateLimitInfo;
}

// types/utils/guards.types.ts
export function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'email' in value &&
    'role' in value
  );
}

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'http_status' in error
  );
}
```

## 4. Implementation Guidelines

### 4.1 Type Safety Rules
1. Enable strict TypeScript checks:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "useUnknownInCatchVariables": true,
    "alwaysStrict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### 4.2 Type Import Strategy
```typescript
// Prefer type imports for better tree-shaking
import type { User, UserRole } from '@/types/domain/user.types';
import type { Load, LoadStatus } from '@/types/domain/load.types';
import type { ApiError } from '@/types/api/errors';

// Use namespace imports for utility types
import * as Utils from '@/types/utils';
```

### 4.3 Generic Type Patterns

```typescript
// Repository pattern
export interface Repository<T extends { id: string }> {
  findOne(id: string): Promise<T | null>;
  findMany(filter: Partial<T>): Promise<T[]>;
  create(data: Omit<T, 'id'>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}

// Service pattern
export interface Service<T, C = unknown, U = Partial<T>> {
  get(id: string): Promise<Result<T>>;
  list(filter?: Partial<T>): Promise<Result<T[]>>;
  create(data: C): Promise<Result<T>>;
  update(id: string, data: U): Promise<Result<T>>;
  remove(id: string): Promise<Result<boolean>>;
}

// Event handler pattern
export type EventHandler<T> = (event: T) => Promise<void> | void;
export type EventUnsubscribe = () => void;

export interface EventEmitter<T> {
  emit(event: T): void;
  on(handler: EventHandler<T>): EventUnsubscribe;
  once(handler: EventHandler<T>): EventUnsubscribe;
}
```

## 5. State Management Types

```typescript
// types/store/state.types.ts
export interface RootState {
  user: UserState;
  loads: LoadState;
  market: MarketState;
  ui: UIState;
}

export interface UserState {
  current: User | null;
  preferences: UserPreferences;
  permissions: UserPermissions;
  session: SessionInfo;
}

export interface LoadState {
  items: Record<string, Load>;
  filters: LoadFilters;
  sorting: SortConfig;
  pagination: PaginationState;
  selected: string | null;
}

// types/store/actions.types.ts
export type ActionType = 
  | 'user/login'
  | 'user/logout'
  | 'load/create'
  | 'load/update'
  | 'market/refresh';

export interface Action<T = unknown> {
  type: ActionType;
  payload?: T;
  meta?: ActionMetadata;
}

export interface ActionMetadata {
  timestamp: number;
  source: 'user' | 'system' | 'api';
  sync: boolean;
}
```

## 6. Integration Types

```typescript
// types/integrations/maps.types.ts
export interface MapConfig {
  apiKey: string;
  options: GoogleMapOptions;
  styles: MapStyles[];
}

export interface RouteOptions {
  optimize: boolean;
  avoidTolls: boolean;
  avoidHighways: boolean;
  departureTime?: Date;
}

// types/integrations/twilio.types.ts
export interface CallConfig {
  to: string;
  from: string;
  recordingEnabled: boolean;
  transcriptionEnabled: boolean;
  callbackUrl: string;
}

export interface MessageConfig {
  to: string;
  from: string;
  body: string;
  mediaUrls?: string[];
}
```

## 7. Best Practices

### 7.1 Type Naming Conventions
- Use PascalCase for interface and type names
- Use camelCase for properties and methods
- Add 'Type' suffix for complex type aliases
- Add 'Props' suffix for component props
- Add 'State' suffix for state interfaces

### 7.2 Type Organization
- Group related types in the same file
- Use barrel exports for public APIs
- Keep type definitions close to their usage
- Separate internal and external types

### 7.3 Type Documentation
- Document complex types with JSDoc comments
- Include examples for non-obvious usage
- Document type parameters in generics
- Explain type constraints and bounds

### 7.4 Type Testing
- Write type tests using dtslint
- Test edge cases and constraints
- Verify type inference behavior
- Test generic type parameters

## 8. Migration Guidelines

### 8.1 Gradual Migration
1. Start with core domain types
2. Add types to new features first
3. Gradually type existing code
4. Use `any` temporarily if needed

### 8.2 Breaking Changes
1. Document all breaking changes
2. Provide migration guides
3. Use codemods when possible
4. Version types separately

### 8.3 Compatibility
1. Maintain backwards compatibility
2. Support legacy type formats
3. Provide type utilities
4. Document upgrade paths
