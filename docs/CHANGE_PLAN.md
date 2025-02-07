# LaneRunner Codebase Restructuring Plan

## Overview
This document outlines the comprehensive plan for restructuring the LaneRunner codebase to align with our target architecture, focusing on maintainability, scalability, and performance.

## 1. Current Structure Analysis

### 1.1 Directory Structure
```
lanerunner/
├── .bolt/                 # Build output
├── docs/                 # Documentation
├── src/                  # Source code
│   ├── components/      # UI components
│   ├── features/        # Feature modules
│   ├── lib/             # Utilities
│   ├── store/           # State management
│   ├── types/           # TypeScript types
│   ├── pages/           # Page components
│   ├── App.tsx          # Main app component
│   └── main.tsx         # Entry point
├── supabase/            # Database
└── [config files]       # Various config files
```

### 1.2 Core Database Tables
```typescript
interface DatabaseSchema {
  users: {
    id: string;
    email: string;
    role: UserRole;
    profile: UserProfile;
  };
  loads: {
    id: string;
    shipper_id: string;
    status: LoadStatus;
    details: LoadDetails;
  };
  carrier_profiles: {
    id: string;
    user_id: string;
    company: CompanyDetails;
    fleet: FleetDetails;
  };
  quotes: {
    id: string;
    load_id: string;
    carrier_id: string;
    rate: RateDetails;
  };
  shipments: {
    id: string;
    load_id: string;
    carrier_id: string;
    status: ShipmentStatus;
  };
  documents: {
    id: string;
    reference_id: string;
    type: DocumentType;
    url: string;
  };
  carrier_vehicles: {
    id: string;
    carrier_id: string;
    details: VehicleDetails;
  };
  messages: {
    id: string;
    thread_id: string;
    sender_id: string;
    content: MessageContent;
  };
  notifications: {
    id: string;
    user_id: string;
    type: NotificationType;
    data: NotificationData;
  };
}
```

## 2. Target Architecture

### 2.1 Directory Structure
```
lanerunner/
├── apps/                      # Application modules
│   ├── client/               # React frontend
│   │   ├── src/
│   │   │   ├── components/   # UI components
│   │   │   │   ├── ui/      # Basic UI components
│   │   │   │   └── common/  # Business components
│   │   │   ├── features/    # Feature modules
│   │   │   │   ├── loads/
│   │   │   │   ├── rates/
│   │   │   │   ├── tracking/
│   │   │   │   └── voice/
│   │   │   ├── lib/         # Shared utilities
│   │   │   ├── store/       # State management
│   │   │   └── types/       # TypeScript types
│   │   └── [config files]
│   ├── websocket-service/    # WebSocket service
│   ├── load-service/         # Load management service
│   ├── rate-service/         # Rate optimization service
│   └── voice-service/        # Voice/chat service
├── packages/                 # Shared packages
│   ├── ui/                  # UI component library
│   ├── api-client/          # API client library
│   └── common/              # Shared utilities
├── infrastructure/          # Infrastructure code
│   ├── kubernetes/         # K8s configurations
│   ├── terraform/          # Infrastructure as Code
│   └── docker/            # Docker configurations
└── tools/                 # Development tools
```

### 2.2 Feature Module Structure
Each feature module follows this structure:
```
feature/
├── components/           # Feature-specific components
│   ├── __tests__/       # Component tests
│   └── stories/         # Storybook stories
├── api/                 # API integration
│   ├── client.ts        # API client
│   └── types.ts         # API types
├── hooks/               # Custom hooks
│   └── __tests__/       # Hook tests
├── store/               # State management
│   └── __tests__/       # Store tests
├── utils/               # Feature utilities
├── types.ts             # Feature types
└── index.ts             # Public API
```

## 3. Implementation Plan

### 3.1 Phase 1: Infrastructure Setup (Week 1)
1. Repository Structure
   - Set up monorepo with pnpm workspaces
   - Configure TypeScript paths
   - Set up ESLint and Prettier
   - Configure testing framework

2. Build System
   - Configure Vite for client
   - Set up module federation
   - Configure bundle analysis
   - Implement CI/CD pipelines

3. Development Environment
   - Docker compose setup
   - Local development scripts
   - Database migrations
   - Seed data generation

### 3.2 Phase 2: Core Services (Weeks 2-3)
1. Client Application
   - Implement new directory structure
   - Set up routing system
   - Configure state management
   - Implement error boundaries

2. WebSocket Service
   - Set up NestJS application
   - Implement connection handling
   - Set up authentication
   - Configure event system

3. Load Service
   - Set up NestJS application
   - Implement CRUD operations
   - Set up event handlers
   - Configure caching

4. Rate Service
   - Set up NestJS application
   - Implement rate calculation
   - Set up market data integration
   - Configure optimization engine

### 3.3 Phase 3: Feature Migration (Weeks 4-5)
1. Load Management
   - Migrate components
   - Set up state management
   - Implement real-time updates
   - Add error handling

2. Rate Management
   - Migrate components
   - Implement negotiation system
   - Set up analytics
   - Add market insights

3. Tracking System
   - Migrate components
   - Set up real-time tracking
   - Implement geofencing
   - Add notifications

4. Voice/Chat System
   - Set up WebSocket handlers
   - Implement chat features
   - Set up voice integration
   - Add AI responses

### 3.4 Phase 4: Integration & Testing (Week 6)
1. Integration Testing
   - Set up test environment
   - Write integration tests
   - Configure test coverage
   - Add performance tests

2. Documentation
   - Update API documentation
   - Add architecture diagrams
   - Write migration guides
   - Create troubleshooting guides

3. Performance Optimization
   - Implement code splitting
   - Optimize bundle size
   - Add caching strategies
   - Configure CDN

## 4. Migration Strategy

### 4.1 Code Migration
1. Component Migration
   ```typescript
   // Before: src/components/LoadCard.tsx
   import { FC } from 'react'
   import { Load } from '../types'
   
   const LoadCard: FC<{ load: Load }> = ({ load }) => {
     // Component implementation
   }
   
   // After: src/features/loads/components/LoadCard/index.tsx
   import { FC } from 'react'
   import { Load } from '../../types'
   import { useLoadActions } from '../../hooks'
   import { Card } from '@/components/ui'
   
   export interface LoadCardProps {
     load: Load;
     onAction?: (action: string) => void;
   }
   
   export const LoadCard: FC<LoadCardProps> = ({ load, onAction }) => {
     const { updateLoad } = useLoadActions()
     // Enhanced component implementation
   }
   ```

2. State Migration
   ```typescript
   // Before: Redux store
   const loadSlice = createSlice({
     name: 'loads',
     initialState,
     reducers: {/*...*/}
   })
   
   // After: Zustand store
   interface LoadStore {
     loads: Load[];
     isLoading: boolean;
     error: Error | null;
     addLoad: (load: Load) => void;
     updateLoad: (id: string, updates: Partial<Load>) => void;
   }
   
   export const useLoadStore = create<LoadStore>((set) => ({
     loads: [],
     isLoading: false,
     error: null,
     addLoad: (load) => 
       set((state) => ({ loads: [...state.loads, load] })),
     updateLoad: (id, updates) =>
       set((state) => ({
         loads: state.loads.map(load =>
           load.id === id ? { ...load, ...updates } : load
         )
       }))
   }))
   ```

### 4.2 Database Migration
1. Schema Updates
   ```sql
   -- Add new columns
   ALTER TABLE loads
   ADD COLUMN optimization_data JSONB,
   ADD COLUMN ai_matching_score FLOAT;
   
   -- Create new tables
   CREATE TABLE load_events (
     id UUID PRIMARY KEY,
     load_id UUID REFERENCES loads(id),
     event_type TEXT,
     data JSONB,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. Data Migration
   ```typescript
   async function migrateLoadData() {
     const loads = await db.loads.findMany()
     for (const load of loads) {
       await db.$transaction([
         db.loads.update({
           where: { id: load.id },
           data: {
             optimization_data: computeOptimizationData(load),
             ai_matching_score: calculateMatchingScore(load)
           }
         }),
         db.load_events.createMany({
           data: generateLoadEvents(load)
         })
       ])
     }
   }
   ```

## 5. Rollback Procedures

### 5.1 Code Rollback
1. Version Control
   - Tag releases
   - Maintain release branches
   - Document dependencies
   - Keep configuration history

2. Deployment Rollback
   - Blue-green deployment
   - Canary releases
   - Feature flags
   - Database versioning

### 5.2 Data Rollback
1. Backup Strategy
   - Regular snapshots
   - Transaction logs
   - Point-in-time recovery
   - Data validation

2. Recovery Process
   - Stop services
   - Restore data
   - Verify integrity
   - Resume services

## 6. Success Criteria

### 6.1 Technical Requirements
1. Performance Metrics
   - Bundle size < 250KB initial
   - Page load < 2s
   - API response < 100ms
   - WebSocket latency < 50ms

2. Code Quality
   - Test coverage > 90%
   - Zero critical issues
   - TypeScript strict mode
   - ESLint compliance

### 6.2 Business Requirements
1. Feature Parity
   - All existing features working
   - No regression bugs
   - Improved UX metrics
   - Enhanced performance

2. Monitoring
   - Error tracking
   - Performance monitoring
   - User analytics
   - System health checks

## 7. Timeline

### 7.1 Development Schedule
Week 1:
- Infrastructure setup
- Development environment
- Build system configuration

Week 2-3:
- Core services implementation
- Database migration
- API integration

Week 4-5:
- Feature migration
- Real-time functionality
- Integration testing

Week 6:
- Performance optimization
- Documentation
- Production deployment

### 7.2 Milestones
1. Infrastructure Ready
   - [ ] Monorepo setup
   - [ ] CI/CD configured
   - [ ] Development environment
   - [ ] Testing framework

2. Core Services
   - [ ] Client application
   - [ ] WebSocket service
   - [ ] Load service
   - [ ] Rate service

3. Features Complete
   - [ ] Load management
   - [ ] Rate management
   - [ ] Tracking system
   - [ ] Voice/chat system

4. Production Ready
   - [ ] Performance optimized
   - [ ] Documentation complete
   - [ ] Monitoring configured
   - [ ] Security verified
