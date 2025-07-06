import Footer from "./components/Footer/Footer";
import Header from "./components/Header/Header";
import { Outlet, useLocation } from 'react-router-dom';
import styles from './App.module.css'

export default function App() {
  const location = useLocation();
  
  // Don't show Header and Footer on admin, kitchen, and waiter pages
  const hideHeaderFooter = ['/admin', '/kitchen', '/waiter'].includes(location.pathname);
  
  return (
    <div className={styles.appContainer}>
      {!hideHeaderFooter && <Header />}
      <main className={styles.mainContent}>
        <Outlet />
      </main>
      {!hideHeaderFooter && <Footer />}
    </div>
  )
}