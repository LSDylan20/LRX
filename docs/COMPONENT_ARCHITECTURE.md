# LaneRunner Component Architecture

## Overview
This document outlines the component architecture, component relationships, and state management strategy for the LaneRunner platform.

## 1. Component Hierarchy

```
App
├── Layout
│   ├── Navbar
│   ├── Sidebar
│   └── NotificationCenter
├── Pages
│   ├── Dashboard
│   │   ├── AnalyticsDashboard
│   │   ├── QuickActions
│   │   └── RecentActivity
│   ├── LoadBoard
│   │   ├── LoadList
│   │   ├── LoadFilters
│   │   └── LoadMap
│   ├── LoadDetails
│   │   ├── LoadInfo
│   │   ├── CarrierMatches
│   │   └── LoadDocuments
│   ├── ShipmentTracking
│   │   ├── ShipmentMap
│   │   ├── ShipmentTimeline
│   │   └── ShipmentDocuments
│   └── Messages
│       ├── ChatList
│       ├── ChatWindow
│       └── VideoCall
└── Shared
    ├── Forms
    │   ├── LoadForm
    │   ├── QuoteForm
    │   └── DocumentUpload
    ├── UI
    │   ├── Button
    │   ├── Input
    │   └── Modal
    └── Maps
        ├── RouteMap
        └── LocationPicker
```

## 2. Component Specifications

### LoadBoard Component
```typescript
// LoadBoard.tsx
interface LoadBoardProps {
  filters: LoadFilters;
  view: 'list' | 'map';
  onFilterChange: (filters: LoadFilters) => void;
}

interface LoadFilters {
  origin?: string;
  destination?: string;
  equipmentType?: string[];
  dateRange?: [Date, Date];
  status?: LoadStatus[];
}

const LoadBoard: React.FC<LoadBoardProps> = ({ filters, view, onFilterChange }) => {
  const { loads, loading, error } = useLoads(filters);
  const { predictions } = useRatePredictions(loads);
  
  return (
    <div className="load-board">
      <LoadFilters
        filters={filters}
        onChange={onFilterChange}
      />
      {view === 'list' ? (
        <LoadList
          loads={loads}
          predictions={predictions}
          loading={loading}
        />
      ) : (
        <LoadMap
          loads={loads}
          predictions={predictions}
          loading={loading}
        />
      )}
    </div>
  );
};
```

### CarrierMatching Component
```typescript
// CarrierMatching.tsx
interface CarrierMatchingProps {
  loadId: string;
  onMatchSelect: (carrierId: string) => void;
}

const CarrierMatching: React.FC<CarrierMatchingProps> = ({
  loadId,
  onMatchSelect,
}) => {
  const { matches, loading, error } = useCarrierMatches(loadId);
  const { predictRate } = useRatePrediction();
  
  return (
    <div className="carrier-matching">
      <div className="matches-list">
        {matches.map(match => (
          <MatchCard
            key={match.id}
            match={match}
            predictedRate={predictRate(match)}
            onSelect={() => onMatchSelect(match.id)}
          />
        ))}
      </div>
    </div>
  );
};
```

### ShipmentTracker Component
```typescript
// ShipmentTracker.tsx
interface ShipmentTrackerProps {
  shipmentId: string;
  onStatusUpdate: (status: ShipmentStatus) => void;
}

const ShipmentTracker: React.FC<ShipmentTrackerProps> = ({
  shipmentId,
  onStatusUpdate,
}) => {
  const {
    shipment,
    currentLocation,
    eta,
    updateLocation,
  } = useShipmentTracking(shipmentId);
  
  return (
    <div className="shipment-tracker">
      <ShipmentMap
        currentLocation={currentLocation}
        destination={shipment.destination}
      />
      <ShipmentTimeline
        status={shipment.status}
        events={shipment.events}
        eta={eta}
      />
      <ShipmentControls
        onUpdateStatus={onStatusUpdate}
        onUpdateLocation={updateLocation}
      />
    </div>
  );
};
```

## 3. Custom Hooks

### useLoads
```typescript
// hooks/useLoads.ts
interface UseLoadsOptions {
  filters: LoadFilters;
  pageSize?: number;
}

function useLoads({ filters, pageSize = 20 }: UseLoadsOptions) {
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const fetchLoads = async () => {
      try {
        const { data, error } = await supabase
          .from('loads')
          .select('*')
          .match(filters)
          .limit(pageSize);
          
        if (error) throw error;
        setLoads(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLoads();
  }, [filters, pageSize]);
  
  return { loads, loading, error };
}
```

### useRatePrediction
```typescript
// hooks/useRatePrediction.ts
function useRatePrediction() {
  const predictRate = async (load: Load): Promise<RatePrediction> => {
    const { data } = await supabase.functions.invoke('predict-rate', {
      body: { load }
    });
    return data;
  };
  
  const getBatchPredictions = async (loads: Load[]): Promise<RatePrediction[]> => {
    const { data } = await supabase.functions.invoke('predict-rates-batch', {
      body: { loads }
    });
    return data;
  };
  
  return { predictRate, getBatchPredictions };
}
```

## 4. State Management

### Zustand Store Configuration
```typescript
// store/index.ts
interface AppState {
  user: User | null;
  loads: Load[];
  notifications: Notification[];
  actions: {
    setUser: (user: User | null) => void;
    addLoad: (load: Load) => void;
    updateLoad: (id: string, updates: Partial<Load>) => void;
    addNotification: (notification: Notification) => void;
    markNotificationRead: (id: string) => void;
  };
}

const useStore = create<AppState>((set) => ({
  user: null,
  loads: [],
  notifications: [],
  actions: {
    setUser: (user) => set({ user }),
    addLoad: (load) => set((state) => ({
      loads: [...state.loads, load]
    })),
    updateLoad: (id, updates) => set((state) => ({
      loads: state.loads.map((load) =>
        load.id === id ? { ...load, ...updates } : load
      )
    })),
    addNotification: (notification) => set((state) => ({
      notifications: [...state.notifications, notification]
    })),
    markNotificationRead: (id) => set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      )
    })),
  },
}));
```

## 5. Component Communication

### Event Bus
```typescript
// lib/eventBus.ts
type EventHandler = (...args: any[]) => void;

class EventBus {
  private handlers: Record<string, EventHandler[]> = {};

  on(event: string, handler: EventHandler) {
    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }
    this.handlers[event].push(handler);
  }

  emit(event: string, ...args: any[]) {
    if (this.handlers[event]) {
      this.handlers[event].forEach((handler) => handler(...args));
    }
  }

  off(event: string, handler: EventHandler) {
    if (this.handlers[event]) {
      this.handlers[event] = this.handlers[event].filter(
        (h) => h !== handler
      );
    }
  }
}

export const eventBus = new EventBus();
```

## 6. Error Boundaries

### Global Error Boundary
```typescript
// components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Log to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## 7. Performance Optimization

### Code Splitting
```typescript
// App.tsx
const Dashboard = lazy(() => import('./pages/Dashboard'));
const LoadBoard = lazy(() => import('./pages/LoadBoard'));
const ShipmentTracking = lazy(() => import('./pages/ShipmentTracking'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/loads" element={<LoadBoard />} />
        <Route path="/shipments/:id" element={<ShipmentTracking />} />
      </Routes>
    </Suspense>
  );
}
```

### Memoization
```typescript
// components/LoadList.tsx
const LoadList = memo(function LoadList({
  loads,
  onLoadSelect
}: LoadListProps) {
  return (
    <div className="load-list">
      {loads.map(load => (
        <LoadCard
          key={load.id}
          load={load}
          onClick={() => onLoadSelect(load.id)}
        />
      ))}
    </div>
  );
}, (prevProps, nextProps) => {
  return isEqual(prevProps.loads, nextProps.loads);
});
```

## 8. Accessibility

### Focus Management
```typescript
// hooks/useFocusTrap.ts
function useFocusTrap(ref: RefObject<HTMLElement>) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[
      focusableElements.length - 1
    ] as HTMLElement;

    function handleTabKey(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          lastFocusable.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          firstFocusable.focus();
          e.preventDefault();
        }
      }
    }

    element.addEventListener('keydown', handleTabKey);
    firstFocusable.focus();

    return () => {
      element.removeEventListener('keydown', handleTabKey);
    };
  }, [ref]);
}
```
