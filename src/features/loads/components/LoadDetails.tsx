import React from 'react';
import { format } from 'date-fns';
import { MapPin, Truck, Calendar, Weight, DollarSign } from 'lucide-react';

import DocumentUpload from '../../../components/ui/DocumentUpload';

import type { Database } from '../../../lib/database.types';

type Load = Database['public']['Tables']['loads']['Row'] & {
  shipper?: {
    company_name: string;
  };
};

interface LoadDetailsProps {
  load: Load;
  onClose?: () => void;
}

export default function LoadDetails({ load, onClose }: LoadDetailsProps) {
  const [activeTab, setActiveTab] = React.useState<'details' | 'documents'>('details');

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Load Details</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          )}
        </div>

        <div className="mb-6">
          <div className="border-b">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('details')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'details'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'documents'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Documents
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'details' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-700">Origin</h3>
                    <p className="text-gray-600">{load.origin}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-700">Destination</h3>
                    <p className="text-gray-600">{load.destination}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Calendar className="w-5 h-5 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-700">Pickup Date</h3>
                    <p className="text-gray-600">
                      {format(new Date(load.pickup_date), 'PPP p')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Calendar className="w-5 h-5 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-700">Delivery Date</h3>
                    <p className="text-gray-600">
                      {format(new Date(load.delivery_date), 'PPP p')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-start space-x-3">
                  <Truck className="w-5 h-5 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-700">Equipment Type</h3>
                    <p className="text-gray-600">{load.equipment_type}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Weight className="w-5 h-5 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-700">Weight</h3>
                    <p className="text-gray-600">{load.weight.toLocaleString()} lbs</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <DollarSign className="w-5 h-5 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-700">Rate</h3>
                    <p className="text-gray-600">
                      {load.rate ? `$${load.rate.toLocaleString()}` : 'Rate on request'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="flex items-start space-x-3">
                <div>
                  <h3 className="font-semibold text-gray-700">Shipper</h3>
                  <p className="text-gray-600">{load.shipper?.company_name}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <DocumentUpload loadId={load.id} />
        )}

        <div className="mt-8 flex justify-end space-x-4">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Close
            </button>
          )}
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Contact Shipper
          </button>
        </div>
      </div>
    </div>
  );
}