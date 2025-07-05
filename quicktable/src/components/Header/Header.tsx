import { useNavigate } from 'react-router-dom';
import styles from './Header.module.css';

export default function Header() {
  const navigate = useNavigate();

  return (
    <header className={styles.header}>
      <img src="./src/assets/Logo.png" className={styles.logo} alt="Logo" />
      
      <div className={styles.text}>
        <h1>QuickTable</h1>
        <p>System zarządzania restauracją</p>
      </div>

      <div className={styles.actions}>
        <button className="btn primary" onClick={() => navigate('/waiter')}>
          Kelner
        </button>
        <button className="btn secondary" onClick={() => navigate('/client')}>
          Gość
        </button>
        <button className="btn secondary" onClick={() => navigate('/admin')}>
          Admin
        </button>
        <button className="btn secondary" onClick={() => navigate('/kitchen')}>
          Kuchnia
        </button>
        <button className="btn third" onClick={() => navigate('/')}>
          Powrót
        </button>
      </div>
    </header>
  );
}
