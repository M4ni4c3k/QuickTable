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
  const [showViewModal, setShowViewModal] = useState(false);
  const [showChangeViewModal, setShowChangeViewModal] = useState(false);

  // Fetch orders and tables with real-time updates
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

  // Set up polling for real-time updates
  useEffect(() => {
    fetchData();

    const interval = setInterval(() => {
      fetchData();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval); // Clean up interval on unmount
  }, [showDone]);

  const handleToggleOrderStatus = async (
    orderId: string,
    newStatus: 'done' | 'pending'
  ) => {
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

  // Group orders by table for better organization
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
        <div className={styles.appName}>Quick Table</div>
        <h2>{showDone ? 'Wykonane zamówienia' : 'Zamówienia do przygotowania'}</h2>
        <button 
          className={styles.gearButton} 
          onClick={() => setShowViewModal(true)}
          title="Ustawienia"
        >
          ⚙️
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
                        handleToggleOrderStatus(
                          order.id,
                          showDone ? 'pending' : 'done'
                        )
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
      
              {showViewModal && (
          <div className={styles.modalOverlay} onClick={() => setShowViewModal(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h3>Ustawienia</h3>
              <div className={styles.modalButtons}>
                <button onClick={() => setShowChangeViewModal(true)}>
                  Zmień widok
                </button>
                <div className={styles.modalDivider}></div>
                <button 
                  className={styles.toggleButton}
                  onClick={() => { setShowDone(prev => !prev); setShowViewModal(false); }}
                >
                  {showDone ? 'Pokaż oczekujące zamówienia' : 'Pokaż wykonane zamówienia'}
                </button>
              </div>
              <button className={styles.closeButton} onClick={() => setShowViewModal(false)}>
                Zamknij
              </button>
            </div>
          </div>
        )}
        
        {showChangeViewModal && (
          <div className={styles.modalOverlay} onClick={() => setShowChangeViewModal(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h3>Zmień widok</h3>
              <div className={styles.modalButtons}>
                <button onClick={() => { setShowChangeViewModal(false); setShowViewModal(false); window.location.href = '/admin'; }}>
                  Panel Administracyjny
                </button>
                <button onClick={() => { setShowChangeViewModal(false); setShowViewModal(false); window.location.href = '/client'; }}>
                  Strona Klienta
                </button>
                <button onClick={() => { setShowChangeViewModal(false); setShowViewModal(false); window.location.href = '/menu'; }}>
                  Menu
                </button>
                <button onClick={() => { setShowChangeViewModal(false); setShowViewModal(false); window.location.href = '/order'; }}>
                  Zamówienia
                </button>
                <button onClick={() => { setShowChangeViewModal(false); setShowViewModal(false); window.location.href = '/reservation'; }}>
                  Rezerwacje
                </button>
                <button onClick={() => { setShowChangeViewModal(false); setShowViewModal(false); window.location.href = '/waiter'; }}>
                  Kelner
                </button>
              </div>
              <button className={styles.closeButton} onClick={() => setShowChangeViewModal(false)}>
                Wróć
              </button>
            </div>
          </div>
        )}
    </div>
  );
}
