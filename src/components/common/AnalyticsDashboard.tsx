import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Truck, Package, Clock } from 'lucide-react';

import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../lib/store';

import type { Database } from '../../lib/database.types';

type Load = Database['public']['Tables']['loads']['Row'];
type Shipment = Database['public']['Tables']['shipments']['Row'];

export default function AnalyticsDashboard() {
  const user = useAuthStore((state) => state.user);
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    averageRate: 0,
    totalLoads: 0,
    completedLoads: 0,
    onTimeDelivery: 0,
    activeLoads: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user, timeframe]);

  const fetchAnalytics = async () => {
    if (!user) return;

    try {
      const startDate = new Date();
      if (timeframe === 'week') startDate.setDate(startDate.getDate() - 7);
      if (timeframe === 'month') startDate.setMonth(startDate.getMonth() - 1);
      if (timeframe === 'year') startDate.setFullYear(startDate.getFullYear() - 1);

      // Fetch loads data based on user role
      const { data: loads, error: loadsError } = await supabase
        .from('loads')
        .select('*')
        .eq(user.role === 'shipper' ? 'shipper_id' : 'carrier_id', user.id)
        .gte('created_at', startDate.toISOString());

      if (loadsError) throw loadsError;

      // Calculate metrics
      const totalRevenue = loads?.reduce((sum, load) => sum + (load.rate || 0), 0) || 0;
      const averageRate = loads?.length ? totalRevenue / loads.length : 0;
      const totalLoads = loads?.length || 0;
      const completedLoads = loads?.filter(l => l.status === 'delivered').length || 0;
      const onTimeDeliveries = loads?.filter(l => {
        const delivery = new Date(l.delivery_date);
        return l.status === 'delivered' && delivery <= new Date();
      }).length || 0;
      const onTimeDeliveryRate = completedLoads ? (onTimeDeliveries / completedLoads) * 100 : 0;
      const activeLoads = loads?.filter(l => ['posted', 'assigned', 'in_transit'].includes(l.status)).length || 0;

      setMetrics({
        totalRevenue,
        averageRate,
        totalLoads,
        completedLoads,
        onTimeDelivery: onTimeDeliveryRate,
        activeLoads,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please sign in to view analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Analytics Dashboard</h2>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as 'week' | 'month' | 'year')}
            className="px-3 py-2 border rounded-md"
          >
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="year">Last Year</option>
          </select>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading analytics...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${metrics.totalRevenue.toLocaleString()}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-600">
                  Avg. Rate: ${metrics.averageRate.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Loads</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metrics.totalLoads}
                  </p>
                </div>
                <Truck className="w-8 h-8 text-blue-500" />
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-600">
                  Active: {metrics.activeLoads}
                </p>
              </div>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Completed Loads</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metrics.completedLoads}
                  </p>
                </div>
                <Package className="w-8 h-8 text-purple-500" />
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-600">
                  Success Rate: {((metrics.completedLoads / metrics.totalLoads) * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">On-Time Delivery</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metrics.onTimeDelivery.toFixed(1)}%
                  </p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
              <div className="mt-4 flex items-center">
                {metrics.onTimeDelivery >= 90 ? (
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                )}
                <p className="text-sm text-gray-600">
                  {metrics.onTimeDelivery >= 90 ? 'Excellent' : 'Needs Improvement'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}