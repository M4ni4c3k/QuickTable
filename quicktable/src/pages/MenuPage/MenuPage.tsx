import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import styles from './MenuPage.module.css';

type MenuItem = {
  id: string;
  name: string;
  price: number;
};

export default function MenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'menu'));
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as { name: string; price: number }),
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
      <h2>Nasze Menu</h2>
      <ul className={styles.menuList}>
        {menuItems.map(item => (
          <li key={item.id} className={styles.menuItem}>
            <span className={styles.name}>{item.name}</span>
            <span className={styles.price}>{item.price} zł</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
