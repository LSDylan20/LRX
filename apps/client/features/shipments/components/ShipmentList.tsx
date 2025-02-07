import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/store';
import { Link } from 'react-router-dom';
import { Truck, MapPin, Calendar, ArrowRight } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Shipment = Database['public']['Tables']['shipments']['Row'] & {
  load?: Database['public']['Tables']['loads']['Row'];
};

export default function ShipmentList() {
  const user = useAuthStore((state) => state.user);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchShipments();
      const subscription = subscribeToShipments();
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const fetchShipments = async () => {
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          *,
          load:loads(*)
        `)
        .eq(user?.role === 'shipper' ? 'load.shipper_id' : 'carrier_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShipments(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToShipments = () => {
    return supabase
      .channel('shipments')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'shipments',
        filter: user?.role === 'shipper'
          ? `load.shipper_id=eq.${user?.id}`
          : `carrier_id=eq.${user?.id}`,
      }, () => {
        fetchShipments();
      })
      .subscribe();
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please sign in to view shipments.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-6">Active Shipments</h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading shipments...</p>
          </div>
        ) : shipments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No active shipments found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {shipments.map((shipment) => (
              <Link
                key={shipment.id}
                to={`/shipments/${shipment.id}`}
                className="block border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-lg">
                        Shipment #{shipment.id.slice(0, 8)}
                      </h3>
                      <span className={`px-2 py-1 text-sm rounded-full ${
                        shipment.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : shipment.status === 'in_transit'
                          ? 'bg-blue-100 text-blue-800'
                          : shipment.status === 'delivered'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {shipment.status.charAt(0).toUpperCase() + shipment.status.slice(1)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {shipment.load?.origin} <ArrowRight className="inline w-3 h-3" /> {shipment.load?.destination}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          Due: {new Date(shipment.load?.delivery_date || '').toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {shipment.eta && (
                      <p className="text-sm text-gray-600">
                        ETA: {new Date(shipment.eta).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="text-blue-600">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}