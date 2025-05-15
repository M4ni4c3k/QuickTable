import { Timestamp } from 'firebase/firestore';

export type TableStatus = 'free' | 'occupied' | 'reserved';

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  tableId: string;
  items: OrderItem[];
  total: number;
  timestamp: Timestamp;
  status: 'pending' | 'completed';
  waiterName?: string;
  dataState?: number;
}

export interface Table {
  id: string;
  number: number;
  status: TableStatus;
  customerName?: string;
  reservationTime?: string;
}
