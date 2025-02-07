import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/utils';
import { ShipmentTracker } from '../components/ShipmentTracker';
import { useShipmentStore } from '@/store/shipments';

// Mock the store
vi.mock('@/store/shipments', () => ({
  useShipmentStore: vi.fn(),
}));

describe('ShipmentTracker', () => {
  const mockShipment = {
    id: 'shipment1',
    load_id: 'load1',
    carrier_id: 'carrier1',
    status: 'in_transit',
    current_location: {
      latitude: 40.7128,
      longitude: -74.0060,
      address: 'New York, NY',
      timestamp: new Date().toISOString(),
    },
    pickup_time: new Date().toISOString(),
    delivery_time: null,
    tracking_number: 'TRK123456',
  };

  const mockUpdateLocation = vi.fn();
  const mockUpdateStatus = vi.fn();

  beforeEach(() => {
    vi.mocked(useShipmentStore).mockReturnValue({
      shipment: mockShipment,
      updateLocation: mockUpdateLocation,
      updateStatus: mockUpdateStatus,
    } as any);
  });

  it('renders shipment details', () => {
    render(<ShipmentTracker shipmentId="shipment1" />);
    
    expect(screen.getByText(/TRK123456/i)).toBeInTheDocument();
    expect(screen.getByText(/New York, NY/i)).toBeInTheDocument();
    expect(screen.getByText(/in transit/i)).toBeInTheDocument();
  });

  it('updates location when carrier updates position', async () => {
    render(<ShipmentTracker shipmentId="shipment1" />);
    
    const newLocation = {
      latitude: 40.7306,
      longitude: -73.9352,
      address: 'Brooklyn, NY',
    };
    
    // Simulate location update
    fireEvent.click(screen.getByRole('button', { name: /update location/i }));
    
    await waitFor(() => {
      expect(mockUpdateLocation).toHaveBeenCalledWith(
        'shipment1',
        expect.objectContaining(newLocation)
      );
    });
  });

  it('updates status when carrier marks delivery', async () => {
    render(<ShipmentTracker shipmentId="shipment1" />);
    
    // Simulate delivery completion
    fireEvent.click(screen.getByRole('button', { name: /mark as delivered/i }));
    
    await waitFor(() => {
      expect(mockUpdateStatus).toHaveBeenCalledWith('shipment1', 'delivered');
    });
  });

  it('displays error when location update fails', async () => {
    const error = new Error('Failed to update location');
    mockUpdateLocation.mockRejectedValueOnce(error);

    render(<ShipmentTracker shipmentId="shipment1" />);
    
    fireEvent.click(screen.getByRole('button', { name: /update location/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/failed to update location/i)).toBeInTheDocument();
    });
  });

  it('shows loading state while updating', async () => {
    mockUpdateLocation.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

    render(<ShipmentTracker shipmentId="shipment1" />);
    
    fireEvent.click(screen.getByRole('button', { name: /update location/i }));
    
    expect(screen.getByText(/updating/i)).toBeInTheDocument();
  });
});
