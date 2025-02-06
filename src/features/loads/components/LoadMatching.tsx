import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { findBestMatches, type MatchScore } from '../lib/ai';
import type { Database } from '../lib/database.types';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

type Load = Database['public']['Tables']['loads']['Row'];
type CarrierProfile = Database['public']['Tables']['carrier_profiles']['Row'] & {
  user: Database['public']['Tables']['users']['Row'];
};

interface LoadMatchingProps {
  loadId: string;
}

export default function LoadMatching({ loadId }: LoadMatchingProps) {
  const [load, setLoad] = useState<Load | null>(null);
  const [matches, setMatches] = useState<MatchScore[]>([]);
  const [carriers, setCarriers] = useState<Record<string, CarrierProfile>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitedCarriers, setInvitedCarriers] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchLoadAndMatches();
  }, [loadId]);

  const fetchLoadAndMatches = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch load details
      const { data: loadData, error: loadError } = await supabase
        .from('loads')
        .select('*')
        .eq('id', loadId)
        .single();

      if (loadError) throw loadError;
      if (!loadData) throw new Error('Load not found');

      setLoad(loadData);

      // Find best carrier matches using AI
      const matchResults = await findBestMatches(loadData);
      setMatches(matchResults);

      // Fetch carrier details for matches
      const { data: carrierData, error: carrierError } = await supabase
        .from('carrier_profiles')
        .select(`
          *,
          user:users!carrier_profiles_user_id_fkey(*)
        `)
        .in('user_id', matchResults.map(m => m.carrierId));

      if (carrierError) throw carrierError;
      
      const carrierMap = carrierData?.reduce((acc, carrier) => {
        acc[carrier.user_id] = carrier;
        return acc;
      }, {} as Record<string, CarrierProfile>);

      setCarriers(carrierMap || {});

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inviteCarrier = async (carrierId: string) => {
    try {
      if (!load) return;

      const { error } = await supabase
        .from('carrier_invites')
        .insert({
          load_id: load.id,
          carrier_id: carrierId,
          status: 'pending'
        });

      if (error) throw error;

      setInvitedCarriers(prev => new Set([...prev, carrierId]));
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p className="font-medium">Error loading matches</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Best Carrier Matches</h3>
      
      <div className="grid gap-4">
        {matches.map(match => {
          const carrier = carriers[match.carrierId];
          if (!carrier) return null;

          return (
            <div key={match.carrierId} className="bg-white p-4 rounded-lg shadow border">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-lg">{carrier.user.company_name}</h4>
                  <p className="text-sm text-gray-600">Match Score: {match.score}%</p>
                  
                  <div className="mt-2 space-y-1">
                    {match.reasons.map((reason, i) => (
                      <div key={i} className="flex items-center text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        {reason}
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 space-y-1">
                    <p className="text-sm">
                      <span className="font-medium">Equipment:</span>{' '}
                      {carrier.equipment_types?.join(', ')}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Rating:</span>{' '}
                      {carrier.rating ? `${carrier.rating.toFixed(1)} / 5.0` : 'N/A'}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Service Areas:</span>{' '}
                      {carrier.service_areas?.join(', ')}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => inviteCarrier(match.carrierId)}
                  disabled={invitedCarriers.has(match.carrierId)}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    invitedCarriers.has(match.carrierId)
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  {invitedCarriers.has(match.carrierId) ? 'Invited' : 'Invite to Bid'}
                </button>
              </div>
            </div>
          );
        })}

        {matches.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-yellow-400 mr-2" />
              <p className="text-yellow-700">No matching carriers found at this time.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}