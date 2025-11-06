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
  dataState?: number;
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
  date: string;
  dayName: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  timeSlots: string[];
  blockedHours: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthError {
  code: string;
  message: string;
}

/**
 * User roles in the system
 */
export type UserRole = 'admin' | 'manager' | 'client' | 'waiter' | 'kitchen';

/**
 * Extended user interface with role information
 */
export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  photoURL?: string | null;
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
  register: (email: string, password: string, role?: UserRole) => Promise<UserCredential>;
  loginWithGoogle: () => Promise<UserCredential>;
  logout: () => Promise<void>;
}

/**
 * Authentication state interface combining user data with loading and error states
 */
export interface AuthState {
  user: User | null;
  userRole: UserRole | null;
  userData: AppUser | null;
  loading: boolean;
  error: FirebaseError | null;
}

/**
 * Combined authentication hook interface
 */
export type AuthHookReturn = AuthActions & AuthState;