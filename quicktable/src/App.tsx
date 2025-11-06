import Footer from "./components/Footer/Footer";
import Header from "./components/Header/Header";
import WelcomeHeader from "./components/WelcomeHeader/WelcomeHeader";
import { Outlet, useLocation } from 'react-router-dom';

export default function App() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  
  return (
    <div className="min-h-screen flex flex-col">
      {isHomePage ? <WelcomeHeader /> : <Header />}
      <main className="flex-1 p-2 sm:p-4 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}