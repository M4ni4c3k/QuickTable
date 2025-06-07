import { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import styles from './KitchenPage.module.css';
import { AnimatePresence, motion } from 'framer-motion';
import type { Table, Order } from '../../types/types';

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersSnap, tablesSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, 'orders'),
              where('status', '==', showDone ? 'done' : 'pending')
            )
          ),
          getDocs(collection(db, 'tables')),
        ]);

        const fetchedOrders: Order[] = ordersSnap.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<Order, 'id'>),
        }));

        const fetchedTables: Table[] = tablesSnap.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<Table, 'id'>),
        }));

        setOrders(fetchedOrders);
        setTables(fetchedTables);
        setLoading(false);
      } catch (error) {
        console.error('Błąd podczas pobierania danych:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [showDone]);

 const handleToggleOrderStatus = async (orderId: string, newStatus: 'done' | 'pending') => {
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      status: newStatus,
    });
    setOrders(prev => prev.filter(order => order.id !== orderId));
  } catch (error) {
    console.error('Błąd przy aktualizacji zamówienia:', error);
  }
};

  const getTableNumber = (tableId: string) => {
    return tables.find(t => t.id === tableId)?.number ?? 'Nieznany';
  };

  const groupedOrders = orders.reduce((acc: Record<string, Order[]>, order) => {
  const tableNumber = getTableNumber(order.tableId);
  if (!acc[tableNumber]) acc[tableNumber] = [];
  acc[tableNumber].push(order);
  return acc;
}, {});

  if (loading) return <p>Ładowanie zamówień...</p>;

  return (
  <div className={styles.kitchenPage}>
    <div className={styles.header}>
      <h2>{showDone ? 'Wykonane zamówienia' : 'Zamówienia do przygotowania'}</h2>
      <button
        className={styles.toggleButton}
        onClick={() => setShowDone(prev => !prev)}
      >
        {showDone ? 'Pokaż oczekujące' : 'Pokaż wykonane'}
      </button>
    </div>

    <div className={styles.ordersGrid}>
      <AnimatePresence>
        {Object.entries(groupedOrders).map(([tableNumber, orders]) => (
          <div key={tableNumber}>
            <h3>Stolik {tableNumber}</h3>
            {orders.map(order => (
              <motion.div
                key={order.id}
                className={styles.orderCard}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.3 } }}
                layout
              >
                <ul>
                  {order.items.map((item, idx) => (
                    <li key={idx}>
                      {item.name} × {item.quantity}
                    </li>
                  ))}
                </ul>
                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        onChange={() =>
                         handleToggleOrderStatus(order.id, showDone ? 'pending' : 'done')
                        }
                      />
                    {showDone ? 'Cofnij wykonanie' : 'Zamówienie gotowe'}
                </label>
              </motion.div>
            ))}
          </div>
        ))}
      </AnimatePresence>
    </div>
  </div>
);
}
