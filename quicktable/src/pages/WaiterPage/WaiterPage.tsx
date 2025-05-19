import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
  addDoc,
  Timestamp
} from 'firebase/firestore';
import type { Table, Order, OrderItem, TableStatus } from '../../types/types';
import { db } from '../../firebase/firebaseConfig';
import styles from './WaiterPage.module.css';

export default function WaiterPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'add' | null>(null);
  const [menuItems, setMenuItems] = useState<{ name: string; price: number }[]>([]);
  const [newOrder, setNewOrder] = useState<Omit<Order, 'id' | 'timestamp'>>({
    tableId: '',
    items: [],
    total: 0,
    status: 'pending',
    waiterName: 'Anna'
  });

  const navigate = useNavigate();
  
  const completeOrder = async (orderId: string, tableId: string) => {
  await updateDoc(doc(db, 'orders', orderId), {
    status: 'completed',
  });

  const pendingOrders = orders.filter(
    (order) => order.tableId === tableId && order.status === 'pending'
  );

  if (pendingOrders.length <= 1) {
    await updateDoc(doc(db, 'tables', tableId), {
      status: 'free',
    });
  }
};

  // Pobieranie cen menu
  useEffect(() => {
  const menuRef = collection(db, 'menu');
  const unsubscribe = onSnapshot(menuRef, (snapshot) => {
    const items = snapshot.docs.map(doc => doc.data() as { name: string; price: number });
    setMenuItems(items);
  });

  return () => unsubscribe();
}, []);

  // Pobieranie stolików
  useEffect(() => {
    const tablesRef = collection(db, 'tables');
    const unsubscribe = onSnapshot(tablesRef, (snapshot) => {
      const tablesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Table[];
      setTables(tablesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Pobieranie zamówień
  useEffect(() => {
    const ordersRef = collection(db, 'orders');
    const unsubscribe = onSnapshot(ordersRef, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      setOrders(ordersData);
    });

    return () => unsubscribe();
  }, []);

  const handleTableClick = (table: Table) => {
  setSelectedTable(table);
  setShowOrderModal(true);
  setModalMode(null);
};

  const addOrderToTable = async () => {
    if (!selectedTable) return;

    try {
      const orderWithMetadata = {
        ...newOrder,
        timestamp: Timestamp.now(),
        total: 0
      };

      await addDoc(collection(db, 'orders'), {
        ...newOrder,
        tableId: selectedTable.id,
        timestamp: Timestamp.now(),
        dataState: 1
      });

      await updateDoc(doc(db, 'tables', selectedTable.id), {
        status: 'occupied'
      });

      setNewOrder({
        tableId: selectedTable.id,
        items: [],
        total: 0,
        status: 'pending',
        waiterName: 'Anna'
      });
      closeModal();
    } catch (error) {
      console.error("Błąd podczas dodawania zamówienia:", error);
    }
  };

  const closeModal = () => {
    setShowOrderModal(false);
    setSelectedTable(null);
  };

  if (loading) return <div className={styles.loading}>Ładowanie danych...</div>;

  return (
    <div className={styles.waiterContainer}>
      <h2 className={styles.pageTitle}>Panel Kelnera</h2>

      <div className={styles.tablesGrid}>
        {tables.map((table) => {
          const activeOrders = orders.filter(
            (order) => order.tableId === table.id && order.status === 'pending'
          );

          return (
            <div
              key={table.id}
              className={`${styles.table} ${styles[`table-${table.status}`]}`}
              onClick={() => handleTableClick(table)}
            >
              <span className={styles.tableNumber}>Stolik {table.number}</span>
              <span className={styles.tableStatus}>
                {table.status === 'free' && 'Wolny'}
                {table.status === 'occupied' && 'Zajęty'}
                {table.status === 'reserved' && `Rez. ${table.reservationTime}`}
              </span>
              {table.customerName && (
                <span className={styles.customerName}>{table.customerName}</span>
              )}
              {activeOrders.length > 0 && (
                <span className={styles.orderCount}>
                  {activeOrders.length} aktywnych
                </span>
              )}
            </div>
          );
        })}
      </div>

      <button
        className={styles.backButton}
        onClick={() => navigate('/')}
      >
        Powrót
      </button>

      {showOrderModal && selectedTable && (
  <div className={styles.modalOverlay}>
    <div className={styles.modalContent}>
      {/* Tryb początkowy - wybór */}
      {!modalMode && (
        <>
          <h3>Stolik {selectedTable.number}</h3>
          <div className={styles.modalButtons}>
            <button
              className={styles.confirmButton}
              onClick={() => setModalMode('add')}
            >
              Złóż zamówienie
            </button>
            <button
              className={styles.confirmButton}
              onClick={() => setModalMode('view')}
            >
              Zobacz zamówienia
            </button>
            <button
              className={styles.cancelButton}
              onClick={closeModal}
            >
              Anuluj
            </button>
          </div>
        </>
      )}

      {/* Tryb podglądu zamówień */}
      {modalMode === 'view' && (
       <>
         <h3>Zamówienia dla stolika {selectedTable.number}</h3>
         <ul className={styles.orderList}>
           {orders
             .filter(order => order.tableId === selectedTable.id && (order.dataState ?? 1) === 1)
             .map(order => (
               <li key={order.id} className={styles.singleOrderCard}>
                 <p>Status: {order.status}</p>
                 <ul className={styles.orderItemList}>
                   {order.items.map(item => (
                     <li key={item.id}>
                       {item.name} – {item.price} zł
                     </li>
                   ))}
                 </ul>
                </li>
             ))}
          </ul>
           
          <div className={styles.modalButtons}>
            <button className={styles.cancelButton} onClick={closeModal}>
              Zamknij
            </button>
            <button
              className={styles.confirmButton}
              onClick={async () => {
                const activeOrders = orders.filter(
                  (order) =>
                    order.tableId === selectedTable.id &&
                    (order.dataState ?? 1) === 1
                );
              
                try {
                  for (const order of activeOrders) {
                    await updateDoc(doc(db, 'orders', order.id), {
                      dataState: 2,
                     status: 'completed'
                    });
                  }
                
                 await updateDoc(doc(db, 'tables', selectedTable.id), {
                   status: 'free'
                 });
               
                 closeModal();
               } catch (error) {
                 console.error('Błąd przy kończeniu zamówień:', error);
               }
             }}
           >
             Zakończ wszystkie
           </button>
           <div className={styles.orderSummary}>
             Razem: {
               orders
                 .filter(
                   (order) =>
                     order.tableId === selectedTable.id &&
                     (order.dataState ?? 1) === 1
                  )
                  .reduce((sum, order) => sum + order.total, 0)
              } zł
            </div>
          </div>
        </>
      )}

      {/* Tryb składania zamówienia */}
      {modalMode === 'add' && (
        <>
          <h3>Nowe zamówienie dla stolika {selectedTable.number}</h3>
          <div className={styles.orderForm}>
            {newOrder.items.map((item, index) => (
              <div key={item.id} className={styles.orderItem}>
                <select
                  className={styles.selectInput}
                  value={item.name}
                  onChange={(e) => {
                    const selectedName = e.target.value;
                    const menuItem = menuItems.find((m) => m.name === selectedName);
                    const items = [...newOrder.items];
                  
                    if (menuItem) {
                      items[index].name = menuItem.name;
                      items[index].price = menuItem.price;                    
                      const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
                      setNewOrder({ ...newOrder, items, total });
                    }
                  }}
                >
                  <option value="">-- Wybierz danie --</option>
                  {menuItems.map((menuItem) => (
                    <option key={menuItem.name} value={menuItem.name}>
                      {menuItem.name} – {menuItem.price} zł
                    </option>
                  ))}
                </select>
                <button
                  className={styles.removeItemButton}
                  onClick={() => {
                    const updatedItems = newOrder.items.filter((_, i) => i !== index);
                    const total = updatedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
                    setNewOrder({ ...newOrder, items: updatedItems, total });
                  }}
                >
                  Usuń
                </button>
              </div>
            ))}

            <button
              className={styles.addItemButton}
              onClick={() =>
                setNewOrder({
                  ...newOrder,
                  items: [
                    ...newOrder.items,
                    {
                      id: Date.now().toString(),
                      name: '',
                      price: 0,
                      quantity: 1
                    }
                  ]
                })
              }
            >
              + Dodaj kolejne danie
            </button>
          </div>

          <div className={styles.modalButtons}>
            <button className={styles.cancelButton} onClick={closeModal}>
              Anuluj
            </button>
            <button
              className={styles.confirmButton}
              onClick={addOrderToTable}
              disabled={newOrder.items.length === 0}
            >
              Gotowe
            </button>
          </div>
        </>
      )}
    </div>
  </div>
)}
    </div>
  );
}