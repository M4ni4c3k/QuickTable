import styles from './Header.module.css';
import SettingsIcon from '../SettingsIcon/SettingsIcon';

export default function Header() {
  return (
    <header className={styles.header}>
      <img src="./src/assets/Logo.png" className={styles.logo} alt="Logo" />
      
      <div className={styles.text}>
        <h1>QuickTable</h1>
        <p>System zarządzania restauracją</p>
      </div>

      <div className={styles.actions}>
        <SettingsIcon />
      </div>
    </header>
  );
}
