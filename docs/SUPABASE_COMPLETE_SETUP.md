# Complete Supabase Setup & Integration Guide

## 1. Initial Setup

### 1.1 Project Creation
1. Create new Supabase project
2. Save credentials:
   ```env
   SUPABASE_URL=your_project_url
   SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

### 1.2 Database Schema

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create custom types
create type user_role as enum ('admin', 'shipper', 'carrier', 'broker', 'driver');
create type load_status as enum (
  'draft',
  'posted',
  'matching',
  'negotiating',
  'booked',
  'in_transit',
  'delivered',
  'completed'
);
create type negotiation_status as enum (
  'pending',
  'active',
  'accepted',
  'rejected',
  'expired'
);

-- Create tables
create table public.users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  role user_role not null default 'shipper',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.user_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  company_id uuid,
  preferences jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null,
  mc_number text unique,
  dot_number text unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.loads (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  company_id uuid references public.companies(id),
  origin jsonb not null,
  destination jsonb not null,
  equipment_type text not null,
  weight numeric,
  dimensions jsonb,
  status load_status default 'draft',
  rate_details jsonb,
  pickup_date timestamp with time zone,
  delivery_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.negotiations (
  id uuid primary key default uuid_generate_v4(),
  load_id uuid references public.loads(id) on delete cascade,
  carrier_id uuid references public.users(id),
  shipper_id uuid references public.users(id),
  status negotiation_status default 'pending',
  current_offer numeric not null,
  offer_history jsonb default '[]'::jsonb,
  ai_suggestions jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.market_data (
  id uuid primary key default uuid_generate_v4(),
  origin_region text not null,
  destination_region text not null,
  equipment_type text not null,
  rate numeric not null,
  volume integer not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.ai_results (
  id uuid primary key default uuid_generate_v4(),
  input jsonb not null,
  result jsonb not null,
  model text not null,
  processed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes
create index loads_user_id_idx on public.loads(user_id);
create index loads_status_idx on public.loads(status);
create index negotiations_load_id_idx on public.negotiations(load_id);
create index market_data_regions_idx on public.market_data(origin_region, destination_region);

-- Enable Row Level Security
alter table public.users enable row level security;
alter table public.user_profiles enable row level security;
alter table public.companies enable row level security;
alter table public.loads enable row level security;
alter table public.negotiations enable row level security;
alter table public.market_data enable row level security;
alter table public.ai_results enable row level security;

-- RLS Policies
-- Users
create policy "Users can view their own data"
  on public.users
  for select
  using (auth.uid() = id);

-- Loads
create policy "Shippers can create loads"
  on public.loads
  for insert
  with check (auth.uid() = user_id);

create policy "Users can view available loads"
  on public.loads
  for select
  using (status = 'posted');

create policy "Load owners can update their loads"
  on public.loads
  for update
  using (auth.uid() = user_id);

-- Negotiations
create policy "Participants can view negotiations"
  on public.negotiations
  for select
  using (
    auth.uid() = carrier_id or
    auth.uid() = shipper_id
  );

create policy "Participants can update negotiations"
  on public.negotiations
  for update
  using (
    auth.uid() = carrier_id or
    auth.uid() = shipper_id
  );

-- Market Data
create policy "Authenticated users can view market data"
  on public.market_data
  for select
  using (auth.role() = 'authenticated');

-- Enable Realtime
alter publication supabase_realtime add table public.loads;
alter publication supabase_realtime add table public.negotiations;
alter publication supabase_realtime add table public.market_data;
```

## 2. Required Files & Components

### 2.1 Environment Files

```typescript
// .env.local
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

// .env (server)
SUPABASE_URL=your_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2.2 Type Definitions

```typescript
// packages/shared/src/supabase/types/database.ts
export type Tables = {
  users: UserTable;
  user_profiles: UserProfileTable;
  companies: CompanyTable;
  loads: LoadTable;
  negotiations: NegotiationTable;
  market_data: MarketDataTable;
  ai_results: AIResultTable;
};

// packages/shared/src/supabase/types/tables.ts
export interface UserTable {
  Row: {
    id: string;
    email: string;
    role: UserRole;
    created_at: string;
    updated_at: string;
  };
  Insert: Omit<UserTable['Row'], 'id' | 'created_at' | 'updated_at'>;
  Update: Partial<UserTable['Insert']>;
}

// ... (similar interfaces for other tables)
```

### 2.3 Client Integration

```typescript
// packages/shared/src/supabase/client.ts
export const createSupabaseClient = (
  supabaseUrl: string,
  supabaseKey: string,
  options: SupabaseClientOptions = {}
) => {
  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: options.auth?.persistSession ?? true,
      autoRefreshToken: options.auth?.autoRefreshToken ?? true,
    },
    realtime: options.realtime
      ? {
          params: {
            eventsPerSecond: 10,
          },
        }
      : undefined,
  });
};
```

### 2.4 Repository Pattern

```typescript
// packages/shared/src/database/repositories/base.repository.ts
export abstract class BaseRepository<T extends { id: string }> {
  protected supabase: SupabaseClient<Database>;
  protected abstract table: string;

  constructor() {
    this.supabase = createSupabaseAdmin();
  }

  // ... CRUD methods
}

// packages/shared/src/database/repositories/load.repository.ts
export class LoadRepository extends BaseRepository<Load> {
  protected table = 'loads';

  async findAvailableLoads(filter: LoadFilter): Promise<Load[]> {
    // Implementation
  }
}

// ... (similar repositories for other entities)
```

### 2.5 React Integration

```typescript
// apps/client/src/lib/supabase/hooks/useSupabaseAuth.ts
export const useSupabaseAuth = () => {
  const { setUser } = useStore();

  useEffect(() => {
    // Auth state management
  }, []);

  return {
    signIn,
    signUp,
    signOut,
  };
};

// apps/client/src/lib/supabase/hooks/useRealtimeSubscription.ts
export const useRealtimeSubscription = <T>(
  table: string,
  filter?: string
) => {
  // Realtime subscription management
};
```

### 2.6 Edge Functions

```typescript
// supabase/functions/process-ai/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  // AI processing implementation
});

// supabase/functions/market-analysis/index.ts
serve(async (req) => {
  // Market analysis implementation
});
```

## 3. Integration Points

### 3.1 Authentication Flow
1. Sign Up Process
2. Sign In Flow
3. Session Management
4. Role-based Access

### 3.2 Real-time Features
1. Load Updates
2. Negotiation Status
3. Market Data Changes
4. Chat/Messaging

### 3.3 AI Integration
1. Edge Functions
2. WebSocket Communication
3. Result Storage

### 3.4 Data Access Patterns
1. Service-level Access
2. Client-side Queries
3. Real-time Subscriptions

## 4. Required Configurations

### 4.1 Supabase Project Settings
1. Authentication Settings
2. Email Templates
3. Database Settings
4. Storage Buckets

### 4.2 Security Settings
1. RLS Policies
2. API Key Management
3. JWT Settings

### 4.3 Monitoring Setup
1. Database Metrics
2. Function Logs
3. Auth Logs
4. Performance Metrics

## 5. Implementation Steps

### Phase 1: Core Setup (Week 1)
1. Project Creation
2. Schema Implementation
3. RLS Policies
4. Basic Auth Flow

### Phase 2: Service Integration (Week 2)
1. Repository Pattern
2. Service Layer
3. Edge Functions
4. Error Handling

### Phase 3: Client Integration (Week 3)
1. React Hooks
2. Real-time Features
3. State Management
4. UI Components

### Phase 4: Testing & Optimization (Week 4)
1. Integration Tests
2. Performance Testing
3. Security Audit
4. Documentation

## 6. Testing Requirements

### 6.1 Integration Tests
```typescript
// tests/integration/supabase/auth.test.ts
describe('Supabase Auth', () => {
  test('sign up flow', async () => {
    // Implementation
  });
});

// tests/integration/supabase/realtime.test.ts
describe('Supabase Realtime', () => {
  test('load updates', async () => {
    // Implementation
  });
});
```

### 6.2 Unit Tests
```typescript
// tests/unit/repositories/load.repository.test.ts
describe('LoadRepository', () => {
  test('findAvailableLoads', async () => {
    // Implementation
  });
});
```

## 7. Monitoring & Maintenance

### 7.1 Health Checks
1. Database Connection
2. Real-time Connection
3. Edge Functions
4. Auth Services

### 7.2 Performance Monitoring
1. Query Performance
2. Real-time Message Rate
3. Function Execution Time
4. Error Rates

### 7.3 Backup Strategy
1. Database Backups
2. Configuration Backups
3. Recovery Testing

## 8. Documentation Requirements

### 8.1 Technical Documentation
1. API Documentation
2. Schema Documentation
3. Security Documentation
4. Integration Guides

### 8.2 User Documentation
1. Setup Guide
2. Usage Guide
3. Troubleshooting Guide
4. Best Practices

## 9. Security Checklist

### 9.1 Authentication
- [ ] JWT Configuration
- [ ] Role Management
- [ ] Session Handling
- [ ] MFA Setup

### 9.2 Authorization
- [ ] RLS Policies
- [ ] API Access Control
- [ ] Function Permissions
- [ ] Storage Rules

### 9.3 Data Protection
- [ ] Encryption at Rest
- [ ] Secure Communication
- [ ] Backup Encryption
- [ ] Access Logging

## 10. Deployment Checklist

### 10.1 Pre-deployment
- [ ] Schema Validation
- [ ] Policy Testing
- [ ] Function Testing
- [ ] Performance Testing

### 10.2 Deployment
- [ ] Database Migration
- [ ] Function Deployment
- [ ] Configuration Update
- [ ] Monitoring Setup

### 10.3 Post-deployment
- [ ] Health Check
- [ ] Performance Verification
- [ ] Security Audit
- [ ] Backup Verification
