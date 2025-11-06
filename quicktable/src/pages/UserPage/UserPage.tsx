import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import Breadcrumb from '../../components/Breadcrumb/Breadcrumb';

const roleLabels: Record<string, string> = {
  admin: 'Administrator',
  manager: 'Menedżer',
  client: 'Klient',
  waiter: 'Kelner',
  kitchen: 'Kuchnia',
};

export default function UserPage() {
  const { user, userData, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!user || !userData) {
    return (
      <div className="w-full">
        <div className="bg-yellow-50 border border-yellow-400 text-yellow-700 rounded-lg p-8 mb-6">
          <h3 className="text-xl font-bold mb-2">Nie jesteś zalogowany</h3>
          <p className="mb-4">Musisz się zalogować aby zobaczyć informacje o koncie.</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-gradient-to-r from-primary to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
          >
            Przejdź do logowania
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Breadcrumb 
        items={[
          { label: 'Strona główna', path: '/' },
          { label: 'Moje konto' }
        ]}
      />
      <div className="mb-6">
        <h2 className="text-4xl font-bold text-gray-800 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent text-center mb-2">
          Moje konto
        </h2>
        <p className="text-gray-600 text-center font-medium">Zarządzaj swoimi danymi i ustawieniami</p>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6 border border-gray-100">
          <div className="flex items-center gap-6 mb-6 pb-6 border-b border-gray-200">
            {userData.photoURL ? (
              <img 
                src={userData.photoURL} 
                alt={userData.displayName || 'User'} 
                className="h-20 w-20 rounded-full border-4 border-primary"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-gradient-to-r from-primary to-blue-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-primary">
                {(userData.displayName || userData.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-800 mb-1">
                {userData.displayName || 'Brak nazwy'}
              </h3>
              <p className="text-gray-600 mb-2">{userData.email}</p>
              <span className="inline-block px-4 py-1 bg-primary/10 text-primary rounded-full font-semibold text-sm">
                {roleLabels[userData.role] || userData.role}
              </span>
            </div>
          </div>

          {/* Account Details */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-semibold text-gray-600 mb-1">Email</label>
                <p className="text-gray-800 font-medium">{userData.email || 'Brak email'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-semibold text-gray-600 mb-1">Rola</label>
                <p className="text-gray-800 font-medium">{roleLabels[userData.role] || userData.role}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-semibold text-gray-600 mb-1">Nazwa wyświetlana</label>
                <p className="text-gray-800 font-medium">{userData.displayName || 'Brak nazwy'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-semibold text-gray-600 mb-1">ID użytkownika</label>
                <p className="text-gray-800 font-medium text-xs break-all">{userData.uid}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Szybkie akcje</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userData.role === 'client' && (
              <>
                <button
                  onClick={() => navigate('/order')}
                  className="px-6 py-3 bg-gradient-to-r from-primary to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
                >
                  🍽️ Złóż zamówienie
                </button>
                <button
                  onClick={() => navigate('/reservation')}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-pink-500 hover:to-pink-600 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
                >
                  📅 Zarezerwuj stolik
                </button>
              </>
            )}
            {(userData.role === 'admin' || userData.role === 'manager') && (
              <button
                onClick={() => navigate('/admin')}
                className="px-6 py-3 bg-gradient-to-r from-primary to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
              >
                ⚙️ Panel administracyjny
              </button>
            )}
            {userData.role === 'waiter' && (
              <button
                onClick={() => navigate('/waiter')}
                className="px-6 py-3 bg-gradient-to-r from-primary to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
              >
                🍽️ Panel kelnera
              </button>
            )}
            {userData.role === 'kitchen' && (
              <button
                onClick={() => navigate('/kitchen')}
                className="px-6 py-3 bg-gradient-to-r from-primary to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
              >
                👨‍🍳 Panel kuchni
              </button>
            )}
            <button
              onClick={() => navigate('/menu')}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
            >
              📋 Przeglądaj menu
            </button>
          </div>
        </div>

        {/* Logout */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Wylogowanie</h3>
          <p className="text-gray-600 mb-4">Wyloguj się ze swojego konta</p>
          <button
            onClick={handleLogout}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
          >
            Wyloguj się
          </button>
        </div>

        <div className="flex justify-center mt-6">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            ⬅ Wróć do strony głównej
          </button>
        </div>
      </div>
    </div>
  );
}


