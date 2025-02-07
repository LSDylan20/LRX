import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react';
import type { Database } from '../../../lib/database.types';

type Quote = Database['public']['Tables']['quotes']['Row'] & {
  load?: Database['public']['Tables']['loads']['Row'];
  carrier?: Database['public']['Tables']['users']['Row'];
};

interface QuoteManagementProps {
  loadId: string;
  onClose?: () => void;
}

export default function QuoteManagement({ loadId, onClose }: QuoteManagementProps) {
  const user = useAuthStore((state) => state.user);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newQuote, setNewQuote] = useState({
    price: '',
    delivery_date: '',
    terms_and_conditions: '',
  });

  useEffect(() => {
    fetchQuotes();
    const subscription = subscribeToQuotes();
    return () => {
      subscription.unsubscribe();
    };
  }, [loadId]);

  const fetchQuotes = async () => {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          load:loads(*),
          carrier:users!quotes_carrier_id_fkey(*)
        `)
        .eq('load_id', loadId);

      if (error) throw error;
      setQuotes(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToQuotes = () => {
    return supabase
      .channel(`quotes-${loadId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'quotes',
        filter: `load_id=eq.${loadId}`,
      }, () => {
        fetchQuotes();
      })
      .subscribe();
  };

  const submitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('quotes')
        .insert({
          load_id: loadId,
          carrier_id: user.id,
          price: parseFloat(newQuote.price),
          delivery_date: newQuote.delivery_date,
          terms_and_conditions: newQuote.terms_and_conditions,
          status: 'pending',
        });

      if (error) throw error;

      setNewQuote({
        price: '',
        delivery_date: '',
        terms_and_conditions: '',
      });

      // Create notification for shipper
      const { data: loadData } = await supabase
        .from('loads')
        .select('shipper_id')
        .eq('id', loadId)
        .single();

      if (loadData) {
        await supabase
          .from('notifications')
          .insert({
            user_id: loadData.shipper_id,
            message: `New quote received for load ${loadId}`,
          });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateQuoteStatus = async (quoteId: string, status: 'accepted' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('quotes')
        .update({ status })
        .eq('id', quoteId);

      if (error) throw error;

      // Create notification for carrier
      const quote = quotes.find(q => q.id === quoteId);
      if (quote) {
        await supabase
          .from('notifications')
          .insert({
            user_id: quote.carrier_id,
            message: `Your quote for load ${loadId} has been ${status}`,
          });
      }

      // If accepted, create shipment
      if (status === 'accepted') {
        const { error: shipmentError } = await supabase
          .from('shipments')
          .insert({
            load_id: loadId,
            carrier_id: quote?.carrier_id,
            status: 'pending',
          });

        if (shipmentError) throw shipmentError;

        // Update load status
        const { error: loadError } = await supabase
          .from('loads')
          .update({ status: 'assigned' })
          .eq('id', loadId);

        if (loadError) throw loadError;
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {user?.role === 'carrier' && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Submit Quote</h3>
          
          <form onSubmit={submitQuote} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price (USD)
              </label>
              <input
                type="number"
                value={newQuote.price}
                onChange={(e) => setNewQuote(prev => ({ ...prev, price: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Date
              </label>
              <input
                type="datetime-local"
                value={newQuote.delivery_date}
                onChange={(e) => setNewQuote(prev => ({ ...prev, delivery_date: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Terms and Conditions
              </label>
              <textarea
                value={newQuote.terms_and_conditions}
                onChange={(e) => setNewQuote(prev => ({ ...prev, terms_and_conditions: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md"
                rows={4}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Quote'}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Quotes</h3>
        
        <div className="space-y-4">
          {loading ? (
            <p className="text-center text-gray-600">Loading quotes...</p>
          ) : quotes.length === 0 ? (
            <p className="text-center text-gray-600">No quotes submitted yet</p>
          ) : (
            quotes.map((quote) => (
              <div
                key={quote.id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-lg">
                      ${quote.price.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      by {quote.carrier?.company_name}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-sm rounded-full ${
                    quote.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : quote.status === 'accepted'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>
                      Delivery: {new Date(quote.delivery_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4" />
                    <span>Rate: ${(quote.price / (quote.load?.weight || 1)).toFixed(2)}/lb</span>
                  </div>
                </div>

                {quote.terms_and_conditions && (
                  <p className="text-sm text-gray-600">
                    {quote.terms_and_conditions}
                  </p>
                )}

                {user?.role === 'shipper' && quote.status === 'pending' && (
                  <div className="flex justify-end space-x-4 mt-4">
                    <button
                      onClick={() => updateQuoteStatus(quote.id, 'rejected')}
                      className="flex items-center space-x-1 text-red-600 hover:text-red-700"
                    >
                      <XCircle className="w-5 h-5" />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => updateQuoteStatus(quote.id, 'accepted')}
                      className="flex items-center space-x-1 text-green-600 hover:text-green-700"
                    >
                      <CheckCircle className="w-5 h-5" />
                      <span>Accept</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}