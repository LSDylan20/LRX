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

### 2.1 Core Components

#### Layout Components
```typescript
// Layout.tsx
interface LayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  showNotifications?: boolean;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  showSidebar = true,
  showNotifications = true
}) => {
  const { user } = useAuth();
  const { notifications } = useNotifications();
  
  return (
    <div className="layout">
      <Navbar user={user} />
      {showSidebar && <Sidebar />}
      <main className="content">{children}</main>
      {showNotifications && (
        <NotificationCenter notifications={notifications} />
      )}
    </div>
  );
};
```

#### LoadBoard Component
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

const LoadBoard: React.FC<LoadBoardProps> = ({
  filters,
  view,
  onFilterChange
}) => {
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

### 2.2 Feature Components

#### CarrierMatching Component
```typescript
// CarrierMatching.tsx
interface CarrierMatchingProps {
  loadId: string;
  onMatchSelect: (carrierId: string) => void;
}

const CarrierMatching: React.FC<CarrierMatchingProps> = ({
  loadId,
  onMatchSelect
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

#### ShipmentTracker Component
```typescript
// ShipmentTracker.tsx
interface ShipmentTrackerProps {
  shipmentId: string;
  onStatusUpdate: (status: ShipmentStatus) => void;
}

const ShipmentTracker: React.FC<ShipmentTrackerProps> = ({
  shipmentId,
  onStatusUpdate
}) => {
  const {
    shipment,
    currentLocation,
    eta,
    updateLocation
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

### 2.3 UI Components

#### Button Component
```typescript
// ui/Button.tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading,
  icon,
  children,
  ...props
}) => {
  return (
    <button
      className={cn(
        'button',
        `button--${variant}`,
        `button--${size}`,
        loading && 'button--loading'
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <Spinner size={size} />
      ) : (
        <>
          {icon && <span className="button__icon">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};
```

## 3. Custom Hooks

### 3.1 Data Hooks

#### useLoads
```typescript
// hooks/useLoads.ts
interface UseLoadsOptions {
  filters: LoadFilters;
  pageSize?: number;
}

function useLoads({
  filters,
  pageSize = 20
}: UseLoadsOptions) {
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

### 3.2 Utility Hooks

#### useWebSocket
```typescript
// hooks/useWebSocket.ts
interface WebSocketOptions {
  url: string;
  onMessage?: (data: any) => void;
  onError?: (error: Error) => void;
  reconnectAttempts?: number;
}

function useWebSocket({
  url,
  onMessage,
  onError,
  reconnectAttempts = 3
}: WebSocketOptions) {
  const ws = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  
  useEffect(() => {
    const connect = () => {
      ws.current = new WebSocket(url);
      
      ws.current.onopen = () => {
        setStatus('connected');
      };
      
      ws.current.onmessage = (event) => {
        onMessage?.(JSON.parse(event.data));
      };
      
      ws.current.onerror = (error) => {
        onError?.(error);
        setStatus('error');
      };
      
      ws.current.onclose = () => {
        setStatus('disconnected');
      };
    };
    
    connect();
    
    return () => {
      ws.current?.close();
    };
  }, [url, onMessage, onError]);
  
  return { status };
}
```

## 4. State Management

### 4.1 Zustand Store Structure
```typescript
// store/index.ts
interface AppState {
  loads: LoadsSlice;
  user: UserSlice;
  ui: UISlice;
}

const useStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        loads: createLoadsSlice(set),
        user: createUserSlice(set),
        ui: createUISlice(set)
      }),
      {
        name: 'app-store'
      }
    )
  )
);

// store/slices/loads.ts
interface LoadsSlice {
  items: Load[];
  filters: LoadFilters;
  selected: Load | null;
  
  setLoads: (loads: Load[]) => void;
  updateFilters: (filters: Partial<LoadFilters>) => void;
  selectLoad: (load: Load | null) => void;
}

const createLoadsSlice = (set: SetState<AppState>) => ({
  items: [],
  filters: defaultFilters,
  selected: null,
  
  setLoads: (loads) => set((state) => ({
    loads: { ...state.loads, items: loads }
  })),
  
  updateFilters: (filters) => set((state) => ({
    loads: {
      ...state.loads,
      filters: { ...state.loads.filters, ...filters }
    }
  })),
  
  selectLoad: (load) => set((state) => ({
    loads: { ...state.loads, selected: load }
  }))
});
```

## 5. Performance Optimization

### 5.1 Component Optimization
```typescript
// Memoization example
const MemoizedLoadCard = React.memo(LoadCard, (prev, next) => {
  return (
    prev.id === next.id &&
    prev.status === next.status &&
    prev.version === next.version
  );
});

// Virtual list for large datasets
const VirtualizedLoadList: React.FC<LoadListProps> = ({
  loads,
  rowHeight = 60
}) => {
  return (
    <VirtualList
      height={600}
      itemCount={loads.length}
      itemSize={rowHeight}
      width="100%"
    >
      {({ index, style }) => (
        <LoadCard
          key={loads[index].id}
          load={loads[index]}
          style={style}
        />
      )}
    </VirtualList>
  );
};
```

### 5.2 Data Optimization
```typescript
// Optimistic updates
const useUpdateLoad = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateLoad,
    onMutate: async (newLoad) => {
      await queryClient.cancelQueries(['loads']);
      
      const previousLoads = queryClient.getQueryData(['loads']);
      
      queryClient.setQueryData(['loads'], (old: Load[]) => 
        old.map((load) =>
          load.id === newLoad.id ? newLoad : load
        )
      );
      
      return { previousLoads };
    },
    onError: (err, newLoad, context) => {
      queryClient.setQueryData(
        ['loads'],
        context.previousLoads
      );
    }
  });
};
```

## 6. Error Handling

### 6.1 Error Boundaries
```typescript
class ErrorBoundary extends React.Component<
  { fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Error boundary caught an error:', error, info);
    
    // Log to monitoring service
    errorMonitor.track(error, {
      component: this.constructor.name,
      ...info
    });
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
```

### 6.2 API Error Handling
```typescript
// hooks/useApi.ts
interface UseApiOptions<T> {
  onError?: (error: Error) => void;
  onSuccess?: (data: T) => void;
}

function useApi<T>({
  onError,
  onSuccess
}: UseApiOptions<T> = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  
  const execute = async (promise: Promise<T>) => {
    try {
      setLoading(true);
      const result = await promise;
      setData(result);
      onSuccess?.(result);
      return result;
    } catch (err) {
      setError(err);
      onError?.(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  return { data, error, loading, execute };
}
```

## 7. Testing Strategy

### 7.1 Component Testing
```typescript
// LoadCard.test.tsx
describe('LoadCard', () => {
  const mockLoad = {
    id: '1',
    origin: 'NYC',
    destination: 'LA',
    status: 'active'
  };
  
  it('renders load details correctly', () => {
    render(<LoadCard load={mockLoad} />);
    
    expect(screen.getByText('NYC')).toBeInTheDocument();
    expect(screen.getByText('LA')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
  });
  
  it('handles click events', () => {
    const onSelect = jest.fn();
    render(<LoadCard load={mockLoad} onSelect={onSelect} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith(mockLoad);
  });
  
  it('shows loading state', () => {
    render(<LoadCard load={mockLoad} loading />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});
```

### 7.2 Integration Testing
```typescript
// LoadBoard.test.tsx
describe('LoadBoard Integration', () => {
  beforeEach(() => {
    // Mock API responses
    server.use(
      rest.get('/api/loads', (req, res, ctx) => {
        return res(ctx.json(mockLoads));
      })
    );
  });
  
  it('loads and displays data correctly', async () => {
    render(<LoadBoard />);
    
    // Wait for data to load
    expect(await screen.findByText('Load #123')).toBeInTheDocument();
    
    // Test filtering
    fireEvent.click(screen.getByText('Filter'));
    fireEvent.click(screen.getByText('Active'));
    
    // Verify filtered results
    expect(screen.queryByText('Load #456')).not.toBeInTheDocument();
  });
  
  it('handles errors gracefully', async () => {
    server.use(
      rest.get('/api/loads', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );
    
    render(<LoadBoard />);
    
    expect(await screen.findByText('Error loading loads')).toBeInTheDocument();
  });
});
