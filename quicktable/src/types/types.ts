import { Timestamp } from 'firebase/firestore';
import type { User, UserCredential } from 'firebase/auth';
import type { FirebaseError } from 'firebase/app';

/**
 * Represents a single item in an order
 */
export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

/**
 * Represents a complete order with items, status, and metadata
 */
export interface Order {
  id: string;
  tableId: string;
  items: OrderItem[];
  total: number;
  timestamp: Timestamp;
  status: 'pending' | 'completed' | 'done';
  waiterName?: string;
  dataState?: number; // 1 = active, 2 = archived
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Represents a restaurant table with its current status
 */
export interface Table {
  id: string;
  number: number;
  status: 'free' | 'occupied';
  customerName?: string;
}

/**
 * Represents a menu item with ingredients and pricing
 */
export interface MenuItem {
  id: string;
  name: string;
  price: number;
  ingredients: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Reservation with conflict checking and status management
 * dataState: 1 = active, 2 = archived
 * isAccepted: boolean for quick status check
 */
export interface Reservation {
  id: string;
  tableId: string;
  tableNumber: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  guests: number;
  reservationDate: string;
  reservationHour: string;
  reservationTime: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  dataState: number;
  isAccepted: boolean;
  createdAt: Date;
  notes?: string;
}

/**
 * Restaurant operating hours for specific dates with generated time slots
 * date: Specific date (YYYY-MM-DD format)
 * timeSlots: Array of available time slots at 30-minute intervals
 * blockedHours: Array of blocked time ranges (e.g., ["10:00-12:00", "14:00-16:00"])
 */
export interface RestaurantHours {
  id: string;
  date: string; // Specific date in YYYY-MM-DD format
  dayName: string; // Day name for display
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  timeSlots: string[];
  blockedHours: string[]; // Time ranges that are blocked for reservations
  createdAt?: Date;
  updatedAt?: Date;
}

// Firebase Authentication Types
/**
 * Firebase authentication error interface
 */
export interface AuthError {
  code: string;
  message: string;
}

/**
 * Simplified user interface for authentication
 */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

/**
 * Authentication actions interface for login, register, and logout functions
 */
export interface AuthActions {
  login: (email: string, password: string) => Promise<UserCredential>;
  register: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
}

/**
 * Authentication state interface combining user data with loading and error states
 */
export interface AuthState {
  user: User | null;
  loading: boolean;
  error: FirebaseError | null;
}

/**
 * Combined authentication hook interface
 */
export type AuthHookReturn = AuthActions & AuthState;