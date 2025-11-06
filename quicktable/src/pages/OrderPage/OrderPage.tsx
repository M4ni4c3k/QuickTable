import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Table, OrderItem } from '../../types/types';
import { orderAPI, tableAPI, menuAPI } from '../../utils/apiClient';
import Breadcrumb from '../../components/Breadcrumb/Breadcrumb';
import { useAuth } from '../../hooks/useAuth';

export default function OrderPage() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [name, setName] = useState('');
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTableId, setSelectedTableId] = useState('');
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<{ id: string; name: string; price: number }[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderSaved, setOrderSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userData?.displayName) {
      setName(userData.displayName);
    }
  }, [userData]);

  useEffect(() => {
    const fetchTables = async () => {
      try {
        const allTables = await tableAPI.getAll({ status: 'free' });
        setTables(allTables as Table[]);
        setLoading(false);
      } catch (error) {
        console.error('Błąd podczas pobierania stolików:', error);
        setError('Nie udało się pobrać listy stolików. Sprawdź czy serwisy są uruchomione.');
        setLoading(false);
      }
    };

    fetchTables();
  }, []);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const items = await menuAPI.getAll();
        setMenuItems(items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price
        })));
      } catch (error: any) {
        console.error('Błąd podczas pobierania menu:', error);
        const errorMessage = error.message || 'Nie udało się pobrać menu.';
        setError(`${errorMessage} Upewnij się, że wszystkie serwisy są uruchomione (npm run services:dev lub npm start).`);
      }
    };

    fetchMenu();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !selectedTableId) return;

    try {
      await tableAPI.updateStatus(selectedTableId, 'occupied', name);

      const table = tables.find((t) => t.id === selectedTableId);
      setSelectedTable(table ?? null);
    } catch (error) {
      console.error('Błąd przy przypisaniu stolika:', error);
    }
  };

  const handleAddItem = () => {
    setOrderItems((prev) => [...prev, { id: '', name: '', price: 0, quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = orderItems.filter((_, i) => i !== index);
    setOrderItems(updatedItems);
  };

  const handleChangeItem = (index: number, selectedName: string) => {
    const menuItem = menuItems.find((m) => m.name === selectedName);
    if (!menuItem) return;

    const updatedItems = [...orderItems];
    updatedItems[index] = {
      ...updatedItems[index],
      id: menuItem.id,
      name: menuItem.name,
      price: menuItem.price,
    };
    setOrderItems(updatedItems);
  };

  const handleSaveOrder = async () => {
    if (!selectedTableId || orderItems.length === 0) return;

    try {
      await orderAPI.create({
        tableId: selectedTableId,
        items: orderItems,
        waiterName: '',
      });

      setOrderSaved(true);
    } catch (error) {
      console.error('Błąd przy zapisie zamówienia:', error);
    }
  };

  if (loading) return <p className="text-center py-8">Ładowanie dostępnych stolików...</p>;

  return (
    <div className="w-full">
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg mb-4 shadow-sm">
          <p className="font-medium">{error}</p>
        </div>
      )}
      <Breadcrumb 
        items={[
          { label: 'Strona główna', path: '/client' },
          { label: 'Zamówienie', path: '/order' },
          ...(selectedTable ? [{ label: `Stolik ${selectedTable.number}` }] : []),
          ...(orderSaved ? [{ label: 'Zamówienie zapisane' }] : [])
        ]}
      />
      <div className="mb-8">
        <h2 className="text-4xl font-bold text-gray-800 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent mb-2">
          Rozpocznij zamówienie
        </h2>
        <p className="text-gray-600 font-medium">Wybierz stolik i dodaj pozycje z menu</p>
      </div>

      {!selectedTable && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 space-y-6 mb-6 border border-gray-100">
          <label className="block">
            <span className="block mb-2 font-semibold text-gray-700">Twoje imię:</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-gray-50 focus:bg-white"
              placeholder="Wprowadź swoje imię"
            />
          </label>

          <label className="block">
            <span className="block mb-2 font-semibold text-gray-700">Wybierz stolik:</span>
            <select
              value={selectedTableId}
              onChange={(e) => setSelectedTableId(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-gray-50 focus:bg-white"
            >
              <option value="">-- wybierz wolny stolik --</option>
              {tables.map((table) => (
                <option key={table.id} value={table.id}>
                  Stolik {table.number}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" className="w-full px-6 py-3 bg-gradient-to-r from-primary to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
            Przejdź dalej
          </button>
        </form>
      )}

      {selectedTable && !orderSaved && (
        <div className="bg-white rounded-lg shadow-md p-6 space-y-4 mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Witaj, {name}! Dodaj zamówienie dla stolika {selectedTable.number}</h3>
          
          {orderItems.map((item, index) => (
            <div key={index} className="flex gap-2 items-end">
              <select
                value={item.name}
                onChange={(e) => handleChangeItem(index, e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">-- Wybierz danie --</option>
                {menuItems.map((menuItem) => (
                  <option key={menuItem.id} value={menuItem.name}>
                    {menuItem.name} – {menuItem.price} zł
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleRemoveItem(index)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Usuń
              </button>
            </div>
          ))}

          <button 
            onClick={handleAddItem} 
            className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Dodaj danie
          </button>

          <p className="text-xl font-bold text-gray-800 pt-4 border-t">
            Suma: {orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)} zł
          </p>

          <button 
            onClick={handleSaveOrder} 
            className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
          >
            Zapisz zamówienie
          </button>
        </div>
      )}

      {orderSaved && (
        <div className="bg-green-100 border border-green-400 text-green-700 rounded-lg p-6 mb-6">
          <h3 className="text-xl font-bold">Zamówienie zostało zapisane!</h3>
        </div>
      )}

      <div className="flex justify-center">
        {orderSaved ? (
          <button 
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            onClick={() => {
              setOrderSaved(false);
              setSelectedTable(null);
              setSelectedTableId('');
              setName('');
              setOrderItems([]);
            }}
          >
            ⬅ Rozpocznij nowe zamówienie
          </button>
        ) : selectedTable ? (
          <button 
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            onClick={() => {
              setSelectedTable(null);
              setSelectedTableId('');
              setOrderItems([]);
            }}
          >
            ⬅ Wróć do wyboru stolika
          </button>
        ) : (
          <button 
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            onClick={() => navigate('/client')}
          >
            ⬅ Wróć do strony głównej
          </button>
        )}
      </div>
    </div>
  );
}
