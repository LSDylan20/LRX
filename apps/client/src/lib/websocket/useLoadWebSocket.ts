import { useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { useStore } from '@/store';
import type { Load, LoadUpdate, MatchResult } from '@/types';

export const useLoadWebSocket = (loadId?: string) => {
  const { subscribe, joinRoom, leaveRoom } = useWebSocket();
  const { updateLoad, addMatch, setLoadStatus } = useStore();

  // Handle load updates
  const handleLoadUpdate = useCallback((update: LoadUpdate) => {
    updateLoad(update);
  }, [updateLoad]);

  // Handle new matches
  const handleNewMatch = useCallback((match: MatchResult) => {
    addMatch(match);
  }, [addMatch]);

  // Handle load status changes
  const handleStatusChange = useCallback((status: string) => {
    if (loadId) {
      setLoadStatus(loadId, status);
    }
  }, [loadId, setLoadStatus]);

  useEffect(() => {
    if (!loadId) return;

    // Join load-specific room
    const room = `load_${loadId}`;
    joinRoom(room);

    // Subscribe to load-specific events
    const unsubscribeUpdate = subscribe<LoadUpdate>('load_update', handleLoadUpdate);
    const unsubscribeMatch = subscribe<MatchResult>('new_match', handleNewMatch);
    const unsubscribeStatus = subscribe<string>('status_change', handleStatusChange);

    return () => {
      leaveRoom(room);
      unsubscribeUpdate();
      unsubscribeMatch();
      unsubscribeStatus();
    };
  }, [
    loadId,
    joinRoom,
    leaveRoom,
    subscribe,
    handleLoadUpdate,
    handleNewMatch,
    handleStatusChange,
  ]);

  // Return methods for sending updates
  return {
    updateLoadStatus: useCallback((status: string) => {
      if (loadId) {
        emit('update_status', { loadId, status });
      }
    }, [loadId]),
    
    startMatching: useCallback(() => {
      if (loadId) {
        emit('start_matching', { loadId });
      }
    }, [loadId]),
    
    stopMatching: useCallback(() => {
      if (loadId) {
        emit('stop_matching', { loadId });
      }
    }, [loadId]),
  };
};
