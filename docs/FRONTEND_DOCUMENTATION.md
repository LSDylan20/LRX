# Frontend Documentation

## Overview
This document outlines the frontend architecture, components, and implementation details for the LaneRunner platform.

## 1. Architecture

### 1.1 Technology Stack
- React 18 with TypeScript
- Zustand for state management
- TailwindCSS for styling
- React Query for data fetching
- React Router for navigation
- React Testing Library for testing

### 1.2 Project Structure
```
src/
├── components/
│   ├── ui/             # Reusable UI components
│   ├── common/         # Common business components
│   └── features/       # Feature-specific components
├── hooks/              # Custom hooks
├── pages/             # Page components
├── store/             # Zustand store
├── api/               # API client
├── utils/             # Utility functions
└── types/             # TypeScript types
```

## 2. State Management

### 2.1 Zustand Store Structure
```typescript
interface LoadStore {
  loads: Load[];
  selectedLoad: Load | null;
  filters: LoadFilters;
  sorting: SortConfig;
  
  // Actions
  setLoads: (loads: Load[]) => void;
  selectLoad: (load: Load) => void;
  updateFilters: (filters: Partial<LoadFilters>) => void;
  setSorting: (config: SortConfig) => void;
}

interface UserStore {
  user: User | null;
  preferences: UserPreferences;
  notifications: Notification[];
  
  // Actions
  setUser: (user: User) => void;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  addNotification: (notification: Notification) => void;
}
```

### 2.2 Store Implementation
```typescript
import create from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export const useLoadStore = create<LoadStore>()(
  devtools(
    persist(
      (set) => ({
        loads: [],
        selectedLoad: null,
        filters: defaultFilters,
        sorting: defaultSorting,
        
        setLoads: (loads) => set({ loads }),
        selectLoad: (load) => set({ selectedLoad: load }),
        updateFilters: (filters) => 
          set((state) => ({
            filters: { ...state.filters, ...filters }
          })),
        setSorting: (config) => set({ sorting: config })
      }),
      {
        name: 'load-store'
      }
    )
  )
);
```

## 3. Components

### 3.1 Component Architecture
```typescript
// Base Component Pattern
interface BaseProps {
  className?: string;
  children?: React.ReactNode;
}

const BaseComponent: React.FC<BaseProps> = ({
  className,
  children
}) => {
  return (
    <div className={cn('base-styles', className)}>
      {children}
    </div>
  );
};

// Feature Component Pattern
interface FeatureProps {
  data: FeatureData;
  onAction: (data: ActionData) => void;
}

const FeatureComponent: React.FC<FeatureProps> = ({
  data,
  onAction
}) => {
  const store = useStore();
  const query = useQuery();
  
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <BaseComponent>
        {/* Component logic */}
      </BaseComponent>
    </ErrorBoundary>
  );
};
```

### 3.2 Error Boundaries
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
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
```

## 4. Data Fetching

### 4.1 API Client
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle token refresh
    }
    return Promise.reject(error);
  }
);
```

### 4.2 React Query Implementation
```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

export const useLoads = (filters: LoadFilters) => {
  return useQuery({
    queryKey: ['loads', filters],
    queryFn: () => api.getLoads(filters),
    staleTime: 1000 * 60 * 5 // 5 minutes
  });
};

export const useUpdateLoad = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: UpdateLoadData) => 
      api.updateLoad(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['loads']);
    }
  });
};
```

## 5. Routing

### 5.1 Route Configuration
```typescript
import {
  createBrowserRouter,
  RouterProvider
} from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        path: 'loads',
        element: <LoadsPage />,
        loader: loadsLoader
      },
      {
        path: 'loads/:id',
        element: <LoadDetailsPage />,
        loader: loadDetailsLoader
      }
    ]
  }
]);
```

### 5.2 Route Guards
```typescript
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const { user } = useUserStore();
  const location = useLocation();
  
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} />;
  }
  
  return <>{children}</>;
};
```

## 6. Testing

### 6.1 Component Testing
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { LoadCard } from './LoadCard';

describe('LoadCard', () => {
  const mockLoad = {
    id: '1',
    origin: 'NYC',
    destination: 'LA'
  };
  
  it('renders load details correctly', () => {
    render(<LoadCard load={mockLoad} />);
    
    expect(screen.getByText('NYC')).toBeInTheDocument();
    expect(screen.getByText('LA')).toBeInTheDocument();
  });
  
  it('handles click events', () => {
    const onSelect = jest.fn();
    render(<LoadCard load={mockLoad} onSelect={onSelect} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith(mockLoad);
  });
});
```

### 6.2 Integration Testing
```typescript
import { renderWithProviders } from '../test-utils';
import { LoadsPage } from './LoadsPage';

describe('LoadsPage Integration', () => {
  it('loads and displays data correctly', async () => {
    renderWithProviders(<LoadsPage />);
    
    // Wait for data to load
    expect(await screen.findByText('Loads')).toBeInTheDocument();
    
    // Check filtering
    fireEvent.click(screen.getByText('Filter'));
    // ... test filter interactions
    
    // Check sorting
    fireEvent.click(screen.getByText('Sort'));
    // ... test sort interactions
  });
});
```

## 7. Performance

### 7.1 Code Splitting
```typescript
const LoadsPage = React.lazy(() => import('./pages/LoadsPage'));
const LoadDetailsPage = React.lazy(() => import('./pages/LoadDetailsPage'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/loads" element={<LoadsPage />} />
        <Route path="/loads/:id" element={<LoadDetailsPage />} />
      </Routes>
    </Suspense>
  );
}
```

### 7.2 Memoization
```typescript
const MemoizedLoadCard = React.memo(LoadCard, (prev, next) => {
  return (
    prev.id === next.id &&
    prev.status === next.status &&
    prev.version === next.version
  );
});

const useLoadData = (loadId: string) => {
  const loadQuery = useQuery(['load', loadId], () => 
    fetchLoad(loadId)
  );
  
  return React.useMemo(
    () => processLoadData(loadQuery.data),
    [loadQuery.data]
  );
};
```

## 8. Accessibility

### 8.1 ARIA Implementation
```typescript
const LoadCard: React.FC<LoadCardProps> = ({ load }) => {
  return (
    <div
      role="article"
      aria-labelledby={`load-${load.id}-title`}
    >
      <h3 id={`load-${load.id}-title`}>
        Load #{load.id}
      </h3>
      <div role="status" aria-live="polite">
        Status: {load.status}
      </div>
      <button
        aria-label={`Select load ${load.id}`}
        onClick={() => onSelect(load)}
      >
        Select
      </button>
    </div>
  );
};
```

### 8.2 Keyboard Navigation
```typescript
const NavigationMenu: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        setActiveIndex((i) => Math.min(i + 1, items.length - 1));
        break;
      case 'ArrowUp':
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
    }
  };
  
  return (
    <nav role="navigation" onKeyDown={handleKeyDown}>
      {items.map((item, index) => (
        <a
          key={item.id}
          href={item.href}
          tabIndex={index === activeIndex ? 0 : -1}
          aria-current={index === activeIndex ? 'page' : undefined}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
};
```

## 9. Monitoring

### 9.1 Error Tracking
```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0
});

class GlobalErrorBoundary extends Sentry.ErrorBoundary {
  render() {
    return this.props.children;
  }
}
```

### 9.2 Performance Monitoring
```typescript
import { Profiler } from 'react';

const onRenderCallback = (
  id: string,
  phase: string,
  actualDuration: number,
  baseDuration: number
) => {
  if (actualDuration > 16) { // 60fps threshold
    console.warn(`Slow render detected in ${id}`);
  }
};

const ProfiledComponent = () => (
  <Profiler id="MyComponent" onRender={onRenderCallback}>
    <MyComponent />
  </Profiler>
);
```
