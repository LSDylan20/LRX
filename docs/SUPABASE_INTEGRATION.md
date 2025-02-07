# Supabase Integration Architecture

## 1. Core Integration Points

### 1.1 Database Schema

```sql
-- Enable RLS (Row Level Security)
alter table public.loads enable row level security;
alter table public.negotiations enable row level security;
alter table public.market_data enable row level security;
alter table public.user_profiles enable row level security;

-- Real-time replication settings
alter publication supabase_realtime add table public.loads;
alter publication supabase_realtime add table public.negotiations;
alter publication supabase_realtime add table public.market_data;

-- Policies for real-time access
create policy "Enable read access for authenticated users"
on public.loads
for select
using (auth.role() = 'authenticated');

create policy "Enable write access for load owners"
on public.loads
for all
using (auth.uid() = user_id);
```

### 1.2 Supabase Client Setup

```typescript
// apps/client/src/lib/supabase/supabase.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
```

### 1.3 Microservices Integration

```typescript
// apps/shared/src/supabase/admin-client.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export const createSupabaseAdmin = () => {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
      },
    }
  );
};
```

## 2. Real-time Data Synchronization

### 2.1 Real-time Hooks

```typescript
// apps/client/src/lib/supabase/useRealtimeSubscription.ts
import { useEffect, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { useStore } from '@/store';

export const useRealtimeSubscription = (
  table: string,
  filter?: string
) => {
  const { updateData } = useStore();
  
  useEffect(() => {
    let channel: RealtimeChannel;

    const setupSubscription = async () => {
      channel = supabase
        .channel('table-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            filter,
          },
          (payload) => {
            updateData(table, payload.new);
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [table, filter, updateData]);
};
```

### 2.2 Load Management Integration

```typescript
// apps/client/src/features/loads/hooks/useLoadManagement.ts
import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRealtimeSubscription } from '@/lib/supabase/useRealtimeSubscription';
import type { Load, LoadFilter } from '@/types';

export const useLoadManagement = (filter?: LoadFilter) => {
  useRealtimeSubscription('loads', `user_id=eq.${filter?.userId}`);

  const createLoad = useCallback(async (load: Omit<Load, 'id'>) => {
    const { data, error } = await supabase
      .from('loads')
      .insert(load)
      .select()
      .single();

    if (error) throw error;
    return data;
  }, []);

  const updateLoad = useCallback(async (id: string, updates: Partial<Load>) => {
    const { data, error } = await supabase
      .from('loads')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }, []);

  return {
    createLoad,
    updateLoad,
  };
};
```

### 2.3 Negotiation Integration

```typescript
// apps/client/src/features/negotiations/hooks/useNegotiation.ts
import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRealtimeSubscription } from '@/lib/supabase/useRealtimeSubscription';
import type { Negotiation, NegotiationUpdate } from '@/types';

export const useNegotiation = (negotiationId?: string) => {
  useRealtimeSubscription(
    'negotiations',
    negotiationId ? `id=eq.${negotiationId}` : undefined
  );

  const updateNegotiation = useCallback(async (
    id: string,
    update: NegotiationUpdate
  ) => {
    const { data, error } = await supabase
      .from('negotiations')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }, []);

  return {
    updateNegotiation,
  };
};
```

## 3. Authentication Integration

### 3.1 Auth Hook

```typescript
// apps/client/src/lib/auth/useSupabaseAuth.ts
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store';

export const useSupabaseAuth = () => {
  const { setUser, clearUser } = useStore();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
      } else {
        clearUser();
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, clearUser]);

  return {
    signIn: supabase.auth.signInWithPassword,
    signUp: supabase.auth.signUp,
    signOut: supabase.auth.signOut,
  };
};
```

## 4. Microservices Data Access

### 4.1 Shared Database Access

```typescript
// apps/shared/src/database/repository.ts
import { createSupabaseAdmin } from '../supabase/admin-client';

export class BaseRepository<T> {
  protected supabase = createSupabaseAdmin();
  protected table: string;

  constructor(table: string) {
    this.table = table;
  }

  async findOne(id: string): Promise<T | null> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select()
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async create(data: Omit<T, 'id'>): Promise<T> {
    const { data: created, error } = await this.supabase
      .from(this.table)
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return created;
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const { data: updated, error } = await this.supabase
      .from(this.table)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return updated;
  }
}
```

### 4.2 Service-Specific Repositories

```typescript
// apps/load-service/src/repositories/load.repository.ts
import { BaseRepository } from '@lanerunner/shared';
import type { Load } from '@lanerunner/common';

export class LoadRepository extends BaseRepository<Load> {
  constructor() {
    super('loads');
  }

  async findByUserId(userId: string): Promise<Load[]> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select()
      .eq('user_id', userId);

    if (error) throw error;
    return data;
  }

  async findAvailableLoads(): Promise<Load[]> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select()
      .eq('status', 'available');

    if (error) throw error;
    return data;
  }
}
```

## 5. Edge Functions Integration

### 5.1 AI Processing Function

```typescript
// supabase/functions/process-ai/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  );

  const { data } = await req.json();

  // Process with AI service
  const result = await processWithAI(data);

  // Store results
  await supabase
    .from('ai_results')
    .insert({
      input: data,
      result,
      processed_at: new Date().toISOString(),
    });

  return new Response(
    JSON.stringify(result),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

## 6. Implementation Timeline

### Phase 1: Core Setup (Week 1)
- Set up Supabase project
- Configure database schema
- Implement RLS policies
- Set up real-time replication

### Phase 2: Client Integration (Week 2)
- Implement client-side hooks
- Set up authentication flow
- Create real-time subscriptions
- Integrate with state management

### Phase 3: Service Integration (Week 3)
- Set up service-level access
- Implement repositories
- Configure Edge Functions
- Add monitoring

### Phase 4: Testing & Optimization (Week 4)
- Write integration tests
- Performance testing
- Security audit
- Documentation

## 7. Security Considerations

### 7.1 Row Level Security
- Implement RLS for all tables
- Set up proper policies
- Regular security audits

### 7.2 Service Role Access
- Use service roles for microservices
- Rotate keys regularly
- Monitor access patterns

## 8. Monitoring

### 8.1 Performance Metrics
- Query performance
- Real-time message rates
- Edge function performance
- Error rates

### 8.2 Usage Metrics
- Active connections
- Database size
- Edge function invocations
- Bandwidth usage
