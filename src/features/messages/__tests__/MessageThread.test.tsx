import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/utils';
import { MessageThread } from '../components/MessageThread';
import { useMessageStore } from '@/store/messages';

// Mock the store
vi.mock('@/store/messages', () => ({
  useMessageStore: vi.fn(),
}));

describe('MessageThread', () => {
  const mockMessages = [
    {
      id: 'msg1',
      sender_id: 'user1',
      recipient_id: 'user2',
      content: 'Hello, is the load still available?',
      status: 'sent',
      created_at: '2025-02-03T12:00:00Z',
    },
    {
      id: 'msg2',
      sender_id: 'user2',
      recipient_id: 'user1',
      content: 'Yes, it is! Are you interested?',
      status: 'sent',
      created_at: '2025-02-03T12:05:00Z',
    },
  ];

  const mockSendMessage = vi.fn();
  const mockMarkAsRead = vi.fn();

  beforeEach(() => {
    vi.mocked(useMessageStore).mockReturnValue({
      messages: mockMessages,
      sendMessage: mockSendMessage,
      markAsRead: mockMarkAsRead,
    } as any);
  });

  it('renders message thread', () => {
    render(<MessageThread threadId="thread1" />);
    
    expect(screen.getByText('Hello, is the load still available?')).toBeInTheDocument();
    expect(screen.getByText('Yes, it is! Are you interested?')).toBeInTheDocument();
  });

  it('sends new message', async () => {
    render(<MessageThread threadId="thread1" />);
    
    const input = screen.getByPlaceholderText(/type a message/i);
    fireEvent.change(input, {
      target: { value: 'Yes, I would like to submit a quote.' },
    });
    
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    
    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith({
        thread_id: 'thread1',
        content: 'Yes, I would like to submit a quote.',
      });
    });
  });

  it('marks messages as read when viewed', async () => {
    render(<MessageThread threadId="thread1" />);
    
    await waitFor(() => {
      expect(mockMarkAsRead).toHaveBeenCalledWith(['msg1', 'msg2']);
    });
  });

  it('displays message timestamps', () => {
    render(<MessageThread threadId="thread1" />);
    
    expect(screen.getByText('12:00')).toBeInTheDocument();
    expect(screen.getByText('12:05')).toBeInTheDocument();
  });

  it('shows loading state while sending message', async () => {
    mockSendMessage.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

    render(<MessageThread threadId="thread1" />);
    
    const input = screen.getByPlaceholderText(/type a message/i);
    fireEvent.change(input, {
      target: { value: 'Test message' },
    });
    
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    
    expect(screen.getByText(/sending/i)).toBeInTheDocument();
  });

  it('displays error when sending fails', async () => {
    const error = new Error('Failed to send message');
    mockSendMessage.mockRejectedValueOnce(error);

    render(<MessageThread threadId="thread1" />);
    
    const input = screen.getByPlaceholderText(/type a message/i);
    fireEvent.change(input, {
      target: { value: 'Test message' },
    });
    
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/failed to send message/i)).toBeInTheDocument();
    });
  });

  it('handles empty message thread', () => {
    vi.mocked(useMessageStore).mockReturnValue({
      messages: [],
      sendMessage: mockSendMessage,
      markAsRead: mockMarkAsRead,
    } as any);

    render(<MessageThread threadId="thread1" />);
    
    expect(screen.getByText(/no messages yet/i)).toBeInTheDocument();
  });
});
