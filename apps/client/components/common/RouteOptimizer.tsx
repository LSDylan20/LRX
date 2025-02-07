import React, { useState, useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { MapPin, Navigation, Clock, AlertCircle } from 'lucide-react';

interface RouteOptimizerProps {
  origin: string;
  destination: string;
  stops?: string[];
}

declare global {
  interface Window {
    google: typeof google;
  }
}

export default function RouteOptimizer({ origin, destination, stops = [] }: RouteOptimizerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService | null>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const [optimizedRoute, setOptimizedRoute] = useState<{
    distance: string;
    duration: string;
    waypoints: string[];
    legs: Array<{
      start: string;
      end: string;
      distance: string;
      duration: string;
    }>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadGoogleMaps = async () => {
      try {
        const loader = new Loader({
          apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
          version: 'weekly',
          libraries: ['places', 'geometry']
        });

        await loader.load();
        if (isMounted) {
          setIsGoogleMapsLoaded(true);
        }
      } catch (err) {
        console.error('Failed to load Google Maps:', err);
        if (isMounted) {
          setError('Failed to load Google Maps. Please check your API configuration.');
          setIsLoading(false);
        }
      }
    };

    loadGoogleMaps();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isGoogleMapsLoaded && mapRef.current) {
      initializeMap();
    }
  }, [isGoogleMapsLoaded]);

  const initializeMap = async () => {
    try {
      if (!mapRef.current) return;

      const newMap = new window.google.maps.Map(mapRef.current, {
        center: { lat: 39.8283, lng: -98.5795 }, // Center of US
        zoom: 4,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          },
          {
            featureType: 'transit',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ],
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false
      });

      const directionsService = new window.google.maps.DirectionsService();
      const directionsRenderer = new window.google.maps.DirectionsRenderer({
        map: newMap,
        suppressMarkers: false,
        polylineOptions: {
          strokeColor: '#3B82F6',
          strokeWeight: 5,
          strokeOpacity: 0.8
        },
        markerOptions: {
          animation: window.google.maps.Animation.DROP
        }
      });

      setMap(newMap);
      setDirectionsService(directionsService);
      setDirectionsRenderer(directionsRenderer);
      setIsLoading(false);
    } catch (err) {
      console.error('Map initialization error:', err);
      setError('Failed to initialize map. Please check your API configuration.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (directionsService && directionsRenderer && origin && destination) {
      calculateRoute();
    }
  }, [directionsService, directionsRenderer, origin, destination, stops]);

  const calculateRoute = async () => {
    if (!directionsService || !directionsRenderer || !origin || !destination) return;
    setError(null);

    try {
      const waypoints = stops.map(stop => ({
        location: stop,
        stopover: true
      }));

      const request: google.maps.DirectionsRequest = {
        origin,
        destination,
        waypoints,
        optimizeWaypoints: true,
        travelMode: google.maps.TravelMode.DRIVING
      };

      const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
        directionsService.route(request, (result, status) => {
          if (status === 'OK' && result) {
            resolve(result);
          } else {
            reject(new Error(status));
          }
        });
      });

      directionsRenderer.setDirections(result);
      const route = result.routes[0];
      const legs = route.legs;

      let totalDistance = 0;
      let totalDuration = 0;
      const routeLegs = [];

      for (const leg of legs) {
        totalDistance += leg.distance?.value || 0;
        totalDuration += leg.duration?.value || 0;
        routeLegs.push({
          start: leg.start_address,
          end: leg.end_address,
          distance: leg.distance?.text || 'N/A',
          duration: leg.duration?.text || 'N/A'
        });
      }

      setOptimizedRoute({
        distance: `${Math.round(totalDistance / 1609.34)} miles`,
        duration: `${Math.round(totalDuration / 3600)} hours`,
        waypoints: route.waypoint_order.map(index => stops[index]),
        legs: routeLegs
      });

      // Fit map bounds to show entire route
      if (map) {
        const bounds = new google.maps.LatLngBounds();
        route.overview_path.forEach(point => bounds.extend(point));
        map.fitBounds(bounds);
      }

    } catch (err) {
      console.error('Route calculation error:', err);
      setError('Unable to calculate route. Please verify the addresses and try again.');
    }
  };

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="w-6 h-6" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Loading route optimizer...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-4">Route Optimization</h3>

        {optimizedRoute && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="flex items-center space-x-3 bg-blue-50 p-4 rounded-lg">
              <Navigation className="w-6 h-6 text-blue-600" />
              <div>
                <p className="text-sm text-blue-600">Total Distance</p>
                <p className="font-semibold text-lg">{optimizedRoute.distance}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 bg-green-50 p-4 rounded-lg">
              <Clock className="w-6 h-6 text-green-600" />
              <div>
                <p className="text-sm text-green-600">Estimated Duration</p>
                <p className="font-semibold text-lg">{optimizedRoute.duration}</p>
              </div>
            </div>
          </div>
        )}

        <div ref={mapRef} className="w-full h-[400px] rounded-lg border border-gray-200"></div>
      </div>

      {optimizedRoute && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h4 className="font-semibold text-lg mb-4">Route Details</h4>
          <div className="space-y-4">
            {optimizedRoute.legs.map((leg, index) => (
              <div key={index} className="border-b last:border-b-0 pb-4 last:pb-0">
                <div className="flex items-start space-x-3">
                  <div className="mt-1">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 text-sm font-medium">{index + 1}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{leg.start}</p>
                        <div className="h-6 border-l-2 border-dashed border-gray-300 ml-2"></div>
                        <p className="font-medium">{leg.end}</p>
                      </div>
                      <div className="text-right text-sm text-gray-600">
                        <p>{leg.distance}</p>
                        <p>{leg.duration}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}