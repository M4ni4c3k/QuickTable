import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
  getDocs,
} from 'firebase/firestore';
import type { Table, Order, Reservation } from '../../types/types';
import { db } from '../../firebase/firebaseConfig';
import styles from './WaiterPage.module.css';
import { createOrder } from '../../utils/databaseUtils';

export default function WaiterPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [menuItems, setMenuItems] = useState<{ name: string; price: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'tables' | 'reservations' | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showArchivedReservations, setShowArchivedReservations] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showChangeViewModal, setShowChangeViewModal] = useState(false);
  
  const [newOrder, setNewOrder] = useState<Omit<Order, 'id' | 'timestamp'>>({
    tableId: '',
    items: [],
    total: 0,
    status: 'pending',
    waiterName: 'Anna'
  });

  const navigate = useNavigate();

  // Real-time menu items listener
  useEffect(() => {
    const menuRef = collection(db, 'menu');
    const unsubscribe = onSnapshot(menuRef, (snapshot) => {
      const items = snapshot.docs.map(doc => doc.data() as { name: string; price: number });
      setMenuItems(items);
    });

    return () => unsubscribe();
  }, []);

  // Real-time tables listener
  useEffect(() => {
    const tablesRef = collection(db, 'tables');
    const unsubscribe = onSnapshot(tablesRef, (snapshot) => {
      const tablesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Table[];
      setTables(tablesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time orders listener
  useEffect(() => {
    const ordersRef = collection(db, 'orders');
    const unsubscribe = onSnapshot(ordersRef, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      setOrders(ordersData);
    });

    return () => unsubscribe();
  }, []);

  // Real-time reservations listener
  useEffect(() => {
    const reservationsRef = collection(db, 'reservations');
    const unsubscribe = onSnapshot(reservationsRef, (snapshot) => {
      const reservationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Reservation[];
      setReservations(reservationsData);
    });

    return () => unsubscribe();
  }, []);

  const handleTableClick = (table: Table) => {
    setSelectedTable(table);
  };

  const addOrderToTable = async () => {
    if (!selectedTable) return;

    try {
      await createOrder({
        ...newOrder,
        tableId: selectedTable.id,
        dataState: 1
      });

      await updateDoc(doc(db, 'tables', selectedTable.id), {
        status: 'occupied'
      });

      setNewOrder({
        tableId: selectedTable.id,
        items: [],
        total: 0,
        status: 'pending',
        waiterName: 'Anna'
      });
      setSelectedTable(null);
    } catch (error) {
      console.error("Błąd podczas dodawania zamówienia:", error);
    }
  };

  const completeAllOrders = async () => {
    if (!selectedTable) return;

    const activeOrders = orders.filter(
      (order) =>
        order.tableId === selectedTable.id &&
        (order.dataState ?? 1) === 1
    );

    try {
      for (const order of activeOrders) {
        await updateDoc(doc(db, 'orders', order.id), {
          dataState: 2,
          status: 'completed'
        });
      }

      await updateDoc(doc(db, 'tables', selectedTable.id), {
        status: 'free'
      });

      setSelectedTable(null);
    } catch (error) {
      console.error('Błąd przy kończeniu zamówień:', error);
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

  if (loading) return <div className={styles.loading}>Ładowanie danych...</div>;

  if (!view) {
    return (
      <div className={styles.waiterContainer}>
        <div className={styles.headerRow}>
          <div className={styles.appName}>Quick Table</div>
          <h2 className={styles.pageTitle}>Panel Kelnera</h2>
          <button 
            className={styles.gearButton} 
            onClick={() => setShowViewModal(true)}
            title="Ustawienia"
          >
            ⚙️
          </button>
        </div>
        <div className={styles.selectionPanel}>
          <button className={styles.bigButton} onClick={() => setView('tables')}>🪑 Zarządzanie Stolikami</button>
          <button className={styles.bigButton} onClick={() => setView('reservations')}>📅 Rezerwacje</button>
        </div>
        <div className={styles.backButtonContainer}>
          <button className={styles.backButton} onClick={() => navigate('/')}>⬅ Wróć</button>
        </div>
        
        {showViewModal && (
          <div className={styles.modalOverlay} onClick={() => setShowViewModal(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h3>Ustawienia</h3>
              <div className={styles.modalButtons}>
                <button onClick={() => setShowChangeViewModal(true)}>
                  Zmień widok
                </button>
              </div>
              <button className={styles.closeButton} onClick={() => setShowViewModal(false)}>
                Zamknij
              </button>
            </div>
          </div>
        )}
        
        {showChangeViewModal && (
          <div className={styles.modalOverlay} onClick={() => setShowChangeViewModal(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h3>Zmień widok</h3>
              <div className={styles.modalButtons}>
                <button onClick={() => { setShowChangeViewModal(false); setShowViewModal(false); window.location.href = '/admin'; }}>
                  Panel Administracyjny
                </button>
                <button onClick={() => { setShowChangeViewModal(false); setShowViewModal(false); window.location.href = '/client'; }}>
                  Strona Klienta
                </button>
                <button onClick={() => { setShowChangeViewModal(false); setShowViewModal(false); window.location.href = '/menu'; }}>
                  Menu
                </button>
                <button onClick={() => { setShowChangeViewModal(false); setShowViewModal(false); window.location.href = '/order'; }}>
                  Zamówienia
                </button>
                <button onClick={() => { setShowChangeViewModal(false); setShowViewModal(false); window.location.href = '/reservation'; }}>
                  Rezerwacje
                </button>
                <button onClick={() => { setShowChangeViewModal(false); setShowViewModal(false); window.location.href = '/kitchen'; }}>
                  Kuchnia
                </button>
              </div>
              <button className={styles.closeButton} onClick={() => setShowChangeViewModal(false)}>
                Wróć
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view === 'tables') {
    const today = new Date();
    const todayString = formatDate(today);
    const todayReservations = getReservationsForDate(todayString, false);
    const currentTime = today.toLocaleTimeString('pl-PL', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    const currentDate = today.toLocaleDateString('pl-PL', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    return (
      <div className={styles.waiterContainer}>
        <h2 className={styles.pageTitle}>
          Zarządzanie Stolikami - {currentDate} {currentTime}
        </h2>
        
        <div className={styles.tablesLayout}>
          <div className={styles.tablesGrid}>
            {tables.map((table) => {
              const activeOrders = orders.filter(
                (order) => order.tableId === table.id && (order.dataState ?? 1) === 1
              );

              return (
                <div
                  key={table.id}
                  className={`${styles.table} ${styles[`table-${table.status}`]} ${selectedTable?.id === table.id ? styles.selectedTable : ''}`}
                  onClick={() => handleTableClick(table)}
                >
                  <span className={styles.tableNumber}>Stolik {table.number}</span>
                  <span className={styles.tableStatus}>
                    {table.status === 'free' && 'Wolny'}
                    {table.status === 'occupied' && 'Zajęty'}
                  </span>
                  {table.customerName && (
                    <span className={styles.customerName}>{table.customerName}</span>
                  )}
                  {activeOrders.length > 0 && (
                    <span className={styles.orderCount}>
                      {activeOrders.length} zamówień
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className={styles.tableDetailsPanel}>
            {selectedTable ? (
              <div className={styles.tableDetails}>
                <h4>Stolik {selectedTable.number}</h4>
                
                <div className={styles.tableInfo}>
                  <p><strong>Status:</strong> {selectedTable.status === 'free' ? 'Wolny' : 'Zajęty'}</p>
                  {selectedTable.customerName && (
                    <p><strong>Klient:</strong> {selectedTable.customerName}</p>
                  )}
                </div>

                <div className={styles.ordersSection}>
                  <h5>📋 Aktywne zamówienia</h5>
                  {orders
                    .filter(order => order.tableId === selectedTable.id && (order.dataState ?? 1) === 1)
                    .map(order => (
                      <div key={order.id} className={styles.orderCard}>
                        <div className={styles.orderHeader}>
                          <span className={styles.orderStatus}>{order.status}</span>
                          <span className={styles.orderTotal}>{order.total} zł</span>
                        </div>
                        <ul className={styles.orderItems}>
                          {order.items.map(item => (
                            <li key={item.id}>
                              {item.name} x{item.quantity} - {item.price * item.quantity} zł
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  
                  {orders.filter(order => order.tableId === selectedTable.id && (order.dataState ?? 1) === 1).length === 0 && (
                    <p className={styles.noOrders}>Brak aktywnych zamówień</p>
                  )}
                </div>

                <div className={styles.tableActions}>
                  <button 
                    className={styles.addOrderButton}
                    onClick={() => {
                      setNewOrder({
                        tableId: selectedTable.id,
                        items: [],
                        total: 0,
                        status: 'pending',
                        waiterName: 'Anna'
                      });
                    }}
                  >
                    ➕ Dodaj zamówienie
                  </button>
                  
                  {orders.filter(order => order.tableId === selectedTable.id && (order.dataState ?? 1) === 1).length > 0 && (
                    <button 
                      className={styles.completeButton}
                      onClick={completeAllOrders}
                    >
                      ✅ Zakończ wszystkie
                    </button>
                  )}
                  
                  <button 
                    className={styles.closeButton}
                    onClick={() => setSelectedTable(null)}
                  >
                    Zamknij
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.noTableSelected}>
                <h4>Wybierz stolik</h4>
                <p>Kliknij na stolik aby zobaczyć szczegóły i zarządzać zamówieniami</p>
              </div>
            )}
          </div>
        </div>

        {todayReservations.length > 0 && (
          <div className={styles.upcomingReservations}>
            <h3>📅 Dzisiejsze rezerwacje</h3>
            <div className={styles.reservationsGrid}>
              {todayReservations.map(reservation => (
                <div key={reservation.id} className={styles.reservationCard}>
                  <div className={styles.reservationHeader}>
                    <h4>Stolik {reservation.tableNumber} - {reservation.reservationHour}</h4>
                    <div className={styles.statusInfo}>
                      <span className={`${styles.statusBadge} ${styles[reservation.status]}`}>
                        {reservation.status === 'pending' && 'Oczekująca'}
                        {reservation.status === 'accepted' && 'Zaakceptowana'}
                        {reservation.status === 'rejected' && 'Odrzucona'}
                        {reservation.status === 'cancelled' && 'Anulowana'}
                      </span>
                    </div>
                  </div>
                  <div className={styles.reservationDetails}>
                    <p><strong>Klient:</strong> {reservation.customerName}</p>
                    <p><strong>Telefon:</strong> {reservation.customerPhone}</p>
                    <p><strong>Liczba gości:</strong> {reservation.guests}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={styles.backButtonContainer}>
          <button className={styles.backButton} onClick={() => setView(null)}>⬅ Wróć</button>
        </div>
      </div>
    );
  }

  if (view === 'reservations') {
    const dayReservations = getReservationsForDate(selectedDate, showArchivedReservations);
    
    return (
      <div className={styles.waiterContainer}>
        <h2 className={styles.pageTitle}>Rezerwacje</h2>
        
        <div className={styles.calendarLayout}>
          <div className={styles.calendarContainer}>
            <div className={styles.calendarHeader}>
              <button 
                className={styles.monthNavButton}
                onClick={() => navigateMonth('prev')}
              >
                ⬅️
              </button>
              <h3>{currentMonth.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}</h3>
              <button 
                className={styles.monthNavButton}
                onClick={() => navigateMonth('next')}
              >
                ➡️
              </button>
            </div>
            
            <div className={styles.calendarGrid}>
              <div className={styles.calendarWeekdays}>
                {['Ndz', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'].map(day => (
                  <div key={day} className={styles.weekdayHeader}>{day}</div>
                ))}
              </div>
              
              <div className={styles.calendarDays}>
                {getCurrentMonthDays().map((date, index) => {
                  if (!date) {
                    return <div key={index} className={styles.emptyDay}></div>;
                  }
                  
                  const dateString = formatDate(date);
                  const reservationCount = getReservationCountForDate(dateString);
                  const isToday = date.toDateString() === new Date().toDateString();
                  const isPast = date.getTime() < new Date().setHours(0, 0, 0, 0);
                  const isSelected = dateString === selectedDate;
                  
                  return (
                    <div 
                      key={index} 
                      className={`${styles.calendarDay} ${isToday ? styles.today : ''} ${isPast ? styles.pastDay : ''} ${isSelected ? styles.selectedDay : ''}`}
                      onClick={() => setSelectedDate(dateString)}
                    >
                      <div className={styles.dayNumber}>{date.getDate()}</div>
                      {reservationCount > 0 && (
                        <div className={styles.reservationCount}>
                          <span className={styles.countBadge}>{reservationCount}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className={styles.reservationsPanel}>
            <div className={styles.dateSelector}>
              <h3>Rezerwacje na {selectedDate}</h3>
              <label className={styles.archiveToggle}>
                <input
                  type="checkbox"
                  checked={showArchivedReservations}
                  onChange={(e) => setShowArchivedReservations(e.target.checked)}
                />
                Pokaż zarchiwizowane rezerwacje
              </label>
            </div>

            <div className={styles.reservationsList}>
              {dayReservations.length === 0 ? (
                <p className={styles.noReservations}>
                  {showArchivedReservations ? 'Brak zarchiwizowanych rezerwacji' : 'Brak aktywnych rezerwacji'} na wybraną datę
                </p>
              ) : (
                dayReservations.map(reservation => (
                  <div key={reservation.id} className={styles.reservationCard}>
                    <div className={styles.reservationHeader}>
                      <h4>Stolik {reservation.tableNumber} - {reservation.reservationHour}</h4>
                      <div className={styles.statusInfo}>
                        <span className={`${styles.statusBadge} ${styles[reservation.status]}`}>
                          {reservation.status === 'pending' && 'Oczekująca'}
                          {reservation.status === 'accepted' && 'Zaakceptowana'}
                          {reservation.status === 'rejected' && 'Odrzucona'}
                          {reservation.status === 'cancelled' && 'Anulowana'}
                        </span>
                      </div>
                    </div>
                    <div className={styles.reservationDetails}>
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

        <div className={styles.backButtonContainer}>
          <button className={styles.backButton} onClick={() => setView(null)}>⬅ Wróć</button>
        </div>
      </div>
    );
  }

  return null;
}