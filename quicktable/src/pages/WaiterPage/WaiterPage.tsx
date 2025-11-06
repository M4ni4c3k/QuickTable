import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Table, Order, Reservation } from '../../types/types';
import SettingsIcon from '../../components/SettingsIcon/SettingsIcon';
import { tableAPI, orderAPI, reservationAPI } from '../../utils/apiClient';
import { connectRealtime, disconnectRealtime } from '../../utils/realtimeClient';
import Breadcrumb from '../../components/Breadcrumb/Breadcrumb';

export default function WaiterPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'tables' | 'reservations' | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showArchivedReservations, setShowArchivedReservations] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [expandedOrderDetails, setExpandedOrderDetails] = useState<Set<string>>(new Set());
  const [expandedReservations, setExpandedReservations] = useState<Set<string>>(new Set());
  

  const navigate = useNavigate();


  // Fetch data with polling for real-time-like updates
  const fetchData = async () => {
    try {
      const [tablesData, ordersData, reservationsData] = await Promise.all([
        tableAPI.getAll(),
        orderAPI.getAll({ dataState: 1 }),
        reservationAPI.getAll({ dataState: 1 }),
      ]);
      
      setTables(tablesData as Table[]);
      setOrders(ordersData as Order[]);
      setReservations(reservationsData as Reservation[]);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Connect to real-time service for live updates
    connectRealtime({
      onOrderUpdate: () => fetchData(),
      onTableUpdate: () => fetchData(),
      onReservationUpdate: () => fetchData(),
      onConnect: () => {
        console.log('Waiter connected to real-time service');
      },
    }, 'waiter');

    // Fallback polling every 5 seconds
    const interval = setInterval(fetchData, 5000);
    
    return () => {
      clearInterval(interval);
      disconnectRealtime();
    };
  }, []);

  const isTableOccupied = (tableId: string) => {
    return orders.some(order => 
      order.tableId === tableId && 
      order.status !== 'done' &&
      order.dataState === 1
    );
  };

  const getAllOrdersForTable = (tableId: string) => {
    return orders.filter(order => 
      order.tableId === tableId && 
      order.dataState === 1
    );
  };

  const getNextReservationForTable = (tableNumber: number) => {
    const now = new Date();
    const currentDateStr = formatDate(now);
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const upcomingReservations = reservations
      .filter(r => 
        r.tableNumber === tableNumber && 
        r.dataState === 1 && 
        r.status === 'accepted' &&
        (r.reservationDate > currentDateStr || 
         (r.reservationDate === currentDateStr && r.reservationHour >= currentTime))
      )
      .sort((a, b) => {
        const dateCompare = a.reservationDate.localeCompare(b.reservationDate);
        if (dateCompare !== 0) return dateCompare;
        return a.reservationHour.localeCompare(b.reservationHour);
      });
    
    return upcomingReservations[0] || null;
  };

  const toggleOrderExpand = (tableId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(tableId)) {
      newExpanded.delete(tableId);
    } else {
      newExpanded.add(tableId);
    }
    setExpandedOrders(newExpanded);
  };

  const toggleOrderDetailsExpand = (orderId: string) => {
    const newExpanded = new Set(expandedOrderDetails);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrderDetails(newExpanded);
  };

  const toggleReservationExpand = (tableId: string) => {
    const newExpanded = new Set(expandedReservations);
    if (newExpanded.has(tableId)) {
      newExpanded.delete(tableId);
    } else {
      newExpanded.add(tableId);
    }
    setExpandedReservations(newExpanded);
  };

  const handleMarkOrderAsDone = async (orderId: string) => {
    try {
      await orderAPI.updateStatus(orderId, 'done');
    } catch (error) {
      console.error('Error marking order as done:', error);
      alert('Błąd podczas oznaczania zamówienia jako wykonane');
    }
  };

  const getReservationsForDate = (date: string, showArchived: boolean = false) => {
    return reservations.filter(r => 
      r.reservationDate === date && 
      (showArchived ? r.dataState === 0 : r.dataState === 1)
    );
  };

  const getReservationCountForDate = (date: string) => {
    return reservations.filter(r => 
      r.reservationDate === date && r.dataState === 1
    ).length;
  };

  const getCurrentMonthDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const firstDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  if (loading) return <div className="text-center py-12 text-gray-600">Ładowanie danych...</div>;

  if (!view) {
    return (
      <div className="w-full min-h-screen bg-gray-50 p-4">
        <Breadcrumb 
          items={[
            { label: 'Panel Kelnera', path: '/waiter' }
          ]}
        />
        <div className="mb-6">
          <h2 className="text-4xl font-bold text-gray-800 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent text-center">
            Panel Kelnera
          </h2>
        </div>
        <div className="flex flex-col gap-4 mb-6 max-w-md mx-auto">
          <button 
            className="px-8 py-6 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold text-lg shadow-md"
            onClick={() => setView('tables')}
          >
            🪑 Zarządzanie Stolikami
          </button>
          <button 
            className="px-8 py-6 bg-secondary text-white rounded-lg hover:bg-green-600 transition-colors font-semibold text-lg shadow-md"
            onClick={() => setView('reservations')}
          >
            📅 Rezerwacje
          </button>
        </div>
        <div className="flex justify-center">
          <button 
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            onClick={() => navigate('/')}
          >
            ⬅ Wróć
          </button>
        </div>
      </div>
    );
  }

  if (view === 'tables') {
    const sortedTables = [...tables].sort((a, b) => a.number - b.number);

    return (
      <div className="w-full min-h-screen bg-gray-50 p-4">
        <Breadcrumb 
          items={[
            { label: 'Panel Kelnera', path: '/waiter', onClick: () => setView(null) },
            { label: 'Zarządzanie Stolikami' }
          ]}
        />
        <div className="mb-6">
          <h2 className="text-4xl font-bold text-gray-800 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent text-center">
            Zarządzanie Stolikami
          </h2>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-gray-800">Lista Stolików ({tables.length})</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedTables.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-600">
                <p>Brak stolików.</p>
              </div>
            ) : (
              sortedTables.map(table => {
                const hasActiveOrders = isTableOccupied(table.id);
                const nextReservation = getNextReservationForTable(table.number);
                const allOrders = getAllOrdersForTable(table.id);
                const allOrdersCompleted = allOrders.length > 0 && allOrders.every(order => order.status === 'done');
                
                let statusDotColor = 'bg-green-500';
                if (hasActiveOrders) {
                  statusDotColor = 'bg-yellow-500';
                } else if (table.status === 'occupied') {
                  statusDotColor = 'bg-red-500';
                }
                
                return (
                  <div 
                    key={table.id} 
                    className="bg-white border border-gray-200 rounded-lg shadow-md p-4"
                  >
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b">
                      <div className={`w-3 h-3 rounded-full ${statusDotColor}`}></div>
                      <h4 className="text-lg font-bold text-gray-800">Stolik {table.number}</h4>
                      <div className="flex-1"></div>
                    </div>

                    <div className="space-y-3">
                      {allOrders.length > 0 && (
                        <div className={`${allOrdersCompleted ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'} border rounded-lg p-3`}>
                          <button 
                            className="w-full flex items-center justify-between text-left"
                            onClick={() => toggleOrderExpand(table.id)}
                          >
                            <div className="flex items-center gap-2">
                              <span>{allOrdersCompleted ? '✅' : '📋'}</span>
                              <span className="font-medium text-gray-700">Zamówienia ({allOrders.length})</span>
                            </div>
                            <span className="text-gray-500">
                              {expandedOrders.has(table.id) ? '▼' : '▶'}
                            </span>
                          </button>
                          
                          {expandedOrders.has(table.id) && (
                            <div className="mt-3 space-y-2">
                              {allOrders.map((order, idx) => (
                                <div key={order.id} className="bg-white rounded border border-gray-200 p-3">
                                  <div 
                                    className="flex items-center justify-between cursor-pointer mb-2"
                                    onClick={() => toggleOrderDetailsExpand(order.id)}
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-semibold text-gray-800">Zamówienie #{idx + 1}</span>
                                      <span className="text-sm text-gray-600">Suma: {order.total.toFixed(2)} zł</span>
                                    </div>
                                    <span className="text-gray-500">
                                      {expandedOrderDetails.has(order.id) ? '▼' : '▶'}
                                    </span>
                                  </div>

                                  {expandedOrderDetails.has(order.id) && (
                                    <div className="mt-2 pt-2 border-t border-gray-200">
                                      <div className="space-y-1">
                                        {order.items.map((item, itemIdx) => (
                                          <div key={itemIdx} className="flex justify-between text-sm text-gray-700">
                                            <span><span className="font-medium">{item.quantity}x</span> {item.name}</span>
                                            <span className="font-semibold">{(item.price * item.quantity).toFixed(2)} zł</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  <div className="mt-2">
                                    <button
                                      className={`w-full px-4 py-2 rounded-lg font-semibold transition-colors ${
                                        order.status === 'done' 
                                          ? 'bg-gray-200 text-gray-600 cursor-not-allowed' 
                                          : 'bg-primary text-white hover:bg-blue-600'
                                      }`}
                                      onClick={() => handleMarkOrderAsDone(order.id)}
                                      disabled={order.status === 'done'}
                                    >
                                      {order.status === 'done' ? '✅ Wydane' : '📤 Wydaj klientowi'}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {nextReservation && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <button 
                            className="w-full flex items-center justify-between text-left"
                            onClick={() => toggleReservationExpand(table.id)}
                          >
                            <div className="flex items-center gap-2">
                              <span>📅</span>
                              <span className="font-medium text-gray-700">Najbliższa rezerwacja</span>
                            </div>
                            <span className="text-gray-500">
                              {expandedReservations.has(table.id) ? '▼' : '▶'}
                            </span>
                          </button>
                          
                          {expandedReservations.has(table.id) && (
                            <div className="mt-3 space-y-1 text-sm text-gray-700">
                              <p><strong>Data:</strong> {nextReservation.reservationDate}</p>
                              <p><strong>Godzina:</strong> {nextReservation.reservationHour}</p>
                              <p><strong>Klient:</strong> {nextReservation.customerName}</p>
                              <p><strong>Liczba gości:</strong> {nextReservation.guests}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {allOrders.length === 0 && !nextReservation && (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          <p>Brak zamówień i rezerwacji</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex justify-center">
          <button 
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            onClick={() => setView(null)}
          >
            ⬅ Wróć
          </button>
        </div>
      </div>
    );
  }

  if (view === 'reservations') {
    const dayReservations = getReservationsForDate(selectedDate, showArchivedReservations);
    
    return (
      <div className="w-full min-h-screen bg-gray-50 p-4">
        <Breadcrumb 
          items={[
            { label: 'Panel Kelnera', path: '/waiter', onClick: () => setView(null) },
            { label: 'Rezerwacje' }
          ]}
        />
        <div className="mb-6">
          <h2 className="text-4xl font-bold text-gray-800 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent text-center">
            Rezerwacje
          </h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <button 
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-xl"
                onClick={() => navigateMonth('prev')}
              >
                ⬅️
              </button>
              <h3 className="text-xl font-bold text-gray-800">{currentMonth.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}</h3>
              <button 
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-xl"
                onClick={() => navigateMonth('next')}
              >
                ➡️
              </button>
            </div>
            
            <div>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Ndz', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'].map(day => (
                  <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">{day}</div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {getCurrentMonthDays().map((date, index) => {
                  if (!date) {
                    return <div key={index} className="aspect-square"></div>;
                  }
                  
                  const dateString = formatDate(date);
                  const reservationCount = getReservationCountForDate(dateString);
                  const isToday = date.toDateString() === new Date().toDateString();
                  const isPast = date.getTime() < new Date().setHours(0, 0, 0, 0);
                  const isSelected = dateString === selectedDate;
                  
                  return (
                    <div 
                      key={index} 
                      className={`aspect-square flex flex-col items-center justify-center rounded-lg cursor-pointer transition-colors ${
                        isToday && isSelected 
                          ? 'bg-primary text-white' 
                          : isToday 
                          ? 'bg-blue-100 text-blue-800' 
                          : isSelected 
                          ? 'bg-primary text-white' 
                          : isPast 
                          ? 'bg-gray-100 text-gray-400' 
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                      onClick={() => setSelectedDate(dateString)}
                    >
                      <div className="font-medium">{date.getDate()}</div>
                      {reservationCount > 0 && (
                        <div className="mt-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                            isToday && isSelected 
                              ? 'bg-white text-primary' 
                              : isSelected 
                              ? 'bg-white text-primary' 
                              : 'bg-primary text-white'
                          }`}>
                            {reservationCount}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-6 pb-4 border-b">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Rezerwacje na {selectedDate}</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showArchivedReservations}
                  onChange={(e) => setShowArchivedReservations(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Pokaż zarchiwizowane rezerwacje</span>
              </label>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {dayReservations.length === 0 ? (
                <p className="text-center py-8 text-gray-500 italic">
                  {showArchivedReservations ? 'Brak zarchiwizowanych rezerwacji' : 'Brak aktywnych rezerwacji'} na wybraną datę
                </p>
              ) : (
                dayReservations.map(reservation => (
                  <div key={reservation.id} className="bg-gray-50 rounded-lg p-4 border-l-4 border-primary">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-bold text-gray-800">Stolik {reservation.tableNumber} - {reservation.reservationHour}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        reservation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        reservation.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        reservation.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {reservation.status === 'pending' && 'Oczekująca'}
                        {reservation.status === 'accepted' && 'Zaakceptowana'}
                        {reservation.status === 'rejected' && 'Odrzucona'}
                        {reservation.status === 'cancelled' && 'Anulowana'}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-700">
                      <p><strong>Klient:</strong> {reservation.customerName}</p>
                      <p><strong>Email:</strong> {reservation.customerEmail}</p>
                      <p><strong>Telefon:</strong> {reservation.customerPhone}</p>
                      <p><strong>Liczba gości:</strong> {reservation.guests}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <button 
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            onClick={() => setView(null)}
          >
            ⬅ Wróć
          </button>
        </div>
      </div>
    );
  }

  return null;
}