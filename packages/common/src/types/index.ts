export interface User {
  id: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  companyId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  ADMIN = 'admin',
  CARRIER = 'carrier',
  SHIPPER = 'shipper',
  BROKER = 'broker'
}

export interface Load {
  id: string;
  origin: Location;
  destination: Location;
  status: LoadStatus;
  rate: Rate;
  carrier?: string;
  shipper: string;
  pickupDate: Date;
  deliveryDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Location {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
}

export interface Rate {
  amount: number;
  currency: string;
  type: RateType;
}

export enum RateType {
  FLAT = 'flat',
  PER_MILE = 'per_mile'
}

export enum LoadStatus {
  POSTED = 'posted',
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

export interface Company {
  id: string;
  name: string;
  type: CompanyType;
  mc?: string;
  dot?: string;
  address: Location;
  createdAt: Date;
  updatedAt: Date;
}

export enum CompanyType {
  CARRIER = 'carrier',
  SHIPPER = 'shipper',
  BROKER = 'broker'
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: MessageType;
  loadId?: string;
  createdAt: Date;
}

export enum MessageType {
  TEXT = 'text',
  VOICE = 'voice',
  SYSTEM = 'system'
}

export interface Tracking {
  id: string;
  loadId: string;
  location: Location;
  status: TrackingStatus;
  timestamp: Date;
}

export enum TrackingStatus {
  EN_ROUTE = 'en_route',
  STOPPED = 'stopped',
  DELAYED = 'delayed',
  ARRIVED = 'arrived'
}
