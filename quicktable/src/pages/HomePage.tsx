import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useState } from 'react';

export default function HomePage() {
  const navigate = useNavigate();
  const { user, loginWithGoogle } = useAuth();
  const [showReservationModal, setShowReservationModal] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error('Google login failed:', err);
    }
  };

  return (
    <div className="w-full">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary via-blue-600 to-blue-700 text-white rounded-xl sm:rounded-2xl shadow-2xl p-6 sm:p-8 md:p-12 mb-6 sm:mb-12 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative z-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 drop-shadow-lg">
            Witamy w QuickTable! 👋
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-blue-100 mb-4 sm:mb-6 md:mb-8 font-medium px-2">
            Twoja restauracja na wyciągnięcie ręki
          </p>
          <p className="text-sm sm:text-base md:text-lg text-blue-50 max-w-2xl mx-auto mb-6 sm:mb-8 px-2">
            Zamawiaj bezpośrednio z telefonu, przeglądaj menu, rezerwuj stolik - wszystko w jednym miejscu!
          </p>
          {!user && (
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mt-4 sm:mt-8 px-2">
              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white text-primary rounded-xl hover:bg-blue-50 transition-all duration-300 font-bold text-base sm:text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Zaloguj się / Zarejestruj
              </button>
              <button
                onClick={handleGoogleLogin}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 rounded-xl hover:bg-white/20 transition-all duration-300 font-bold text-base sm:text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Zaloguj przez Google
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-12">
        <button 
          onClick={() => {
            if (!user) {
              if (confirm('Aby złożyć zamówienie, musisz się zalogować lub utworzyć konto. Czy chcesz przejść do logowania?')) {
                navigate('/login');
              }
            } else {
              navigate('/order');
            }
          }}
          className="group relative bg-gradient-to-br from-primary to-blue-600 text-white rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 sm:hover:-translate-y-2 overflow-hidden"
        >
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
          <div className="relative z-10">
            <div className="text-5xl sm:text-6xl mb-3 sm:mb-4 transform group-hover:scale-110 transition-transform duration-300">🍽️</div>
            <h3 className="text-xl sm:text-2xl font-bold mb-2">Zamów teraz</h3>
            <p className="text-blue-100 text-xs sm:text-sm">
              Wybierz stolik i zamów jedzenie bezpośrednio z telefonu
            </p>
          </div>
        </button>

        <button 
          onClick={() => navigate('/menu')}
          className="group relative bg-gradient-to-br from-secondary to-green-600 text-white rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 sm:hover:-translate-y-2 overflow-hidden"
        >
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
          <div className="relative z-10">
            <div className="text-5xl sm:text-6xl mb-3 sm:mb-4 transform group-hover:scale-110 transition-transform duration-300">📋</div>
            <h3 className="text-xl sm:text-2xl font-bold mb-2">Przeglądaj menu</h3>
            <p className="text-green-100 text-xs sm:text-sm">Zobacz naszą pełną ofertę dań i napojów</p>
          </div>
        </button>

        <button 
          onClick={() => {
            if (!user) {
              console.log('Opening reservation modal');
              setShowReservationModal(true);
            } else {
              navigate('/reservation');
            }
          }}
          className="group relative bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 sm:hover:-translate-y-2 overflow-hidden"
        >
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
          <div className="relative z-10">
            <div className="text-5xl sm:text-6xl mb-3 sm:mb-4 transform group-hover:scale-110 transition-transform duration-300">📅</div>
            <h3 className="text-xl sm:text-2xl font-bold mb-2">Zarezerwuj stolik</h3>
            <p className="text-purple-100 text-xs sm:text-sm">
              Zarezerwuj stolik na wybraną datę i godzinę
            </p>
          </div>
        </button>
      </div>

      {/* Features Section */}
      <section className="bg-gradient-to-br from-white via-gray-50 to-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6 md:p-8 mb-4 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 md:mb-8 text-gray-800 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent text-center px-2">
          Dlaczego warto wybrać QuickTable?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100">
            <div className="text-4xl mb-3 sm:mb-4 text-center">⚡</div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 text-center">Szybkie zamawianie</h3>
            <p className="text-sm sm:text-base text-gray-600 text-center">Zamów jedzenie bezpośrednio z telefonu - bez czekania na kelnera</p>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100">
            <div className="text-4xl mb-3 sm:mb-4 text-center">📱</div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 text-center">Wygodna rezerwacja</h3>
            <p className="text-sm sm:text-base text-gray-600 text-center">Zarezerwuj stolik online w kilka prostych kroków</p>
          </div>
        </div>
      </section>

      {/* Quick Start CTA */}
      <div className="bg-gradient-to-r from-primary to-blue-600 rounded-xl sm:rounded-2xl shadow-xl p-6 sm:p-8 text-center text-white">
        <h3 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Gotowy na niezapomnianą wizytę?</h3>
        <p className="text-base sm:text-lg md:text-xl text-blue-100 mb-4 sm:mb-6 px-2">Zacznij już teraz - wybierz jedną z opcji powyżej!</p>
        <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4">
          <button 
            onClick={() => {
              if (!user) {
                if (confirm('Aby złożyć zamówienie, musisz się zalogować lub utworzyć konto. Czy chcesz przejść do logowania?')) {
                  navigate('/login');
                }
              } else {
                navigate('/order');
              }
            }}
            className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white text-primary rounded-xl hover:bg-blue-50 transition-all duration-300 font-bold text-base sm:text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            🍽️ Zamów teraz
          </button>
          <button 
            onClick={() => navigate('/menu')}
            className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white text-secondary rounded-xl hover:bg-green-50 transition-all duration-300 font-bold text-base sm:text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            📋 Zobacz menu
          </button>
          <button 
            onClick={() => {
              if (!user) {
                console.log('Opening reservation modal from bottom button');
                setShowReservationModal(true);
              } else {
                navigate('/reservation');
              }
            }}
            className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white text-purple-600 rounded-xl hover:bg-purple-50 transition-all duration-300 font-bold text-base sm:text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            📅 Rezerwuj stolik
          </button>
        </div>
      </div>

      {/* Reservation Modal */}
      {showReservationModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
          onClick={() => setShowReservationModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">
              Zarezerwuj stolik
            </h3>
            <p className="text-gray-600 mb-6 text-center">
              Wybierz sposób rezerwacji:
            </p>
            <div className="space-y-4">
              <button
                onClick={() => {
                  setShowReservationModal(false);
                  navigate('/login');
                }}
                className="w-full px-6 py-4 bg-gradient-to-r from-primary to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                🔐 Zaloguj się / Utwórz konto
              </button>
              <button
                onClick={() => {
                  setShowReservationModal(false);
                  navigate('/reservation');
                }}
                className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-pink-500 hover:to-pink-600 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                👤 Zarezerwuj anonimowo
              </button>
              <button
                onClick={() => setShowReservationModal(false)}
                className="w-full px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}