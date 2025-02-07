/**
 * Market rate data
 */
export interface MarketRate {
  id: string;
  originRegion: string;
  destinationRegion: string;
  equipmentType: string;
  rate: number;
  volume: number;
  fuelPrice?: number;
  weatherConditions?: WeatherConditions;
  timestamp: string;
}

/**
 * Weather conditions affecting rates
 */
export interface WeatherConditions {
  temperature: number;
  precipitation: number;
  windSpeed: number;
  conditions: string[];
  alerts?: string[];
}

/**
 * Rate prediction model input
 */
export interface RatePredictionInput {
  origin: string;
  destination: string;
  equipmentType: string;
  distance: number;
  weight?: number;
  pickupDate?: string;
  specialRequirements?: string[];
}

/**
 * Rate prediction model output
 */
export interface RatePrediction {
  predictedRate: number;
  confidenceScore: number;
  factors: {
    marketConditions: number;
    seasonality: number;
    demand: number;
    weather: number;
    fuelPrice: number;
  };
  range: {
    min: number;
    max: number;
  };
}

/**
 * Market analysis filters
 */
export interface MarketAnalysisFilters {
  originRegions?: string[];
  destinationRegions?: string[];
  equipmentTypes?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  rateRange?: {
    min: number;
    max: number;
  };
}

/**
 * Market trend analysis
 */
export interface MarketTrend {
  period: string;
  averageRate: number;
  volumeChange: number;
  priceChange: number;
  confidence: number;
}

/**
 * Market insights
 */
export interface MarketInsights {
  trends: MarketTrend[];
  hotMarkets: string[];
  predictions: {
    shortTerm: RatePrediction;
    longTerm: RatePrediction;
  };
  recommendations: string[];
}

/**
 * Type guard to check if a value is a MarketRate
 */
export function isMarketRate(value: unknown): value is MarketRate {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'originRegion' in value &&
    'destinationRegion' in value &&
    'rate' in value &&
    'timestamp' in value
  );
}

/**
 * Type guard to check if a value is a RatePrediction
 */
export function isRatePrediction(value: unknown): value is RatePrediction {
  return (
    typeof value === 'object' &&
    value !== null &&
    'predictedRate' in value &&
    'confidenceScore' in value &&
    'factors' in value &&
    'range' in value
  );
}
