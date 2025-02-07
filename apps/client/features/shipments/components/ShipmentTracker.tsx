import React, { useEffect, useRef, useState } from 'react';
import { useLoadTracking } from '../lib/hooks/useLoadTracking';
import { Loader2, MapPin, Clock, Truck, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Loader } from '@googlemaps/js-api-loader';

interface ShipmentTrackerProps {
  loadId: string;
  className?: string;
}

export default function ShipmentTracker({ loadId, className = '' }: ShipmentTrackerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  const {
    load,
    shipment,
    currentLocation,
    eta,
    status,
    error,
    updateShipment,
  } = useLoadTracking(loadId);

  useEffect(() => {
    if (!currentLocation) return;

    initializeMap();
  }, [currentLocation]);

  const initializeMap = async () => {
    if (!currentLocation || !mapRef.current) return;

    try {
      // Initialize Google Maps
      const loader = new Loader({
        apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        version: 'weekly',
      });

      const google = await loader.load();
      const geocoder = new google.maps.Geocoder();

      // Convert location string to coordinates
      geocoder.geocode({ address: currentLocation }, (results, status) => {
        if (status === 'OK' && results?.[0]?.geometry?.location) {
          const position = results[0].geometry.location;

          // Create or update map
          if (!googleMapRef.current) {
            googleMapRef.current = new google.maps.Map(mapRef.current!, {
              center: position,
              zoom: 12,
              styles: [
                {
                  featureType: 'poi',
                  elementType: 'labels',
                  stylers: [{ visibility: 'off' }],
                },
              ],
            });
          } else {
            googleMapRef.current.setCenter(position);
          }

          // Create or update marker
          if (!markerRef.current) {
            markerRef.current = new google.maps.Marker({
              position,
              map: googleMapRef.current,
              icon: {
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 6,
                fillColor: '#2563eb',
                fillOpacity: 1,
                strokeColor: '#1e40af',
                strokeWeight: 1,
                rotation: 0,
              },
            });
          } else {
            markerRef.current.setPosition(position);
          }
        } else {
          setMapError('Could not locate shipment on map');
        }
      });
    } catch (err: any) {
      setMapError(err.message);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !load || !shipment) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          <p className="font-medium">Error tracking shipment</p>
        </div>
        <p className="text-sm mt-1">{error || 'Shipment not found'}</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_transit':
        return 'text-blue-500';
      case 'delivered':
        return 'text-green-500';
      case 'delayed':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Shipment Tracking</h3>
          <div className={`flex items-center ${getStatusColor(shipment.status)}`}>
            <Truck className="w-5 h-5 mr-2" />
            <span className="font-medium capitalize">
              {shipment.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <div className="flex items-center text-gray-600 mb-1">
                <MapPin className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">Current Location</span>
              </div>
              <p className="text-lg">{currentLocation || 'Not available'}</p>
            </div>

            <div>
              <div className="flex items-center text-gray-600 mb-1">
                <Clock className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">Estimated Arrival</span>
              </div>
              <p className="text-lg">
                {eta ? format(new Date(eta), 'PPp') : 'Not available'}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center text-gray-600">
                <CheckCircle className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">Delivery Details</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-md text-sm space-y-1">
                <p>
                  <span className="font-medium">Origin:</span> {load.origin}
                </p>
                <p>
                  <span className="font-medium">Destination:</span> {load.destination}
                </p>
                <p>
                  <span className="font-medium">Equipment:</span>{' '}
                  {load.equipment_type}
                </p>
                {load.special_instructions && (
                  <p>
                    <span className="font-medium">Special Instructions:</span>{' '}
                    {load.special_instructions}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="relative min-h-[300px] rounded-lg overflow-hidden">
            <div
              ref={mapRef}
              className="absolute inset-0 bg-gray-100 rounded-lg"
            />
            {mapError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75">
                <p className="text-red-500 text-sm">{mapError}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}