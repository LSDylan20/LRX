import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/utils';
import { LoadForm } from '../components/LoadForm';
import { useLoadStore } from '@/store/loads';

// Mock the store
vi.mock('@/store/loads', () => ({
  useLoadStore: vi.fn(),
}));

describe('LoadForm', () => {
  const mockCreateLoad = vi.fn();
  
  beforeEach(() => {
    vi.mocked(useLoadStore).mockReturnValue({
      createLoad: mockCreateLoad,
    } as any);
  });

  it('renders all form fields', () => {
    render(<LoadForm />);
    
    expect(screen.getByLabelText(/origin/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/destination/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/equipment type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/weight/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/pickup date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/delivery date/i)).toBeInTheDocument();
  });

  it('submits form with valid data', async () => {
    render(<LoadForm />);
    
    // Fill form
    fireEvent.change(screen.getByLabelText(/origin/i), {
      target: { value: 'New York, NY' },
    });
    fireEvent.change(screen.getByLabelText(/destination/i), {
      target: { value: 'Los Angeles, CA' },
    });
    fireEvent.change(screen.getByLabelText(/equipment type/i), {
      target: { value: 'flatbed' },
    });
    fireEvent.change(screen.getByLabelText(/weight/i), {
      target: { value: '15000' },
    });
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    
    await waitFor(() => {
      expect(mockCreateLoad).toHaveBeenCalledWith(expect.objectContaining({
        origin: 'New York, NY',
        destination: 'Los Angeles, CA',
        equipment_type: 'flatbed',
        weight: 15000,
      }));
    });
  });

  it('shows validation errors for required fields', async () => {
    render(<LoadForm />);
    
    // Submit without filling form
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/origin is required/i)).toBeInTheDocument();
      expect(screen.getByText(/destination is required/i)).toBeInTheDocument();
      expect(screen.getByText(/equipment type is required/i)).toBeInTheDocument();
      expect(screen.getByText(/weight is required/i)).toBeInTheDocument();
    });
  });
});
