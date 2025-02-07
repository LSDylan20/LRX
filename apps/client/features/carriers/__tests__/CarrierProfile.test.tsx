import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/utils';
import { CarrierProfile } from '../components/CarrierProfile';
import { useCarrierStore } from '@/store/carriers';

// Mock the store
vi.mock('@/store/carriers', () => ({
  useCarrierStore: vi.fn(),
}));

describe('CarrierProfile', () => {
  const mockCarrier = {
    id: 'carrier1',
    user_id: 'user1',
    company_name: 'Test Carrier Inc',
    mc_number: 'MC123456',
    dot_number: 'DOT789012',
    equipment_types: ['flatbed', 'reefer'],
    service_areas: ['NY', 'NJ', 'PA'],
    insurance: {
      liability: {
        provider: 'Test Insurance',
        policy_number: 'POL123',
        expiry_date: '2025-12-31',
        coverage_amount: 1000000,
      },
    },
    rating: 4.5,
    total_reviews: 50,
    status: 'active',
  };

  const mockUpdateCarrier = vi.fn();
  const mockAddVehicle = vi.fn();

  beforeEach(() => {
    vi.mocked(useCarrierStore).mockReturnValue({
      carrier: mockCarrier,
      updateCarrier: mockUpdateCarrier,
      addVehicle: mockAddVehicle,
    } as any);
  });

  it('renders carrier details', () => {
    render(<CarrierProfile carrierId="carrier1" />);
    
    expect(screen.getByText('Test Carrier Inc')).toBeInTheDocument();
    expect(screen.getByText('MC123456')).toBeInTheDocument();
    expect(screen.getByText('DOT789012')).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('50 reviews')).toBeInTheDocument();
  });

  it('allows editing of service areas', async () => {
    render(<CarrierProfile carrierId="carrier1" />);
    
    fireEvent.click(screen.getByRole('button', { name: /edit service areas/i }));
    
    const checkbox = screen.getByLabelText('CA');
    fireEvent.click(checkbox);
    
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    
    await waitFor(() => {
      expect(mockUpdateCarrier).toHaveBeenCalledWith('carrier1', {
        service_areas: ['NY', 'NJ', 'PA', 'CA'],
      });
    });
  });

  it('allows adding new vehicles', async () => {
    render(<CarrierProfile carrierId="carrier1" />);
    
    fireEvent.click(screen.getByRole('button', { name: /add vehicle/i }));
    
    // Fill vehicle form
    fireEvent.change(screen.getByLabelText(/type/i), {
      target: { value: 'flatbed' },
    });
    fireEvent.change(screen.getByLabelText(/make/i), {
      target: { value: 'Freightliner' },
    });
    fireEvent.change(screen.getByLabelText(/model/i), {
      target: { value: 'Cascadia' },
    });
    fireEvent.change(screen.getByLabelText(/year/i), {
      target: { value: '2023' },
    });
    
    fireEvent.click(screen.getByRole('button', { name: /save vehicle/i }));
    
    await waitFor(() => {
      expect(mockAddVehicle).toHaveBeenCalledWith('carrier1', {
        type: 'flatbed',
        make: 'Freightliner',
        model: 'Cascadia',
        year: 2023,
      });
    });
  });

  it('displays insurance information', () => {
    render(<CarrierProfile carrierId="carrier1" />);
    
    expect(screen.getByText('Test Insurance')).toBeInTheDocument();
    expect(screen.getByText('POL123')).toBeInTheDocument();
    expect(screen.getByText('$1,000,000')).toBeInTheDocument();
    expect(screen.getByText('12/31/2025')).toBeInTheDocument();
  });

  it('shows error message when update fails', async () => {
    const error = new Error('Failed to update carrier');
    mockUpdateCarrier.mockRejectedValueOnce(error);

    render(<CarrierProfile carrierId="carrier1" />);
    
    fireEvent.click(screen.getByRole('button', { name: /edit service areas/i }));
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/failed to update carrier/i)).toBeInTheDocument();
    });
  });
});
