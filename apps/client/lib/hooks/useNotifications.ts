import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuthStore } from '../store';
import type { Database } from '../database.types';

type Notification = Database['public']['Tables']['notifications']['Row'];

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  status: 'loading' | 'error' | 'success';
  error: string | null;
}

/**
 * Custom hook for managing real-time notifications
 * Handles fetching, subscribing to, and managing notification state
 */
export function useNotifications() {
  const user = useAuthStore(state => state.user);
  const [state, setState] = useState<NotificationState>({
    notifications: [],
    unreadCount: 0,
    status: 'loading',
    error: null,
  });

  useEffect(() => {
    if (!user) return;

    // Initial fetch
    fetchNotifications();

    // Set up real-time subscription
    const subscription = supabase
      .channel(`notifications-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        handleNotificationChange(payload);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const unreadCount = data.filter(n => !n.read).length;

      setState({
        notifications: data,
        unreadCount,
        status: 'success',
        error: null,
      });
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: err.message,
      }));
    }
  };

  const handleNotificationChange = (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: Notification;
    old: Notification;
  }) => {
    setState(prev => {
      let notifications: Notification[];
      let unreadCount = prev.unreadCount;

      switch (payload.eventType) {
        case 'INSERT':
          notifications = [payload.new, ...prev.notifications];
          unreadCount += 1;
          break;

        case 'UPDATE':
          notifications = prev.notifications.map(n =>
            n.id === payload.new.id ? payload.new : n
          );
          unreadCount = notifications.filter(n => !n.read).length;
          break;

        case 'DELETE':
          notifications = prev.notifications.filter(n => n.id !== payload.old.id);
          unreadCount = notifications.filter(n => !n.read).length;
          break;

        default:
          notifications = prev.notifications;
      }

      return {
        ...prev,
        notifications,
        unreadCount,
      };
    });
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: err.message,
      }));
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: err.message,
      }));
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: err.message,
      }));
    }
  };

  return {
    ...state,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: fetchNotifications,
  };
}
