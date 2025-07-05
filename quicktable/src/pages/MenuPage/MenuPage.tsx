import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { useNavigate } from 'react-router-dom';
import styles from './MenuPage.module.css';
import type { MenuItem } from '../../types/types';

export default function MenuPage() {
  const navigate = useNavigate();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  // Fetch menu items from Firestore
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'menu'));
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<MenuItem, 'id'>),
        }));
        setMenuItems(items);
        setLoading(false);
      } catch (error) {
        console.error('Błąd podczas pobierania menu:', error);
        setLoading(false);
      }
    };

    fetchMenu();
  }, []);

  if (loading) return <p>Ładowanie menu...</p>;

  return (
    <div className={styles.menuPage}>
      <div className={styles.headerSection}>
        <h2>Nasze Menu</h2>
        <button className={styles.backButton} onClick={() => navigate('/')}>
          ⬅ Wróć do strony głównej
        </button>
      </div>

      <ul className={styles.menuList}>
        {menuItems.map(item => (
          <li
            key={item.id}
            className={styles.menuItem}
            onClick={() => setSelectedItem(item)}
            tabIndex={0}
            role="button"
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') setSelectedItem(item);
            }}
          >
            <span className={styles.name}>{item.name}</span>
            <span className={styles.price}>{item.price} zł</span>
          </li>
        ))}
      </ul>

      {selectedItem && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setSelectedItem(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className={styles.modal}
            onClick={e => e.stopPropagation()}
            tabIndex={-1}
          >
            <h3>{selectedItem.name}</h3>
            <p><strong>Składniki:</strong></p>
            <ul>
              {selectedItem.ingredients.map((ing, i) => (
                <li key={i}>{ing}</li>
              ))}
            </ul>
            <button
              onClick={() => setSelectedItem(null)}
              className={styles.closeButton}
            >
              Zamknij
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
