import Footer from "./components/Footer/Footer";
import Header from "./components/Header/Header";
import { Outlet } from 'react-router-dom';
import styles from './App.module.css'

export default function App() {
  return (
    <div className={styles.appContainer}>
      <Header />
      <main className={styles.mainContent}>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}