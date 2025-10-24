import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';
import type { Table, Order, Reservation } from '../../types/types';
import { db } from '../../firebase/firebaseConfig';
import styles from './WaiterPage.module.css';
import SettingsIcon from '../../components/SettingsIcon/SettingsIcon';

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
      await updateDoc(doc(db, 'orders', orderId), { 
        status: 'done'
      });
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

  if (loading) return <div className={styles.loading}>Ładowanie danych...</div>;

  if (!view) {
    return (
      <div className={styles.waiterContainer}>
        <div className={styles.headerRow}>
          <div className={styles.appName}>Quick Table</div>
          <h2 className={styles.pageTitle}>Panel Kelnera</h2>
          <div className={styles.headerActions}>
            <SettingsIcon />
          </div>
        </div>
        <div className={styles.selectionPanel}>
          <button className={styles.bigButton} onClick={() => setView('tables')}>🪑 Zarządzanie Stolikami</button>
          <button className={styles.bigButton} onClick={() => setView('reservations')}>📅 Rezerwacje</button>
        </div>
        <div className={styles.backButtonContainer}>
          <button className={styles.backButton} onClick={() => navigate('/')}>⬅ Wróć</button>
        </div>
      </div>
    );
  }

  if (view === 'tables') {
    const sortedTables = [...tables].sort((a, b) => a.number - b.number);

    return (
      <div className={styles.waiterContainer}>
        <div className={styles.sectionHeaderRow}>
          <div className={styles.sectionAppName}>Quick Table</div>
          <h2 className={styles.sectionTitle}>Zarządzanie Stolikami</h2>
          <div className={styles.headerActions}>
            <SettingsIcon />
          </div>
        </div>

        <div className={styles.tablesManagement}>
          <div className={styles.tablesHeader}>
            <h3>Lista Stolików ({tables.length})</h3>
          </div>

          <div className={styles.tablesGrid}>
            {sortedTables.length === 0 ? (
              <div className={styles.noTables}>
                <p>Brak stolików.</p>
              </div>
            ) : (
              sortedTables.map(table => {
                const hasActiveOrders = isTableOccupied(table.id);
                const nextReservation = getNextReservationForTable(table.number);
                const allOrders = getAllOrdersForTable(table.id);
                const allOrdersCompleted = allOrders.length > 0 && allOrders.every(order => order.status === 'done');
                
                let statusDotClass = styles.statusDotFree;
                if (hasActiveOrders) {
                  statusDotClass = styles.statusDotYellow;
                } else if (table.status === 'occupied') {
                  statusDotClass = styles.statusDotOccupied;
                }
                
                return (
                  <div 
                    key={table.id} 
                    className={styles.tableCard}
                  >
                    <div className={styles.tableCardHeader}>
                      <div className={`${styles.statusDot} ${statusDotClass}`}></div>
                      <h4>Stolik {table.number}</h4>
                      <div className={styles.spacer}></div>
                    </div>

                    <div className={styles.tableCardBody}>
                      {allOrders.length > 0 && (
                        <div className={`${styles.tableActiveOrder} ${allOrdersCompleted ? styles.allOrdersCompleted : ''}`}>
                          <button 
                            className={styles.orderToggle}
                            onClick={() => toggleOrderExpand(table.id)}
                          >
                            <span className={styles.orderIcon}>{allOrdersCompleted ? '✅' : '📋'}</span>
                            <span className={styles.orderLabel}>Zamówienia ({allOrders.length})</span>
                            <span className={styles.toggleIcon}>
                              {expandedOrders.has(table.id) ? '▼' : '▶'}
                            </span>
                          </button>
                          
                          {expandedOrders.has(table.id) && (
                            <div className={styles.orderDetails}>
                              {allOrders.map((order, idx) => (
                                <div key={order.id} className={styles.compactOrderCard}>
                                  <div 
                                    className={styles.compactOrderHeader}
                                    onClick={() => toggleOrderDetailsExpand(order.id)}
                                  >
                                    <div className={styles.orderSummary}>
                                      <span className={styles.orderNumber}>Zamówienie #{idx + 1}</span>
                                      <span className={styles.orderTotal}>Suma: {order.total.toFixed(2)} zł</span>
                                    </div>
                                    <span className={styles.expandIcon}>
                                      {expandedOrderDetails.has(order.id) ? '▼' : '▶'}
                                    </span>
                                  </div>

                                  {expandedOrderDetails.has(order.id) && (
                                    <div className={styles.orderExpandedContent}>
                                      <div className={styles.orderItemsList}>
                                        {order.items.map((item, itemIdx) => (
                                          <div key={itemIdx} className={styles.orderItem}>
                                            <span className={styles.itemQuantity}>{item.quantity}x</span>
                                            <span className={styles.itemName}>{item.name}</span>
                                            <span className={styles.itemPrice}>{(item.price * item.quantity).toFixed(2)} zł</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  <div className={styles.orderActions}>
                                    <button
                                      className={`${styles.orderActionButton} ${order.status === 'done' ? styles.orderDone : styles.orderPending}`}
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
                        <div className={styles.tableReservation}>
                          <button 
                            className={styles.reservationToggle}
                            onClick={() => toggleReservationExpand(table.id)}
                          >
                            <span className={styles.calendarIcon}>📅</span>
                            <span className={styles.reservationLabel}>Najbliższa rezerwacja</span>
                            <span className={styles.toggleIcon}>
                              {expandedReservations.has(table.id) ? '▼' : '▶'}
                            </span>
                          </button>
                          
                          {expandedReservations.has(table.id) && (
                            <div className={styles.reservationDetails}>
                              <p><strong>Data:</strong> {nextReservation.reservationDate}</p>
                              <p><strong>Godzina:</strong> {nextReservation.reservationHour}</p>
                              <p><strong>Klient:</strong> {nextReservation.customerName}</p>
                              <p><strong>Liczba gości:</strong> {nextReservation.guests}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {allOrders.length === 0 && !nextReservation && (
                        <div className={styles.tableInfo}>
                          <p className={styles.infoText}>
                            Brak zamówień i rezerwacji
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

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