import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MenuItem } from '../../types/types';
import { menuAPI } from '../../utils/apiClient';
import Breadcrumb from '../../components/Breadcrumb/Breadcrumb';

export default function MenuPage() {
  const navigate = useNavigate();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  // Fetch menu items from Menu Service
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const items = await menuAPI.getAll();
        setMenuItems(items as MenuItem[]);
        setLoading(false);
      } catch (error) {
        console.error('Błąd podczas pobierania menu:', error);
        setLoading(false);
      }
    };

    fetchMenu();
  }, []);

  if (loading) return <p className="text-center py-8">Ładowanie menu...</p>;

  return (
    <div className="w-full">
      <Breadcrumb 
        items={[
          { label: 'Strona główna', path: '/client' },
          { label: 'Menu', path: '/menu' },
          ...(selectedItem ? [{ label: selectedItem.name }] : [])
        ]}
      />
      <div className="mb-4 sm:mb-6 md:mb-8">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent mb-2 px-2 sm:px-0">
          Nasze Menu
        </h2>
        <p className="text-sm sm:text-base text-gray-600 font-medium px-2 sm:px-0">Wybierz danie aby zobaczyć szczegóły</p>
      </div>

      <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
        {menuItems.map(item => (
          <li
            key={item.id}
            className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6 cursor-pointer hover:shadow-xl transition-all duration-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 border border-gray-100 transform hover:-translate-y-1 active:scale-[0.98]"
            onClick={() => setSelectedItem(item)}
            tabIndex={0}
            role="button"
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') setSelectedItem(item);
            }}
          >
            <span className="text-lg sm:text-xl font-semibold text-gray-800 break-words">{item.name}</span>
            <span className="text-xl sm:text-2xl font-bold text-primary whitespace-nowrap">{item.price} zł</span>
          </li>
        ))}
      </ul>

      <div className="flex justify-center mb-4 sm:mb-6 px-2">
        <button 
          className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-all duration-300 font-semibold text-sm sm:text-base shadow-md hover:shadow-lg active:scale-95"
          onClick={() => navigate('/')}
        >
          ⬅ Wróć do strony głównej
        </button>
      </div>

      {selectedItem && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
          onClick={() => setSelectedItem(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 max-w-md w-full mx-2 sm:mx-4 border border-gray-100 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
            tabIndex={-1}
          >
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 text-gray-800 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              {selectedItem.name}
            </h3>
            <div className="mb-4 sm:mb-6">
              <p className="font-bold mb-2 sm:mb-3 text-gray-700 text-base sm:text-lg">Składniki:</p>
              <ul className="space-y-1 sm:space-y-2">
                {selectedItem.ingredients.map((ing, i) => (
                  <li key={i} className="flex items-center text-sm sm:text-base text-gray-600">
                    <span className="mr-2 text-primary">•</span>
                    <span className="break-words">{ing}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mb-4">
              <p className="text-xl sm:text-2xl font-bold text-primary">{selectedItem.price} zł</p>
            </div>
            <button
              onClick={() => setSelectedItem(null)}
              className="w-full px-4 py-3 bg-gradient-to-r from-primary to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-semibold text-sm sm:text-base shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95"
            >
              Zamknij
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
