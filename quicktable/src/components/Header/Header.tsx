import SettingsIcon from '../SettingsIcon/SettingsIcon';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const roleLabels: Record<string, string> = {
  admin: 'Administrator',
  manager: 'Menedżer',
  client: 'Klient',
  waiter: 'Kelner',
  kitchen: 'Kuchnia',
};

export default function Header() {
  const { userData, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 text-white shadow-lg border-b-4 border-primary">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 min-h-[64px]">
          <div className="flex items-center space-x-2 sm:space-x-4 group flex-shrink-0">
            <div className="relative flex-shrink-0">
              <img 
                src="/src/assets/Logo.png" 
                className="h-12 w-12 sm:h-14 sm:w-14 object-contain transition-transform duration-300 group-hover:scale-110" 
                alt="Logo" 
                style={{ minWidth: '48px', minHeight: '48px' }}
              />
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent truncate">
                QuickTable
              </h1>
              <p className="text-xs sm:text-sm text-gray-300 font-medium hidden sm:block">System zarządzania restauracją</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {user && userData ? (
              <div className="flex items-center gap-1 sm:gap-3 bg-white/10 px-2 sm:px-4 py-1 sm:py-2 rounded-lg backdrop-blur-sm flex-shrink-0">
                <button
                  onClick={() => navigate('/profile')}
                  className="flex items-center gap-1 sm:gap-3 hover:opacity-80 transition-opacity"
                  title="Moje konto"
                >
                  {userData.photoURL ? (
                    <img 
                      src={userData.photoURL} 
                      alt={userData.displayName || 'User'} 
                      className="h-7 w-7 sm:h-8 sm:w-8 rounded-full cursor-pointer"
                    />
                  ) : (
                    <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary flex items-center justify-center text-white font-bold cursor-pointer text-xs sm:text-sm">
                      {(userData.displayName || userData.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col hidden sm:flex">
                    <span className="text-xs sm:text-sm font-semibold truncate max-w-[120px] lg:max-w-none">{userData.displayName || userData.email}</span>
                    <span className="text-xs text-gray-300">{roleLabels[userData.role] || userData.role}</span>
                  </div>
                </button>
                <button
                  onClick={handleLogout}
                  className="ml-1 sm:ml-2 px-2 sm:px-3 py-1 bg-red-600 hover:bg-red-700 rounded-md text-xs sm:text-sm font-medium transition-colors"
                  title="Wyloguj"
                >
                  <span className="hidden sm:inline">Wyloguj</span>
                  <span className="sm:hidden">✕</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="px-2 sm:px-4 py-1 sm:py-2 bg-primary hover:bg-blue-600 rounded-lg text-xs sm:text-base font-medium transition-colors"
              >
                <span className="hidden sm:inline">Zaloguj się</span>
                <span className="sm:hidden">Login</span>
              </button>
            )}
            <SettingsIcon />
          </div>
        </div>
      </div>
    </header>
  );
}
