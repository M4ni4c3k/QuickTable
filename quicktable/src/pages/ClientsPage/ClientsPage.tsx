import { useState } from 'react';
import styles from './ClientsPage.module.css';
import { useNavigate } from 'react-router-dom';

const mockMenu = [
  { name: 'Pizza Margherita', description: 'Tradycyjna pizza z serem i sosem pomidorowym.', price: 25 },
  { name: 'Spaghetti Bolognese', description: 'Makaron z sosem mięsnym i ziołami.', price: 30 },
  { name: 'Sałatka Cezar', description: 'Sałata z kurczakiem, parmezanem i sosem Cezar.', price: 22 },
];

export default function ClientsPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<'start' | 'menu'>('start');

  if (view === 'menu') {
    return (
      <main className={styles.mainContent}>
        <div className={styles.features}>
          <h2>Menu</h2>
        </div>
        
        <ul className={styles.menuList}>
          {mockMenu.map((item, index) => (
            <li key={index} className={styles.menuItem}>
              <h3>{item.name} - {item.price} zł</h3>
              <p>{item.description}</p>
            </li>
          ))}
        </ul>
        
        <div className={styles.backButtonContainer}>
          <button className={styles.backButton} onClick={() => setView('start')}>
            ⬅ Wróć
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.mainContent}>
      <section className={styles.features}>
        <h2>Witaj w naszej restauracji!</h2>
        <p>Wybierz jedną z opcji:</p>
      </section>

      <div className={styles.actions}>
        <button className={styles.primaryBtn} onClick={() => navigate ('/order')}>
          🍽️ Zamów
        </button>
        <button className={styles.secondaryBtn} onClick={() => navigate ('/menu')}>
          📋 Przeglądaj menu
        </button>
        <button className={styles.tertiaryBtn} onClick={() => navigate ('/reservation')}>
          📅 Zarezerwuj stolik
        </button>
      </div>
    </main>
  );
}
