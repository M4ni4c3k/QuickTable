import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import type { MenuItem, Order, Reservation, RestaurantHours } from '../types/types';

/**
 * Get the next auto-incrementing ID for a collection
 * @param collectionName - Name of the collection
 * @returns Next available ID number
 */
export async function getNextId(collectionName: string): Promise<number> {
  try {
    const q = query(
      collection(db, collectionName), 
      orderBy('id', 'desc'), 
      limit(1)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return 1; // First document
    }
    
    const lastDoc = snapshot.docs[0];
    const lastId = lastDoc.data().id;
    return typeof lastId === 'number' ? lastId + 1 : 1;
  } catch (error) {
    console.error(`Error getting next ID for ${collectionName}:`, error);
    return 1;
  }
}

/**
 * Create a new menu item with auto-incrementing ID
 */
export async function createMenuItem(itemData: Omit<MenuItem, 'id'>): Promise<MenuItem> {
  const nextId = await getNextId('menu');
  
  const newMenuItem: MenuItem = {
    id: nextId.toString(),
    ...itemData
  };
  
  const docRef = await addDoc(collection(db, 'menu'), {
    ...newMenuItem,
    createdAt: serverTimestamp()
  });
  
  return { ...newMenuItem, id: docRef.id };
}

/**
 * Create a new order with auto-incrementing ID
 */
export async function createOrder(orderData: Omit<Order, 'id' | 'timestamp'>): Promise<Order> {
  const nextId = await getNextId('orders');
  
  const newOrder: Order = {
    id: nextId.toString(),
    ...orderData,
    timestamp: Timestamp.now()
  };
  
  const docRef = await addDoc(collection(db, 'orders'), {
    ...newOrder,
    createdAt: serverTimestamp()
  });
  
  return { ...newOrder, id: docRef.id };
}

/**
 * Create a new reservation with auto-incrementing ID
 */
export async function createReservation(reservationData: Omit<Reservation, 'id' | 'createdAt'>): Promise<Reservation> {
  const nextId = await getNextId('reservations');
  
  const newReservation: Reservation = {
    id: nextId.toString(),
    ...reservationData,
    createdAt: new Date()
  };
  
  const docRef = await addDoc(collection(db, 'reservations'), {
    ...newReservation,
    createdAt: serverTimestamp()
  });
  
  return { ...newReservation, id: docRef.id };
}

/**
 * Create restaurant hours with auto-incrementing ID
 */
export async function createRestaurantHours(hoursData: Omit<RestaurantHours, 'id'>): Promise<RestaurantHours> {
  const nextId = await getNextId('restaurantHours');
  
  const newHours: RestaurantHours = {
    id: nextId.toString(),
    ...hoursData
  };
  
  const docRef = await addDoc(collection(db, 'restaurantHours'), {
    ...newHours,
    createdAt: serverTimestamp()
  });
  
  return { ...newHours, id: docRef.id };
}

/**
 * Update a document with proper error handling
 */
export async function updateDocument<T>(
  collectionName: string, 
  docId: string, 
  data: Partial<T>
): Promise<void> {
  try {
    await updateDoc(doc(db, collectionName, docId), {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error(`Error updating document in ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Delete a document with proper error handling
 */
export async function deleteDocument(collectionName: string, docId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, collectionName, docId));
  } catch (error) {
    console.error(`Error deleting document from ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Get all documents from a collection with proper typing
 */
export async function getDocuments<T>(collectionName: string): Promise<T[]> {
  try {
    const snapshot = await getDocs(collection(db, collectionName));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as T[];
  } catch (error) {
    console.error(`Error getting documents from ${collectionName}:`, error);
    return [];
  }
} 