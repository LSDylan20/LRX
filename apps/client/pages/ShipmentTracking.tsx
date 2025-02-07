import React from 'react';
import { useParams } from 'react-router-dom';
import ShipmentTracker from '../components/ShipmentTracker';

export default function ShipmentTracking() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No shipment ID provided</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ShipmentTracker shipmentId={id} />
    </div>
  );
}