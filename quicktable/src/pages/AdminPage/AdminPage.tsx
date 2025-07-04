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
import type { MenuItem, Table } from '../../types/types';  

export default function AdminPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [addingNewMenuItem, setAddingNewMenuItem] = useState(false);
  const [newMenuItem, setNewMenuItem] = useState<MenuItem>({
    id: '', 
    name: '',
    price: 0,
    ingredients: [''],
  });
  const [view, setView] = useState<'menu' | 'tables' | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const menuSnapshot = await getDocs(collection(db, 'menu'));
      const tableSnapshot = await getDocs(collection(db, 'tables'));

      setMenuItems(menuSnapshot.docs.map(doc => ({
        ...(doc.data() as Omit<MenuItem, 'id'>),
        id: doc.id,
      })));

      setTables(tableSnapshot.docs.map(doc => ({
        ...(doc.data() as Omit<Table, 'id'>),
        id: doc.id,
      })));
    };
    fetchData();
  }, []);

  const handleMenuUpdate = async (id: string, name: string, price: number, ingredients: string[]) => {
    await updateDoc(doc(db, 'menu', id), { name, price, ingredients });
    setMenuItems(menuItems.map(item => item.id === id ? { id, name, price, ingredients } : item));
    setSelectedMenuItem(null);
  };

  const handleAddMenuItem = async () => {
    if (!newMenuItem.name || newMenuItem.price <= 0) return;
    const newDoc = await addDoc(collection(db, 'menu'), {
      name: newMenuItem.name,
      price: newMenuItem.price,
      ingredients: newMenuItem.ingredients,
    });
    setMenuItems([...menuItems, { ...newMenuItem, id: newDoc.id }]);
    setNewMenuItem({ id: '', name: '', price: 0, ingredients: [''] });
    setAddingNewMenuItem(false);
  };

  const handleDeleteMenuItem = async (id: string) => {
    await deleteDoc(doc(db, 'menu', id));
    setMenuItems(menuItems.filter(item => item.id !== id));
    setSelectedMenuItem(null);
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

  if (view === 'menu') {
    if (!selectedMenuItem && !addingNewMenuItem) {
      return (
        <div className={styles.adminContainer}>
          <h2 className={styles.pageTitle}>Menu - lista dań</h2>
          <ul className={styles.menuList}>
            {menuItems.map(item => (
              <li
                key={item.id}
                className={styles.menuListItem}
                onClick={() => setSelectedMenuItem(item)}
                style={{ cursor: 'pointer' }}
              >
                {item.name}
              </li>
            ))}
          </ul>
          <button className={styles.addItemButton} onClick={() => setAddingNewMenuItem(true)}>
            Dodaj nowy produkt
          </button>
          <div className={styles.backButtonContainer}>
            <button className={styles.backButton} onClick={() => setView(null)}>⬅ Wróć</button>
          </div>
        </div>
      );
    }

    if (selectedMenuItem) {
      return (
        <div className={styles.adminContainer}>
          <h2 className={styles.pageTitle}>Edycja dania</h2>
          <div className={styles.itemRow}>
            <label>Nazwa:</label>
            <input
              value={selectedMenuItem.name}
              onChange={(e) => setSelectedMenuItem({ ...selectedMenuItem, name: e.target.value })}
            />
          </div>
          <div className={styles.itemRow}>
            <label>Cena:</label>
            <input
              type="number"
              value={selectedMenuItem.price}
              onChange={(e) => setSelectedMenuItem({ ...selectedMenuItem, price: Number(e.target.value) })}
            />
          </div>

          <div className={styles.ingredientsContainer}>
            <label className={styles.itemLabel}>Składniki:</label>
            {selectedMenuItem.ingredients.map((ing, i) => (
              <div key={i} className={styles.ingredientRow}>
                <input
                  type="text"
                  value={ing}
                  onChange={(e) => {
                    const newIngredients = [...selectedMenuItem.ingredients];
                    newIngredients[i] = e.target.value;
                    setSelectedMenuItem({ ...selectedMenuItem, ingredients: newIngredients });
                  }}
                />
                <button
                  className={styles.deleteButton}
                  onClick={() => {
                    const newIngredients = [...selectedMenuItem.ingredients];
                    newIngredients.splice(i, 1);
                    setSelectedMenuItem({ ...selectedMenuItem, ingredients: newIngredients });
                  }}
                >
                  Usuń
                </button>
              </div>
            ))}
            <button
              className={styles.addIngredientButton}
              onClick={() =>
                setSelectedMenuItem({ ...selectedMenuItem, ingredients: [...selectedMenuItem.ingredients, ''] })
              }
            >
              Dodaj składnik
            </button>
          </div>

          <div className={styles.actionButtonsContainer}>
            <button
              className={styles.saveButton}
              onClick={() =>
                selectedMenuItem &&
                handleMenuUpdate(selectedMenuItem.id, selectedMenuItem.name, selectedMenuItem.price, selectedMenuItem.ingredients)
              }
            >
              Zapisz
            </button>
            <button
              className={styles.deleteButton}
              onClick={() => selectedMenuItem && handleDeleteMenuItem(selectedMenuItem.id)}
            >
              Usuń danie
            </button>
            <button className={styles.backButton} onClick={() => setSelectedMenuItem(null)}>
              ⬅ Powrót do listy
            </button>
          </div>
        </div>
      );
    }

    if (addingNewMenuItem) {
      return (
        <div className={styles.adminContainer}>
          <h2 className={styles.pageTitle}>Dodaj nowe danie</h2>
          <div className={styles.itemRow}>
            <label>Nazwa:</label>
            <input
              placeholder="Nazwa"
              value={newMenuItem.name}
              onChange={(e) => setNewMenuItem({ ...newMenuItem, name: e.target.value })}
            />
          </div>
          <div className={styles.itemRow}>
            <label>Cena:</label>
            <input
              type="number"
              placeholder="Cena"
              value={newMenuItem.price}
              onChange={(e) => setNewMenuItem({ ...newMenuItem, price: Number(e.target.value) })}
            />
          </div>

          <div className={styles.ingredientsContainer}>
            <label>Składniki:</label>
            {newMenuItem.ingredients.map((ing, i) => (
              <div key={i} className={styles.ingredientRow}>
                <input
                  type="text"
                  value={ing}
                  onChange={(e) => {
                    const updated = [...newMenuItem.ingredients];
                    updated[i] = e.target.value;
                    setNewMenuItem({ ...newMenuItem, ingredients: updated });
                  }}
                />
                <button
                  className={styles.deleteButton}
                  onClick={() => {
                    const updated = [...newMenuItem.ingredients];
                    updated.splice(i, 1);
                    setNewMenuItem({ ...newMenuItem, ingredients: updated });
                  }}
                >
                  Usuń
                </button>
              </div>
            ))}
            <button
              className={styles.addIngredientButton}
              onClick={() => setNewMenuItem({ ...newMenuItem, ingredients: [...newMenuItem.ingredients, ''] })}
            >
              Dodaj składnik
            </button>
          </div>

          <button className={styles.addItemButton} onClick={handleAddMenuItem}>
            Dodaj
          </button>

          <div className={styles.backButtonContainer}>
            <button className={styles.backButton} onClick={() => setAddingNewMenuItem(false)}>
              ⬅ Powrót do listy
            </button>
          </div>
        </div>
      );
    }
  }

  if (view === 'tables') {
    return (
      <div className={styles.adminContainer}>
        <h2 className={styles.pageTitle}>Zarządzanie Stolikami</h2>
        <div className={styles.backButtonContainer}>
          <button className={styles.backButton} onClick={() => setView(null)}>⬅ Wróć</button>
        </div>
      </div>
    );
  }

  return null;
}
