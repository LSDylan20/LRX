import React from 'react';
import { useAuthStore } from '../lib/store';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import ShipmentList from '../components/ShipmentList';

export default function Dashboard() {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please sign in to view your dashboard.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <AnalyticsDashboard />
      {user.role === 'carrier' && <ShipmentList />}
    </div>
  );
}