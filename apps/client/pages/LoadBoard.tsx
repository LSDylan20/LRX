import React, { useState, useEffect } from 'react';
import { Search, Filter, MapPin, ChevronDown } from 'lucide-react';

import { useLoadStore, useAuthStore } from '@store/loads';
import { supabase } from '@lib/supabase';

import LoadForm from '@features/loads/components/LoadForm';
import LoadDetails from '@features/loads/components/LoadDetails';
import LoadMatching from '@features/loads/components/LoadMatching';
import QuoteManagement from '@features/quotes/components/QuoteManagement';
import RateCalculator from '@components/common/RateCalculator';
import RouteOptimizer from '@components/common/RouteOptimizer';

import type { Database } from '@types/database';

type Load = Database['public']['Tables']['loads']['Row'] & {
  shipper?: {
    company_name: string;
  };
};

export default function LoadBoard() {
  const { loads, setLoads } = useLoadStore();
  const user = useAuthStore((state) => state.user);
  const [showForm, setShowForm] = useState(false);
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
  const [showMatching, setShowMatching] = useState(false);
  const [showQuotes, setShowQuotes] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    origin: '',
    destination: '',
    equipment_type: '',
    status: '',
  });

  useEffect(() => {
    fetchLoads();
    const subscription = subscribeToLoads();
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const subscribeToLoads = () => {
    return supabase
      .channel('loads')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'loads',
      }, () => {
        fetchLoads();
      })
      .subscribe();
  };

  const fetchLoads = async () => {
    try {
      const { data, error } = await supabase
        .from('loads')
        .select(`
          *,
          shipper:users!loads_shipper_id_fkey(company_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLoads(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadPosted = () => {
    setShowForm(false);
    fetchLoads();
  };

  const filteredLoads = loads.filter(load => {
    return (
      (!filters.origin || load.origin.toLowerCase().includes(filters.origin.toLowerCase())) &&
      (!filters.destination || load.destination.toLowerCase().includes(filters.destination.toLowerCase())) &&
      (!filters.equipment_type || load.equipment_type === filters.equipment_type) &&
      (!filters.status || load.status === filters.status)
    );
  });

  return (
    <div className="max-w-7xl mx-auto">
      {showForm ? (
        <LoadForm onSuccess={handleLoadPosted} onCancel={() => setShowForm(false)} />
      ) : selectedLoad ? (
        <div className="space-y-6">
          <LoadDetails load={selectedLoad} onClose={() => setSelectedLoad(null)} />
          
          {user?.role === 'shipper' && showMatching && (
            <LoadMatching loadId={selectedLoad.id} />
          )}
          
          {user?.role === 'carrier' && showQuotes && (
            <QuoteManagement loadId={selectedLoad.id} />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RateCalculator
              origin={selectedLoad.origin}
              destination={selectedLoad.destination}
              weight={selectedLoad.weight}
              equipment_type={selectedLoad.equipment_type}
            />
            <RouteOptimizer
              origin={selectedLoad.origin}
              destination={selectedLoad.destination}
            />
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-4 md:mb-0">Load Board</h1>
              {user && user.role === 'shipper' && (
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Post Load
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Origin"
                  value={filters.origin}
                  onChange={(e) => setFilters(prev => ({ ...prev, origin: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 border rounded-md"
                />
              </div>

              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Destination"
                  value={filters.destination}
                  onChange={(e) => setFilters(prev => ({ ...prev, destination: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 border rounded-md"
                />
              </div>

              <select
                value={filters.equipment_type}
                onChange={(e) => setFilters(prev => ({ ...prev, equipment_type: e.target.value }))}
                className="w-full px-4 py-2 border rounded-md"
              >
                <option value="">All Equipment Types</option>
                <option value="dry_van">Dry Van</option>
                <option value="reefer">Reefer</option>
                <option value="flatbed">Flatbed</option>
                <option value="step_deck">Step Deck</option>
                <option value="lowboy">Lowboy</option>
              </select>

              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-4 py-2 border rounded-md"
              >
                <option value="">All Statuses</option>
                <option value="posted">Posted</option>
                <option value="assigned">Assigned</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 m-6 rounded">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading...</p>
            </div>
          ) : filteredLoads.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No loads available matching your criteria.</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredLoads.map((load) => (
                <div
                  key={load.id}
                  className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => {
                    setSelectedLoad(load);
                    setShowMatching(false);
                    setShowQuotes(false);
                  }}
                >
                  <div className="flex flex-col md:flex-row justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-lg">
                          {load.origin} → {load.destination}
                        </h3>
                        <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded">
                          {load.equipment_type}
                        </span>
                        <span className={`text-sm px-2 py-1 rounded ${
                          load.status === 'posted'
                            ? 'bg-green-100 text-green-800'
                            : load.status === 'assigned'
                            ? 'bg-blue-100 text-blue-800'
                            : load.status === 'in_transit'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {load.status.charAt(0).toUpperCase() + load.status.slice(1)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 space-y-1">
                        <p>Pickup: {new Date(load.pickup_date).toLocaleDateString()}</p>
                        <p>Delivery: {new Date(load.delivery_date).toLocaleDateString()}</p>
                        <p>Weight: {load.weight.toLocaleString()} lbs</p>
                      </div>
                    </div>
                    <div className="mt-4 md:mt-0 text-right">
                      <p className="font-semibold text-green-600 text-lg">
                        {load.rate ? `$${load.rate.toLocaleString()}` : 'Rate on request'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {load.shipper?.company_name}
                      </p>
                      {user?.role === 'shipper' && load.shipper_id === user.id && (
                        <div className="mt-2 space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLoad(load);
                              setShowMatching(true);
                              setShowQuotes(false);
                            }}
                            className="text-blue-600 hover:text-blue-700 text-sm"
                          >
                            Find Carriers
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLoad(load);
                              setShowQuotes(true);
                              setShowMatching(false);
                            }}
                            className="text-blue-600 hover:text-blue-700 text-sm"
                          >
                            View Quotes
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}