import { useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { useStore } from '@/store';
import type { 
  NegotiationUpdate, 
  AISuggestion, 
  MarketUpdate,
  Offer 
} from '@/types';

export const useNegotiationWebSocket = (negotiationId?: string) => {
  const { subscribe, joinRoom, leaveRoom, emit } = useWebSocket();
  const { 
    updateNegotiation, 
    addAISuggestion, 
    updateMarketData,
    addOffer 
  } = useStore();

  // Handle negotiation updates
  const handleNegotiationUpdate = useCallback((update: NegotiationUpdate) => {
    updateNegotiation(update);
  }, [updateNegotiation]);

  // Handle AI suggestions
  const handleAISuggestion = useCallback((suggestion: AISuggestion) => {
    addAISuggestion(suggestion);
  }, [addAISuggestion]);

  // Handle market updates
  const handleMarketUpdate = useCallback((update: MarketUpdate) => {
    updateMarketData(update);
  }, [updateMarketData]);

  // Handle new offers
  const handleNewOffer = useCallback((offer: Offer) => {
    addOffer(offer);
  }, [addOffer]);

  useEffect(() => {
    if (!negotiationId) return;

    // Join negotiation-specific room
    const room = `negotiation_${negotiationId}`;
    joinRoom(room);

    // Subscribe to negotiation-specific events
    const unsubscribeNegotiation = subscribe<NegotiationUpdate>(
      'negotiation_update',
      handleNegotiationUpdate
    );
    
    const unsubscribeAI = subscribe<AISuggestion>(
      'ai_suggestion',
      handleAISuggestion
    );
    
    const unsubscribeMarket = subscribe<MarketUpdate>(
      'market_update',
      handleMarketUpdate
    );
    
    const unsubscribeOffer = subscribe<Offer>(
      'new_offer',
      handleNewOffer
    );

    return () => {
      leaveRoom(room);
      unsubscribeNegotiation();
      unsubscribeAI();
      unsubscribeMarket();
      unsubscribeOffer();
    };
  }, [
    negotiationId,
    joinRoom,
    leaveRoom,
    subscribe,
    handleNegotiationUpdate,
    handleAISuggestion,
    handleMarketUpdate,
    handleNewOffer,
  ]);

  // Return methods for sending updates
  return {
    sendOffer: useCallback((offer: Omit<Offer, 'id'>) => {
      if (negotiationId) {
        emit('send_offer', { negotiationId, ...offer });
      }
    }, [negotiationId, emit]),

    requestAISuggestion: useCallback((context: any) => {
      if (negotiationId) {
        emit('request_ai_suggestion', { negotiationId, context });
      }
    }, [negotiationId, emit]),

    updateNegotiationStatus: useCallback((status: string) => {
      if (negotiationId) {
        emit('update_negotiation_status', { negotiationId, status });
      }
    }, [negotiationId, emit]),

    startVoiceCall: useCallback(() => {
      if (negotiationId) {
        emit('start_voice_call', { negotiationId });
      }
    }, [negotiationId, emit]),
  };
};
