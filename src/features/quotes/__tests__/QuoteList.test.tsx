import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/utils';
import { QuoteList } from '../components/QuoteList';
import { useQuoteStore } from '@/store/quotes';

// Mock the store
vi.mock('@/store/quotes', () => ({
  useQuoteStore: vi.fn(),
}));

describe('QuoteList', () => {
  const mockQuotes = [
    {
      id: '1',
      load_id: 'load1',
      carrier_id: 'carrier1',
      rate: 1500,
      status: 'pending',
      created_at: new Date().toISOString(),
      carrier: {
        id: 'carrier1',
        company_name: 'Test Carrier',
        mc_number: 'MC123456',
      },
    },
    {
      id: '2',
      load_id: 'load1',
      carrier_id: 'carrier2',
      rate: 1600,
      status: 'pending',
      created_at: new Date().toISOString(),
      carrier: {
        id: 'carrier2',
        company_name: 'Another Carrier',
        mc_number: 'MC789012',
      },
    },
  ];

  const mockAcceptQuote = vi.fn();
  const mockRejectQuote = vi.fn();

  beforeEach(() => {
    vi.mocked(useQuoteStore).mockReturnValue({
      quotes: mockQuotes,
      acceptQuote: mockAcceptQuote,
      rejectQuote: mockRejectQuote,
    } as any);
  });

  it('renders list of quotes', () => {
    render(<QuoteList loadId="load1" />);
    
    expect(screen.getByText('Test Carrier')).toBeInTheDocument();
    expect(screen.getByText('Another Carrier')).toBeInTheDocument();
    expect(screen.getByText('$1,500')).toBeInTheDocument();
    expect(screen.getByText('$1,600')).toBeInTheDocument();
  });

  it('handles quote acceptance', async () => {
    render(<QuoteList loadId="load1" />);
    
    const acceptButtons = screen.getAllByRole('button', { name: /accept/i });
    fireEvent.click(acceptButtons[0]);
    
    await waitFor(() => {
      expect(mockAcceptQuote).toHaveBeenCalledWith('1');
    });
  });

  it('handles quote rejection', async () => {
    render(<QuoteList loadId="load1" />);
    
    const rejectButtons = screen.getAllByRole('button', { name: /reject/i });
    fireEvent.click(rejectButtons[0]);
    
    await waitFor(() => {
      expect(mockRejectQuote).toHaveBeenCalledWith('1');
    });
  });

  it('displays no quotes message when empty', () => {
    vi.mocked(useQuoteStore).mockReturnValue({
      quotes: [],
      acceptQuote: mockAcceptQuote,
      rejectQuote: mockRejectQuote,
    } as any);

    render(<QuoteList loadId="load1" />);
    
    expect(screen.getByText(/no quotes available/i)).toBeInTheDocument();
  });
});
