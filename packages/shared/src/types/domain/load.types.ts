/**
 * Load status types
 */
export type LoadStatus =
  | 'draft'      // Initial creation
  | 'posted'     // Available for carriers
  | 'matching'   // AI matching in progress
  | 'negotiating'// Price negotiation
  | 'booked'     // Successfully assigned
  | 'in_transit' // Currently moving
  | 'delivered'  // Reached destination
  | 'completed'; // All paperwork done

/**
 * Geographic location
 */
export interface Location {
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

/**
 * Load dimensions
 */
export interface Dimensions {
  length: number;
  width: number;
  height: number;
  unit: 'ft' | 'm';
}

/**
 * Rate information
 */
export interface RateDetails {
  askingRate: number;
  minimumRate: number;
  maximumRate: number;
  currency: string;
}

/**
 * Special handling requirements
 */
export interface SpecialRequirements {
  teamRequired: boolean;
  hazmat: boolean;
  temperatureControlled: boolean;
  temperatureRange?: {
    min: number;
    max: number;
    unit: 'F' | 'C';
  };
}

/**
 * Core load entity
 */
export interface Load {
  id: string;
  userId: string;
  companyId: string;
  referenceNumber: string;
  origin: Location;
  destination: Location;
  equipmentType: string;
  weight?: number;
  dimensions?: Dimensions;
  status: LoadStatus;
  rateDetails: RateDetails;
  pickupDate?: string;
  deliveryDate?: string;
  specialRequirements: SpecialRequirements;
  createdAt: string;
  updatedAt: string;
}

/**
 * Load creation request
 */
export interface CreateLoadRequest {
  companyId: string;
  origin: Location;
  destination: Location;
  equipmentType: string;
  weight?: number;
  dimensions?: Dimensions;
  rateDetails: Omit<RateDetails, 'currency'>;
  pickupDate?: string;
  deliveryDate?: string;
  specialRequirements?: Partial<SpecialRequirements>;
}

/**
 * Load update request
 */
export interface UpdateLoadRequest {
  origin?: Partial<Location>;
  destination?: Partial<Location>;
  equipmentType?: string;
  weight?: number;
  dimensions?: Partial<Dimensions>;
  status?: LoadStatus;
  rateDetails?: Partial<RateDetails>;
  pickupDate?: string;
  deliveryDate?: string;
  specialRequirements?: Partial<SpecialRequirements>;
}

/**
 * Load search filters
 */
export interface LoadFilters {
  status?: LoadStatus[];
  equipmentType?: string[];
  originState?: string[];
  destinationState?: string[];
  pickupDateRange?: {
    start: string;
    end: string;
  };
  weightRange?: {
    min: number;
    max: number;
  };
  rateRange?: {
    min: number;
    max: number;
  };
}

/**
 * Type guard to check if a value is a Load
 */
export function isLoad(value: unknown): value is Load {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'userId' in value &&
    'origin' in value &&
    'destination' in value &&
    'status' in value
  );
}

/**
 * Type guard to check if a value is a Location
 */
export function isLocation(value: unknown): value is Location {
  return (
    typeof value === 'object' &&
    value !== null &&
    'address' in value &&
    'city' in value &&
    'state' in value &&
    'coordinates' in value
  );
}
