/**
 * User role types in the system
 */
export type UserRole = 'admin' | 'shipper' | 'carrier' | 'broker' | 'driver';

/**
 * User notification preferences
 */
export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
}

/**
 * User display preferences
 */
export interface DisplayPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
}

/**
 * User preferences configuration
 */
export interface UserPreferences {
  notifications: NotificationPreferences;
  display: DisplayPreferences;
}

/**
 * Base user profile information
 */
export interface UserProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  companyId?: string;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

/**
 * Core user entity
 */
export interface User {
  id: string;
  email: string;
  role: UserRole;
  phoneNumber?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  profile?: UserProfile;
  createdAt: string;
  updatedAt: string;
}

/**
 * User creation request
 */
export interface CreateUserRequest {
  email: string;
  password: string;
  role: UserRole;
  phoneNumber?: string;
  profile?: Omit<UserProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
}

/**
 * User update request
 */
export interface UpdateUserRequest {
  email?: string;
  role?: UserRole;
  phoneNumber?: string;
  profile?: Partial<Omit<UserProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>;
}

/**
 * Type guard to check if a value is a User
 */
export function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'email' in value &&
    'role' in value
  );
}

/**
 * Type guard to check if a value is a UserProfile
 */
export function isUserProfile(value: unknown): value is UserProfile {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'userId' in value &&
    'firstName' in value &&
    'lastName' in value
  );
}
