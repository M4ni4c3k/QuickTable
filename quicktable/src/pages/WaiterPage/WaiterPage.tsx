import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  doc, 
  onSnapshot, 
  updateDoc,
  arrayUnion,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import styles from './WaiterPage.module.css';

type TableStatus = 'free' | 'occupied' | 'reserved';

interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  timestamp: Timestamp;
  status: 'pending' | 'completed';
}

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Table {
  id: string;
  number: number;
  status: TableStatus;
  orders: Order[];
  customerName?: string;
  reservationTime?: string;
}

export default function WaiterPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [newOrder, setNewOrder] = useState<Omit<Order, 'id' | 'timestamp'>>({
    items: [],
    total: 0,
    status: 'pending'
  });
  const navigate = useNavigate();

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

  const handleTableClick = (table: Table) => {
    setSelectedTable(table);
    setShowOrderModal(true);
  };

  const addOrderToTable = async () => {
    if (!selectedTable) return;
    
    try {
      const tableRef = doc(db, 'tables', selectedTable.id);
      const orderWithMetadata = {
        ...newOrder,
        id: Date.now().toString(),
        timestamp: Timestamp.now()
      };

      await updateDoc(tableRef, {
        orders: arrayUnion(orderWithMetadata),
        status: 'occupied' as TableStatus
      });

      setNewOrder({
        items: [],
        total: 0,
        status: 'pending'
      });
      closeModal();
    } catch (error) {
      console.error("Error adding order: ", error);
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
        {tables.map((table) => (
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
            {table.orders.length > 0 && (
              <span className={styles.orderCount}>
                {table.orders.filter(o => o.status === 'pending').length} aktywnych
              </span>
            )}
          </div>
        ))}
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
            <h3>Dodaj zamówienie do Stolika {selectedTable.number}</h3>
            
            <div className={styles.orderForm}>
              <div className={styles.formGroup}>
                <label>Nazwa dania:</label>
                <input 
                  type="text" 
                  onChange={(e) => setNewOrder({
                    ...newOrder,
                    items: [...newOrder.items, {
                      id: Date.now().toString(),
                      name: e.target.value,
                      price: 0,
                      quantity: 1
                    }]
                  })}
                />
              </div>
              
              <div className={styles.orderItems}>
                {newOrder.items.map(item => (
                  <div key={item.id} className={styles.orderItem}>
                    <span>{item.name}</span>
                    <span>{item.price} zł x {item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.modalButtons}>
              <button 
                className={styles.cancelButton} 
                onClick={closeModal}
              >
                Anuluj
              </button>
              <button 
                className={styles.confirmButton}
                onClick={addOrderToTable}
                disabled={newOrder.items.length === 0}
              >
                Dodaj zamówienie
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}