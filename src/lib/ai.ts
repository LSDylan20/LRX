import { supabase } from './supabase';
import type { Database } from './database.types';

type Load = Database['public']['Tables']['loads']['Row'];
type CarrierProfile = Database['public']['Tables']['carrier_profiles']['Row'];

export interface MatchScore {
  carrierId: string;
  score: number;
  reasons: string[];
}

export interface RatePrediction {
  predictedRate: number;
  confidence: number;
  factors: string[];
  marketTrends: {
    trend: 'up' | 'down' | 'stable';
    percentage: number;
  };
}

export async function findBestMatches(load: Load): Promise<MatchScore[]> {
  // Fetch all available carriers
  const { data: carriers } = await supabase
    .from('carrier_profiles')
    .select(`
      *,
      user:users!carrier_profiles_user_id_fkey(*)
    `)
    .eq('active', true);

  if (!carriers) return [];

  // Calculate match scores for each carrier
  const matches = carriers.map(carrier => {
    const score = calculateMatchScore(load, carrier);
    return {
      carrierId: carrier.user_id,
      score: score.score,
      reasons: score.reasons
    };
  });

  // Sort by score descending
  return matches.sort((a, b) => b.score - a.score);
}

function calculateMatchScore(load: Load, carrier: CarrierProfile): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // Equipment match
  if (carrier.equipment_types?.includes(load.equipment_type)) {
    score += 30;
    reasons.push('Equipment type matches');
  }

  // Service area match
  if (carrier.service_areas?.some(area => 
    load.origin.includes(area) || load.destination.includes(area))) {
    score += 25;
    reasons.push('Within service area');
  }

  // Insurance coverage
  if (carrier.insurance_coverage && carrier.insurance_coverage >= load.rate!) {
    score += 15;
    reasons.push('Adequate insurance coverage');
  }

  // Rating factor
  if (carrier.rating && carrier.rating >= 4.5) {
    score += 20;
    reasons.push('High carrier rating');
  } else if (carrier.rating && carrier.rating >= 4.0) {
    score += 10;
    reasons.push('Good carrier rating');
  }

  // Historical performance
  // TODO: Add historical performance analysis

  return { score, reasons };
}

export async function predictRate(load: Load): Promise<RatePrediction> {
  // Fetch historical rates for similar loads
  const { data: historicalLoads } = await supabase
    .from('loads')
    .select('*')
    .eq('equipment_type', load.equipment_type)
    .eq('status', 'delivered')
    .order('created_at', { ascending: false })
    .limit(100);

  if (!historicalLoads || historicalLoads.length === 0) {
    return {
      predictedRate: load.rate || 0,
      confidence: 0.5,
      factors: ['Limited historical data'],
      marketTrends: { trend: 'stable', percentage: 0 }
    };
  }

  // Calculate average rate and trends
  const rates = historicalLoads.map(l => l.rate || 0);
  const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;
  
  // Calculate recent trend
  const recentLoads = historicalLoads.slice(0, 10);
  const recentAvg = recentLoads.reduce((a, b) => a + (b.rate || 0), 0) / recentLoads.length;
  const trend = recentAvg > avgRate ? 'up' : recentAvg < avgRate ? 'down' : 'stable';
  const percentage = Math.abs((recentAvg - avgRate) / avgRate * 100);

  // Adjust based on factors
  const factors: string[] = [];
  let adjustedRate = avgRate;

  // Distance factor
  const distanceFactor = calculateDistanceFactor(load.origin, load.destination);
  adjustedRate *= distanceFactor;
  factors.push(`Distance adjustment: ${((distanceFactor - 1) * 100).toFixed(1)}%`);

  // Season factor
  const seasonFactor = calculateSeasonFactor(load.pickup_date);
  adjustedRate *= seasonFactor;
  factors.push(`Seasonal adjustment: ${((seasonFactor - 1) * 100).toFixed(1)}%`);

  return {
    predictedRate: Math.round(adjustedRate),
    confidence: 0.8,
    factors,
    marketTrends: { trend, percentage }
  };
}

function calculateDistanceFactor(origin: string, destination: string): number {
  // TODO: Implement actual distance calculation using Google Maps API
  return 1.0;
}

function calculateSeasonFactor(pickupDate: string): number {
  const month = new Date(pickupDate).getMonth();
  
  // Peak seasons (summer and holiday season)
  if (month >= 5 && month <= 7) return 1.15; // Summer
  if (month >= 10 && month <= 11) return 1.2; // Holiday season
  
  return 1.0;
}
