import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { useNavigate } from 'react-router-dom';
import type { Table, OrderItem } from '../../types/types';
import styles from './OrderPage.module.css';
import { createOrder } from '../../utils/databaseUtils';

export default function OrderPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTableId, setSelectedTableId] = useState('');
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<{ id: string; name: string; price: number }[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderSaved, setOrderSaved] = useState(false);

  // Fetch available tables and filter for free ones
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'tables'));
        const freeTables = querySnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
          }) as Table)
          .filter(table => table.status === 'free');

        setTables(freeTables);
        setLoading(false);
      } catch (error) {
        console.error('Błąd podczas pobierania stolików:', error);
        setLoading(false);
      }
    };

    fetchTables();
  }, []);

  // Fetch menu items for order selection
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'menu'));
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as { name: string; price: number }),
        }));
        setMenuItems(items);
      } catch (error) {
        console.error('Błąd podczas pobierania menu:', error);
      }
    };

    fetchMenu();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !selectedTableId) return;

    try {
      const tableRef = doc(db, 'tables', selectedTableId);
      await updateDoc(tableRef, {
        status: 'occupied',
        customerName: name,
      });

      const table = tables.find((t) => t.id === selectedTableId);
      setSelectedTable(table ?? null);
    } catch (error) {
      console.error('Błąd przy przypisaniu stolika:', error);
    }
  };

  const handleAddItem = () => {
    setOrderItems((prev) => [...prev, { id: '', name: '', price: 0, quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = orderItems.filter((_, i) => i !== index);
    setOrderItems(updatedItems);
  };

  const handleChangeItem = (index: number, selectedName: string) => {
    const menuItem = menuItems.find((m) => m.name === selectedName);
    if (!menuItem) return;

    const updatedItems = [...orderItems];
    updatedItems[index] = {
      ...updatedItems[index],
      id: menuItem.id,
      name: menuItem.name,
      price: menuItem.price,
    };
    setOrderItems(updatedItems);
  };

  const handleSaveOrder = async () => {
    if (!selectedTableId || orderItems.length === 0) return;

    const total = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    try {
      await createOrder({
        tableId: selectedTableId,
        items: orderItems,
        total,
        status: 'pending',
        waiterName: '',
        dataState: 1,
      });

      setOrderSaved(true);
    } catch (error) {
      console.error('Błąd przy zapisie zamówienia:', error);
    }
  };

  if (loading) return <p>Ładowanie dostępnych stolików...</p>;

  return (
    <div className={styles.orderPage}>
      <div className={styles.headerSection}>
        <h2>Rozpocznij zamówienie</h2>
        <button className={styles.backButton} onClick={() => navigate('/')}>
          ⬅ Wróć do strony głównej
        </button>
      </div>

      {!selectedTable && (
        <form onSubmit={handleSubmit} className={styles.orderForm}>
          <label>
            Twoje imię:
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>

          <label>
            Wybierz stolik:
            <select
              value={selectedTableId}
              onChange={(e) => setSelectedTableId(e.target.value)}
              required
            >
              <option value="">-- wybierz wolny stolik --</option>
              {tables.map((table) => (
                <option key={table.id} value={table.id}>
                  Stolik {table.number}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" className={styles.submitButton}>
            Przejdź dalej
          </button>
        </form>
      )}

      {selectedTable && !orderSaved && (
        <div className={styles.menuSection}>
          <h3>Witaj, {name}! Dodaj zamówienie dla stolika {selectedTable.number}</h3>
          
          {orderItems.map((item, index) => (
            <div key={index} className={styles.orderItem}>
              <select
                value={item.name}
                onChange={(e) => handleChangeItem(index, e.target.value)}
              >
                <option value="">-- Wybierz danie --</option>
                {menuItems.map((menuItem) => (
                  <option key={menuItem.id} value={menuItem.name}>
                    {menuItem.name} – {menuItem.price} zł
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleRemoveItem(index)}
                className={styles.removeItemButton}
              >
                Usuń
              </button>
            </div>
          ))}

          <button onClick={handleAddItem} className={styles.addItemButton}>
            Dodaj danie
          </button>

          <p className={styles.total}>
            Suma: {orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)} zł
          </p>

          <button onClick={handleSaveOrder} className={styles.submitButton}>
            Zapisz zamówienie
          </button>
        </div>
      )}

      {orderSaved && (
        <div className={styles.successMessage}>
          <h3>Zamówienie zostało zapisane!</h3>
        </div>
      )}
    </div>
  );
}
