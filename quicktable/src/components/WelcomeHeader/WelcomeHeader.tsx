import SettingsIcon from '../SettingsIcon/SettingsIcon';

export default function WelcomeHeader() {
  return (
    <header className="bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 text-white shadow-xl border-b-4 border-primary">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 sm:space-x-6 group flex-shrink-0 min-w-0">
            <div className="relative flex-shrink-0">
              <img 
                src="/src/assets/Logo.png" 
                className="h-16 w-16 sm:h-20 sm:w-20 object-contain transition-transform duration-300 group-hover:scale-110 drop-shadow-lg" 
                alt="QuickTable Logo" 
                style={{ minWidth: '64px', minHeight: '64px' }}
              />
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent drop-shadow-md truncate">
                QuickTable
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-gray-200 font-medium mt-1 hidden sm:block">System zarządzania restauracją</p>
            </div>
          </div>

          <div className="flex items-center">
            <SettingsIcon />
          </div>
        </div>
      </div>
    </header>
  );
}


