# LaneRunner Microservices Integration Plan

## Current Frontend Structure vs Microservices

### Microservices Architecture
```
Backend Services:
├── auth-service/           # Authentication & Authorization
├── load-service/          # Load Management
├── rate-service/          # Rate Calculation
├── tracking-service/      # Shipment Tracking
├── ai-service/            # AI & Negotiation
├── communication-service/ # Voice & Chat
└── analytics-service/     # Analytics & Reporting
```

### Frontend-to-Microservice Mapping

```typescript
// src/features/loads/ -> load-service
src/features/loads/
├── api/
│   ├── client.ts         // Load service API client
│   ├── types.ts          // Service-specific types
│   └── endpoints.ts      // Service endpoint definitions
├── components/
└── hooks/
    └── useLoadService.ts // Service integration hook

// src/features/quotes/ -> quote-service
src/features/quotes/
├── api/
│   ├── client.ts         // Quote service API client
│   └── endpoints.ts      // Service endpoint definitions
└── hooks/
    └── useQuoteService.ts // Service integration hook
```

## Integration Strategy

### 1. State Management with Zustand
```typescript
// src/store/loads.ts
import create from 'zustand'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Load = Database['public']['Tables']['loads']['Row']

interface LoadsState {
  loads: Load[]
  isLoading: boolean
  error: Error | null
  addLoad: (load: Load) => void
  updateLoad: (id: string, updates: Partial<Load>) => void
  subscribeToLoads: () => void
}

export const useLoadsStore = create<LoadsState>((set) => ({
  loads: [],
  isLoading: false,
  error: null,
  addLoad: (load) => set((state) => ({ 
    loads: [...state.loads, load] 
  })),
  updateLoad: (id, updates) => set((state) => ({
    loads: state.loads.map(load => 
      load.id === id ? { ...load, ...updates } : load
    )
  })),
  subscribeToLoads: () => {
    const subscription = supabase
      .from('loads')
      .on('*', (payload) => {
        switch (payload.eventType) {
          case 'INSERT':
            useLoadsStore.getState().addLoad(payload.new)
            break
          case 'UPDATE':
            useLoadsStore.getState().updateLoad(payload.new.id, payload.new)
            break
        }
      })
      .subscribe()
    
    return () => subscription.unsubscribe()
  }
}))

// Usage in components
const LoadList = () => {
  const loads = useLoadsStore((state) => state.loads)
  const isLoading = useLoadsStore((state) => state.isLoading)
  
  useEffect(() => {
    const unsubscribe = useLoadsStore.getState().subscribeToLoads()
    return () => unsubscribe()
  }, [])
  
  if (isLoading) return <Loading />
  
  return (
    <div>
      {loads.map(load => (
        <LoadCard key={load.id} load={load} />
      ))}
    </div>
  )
}
```

### 2. API Layer
```typescript
// src/lib/api/baseClient.ts
export class BaseApiClient {
  constructor(private baseUrl: string) {}
  
  // Common API methods with service discovery
  async get<T>(endpoint: string): Promise<T> {
    const serviceUrl = await this.discoverService(endpoint);
    // Make request with service discovery
  }
}

// src/features/loads/api/client.ts
export class LoadServiceClient extends BaseApiClient {
  constructor() {
    super('load-service');
  }

  async getLoads(): Promise<Database['public']['Tables']['loads']['Row'][]> {
    return this.get('/loads');
  }
}
```

### 3. Service Discovery Integration
```typescript
// src/lib/service-discovery/index.ts
export class ServiceDiscovery {
  private serviceRegistry: Map<string, string>;

  async getServiceUrl(serviceName: string): Promise<string> {
    // Get service URL from registry
    return this.serviceRegistry.get(serviceName);
  }
}
```

### 4. Feature-Service Mapping
```typescript
// src/features/loads/config.ts
export const loadServiceConfig = {
  serviceName: 'load-service',
  endpoints: {
    getLoads: '/loads',
    createLoad: '/loads/create',
    updateLoad: '/loads/:id',
  },
  events: {
    loadCreated: 'load.created',
    loadUpdated: 'load.updated',
  },
};
```

## Benefits of This Structure

1. **Service Isolation**
   - Each feature module maps to a specific microservice
   - Clean separation of concerns
   - Independent scaling and deployment

2. **API Management**
   - Centralized API handling
   - Service discovery integration
   - Type-safe API calls

3. **State Management**
   - Feature-specific state aligned with services
   - Real-time updates via WebSocket
   - Cached data management

## Implementation Guide

### 1. Service Integration Layer
```typescript
// src/lib/services/index.ts
export interface ServiceConfig {
  name: string;
  baseUrl: string;
  version: string;
}

export class ServiceRegistry {
  private services: Map<string, ServiceConfig>;

  registerService(config: ServiceConfig) {
    this.services.set(config.name, config);
  }
}
```

### 2. Feature-Service Communication
```typescript
// src/features/loads/hooks/useLoadService.ts
export const useLoadService = () => {
  const client = useLoadServiceClient();
  const discovery = useServiceDiscovery();

  return {
    getLoads: async () => {
      const serviceUrl = await discovery.getServiceUrl('load-service');
      return client.getLoads();
    },
  };
};
```

### 3. Real-time Updates
```typescript
// src/lib/websocket/index.ts
export class ServiceEventBus {
  subscribe(serviceName: string, event: string, handler: Function) {
    // Subscribe to service-specific events
  }
}

// src/features/loads/hooks/useLoadUpdates.ts
export const useLoadUpdates = () => {
  const eventBus = useServiceEventBus();
  
  useEffect(() => {
    eventBus.subscribe('load-service', 'load.updated', handleUpdate);
  }, []);
};
```

## Required Changes

1. **Add Service Discovery**
```typescript
// src/lib/config/services.ts
export const serviceConfig = {
  auth: {
    name: 'auth-service',
    baseUrl: process.env.AUTH_SERVICE_URL,
  },
  load: {
    name: 'load-service',
    baseUrl: process.env.LOAD_SERVICE_URL,
  },
  // ... other services
};
```

2. **Update API Layer**
```typescript
// src/lib/api/middleware.ts
export const serviceMiddleware = async (req: Request) => {
  const serviceName = getServiceFromRequest(req);
  const serviceUrl = await discovery.getServiceUrl(serviceName);
  // Add service routing headers
};
```

3. **Add Event Handling**
```typescript
// src/lib/events/index.ts
export const eventBus = new ServiceEventBus({
  services: serviceConfig,
  handlers: {
    'load.updated': handleLoadUpdate,
    'rate.changed': handleRateChange,
  },
});
```

## Deployment Considerations

1. **Service Discovery**
   - Use Kubernetes service discovery
   - Implement health checks
   - Handle failover scenarios

2. **API Gateway**
   - Route requests to appropriate services
   - Handle authentication/authorization
   - Implement rate limiting

3. **Monitoring**
   - Track service dependencies
   - Monitor service health
   - Log service interactions

## Next Steps

1. **Service Integration**
   - Implement service discovery
   - Add API clients for each service
   - Set up WebSocket connections

2. **Feature Alignment**
   - Map features to services
   - Implement service-specific state
   - Add real-time updates

3. **Testing**
   - Add service integration tests
   - Implement service mocks
   - Test failover scenarios
