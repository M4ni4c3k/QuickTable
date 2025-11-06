import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Table, Order } from '../../types/types';
import SettingsIcon from '../../components/SettingsIcon/SettingsIcon';
import { orderAPI, tableAPI } from '../../utils/apiClient';
import { connectRealtime, disconnectRealtime } from '../../utils/realtimeClient';
import Breadcrumb from '../../components/Breadcrumb/Breadcrumb';

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDone, setShowDone] = useState(false);

  // Fetch orders and tables with real-time updates
  const fetchData = async () => {
    try {
      const [fetchedOrders, fetchedTables] = await Promise.all([
        orderAPI.getAll({ status: showDone ? 'done' : 'pending' }),
        tableAPI.getAll(),
      ]);

      setOrders(fetchedOrders as Order[]);
      setTables(fetchedTables as Table[]);
      setLoading(false);
    } catch (error) {
      console.error('Błąd podczas pobierania danych:', error);
      setLoading(false);
    }
  };

  // Set up real-time updates and polling
  useEffect(() => {
    fetchData();

    // Connect to real-time service for live updates
    connectRealtime({
      onOrderUpdate: (data) => {
        if (data.action === 'update' || data.action === 'create') {
          fetchData(); // Refresh data when order updates
        }
      },
      onConnect: () => {
        console.log('Kitchen connected to real-time service');
      },
    }, 'kitchen');

    // Fallback polling every 10 seconds
    const interval = setInterval(() => {
      fetchData();
    }, 10000);

    return () => {
      clearInterval(interval);
      disconnectRealtime();
    };
  }, [showDone]);

  const handleToggleOrderStatus = async (
    orderId: string,
    newStatus: 'done' | 'pending'
  ) => {
    try {
      await orderAPI.updateStatus(orderId, newStatus);
      setOrders(prev => prev.filter(order => order.id !== orderId));
    } catch (error) {
      console.error('Błąd przy aktualizacji zamówienia:', error);
    }
  };

  const getTableNumber = (tableId: string) => {
    return tables.find(t => t.id === tableId)?.number ?? 'Nieznany';
  };

  // Group orders by table for better organization
  const groupedOrders = orders.reduce((acc: Record<string, Order[]>, order) => {
    const tableNumber = getTableNumber(order.tableId);
    if (!acc[tableNumber]) acc[tableNumber] = [];
    acc[tableNumber].push(order);
    return acc;
  }, {});

  if (loading) return <p className="text-center py-8">Ładowanie zamówień...</p>;

  return (
    <div className="w-full min-h-screen bg-gray-50 p-2 sm:p-4">
      <Breadcrumb 
        items={[
          { label: 'Kuchnia', path: '/kitchen' },
          { label: showDone ? 'Wykonane zamówienia' : 'Zamówienia do przygotowania' }
        ]}
      />
      <div className="mb-4 sm:mb-6">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent text-center mb-3 sm:mb-4 px-2">
          {showDone ? 'Wykonane zamówienia' : 'Zamówienia do przygotowania'}
        </h2>
        <div className="flex justify-center">
          <SettingsIcon 
            additionalOptions={[
              {
                label: showDone ? 'Pokaż oczekujące zamówienia' : 'Pokaż wykonane zamówienia',
                onClick: () => setShowDone(prev => !prev),
                className: ''
              }
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        <AnimatePresence>
          {Object.entries(groupedOrders).map(([tableNumber, orders]) => (
            <div key={tableNumber} className="bg-white rounded-lg shadow-md p-3 sm:p-4">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4 pb-2 border-b">Stolik {tableNumber}</h3>
              {orders.map(order => (
                <motion.div
                  key={order.id}
                  className="mb-3 sm:mb-4 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.3 } }}
                  layout
                >
                  <ul className="mb-3 sm:mb-4 space-y-1">
                    {order.items.map((item, idx) => (
                      <li key={idx} className="text-sm sm:text-base text-gray-700 break-words">
                        {item.name} × {item.quantity}
                      </li>
                    ))}
                  </ul>
                  
                  <label className="flex items-center cursor-pointer touch-manipulation">
                    <input
                      type="checkbox"
                      className="w-5 h-5 sm:w-6 sm:h-6 text-primary rounded focus:ring-primary flex-shrink-0"
                      onChange={() =>
                        handleToggleOrderStatus(
                          order.id,
                          showDone ? 'pending' : 'done'
                        )
                      }
                    />
                    <span className="ml-2 sm:ml-3 text-sm sm:text-base text-gray-700">
                      {showDone ? 'Cofnij wykonanie' : 'Zamówienie gotowe'}
                    </span>
                  </label>
                </motion.div>
              ))}
            </div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
