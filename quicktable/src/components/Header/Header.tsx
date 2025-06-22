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
          Panel kelnera
        </button>
        <button className="btn secondary" onClick={() => navigate('/client')}>
          Panel gościa
        </button>
        <button className="btn secondary" onClick={() => navigate('/admin')}>
          Panel admina
        </button>
        <button className="btn secondary" onClick={() => navigate('/kitchen')}>
          Panel kuchni
        </button>
        <button className="btn third" onClick={() => navigate('/')}>
          Powrót
        </button>
      </div>
    </header>
  );
}
