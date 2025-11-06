import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface SettingsIconProps {
  additionalOptions?: { label: string; onClick: () => void; className?: string }[];
}

export default function SettingsIcon({ additionalOptions }: SettingsIconProps) {
  const [showViewModal, setShowViewModal] = useState(false);
  const [showChangeViewModal, setShowChangeViewModal] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleNavigate = (path: string) => {
    setShowChangeViewModal(false);
    setShowViewModal(false);
    navigate(path);
  };

  const handleChangeViewClick = () => {
    if (!user) {
      setShowLoginPrompt(true);
      setShowViewModal(false);
    } else {
      setShowChangeViewModal(true);
    }
  };

  return (
    <>
      <button
        className="p-3 hover:bg-white/20 rounded-full transition-all duration-300 text-2xl hover:rotate-90 hover:scale-110 shadow-lg hover:shadow-xl"
        onClick={() => setShowViewModal(true)}
        title="Ustawienia"
      >
        ⚙️
      </button>

      {showViewModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
          onClick={() => setShowViewModal(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl p-4 sm:p-6 max-w-md w-full mx-2 sm:mx-4 border border-gray-100 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-800 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">Ustawienia</h3>
            <div className="space-y-2 sm:space-y-3">
              <button 
                onClick={handleChangeViewClick}
                className="w-full px-4 py-3 sm:py-3.5 bg-gradient-to-r from-primary to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-semibold text-sm sm:text-base shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:scale-95"
              >
                Zmień widok
              </button>
              {additionalOptions && additionalOptions.length > 0 && (
                <div className="border-t my-2"></div>
              )}
              {additionalOptions?.map((option, index) => (
                <button 
                  key={index} 
                  onClick={option.onClick} 
                  className={`w-full px-4 py-3 rounded-lg transition-all duration-300 font-medium shadow-sm hover:shadow-md transform hover:-translate-y-0.5 ${option.className || 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button 
              className="mt-4 w-full px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-all duration-300 font-semibold shadow-sm hover:shadow-md"
              onClick={() => setShowViewModal(false)}
            >
              Zamknij
            </button>
          </div>
        </div>
      )}

      {showChangeViewModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
          onClick={() => setShowChangeViewModal(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl p-4 sm:p-6 max-w-md w-full mx-2 sm:mx-4 border border-gray-100 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-800 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">Zmień widok</h3>
            <div className="space-y-2 sm:space-y-2.5">
              <button 
                onClick={() => handleNavigate('/admin')}
                className="w-full px-4 py-3 sm:py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-all duration-300 font-medium text-sm sm:text-base shadow-sm hover:shadow-md transform hover:-translate-y-0.5 active:scale-95"
              >
                Panel Administracyjny
              </button>
              <button 
                onClick={() => handleNavigate('/client')}
                className="w-full px-4 py-3 sm:py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-all duration-300 font-medium text-sm sm:text-base shadow-sm hover:shadow-md transform hover:-translate-y-0.5 active:scale-95"
              >
                Strona Klienta
              </button>
              <button 
                onClick={() => handleNavigate('/menu')}
                className="w-full px-4 py-3 sm:py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-all duration-300 font-medium text-sm sm:text-base shadow-sm hover:shadow-md transform hover:-translate-y-0.5 active:scale-95"
              >
                Menu
              </button>
              <button 
                onClick={() => handleNavigate('/order')}
                className="w-full px-4 py-3 sm:py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-all duration-300 font-medium text-sm sm:text-base shadow-sm hover:shadow-md transform hover:-translate-y-0.5 active:scale-95"
              >
                Zamówienia
              </button>
              <button 
                onClick={() => handleNavigate('/reservation')}
                className="w-full px-4 py-3 sm:py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-all duration-300 font-medium text-sm sm:text-base shadow-sm hover:shadow-md transform hover:-translate-y-0.5 active:scale-95"
              >
                Rezerwacje
              </button>
              <button 
                onClick={() => handleNavigate('/kitchen')}
                className="w-full px-4 py-3 sm:py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-all duration-300 font-medium text-sm sm:text-base shadow-sm hover:shadow-md transform hover:-translate-y-0.5 active:scale-95"
              >
                Kuchnia
              </button>
              <button 
                onClick={() => handleNavigate('/waiter')}
                className="w-full px-4 py-3 sm:py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-all duration-300 font-medium text-sm sm:text-base shadow-sm hover:shadow-md transform hover:-translate-y-0.5 active:scale-95"
              >
                Kelner
              </button>
            </div>
            <button 
              className="mt-4 w-full px-4 py-3 sm:py-3.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-all duration-300 font-semibold text-sm sm:text-base shadow-sm hover:shadow-md active:scale-95"
              onClick={() => setShowChangeViewModal(false)}
            >
              Wróć
            </button>
          </div>
        </div>
      )}

      {showLoginPrompt && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
          onClick={() => setShowLoginPrompt(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl p-4 sm:p-6 md:p-8 max-w-md w-full mx-2 sm:mx-4 border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-gray-800 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent text-center">
              Wymagane logowanie
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 text-center">
              Aby zmienić widok, musisz się najpierw zalogować.
            </p>
            <div className="space-y-2 sm:space-y-3">
              <button 
                onClick={() => {
                  setShowLoginPrompt(false);
                  navigate('/login');
                }}
                className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-primary to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-semibold text-sm sm:text-base shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95"
              >
                Przejdź do logowania
              </button>
              <button 
                className="w-full px-4 sm:px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm sm:text-base active:scale-95"
                onClick={() => setShowLoginPrompt(false)}
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


