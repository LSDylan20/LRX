import { create } from 'zustand'
import { supabase } from '@lib/supabase/client'
import type { Database } from '@types/database'
import type { MessageWithRelations } from '@types/models'

type Message = Database['public']['Tables']['messages']['Row']
type MessageInsert = Database['public']['Tables']['messages']['Insert']
type Notification = Database['public']['Tables']['notifications']['Row']

/**
 * Custom error class for message-related errors
 * Provides consistent error handling across messaging features
 */
class MessageError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message)
    this.name = 'MessageError'
  }
}

interface MessagesState {
  messages: Message[]
  notifications: Notification[]
  selectedMessage: MessageWithRelations | null
  unreadCount: number
  isLoading: boolean
  error: Error | null

  // Sync Actions
  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  updateMessage: (id: string, updates: Partial<Message>) => void
  removeMessage: (id: string) => void
  setNotifications: (notifications: Notification[]) => void
  addNotification: (notification: Notification) => void
  markNotificationRead: (id: string) => void
  setSelectedMessage: (message: MessageWithRelations | null) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: Error | null) => void

  // Async Actions
  fetchMessages: (userId: string) => Promise<void>
  fetchNotifications: (userId: string) => Promise<void>
  sendMessage: (message: MessageInsert) => Promise<void>
  markAllNotificationsRead: (userId: string) => Promise<void>
  subscribeToMessages: (userId: string) => () => void
  subscribeToNotifications: (userId: string) => () => void
}

/**
 * Messages store managing messages and notifications
 * Implements real-time updates for instant messaging features
 */
export const useMessagesStore = create<MessagesState>((set, get) => ({
  messages: [],
  notifications: [],
  selectedMessage: null,
  unreadCount: 0,
  isLoading: false,
  error: null,

  // Sync Actions
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message] 
  })),
  updateMessage: (id, updates) => set((state) => ({
    messages: state.messages.map(message => 
      message.id === id ? { ...message, ...updates } : message
    )
  })),
  removeMessage: (id) => set((state) => ({
    messages: state.messages.filter(message => message.id !== id)
  })),
  setNotifications: (notifications) => set({ 
    notifications,
    unreadCount: notifications.filter(n => !n.read_status).length
  }),
  addNotification: (notification) => set((state) => ({ 
    notifications: [...state.notifications, notification],
    unreadCount: state.unreadCount + (notification.read_status ? 0 : 1)
  })),
  markNotificationRead: (id) => set((state) => ({
    notifications: state.notifications.map(notification =>
      notification.id === id ? { ...notification, read_status: true } : notification
    ),
    unreadCount: state.unreadCount - 1
  })),
  setSelectedMessage: (message) => set({ selectedMessage: message }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Async Actions
  fetchMessages: async (userId: string) => {
    const { setLoading, setError, setMessages } = get()
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!sender_id(*),
          recipient:users!recipient_id(*),
          load:loads(*)
        `)
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false })
      
      if (error) {
        throw new MessageError(
          'Failed to fetch messages',
          'FETCH_ERROR',
          error
        )
      }
      
      setMessages(data)
    } catch (error) {
      setError(error as Error)
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  },

  fetchNotifications: async (userId: string) => {
    const { setLoading, setError, setNotifications } = get()
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) {
        throw new MessageError(
          'Failed to fetch notifications',
          'FETCH_NOTIFICATIONS_ERROR',
          error
        )
      }
      
      setNotifications(data)
    } catch (error) {
      setError(error as Error)
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  },

  sendMessage: async (message: MessageInsert) => {
    const { setLoading, setError, addMessage } = get()
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('messages')
        .insert(message)
        .select(`
          *,
          sender:users!sender_id(*),
          recipient:users!recipient_id(*),
          load:loads(*)
        `)
        .single()
      
      if (error) {
        throw new MessageError(
          'Failed to send message',
          'SEND_ERROR',
          error
        )
      }
      
      if (data) addMessage(data)
    } catch (error) {
      setError(error as Error)
      console.error('Error sending message:', error)
    } finally {
      setLoading(false)
    }
  },

  markAllNotificationsRead: async (userId: string) => {
    const { setLoading, setError, setNotifications } = get()
    try {
      setLoading(true)
      const { error } = await supabase
        .from('notifications')
        .update({ read_status: true })
        .eq('user_id', userId)
      
      if (error) {
        throw new MessageError(
          'Failed to mark notifications as read',
          'UPDATE_NOTIFICATIONS_ERROR',
          error
        )
      }
      
      // Refresh notifications
      await get().fetchNotifications(userId)
    } catch (error) {
      setError(error as Error)
      console.error('Error marking notifications as read:', error)
    } finally {
      setLoading(false)
    }
  },

  subscribeToMessages: (userId: string) => {
    // Set up real-time subscription for messages
    const subscription = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${userId},recipient_id=eq.${userId}`
        },
        (payload) => get().addMessage(payload.new as Message)
      )
      .subscribe()

    // Return cleanup function
    return () => {
      subscription.unsubscribe()
    }
  },

  subscribeToNotifications: (userId: string) => {
    // Set up real-time subscription for notifications
    const subscription = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => get().addNotification(payload.new as Notification)
      )
      .subscribe()

    // Return cleanup function
    return () => {
      subscription.unsubscribe()
    }
  },
}))
