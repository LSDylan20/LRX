# LaneRunner Codebase Restructuring Plan

## Overview
This document outlines the necessary changes to align the current codebase with our target architecture as defined in `.windsurfrules` and other documentation. The plan includes file movements, modifications, and deletions required to achieve the desired structure.

## Current Structure Analysis
```
lanerunner/
├── .bolt/                 # Build output
├── docs/                  # Documentation
├── src/                   # Source code
│   ├── components/        # UI components
│   ├── features/         # Feature modules
│   ├── lib/              # Utilities
│   ├── store/            # State management
│   ├── types/            # TypeScript types
│   ├── pages/            # Page components
│   ├── App.tsx           # Main app component
│   └── main.tsx          # Entry point
├── supabase/             # Database
└── [config files]        # Various config files
```

## Database Types Analysis
The codebase is built around the following core database tables:
- users (auth and roles)
- loads (freight management)
- carrier_profiles (carrier information)
- quotes (load quotes)
- shipments (active shipments)
- documents (load documentation)
- carrier_vehicles (vehicle management)
- messages (communication)
- notifications (user notifications)

## Required Changes

### 1. Directory Structure Changes

#### Create New Directories
```
src/
├── components/
│   ├── ui/              # Move basic UI components here
│   └── common/          # Move business components here
├── features/
│   ├── loads/
│   │   ├── components/
│   │   ├── api/
│   │   ├── hooks/
│   │   └── types.ts
│   ├── quotes/
│   ├── shipments/
│   ├── carriers/
│   └── messages/
├── lib/
│   ├── api/
│   ├── ai/
│   ├── auth/
│   ├── hooks/
│   └── supabase/        # Supabase client and realtime subscriptions
├── pages/
├── store/
│   ├── loads.ts         # Loads state store
│   ├── quotes.ts         # Quotes state store
│   ├── shipments.ts         # Shipments state store
│   ├── carriers.ts         # Carriers state store
│   ├── messages.ts         # Messages state store
│   └── index.ts         # Store exports and types
└── types/
    ├── database.ts
    ├── models.ts
    └── api.ts
```

### 2. Type Definitions
```typescript
// src/types/database.ts
export * from '@/lib/database.types'

// src/types/models.ts
export interface LoadWithRelations extends Database['public']['Tables']['loads']['Row'] {
  shipper: Database['public']['Tables']['users']['Row']
  quotes: Database['public']['Tables']['quotes']['Row'][]
  shipment?: Database['public']['Tables']['shipments']['Row']
}

// Similar interface extensions for other related types
```

### 3. State Management (Zustand)
```typescript
// src/store/loads.ts
import { create } from 'zustand'
import type { Database } from '@/types/database'

type Load = Database['public']['Tables']['loads']['Row']

interface LoadsState {
  loads: Load[]
  isLoading: boolean
  error: Error | null
  addLoad: (load: Load) => void
  updateLoad: (id: string, updates: Partial<Load>) => void
  subscribeToLoads: () => () => void
}

// Similar stores for other database tables
```

### 4. File Movements

#### Components Directory
- Move from: `src/components/*`
- To: `src/components/ui/` or `src/components/common/`
- Criteria: 
  - UI components: Basic, reusable UI elements
  - Common components: Business logic components

#### Pages Directory
- Move from: `src/pages/*`
- To: Respective feature directories
- Example: `src/pages/loads.tsx` → `src/features/loads/components/LoadsPage.tsx`

#### Library Files
- Move utility functions to appropriate lib directories
- Create new API clients in `src/lib/api/`
- Set up Supabase realtime subscriptions in `src/lib/supabase/`

### 5. New Files to Create

#### Feature Modules
1. Loads Feature
   - `src/features/loads/api/client.ts`
   - `src/features/loads/hooks/useLoads.ts`
   - `src/features/loads/types.ts`

2. Quotes Feature
   - `src/features/quotes/api/client.ts`
   - `src/features/quotes/hooks/useQuotes.ts`
   - `src/features/quotes/types.ts`

3. Shipments Feature
   - `src/features/shipments/api/client.ts`
   - `src/features/shipments/hooks/useShipments.ts`
   - `src/features/shipments/types.ts`

4. Carriers Feature
   - `src/features/carriers/api/client.ts`
   - `src/features/carriers/hooks/useCarriers.ts`
   - `src/features/carriers/types.ts`

5. Messages Feature
   - `src/features/messages/api/client.ts`
   - `src/features/messages/hooks/useMessages.ts`
   - `src/features/messages/types.ts`

#### Library Files
1. API Layer
   - `src/lib/api/baseClient.ts`
   - `src/lib/api/endpoints.ts`
   - `src/lib/api/types.ts`

2. AI Integration
   - `src/lib/ai/gemini.ts`
   - `src/lib/ai/types.ts`

3. Authentication
   - `src/lib/auth/client.ts`
   - `src/lib/auth/hooks.ts`

4. Supabase Integration
   - `src/lib/supabase/client.ts`
   - `src/lib/supabase/subscriptions.ts`
   - `src/lib/supabase/hooks.ts`

#### Store Files (Zustand)
1. State Stores
   - `src/store/loads.ts`
   ```typescript
   // Example Zustand store structure
   import create from 'zustand'
   
   interface LoadsState {
     loads: Load[]
     isLoading: boolean
     error: Error | null
     addLoad: (load: Load) => void
     updateLoad: (id: string, updates: Partial<Load>) => void
     setLoading: (loading: boolean) => void
     setError: (error: Error | null) => void
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
     setLoading: (loading) => set({ isLoading: loading }),
     setError: (error) => set({ error })
   }))
   ```
   - Similar structure for `quotes.ts`, `shipments.ts`, `carriers.ts`, `messages.ts`
   - `index.ts` for type exports and store composition

### 6. Files to Update

1. Configuration Files
   - Update `tsconfig.json` with new path aliases
   - Update `vite.config.ts` with new build configuration
   - Update `package.json`:
     ```diff
     {
       "dependencies": {
     -   "zustand": "^4.x.x"
       }
     }
     ```
   - Update `.env` with new environment variables

2. Core Files
   - Update `App.tsx` to use new routing structure
   - Update `main.tsx` to remove Redux provider

### 7. Files to Remove

1. Deprecated Files
   - Remove Redux-related files and configurations
   - Remove old page components after migration
   - Remove unused utility files
   - Clean up old test files

## Implementation Steps

1. **Preparation Phase**
   - Create new directory structure
   - Set up new configuration files
   - Create necessary placeholder files

2. **Migration Phase**
   - Move and refactor components
   - Update imports and dependencies
   - Implement new feature modules
   - Set up Supabase realtime subscriptions
   - Migrate from Redux to Zustand stores

3. **Testing Phase**
   - Verify all features work after migration
   - Run comprehensive test suite
   - Check for broken dependencies

4. **Cleanup Phase**
   - Remove deprecated files
   - Update documentation
   - Verify build process

## Risks and Mitigations

1. **Breaking Changes**
   - Risk: Component dependencies might break
   - Mitigation: Implement changes gradually, with thorough testing

2. **Performance Impact**
   - Risk: New structure might affect bundle size
   - Mitigation: Implement code splitting and lazy loading

3. **Development Workflow**
   - Risk: Team needs to adapt to new structure
   - Mitigation: Provide clear documentation and examples

## Success Criteria

1. All files are in their correct locations
2. All features work as expected
3. Build process completes successfully
4. Tests pass with 100% coverage
5. No deprecated files remain
6. Documentation is up to date

## Next Steps

1. Review this plan with the team
2. Create feature-specific implementation plans
3. Set up new CI/CD pipelines
4. Begin implementation in phases
