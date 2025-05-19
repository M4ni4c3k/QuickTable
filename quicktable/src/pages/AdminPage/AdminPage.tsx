import { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import styles from './AdminPage.module.css';

export default function AdminPage() {
  const [menuItems, setMenuItems] = useState<{ id: string, name: string, price: number }[]>([]);
  const [tables, setTables] = useState<{ id: string, number: number, status: string, guest?: string }[]>([]);
  const [newMenuItem, setNewMenuItem] = useState({ name: '', price: 0 });
  const [newTable, setNewTable] = useState({ number: 0 });
  const [view, setView] = useState<'menu' | 'tables' | null>(null); // 🆕

  useEffect(() => {
    const fetchData = async () => {
      const menuSnapshot = await getDocs(collection(db, 'menu'));
      const tableSnapshot = await getDocs(collection(db, 'tables'));

      setMenuItems(menuSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
      setTables(tableSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    };
    fetchData();
  }, []);

  const handleMenuUpdate = async (id: string, name: string, price: number) => {
    await updateDoc(doc(db, 'menu', id), { name, price });
  };

  const handleAddMenuItem = async () => {
    if (!newMenuItem.name || newMenuItem.price <= 0) return;
    const newDoc = await addDoc(collection(db, 'menu'), newMenuItem);
    setMenuItems([...menuItems, { id: newDoc.id, ...newMenuItem }]);
    setNewMenuItem({ name: '', price: 0 });
  };

  const handleDeleteMenuItem = async (id: string) => {
    await deleteDoc(doc(db, 'menu', id));
    setMenuItems(menuItems.filter(item => item.id !== id));
  };

  const handleTableUpdate = async (id: string, number: number) => {
    await updateDoc(doc(db, 'tables', id), { number });
  };

  const handleAddTable = async () => {
    if (newTable.number <= 0) return;
    const newDoc = await addDoc(collection(db, 'tables'), {
      number: newTable.number,
      status: 'free'
    });
    setTables([...tables, { id: newDoc.id, number: newTable.number, status: 'free' }]);
    setNewTable({ number: 0 });
  };

  const handleDeleteTable = async (id: string) => {
    await deleteDoc(doc(db, 'tables', id));
    setTables(tables.filter(table => table.id !== id));
  };

  if (!view) {
    return (
      <div className={styles.adminContainer}>
        <h2 className={styles.pageTitle}>Wybierz opcję</h2>
        <div className={styles.selectionPanel}>
          <button className={styles.bigButton} onClick={() => setView('menu')}>🍽️ Edycja Menu</button>
          <button className={styles.bigButton} onClick={() => setView('tables')}>🪑 Zarządzanie Stolikami</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.adminContainer}>
      <h2 className={styles.pageTitle}>
        {view === 'menu' ? 'Edycja Menu' : 'Zarządzanie Stolikami'}
      </h2>
      {view === 'menu' && (
        <section className={styles.section}>
          <h3>Menu</h3>
          {menuItems.map(item => (
            <div key={item.id} className={styles.itemRow}>
              <input
                value={item.name}
                onChange={(e) => {
                  const updated = menuItems.map(m => m.id === item.id ? { ...m, name: e.target.value } : m);
                  setMenuItems(updated);
                }}
              />
              <input
                type="number"
                value={item.price}
                onChange={(e) => {
                  const updated = menuItems.map(m => m.id === item.id ? { ...m, price: Number(e.target.value) } : m);
                  setMenuItems(updated);
                }}
              />
              <button className={styles.saveButton} onClick={() => handleMenuUpdate(item.id, item.name, item.price)}>Zapisz</button>
              <button className={styles.deleteButton} onClick={() => handleDeleteMenuItem(item.id)}>Usuń</button>
            </div>
          ))}
          <div className={styles.itemRow}>
            <input
              placeholder="Nazwa"
              value={newMenuItem.name}
              onChange={(e) => setNewMenuItem({ ...newMenuItem, name: e.target.value })}
            />
            <input
              type="number"
              placeholder="Cena"
              value={newMenuItem.price}
              onChange={(e) => setNewMenuItem({ ...newMenuItem, price: Number(e.target.value) })}
            />
            <button className={styles.addItemButton} onClick={handleAddMenuItem}>Dodaj</button>
          </div>
        </section>
      )}

      {view === 'tables' && (
        <section className={styles.section}>
          <h3>Stoliki</h3>
          {tables.map(table => (
            <div key={table.id} className={styles.itemRow}>
              <div>
                <strong>Stolik #{table.number}</strong><br />
                <span className={styles.tableStatusText}>Status: {table.status}</span><br />
                {table.status !== 'free' && table.guest && (
                  <span>Gość: {table.guest}</span>
                )}
              </div>
              <input
                type="number"
                value={table.number}
                onChange={(e) => {
                  const updated = tables.map(t => t.id === table.id ? { ...t, number: Number(e.target.value) } : t);
                  setTables(updated);
                }}
              />
              <button className={styles.saveButton} onClick={() => handleTableUpdate(table.id, table.number)}>Zapisz</button>
              <button className={styles.deleteButton} onClick={() => handleDeleteTable(table.id)}>Usuń</button>
            </div>
          ))}
          <div className={styles.itemRow}>
            <input
              type="number"
              placeholder="Numer stolika"
              value={newTable.number}
              onChange={(e) => setNewTable({ number: Number(e.target.value) })}
            />
            <button className={styles.addItemButton} onClick={handleAddTable}>Dodaj</button>
          </div>
        </section>
      )}
      <div className={styles.backButtonContainer}>
  <button className={styles.backButton} onClick={() => setView(null)}>
    ⬅ Wróć
  </button>
</div>
    </div>
  );
}
