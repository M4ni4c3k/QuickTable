import { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import styles from './AdminPage.module.css';
import type { MenuItem, Reservation, RestaurantHours } from '../../types/types';
import { 
  createMenuItem, 
  createRestaurantHours, 
  updateDocument, 
  deleteDocument,
  getDocuments 
} from '../../utils/databaseUtils';
  

export default function AdminPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [addingNewMenuItem, setAddingNewMenuItem] = useState(false);
  const [newMenuItem, setNewMenuItem] = useState<MenuItem>({
    id: '', 
    name: '',
    price: 0,
    ingredients: [''],
  });
  const [view, setView] = useState<'menu' | 'tables' | 'reservations' | 'hours' | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [restaurantHours, setRestaurantHours] = useState<RestaurantHours[]>([]);
  const [showArchivedReservations, setShowArchivedReservations] = useState(false);
  const [selectedDayForHours, setSelectedDayForHours] = useState<RestaurantHours | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showViewModal, setShowViewModal] = useState(false);
  const [showChangeViewModal, setShowChangeViewModal] = useState(false);


  useEffect(() => {
    const fetchData = async () => {
      const menuSnapshot = await getDocs(collection(db, 'menu'));
      const reservationsSnapshot = await getDocs(collection(db, 'reservations'));
      const hoursSnapshot = await getDocs(collection(db, 'restaurantHours'));

      setMenuItems(menuSnapshot.docs.map(doc => ({
        ...(doc.data() as Omit<MenuItem, 'id'>),
        id: doc.id,
      })));

      setReservations(reservationsSnapshot.docs.map(doc => ({
        ...(doc.data() as Omit<Reservation, 'id'>),
        id: doc.id,
      })));

      setRestaurantHours(hoursSnapshot.docs.map(doc => ({
        ...(doc.data() as Omit<RestaurantHours, 'id'>),
        id: doc.id,
      })));
    };
    fetchData();
  }, []);

  const handleMenuUpdate = async (id: string, name: string, price: number, ingredients: string[]) => {
    await updateDoc(doc(db, 'menu', id), { name, price, ingredients });
    setMenuItems(menuItems.map(item => item.id === id ? { id, name, price, ingredients } : item));
    setSelectedMenuItem(null);
  };

  const handleAddMenuItem = async () => {
    if (!newMenuItem.name || newMenuItem.price <= 0) return;
    const createdItem = await createMenuItem({
      name: newMenuItem.name,
      price: newMenuItem.price,
      ingredients: newMenuItem.ingredients,
    });
    setMenuItems([...menuItems, createdItem]);
    setNewMenuItem({ id: '', name: '', price: 0, ingredients: [''] });
    setAddingNewMenuItem(false);
  };

  const handleDeleteMenuItem = async (id: string) => {
    await deleteDocument('menu', id);
    setMenuItems(menuItems.filter(item => item.id !== id));
    setSelectedMenuItem(null);
  };

  const handleReservationStatusUpdate = async (reservationId: string, status: 'accepted' | 'rejected' | 'cancelled') => {
    const isAccepted = status === 'accepted';
    
    // Check for conflicts if accepting
    if (status === 'accepted') {
      const reservation = reservations.find(r => r.id === reservationId);
      if (reservation) {
        const conflicts = await checkReservationConflicts(reservation);
        if (conflicts.length > 0) {
          const conflictMessage = `Uwaga: Ta rezerwacja koliduje z ${conflicts.length} innymi rezerwacjami:\n${conflicts.map(c => `- ${c.customerName} (${c.reservationHour})`).join('\n')}`;
          if (!confirm(`${conflictMessage}\n\nCzy na pewno chcesz zaakceptować tę rezerwację?`)) {
            return;
          }
        }
      }
    }
    
    await updateDoc(doc(db, 'reservations', reservationId), { 
      status, 
      isAccepted,
      dataState: status === 'accepted' ? 1 : 2 // Keep active if accepted, archive if rejected/cancelled
    });
    setReservations(reservations.map(res => 
      res.id === reservationId ? { ...res, status, isAccepted } : res
    ));
  };

  const checkReservationConflicts = async (reservation: Reservation) => {
    const conflicts: Reservation[] = [];
    
    const selectedDateTime = new Date(`${reservation.reservationDate}T${reservation.reservationHour}`);
    const endDateTime = new Date(selectedDateTime.getTime() + (2 * 60 * 60 * 1000)); // +2 hours

    // Check against other accepted reservations for the same table and date
    const otherReservations = reservations.filter(r => 
      r.id !== reservation.id &&
      r.tableId === reservation.tableId &&
      r.reservationDate === reservation.reservationDate &&
      r.status === 'accepted' &&
      r.dataState === 1
    );

    for (const otherReservation of otherReservations) {
      const otherDateTime = new Date(`${otherReservation.reservationDate}T${otherReservation.reservationHour}`);
      const otherEndTime = new Date(otherDateTime.getTime() + (2 * 60 * 60 * 1000));

      // Check for overlap
      const hasConflict = (
        (selectedDateTime >= otherDateTime && selectedDateTime < otherEndTime) ||
        (endDateTime > otherDateTime && endDateTime <= otherEndTime) ||
        (selectedDateTime <= otherDateTime && endDateTime >= otherEndTime)
      );

      if (hasConflict) {
        conflicts.push(otherReservation);
      }
    }

    return conflicts;
  };

  const handleArchiveReservation = async (reservationId: string) => {
    await updateDoc(doc(db, 'reservations', reservationId), { 
      dataState: 0 // Archive the reservation
    });
    setReservations(reservations.map(res => 
      res.id === reservationId ? { ...res, dataState: 0 } : res
    ));
  };

  const handleDeleteAllReservationsForDate = async (date: string) => {
    try {
      const dayReservations = getReservationsForDate(date, false);
      const batch = writeBatch(db);
      
      dayReservations.forEach(reservation => {
        const reservationRef = doc(db, 'reservations', reservation.id);
        batch.update(reservationRef, { dataState: 0 });
      });
      
      await batch.commit();
      
      // Refresh data
      const reservationsSnapshot = await getDocs(collection(db, 'reservations'));
      setReservations(reservationsSnapshot.docs.map(doc => ({
        ...(doc.data() as Omit<Reservation, 'id'>),
        id: doc.id,
      })));
    } catch (error) {
      console.error('Error deleting all reservations for date:', error);
    }
  };

  const handleHoursUpdate = async (dayId: string, updatedHours: Partial<RestaurantHours>) => {
    if (dayId) {
      await updateDoc(doc(db, 'restaurantHours', dayId), updatedHours);
      setRestaurantHours(restaurantHours.map(h => 
        h.id === dayId ? { ...h, ...updatedHours } : h
      ));
    } else {
      // Create new day hours if it doesn't exist
      const createdHours = await createRestaurantHours(updatedHours as Omit<RestaurantHours, 'id'>);
      setRestaurantHours([...restaurantHours, createdHours]);
    }

    // Update existing reservations for this date if hours changed
    if (updatedHours.openTime || updatedHours.closeTime || updatedHours.timeSlots || updatedHours.blockedHours) {
      await updateReservationsForDate(dayId, updatedHours);
    }
  };

  const updateReservationsForDate = async (dayId: string, updatedHours: Partial<RestaurantHours>) => {
    try {
      const dayHours = restaurantHours.find(h => h.id === dayId);
      if (!dayHours) return;

      const date = dayHours.date;
      const newTimeSlots = updatedHours.timeSlots || dayHours.timeSlots;
      const newBlockedHours = updatedHours.blockedHours || dayHours.blockedHours || [];

      // Get all reservations for this specific date
      const reservationsSnapshot = await getDocs(collection(db, 'reservations'));
      const dateReservations = reservationsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Reservation))
        .filter((reservation) => {
          return reservation.reservationDate === date && reservation.dataState === 1;
        });

      // Update reservations that are outside new hours or in blocked hours
      for (const reservation of dateReservations) {
        const reservationTime = reservation.reservationHour;
        const isWithinNewHours = newTimeSlots.includes(reservationTime);
        const isInBlockedHours = newBlockedHours.some(blockedRange => {
          const [start, end] = blockedRange.split('-');
          return reservationTime >= start && reservationTime < end;
        });
        
        if (!isWithinNewHours || isInBlockedHours) {
          // Find available time slots (excluding blocked hours)
          const availableSlots = newTimeSlots.filter(slot => {
            return !newBlockedHours.some(blockedRange => {
              const [start, end] = blockedRange.split('-');
              return slot >= start && slot < end;
            });
          });

          // Move reservation to closest available time or mark as cancelled
          const closestTime = findClosestTime(reservationTime, availableSlots);
          if (closestTime) {
            await updateDoc(doc(db, 'reservations', reservation.id), {
              reservationHour: closestTime,
              reservationTime: `${reservation.reservationDate} ${closestTime}`,
              notes: `Godzina zmieniona z ${reservationTime} na ${closestTime} z powodu zmiany godzin otwarcia${isInBlockedHours ? ' lub blokady godzin' : ''}`
            });
          } else {
            await updateDoc(doc(db, 'reservations', reservation.id), {
              status: 'cancelled',
              notes: `Rezerwacja anulowana z powodu zmiany godzin otwarcia${isInBlockedHours ? ' lub blokady godzin' : ''}`
            });
          }
        }
      }
    } catch (error) {
      console.error('Błąd podczas aktualizacji rezerwacji:', error);
    }
  };

  const findClosestTime = (originalTime: string, availableTimes: string[]): string | null => {
    if (availableTimes.length === 0) return null;
    
    const originalMinutes = timeToMinutes(originalTime);
    let closestTime = availableTimes[0];
    let minDifference = Math.abs(timeToMinutes(availableTimes[0]) - originalMinutes);
    
    for (const time of availableTimes) {
      const difference = Math.abs(timeToMinutes(time) - originalMinutes);
      if (difference < minDifference) {
        minDifference = difference;
        closestTime = time;
      }
    }
    
    return closestTime;
  };

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
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

  const generateTimeSlots = (openTime: string, closeTime: string) => {
    const slots = [];
    const [openHour, openMinute] = openTime.split(':').map(Number);
    const [closeHour, closeMinute] = closeTime.split(':').map(Number);
    
    let currentHour = openHour;
    let currentMinute = openMinute;
    
    // Handle overnight hours (e.g., 11:00 to 01:00)
    const isOvernight = closeHour < openHour;
    
    
    while (
      (isOvernight && currentHour < 24) || 
      (!isOvernight && currentHour < closeHour) || 
      (currentHour === closeHour && currentMinute < closeMinute)
    ) {
      slots.push(`${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`);
      
      currentMinute += 30;
      if (currentMinute >= 60) {
        currentHour += 1;
        currentMinute = 0;
      }
      
      // Stop at closing time for overnight hours
      if (isOvernight && currentHour === closeHour && currentMinute >= closeMinute) {
        break;
      }
    }
    
    return slots;
  };

  // Calendar and date-specific hours helper functions
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

  const getDayName = (date: Date) => {
    const dayNames = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
    return dayNames[date.getDay()];
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDayHours = (date: Date) => {
    const dateString = formatDate(date);
    return restaurantHours.find(h => h.date === dateString);
  };

  const createDefaultHoursForDate = (date: Date) => {
    const dayOfWeek = date.getDay();
    const dayNames = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
          const defaultHours = {
        0: { openTime: '11:00', closeTime: '01:00' },
        1: { openTime: '10:00', closeTime: '22:00' },
        2: { openTime: '10:00', closeTime: '22:00' },
        3: { openTime: '10:00', closeTime: '22:00' },
        4: { openTime: '10:00', closeTime: '22:00' },
        5: { openTime: '10:00', closeTime: '22:00' },
        6: { openTime: '11:00', closeTime: '01:00' },
      };

    const hours = defaultHours[dayOfWeek as keyof typeof defaultHours];
    return {
      id: '',
      date: formatDate(date),
      dayName: dayNames[dayOfWeek],
      isOpen: true,
      openTime: hours.openTime,
      closeTime: hours.closeTime,
      timeSlots: generateTimeSlots(hours.openTime, hours.closeTime),
      blockedHours: [],
    };
  };





  const toggleTimeSlotInDetails = (time: string) => {
    if (!selectedDayForHours) return;

    const isBlocked = (selectedDayForHours.blockedHours || []).some(range => {
      const [start, end] = range.split('-');
      return time >= start && time < end;
    });

    if (isBlocked) {
      const updatedBlockedHours = (selectedDayForHours.blockedHours || []).filter(range => {
        const [start, end] = range.split('-');
        return !(time >= start && time < end);
      });
      
      // Update local state immediately for UI responsiveness
      const updatedDay = { ...selectedDayForHours, blockedHours: updatedBlockedHours };
      setSelectedDayForHours(updatedDay);
      
      // Update database
      handleHoursUpdate(selectedDayForHours.id, { blockedHours: updatedBlockedHours });
    } else {
      const [hours, minutes] = time.split(':').map(Number);
      const nextTime = new Date();
      nextTime.setHours(hours, minutes + 30, 0, 0);
      const nextTimeString = nextTime.getHours().toString().padStart(2, '0') + ':' + 
                           nextTime.getMinutes().toString().padStart(2, '0');
      const newBlockedRange = `${time}-${nextTimeString}`;
      const updatedBlockedHours = [...(selectedDayForHours.blockedHours || []), newBlockedRange];
      
      // Update local state immediately for UI responsiveness
      const updatedDay = { ...selectedDayForHours, blockedHours: updatedBlockedHours };
      setSelectedDayForHours(updatedDay);
      
      // Update database
      handleHoursUpdate(selectedDayForHours.id, { blockedHours: updatedBlockedHours });
    }
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





  if (!view) {
    return (
      <div className={styles.adminContainer}>
        <div className={styles.headerRow}>
          <div className={styles.appName}>Quick Table</div>
          <h2 className={styles.pageTitle}>Wybierz opcję</h2>
          <button 
            className={styles.gearButton} 
            onClick={() => setShowViewModal(true)}
            title="Ustawienia"
          >
            ⚙️
          </button>
        </div>
        <div className={styles.selectionPanel}>
          <button className={styles.bigButton} onClick={() => setView('menu')}>🍽️ Edycja Menu</button>
          <button className={styles.bigButton} onClick={() => setView('tables')}>🪑 Zarządzanie Stolikami</button>
          <button className={styles.bigButton} onClick={() => setView('reservations')}>📅 Zarządzanie Rezerwacjami</button>
          <button className={styles.bigButton} onClick={() => setView('hours')}>🕐 Godziny Otwarcia</button>
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
                <button onClick={() => { setShowChangeViewModal(false); setShowViewModal(false); window.location.href = '/waiter'; }}>
                  Kelner
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

  if (view === 'menu') {
    if (!selectedMenuItem && !addingNewMenuItem) {
      return (
        <div className={styles.adminContainer}>
          <div className={styles.sectionHeaderRow}>
            <div className={styles.sectionAppName}>Quick Table</div>
            <h2 className={styles.sectionTitle}>Menu - lista dań</h2>
            <div></div>
          </div>
          <ul className={styles.menuList}>
            {menuItems.map(item => (
              <li
                key={item.id}
                className={styles.menuListItem}
                onClick={() => setSelectedMenuItem(item)}
                style={{ cursor: 'pointer' }}
              >
                {item.name}
              </li>
            ))}
          </ul>
          <button className={styles.addItemButton} onClick={() => setAddingNewMenuItem(true)}>
            Dodaj nowy produkt
          </button>
          <div className={styles.backButtonContainer}>
            <button className={styles.backButton} onClick={() => setView(null)}>⬅ Wróć</button>
          </div>
        </div>
      );
    }

    if (selectedMenuItem) {
      return (
        <div className={styles.adminContainer}>
          <div className={styles.sectionHeaderRow}>
            <div className={styles.sectionAppName}>Quick Table</div>
            <h2 className={styles.sectionTitle}>Edycja dania</h2>
            <div></div>
          </div>
          <div className={styles.itemRow}>
            <label>Nazwa:</label>
            <input
              value={selectedMenuItem.name}
              onChange={(e) => setSelectedMenuItem({ ...selectedMenuItem, name: e.target.value })}
            />
          </div>
          <div className={styles.itemRow}>
            <label>Cena:</label>
            <input
              type="number"
              value={selectedMenuItem.price}
              onChange={(e) => setSelectedMenuItem({ ...selectedMenuItem, price: Number(e.target.value) })}
            />
          </div>

          <div className={styles.ingredientsContainer}>
            <label className={styles.itemLabel}>Składniki:</label>
            {selectedMenuItem.ingredients.map((ing, i) => (
              <div key={i} className={styles.ingredientRow}>
                <input
                  type="text"
                  value={ing}
                  onChange={(e) => {
                    const newIngredients = [...selectedMenuItem.ingredients];
                    newIngredients[i] = e.target.value;
                    setSelectedMenuItem({ ...selectedMenuItem, ingredients: newIngredients });
                  }}
                />
                <button
                  className={styles.deleteButton}
                  onClick={() => {
                    const newIngredients = [...selectedMenuItem.ingredients];
                    newIngredients.splice(i, 1);
                    setSelectedMenuItem({ ...selectedMenuItem, ingredients: newIngredients });
                  }}
                >
                  Usuń
                </button>
              </div>
            ))}
            <button
              className={styles.addIngredientButton}
              onClick={() =>
                setSelectedMenuItem({ ...selectedMenuItem, ingredients: [...selectedMenuItem.ingredients, ''] })
              }
            >
              Dodaj składnik
            </button>
          </div>

          <div className={styles.actionButtonsContainer}>
            <button
              className={styles.saveButton}
              onClick={() =>
                selectedMenuItem &&
                handleMenuUpdate(selectedMenuItem.id, selectedMenuItem.name, selectedMenuItem.price, selectedMenuItem.ingredients)
              }
            >
              Zapisz
            </button>
            <button
              className={styles.deleteButton}
              onClick={() => selectedMenuItem && handleDeleteMenuItem(selectedMenuItem.id)}
            >
              Usuń danie
            </button>
            <button className={styles.backButton} onClick={() => setSelectedMenuItem(null)}>
              ⬅ Powrót do listy
            </button>
          </div>
        </div>
      );
    }

    if (addingNewMenuItem) {
      return (
        <div className={styles.adminContainer}>
          <div className={styles.sectionHeaderRow}>
            <div className={styles.sectionAppName}>Quick Table</div>
            <h2 className={styles.sectionTitle}>Dodaj nowe danie</h2>
            <div></div>
          </div>
          <div className={styles.itemRow}>
            <label>Nazwa:</label>
            <input
              placeholder="Nazwa"
              value={newMenuItem.name}
              onChange={(e) => setNewMenuItem({ ...newMenuItem, name: e.target.value })}
            />
          </div>
          <div className={styles.itemRow}>
            <label>Cena:</label>
            <input
              type="number"
              placeholder="Cena"
              value={newMenuItem.price}
              onChange={(e) => setNewMenuItem({ ...newMenuItem, price: Number(e.target.value) })}
            />
          </div>

          <div className={styles.ingredientsContainer}>
            <label>Składniki:</label>
            {newMenuItem.ingredients.map((ing, i) => (
              <div key={i} className={styles.ingredientRow}>
                <input
                  type="text"
                  value={ing}
                  onChange={(e) => {
                    const updated = [...newMenuItem.ingredients];
                    updated[i] = e.target.value;
                    setNewMenuItem({ ...newMenuItem, ingredients: updated });
                  }}
                />
                <button
                  className={styles.deleteButton}
                  onClick={() => {
                    const updated = [...newMenuItem.ingredients];
                    updated.splice(i, 1);
                    setNewMenuItem({ ...newMenuItem, ingredients: updated });
                  }}
                >
                  Usuń
                </button>
              </div>
            ))}
            <button
              className={styles.addIngredientButton}
              onClick={() => setNewMenuItem({ ...newMenuItem, ingredients: [...newMenuItem.ingredients, ''] })}
            >
              Dodaj składnik
            </button>
          </div>

          <button className={styles.addItemButton} onClick={handleAddMenuItem}>
            Dodaj
          </button>

          <div className={styles.backButtonContainer}>
            <button className={styles.backButton} onClick={() => setAddingNewMenuItem(false)}>
              ⬅ Powrót do listy
            </button>
          </div>
        </div>
      );
    }
  }

  if (view === 'tables') {
    return (
      <div className={styles.adminContainer}>
        <div className={styles.sectionHeaderRow}>
          <div className={styles.sectionAppName}>Quick Table</div>
          <h2 className={styles.sectionTitle}>Zarządzanie Stolikami</h2>
          <div></div>
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
      <div className={styles.adminContainer}>
        <div className={styles.sectionHeaderRow}>
          <div className={styles.sectionAppName}>Quick Table</div>
          <h2 className={styles.sectionTitle}>Zarządzanie Rezerwacjami</h2>
          <div></div>
        </div>
        
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
                  
                  const dayReservations = getReservationsForDate(dateString, false);
                  const briefReservations = dayReservations.slice(0, 3); // Show only first 3 reservations
                  
                  return (
                    <div 
                      key={index} 
                      className={`${styles.calendarDay} ${isToday ? styles.today : ''} ${isPast ? styles.pastDay : ''} ${isSelected ? styles.selectedDay : ''}`}
                      onClick={() => setSelectedDate(dateString)}
                      onMouseEnter={(e) => {
                        if (reservationCount > 0) {
                          e.currentTarget.setAttribute('data-tooltip', 'true');
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.removeAttribute('data-tooltip');
                      }}
                    >
                      <div className={styles.dayNumber}>{date.getDate()}</div>
                      {reservationCount > 0 && (
                        <div className={styles.reservationCount}>
                          <span className={styles.countBadge}>{reservationCount}</span>
                        </div>
                      )}
                      {reservationCount > 0 && (
                        <div className={styles.hoverTooltip}>
                          <div className={styles.tooltipHeader}>
                            <strong>{dateString}</strong>
                            <span className={styles.tooltipCount}>{reservationCount} rezerwacji</span>
                          </div>
                          <div className={styles.tooltipReservations}>
                                                         {briefReservations.map((reservation, idx) => (
                               <div key={idx} className={styles.tooltipReservation}>
                                 <span className={styles.tooltipTime}>{reservation.reservationHour}</span>
                                 <span className={styles.tooltipTable}>Stolik {reservation.tableNumber}</span>
                               </div>
                             ))}
                            {dayReservations.length > 3 && (
                              <div className={styles.tooltipMore}>
                                +{dayReservations.length - 3} więcej...
                              </div>
                            )}
                          </div>
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
                <>
                  <div className={styles.reservationsHeader}>
                    <h4>
                      {showArchivedReservations ? 'Zarchiwizowane' : 'Aktywne'} rezerwacje ({dayReservations.length})
                    </h4>
                                         {!showArchivedReservations && dayReservations.length > 0 && (
                       <button 
                         className={styles.deleteAllButton}
                         onClick={() => {
                           if (window.confirm('Czy na pewno chcesz usunąć wszystkie rezerwacje na ten dzień?')) {
                             handleDeleteAllReservationsForDate(selectedDate);
                           }
                         }}
                       >
                         🗑️ Usuń wszystkie
                       </button>
                     )}
                  </div>
                  {dayReservations.map(reservation => (
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
                          <span className={styles.dataStateBadge}>
                            {reservation.dataState === 1 ? 'Aktywna' : 'Zarchiwizowana'}
                          </span>
                        </div>
                      </div>
                      {reservation.status === 'pending' && (
                        <div className={styles.pendingNote}>
                          <p>⚠️ Rezerwacja oczekująca - może kolidować z innymi rezerwacjami</p>
                        </div>
                      )}
                      <div className={styles.reservationDetails}>
                        <p><strong>Klient:</strong> {reservation.customerName}</p>
                        <p><strong>Email:</strong> {reservation.customerEmail}</p>
                        <p><strong>Telefon:</strong> {reservation.customerPhone}</p>
                        <p><strong>Liczba gości:</strong> {reservation.guests}</p>
                        <p><strong>Status:</strong> {reservation.isAccepted ? '✅ Zaakceptowana' : '❌ Nie zaakceptowana'}</p>
                      </div>
                      {reservation.status === 'pending' && reservation.dataState === 1 && (
                        <div className={styles.reservationActions}>
                          <button
                            className={styles.acceptButton}
                            onClick={() => handleReservationStatusUpdate(reservation.id, 'accepted')}
                          >
                            ✅ Zaakceptuj
                          </button>
                          <button
                            className={styles.rejectButton}
                            onClick={() => handleReservationStatusUpdate(reservation.id, 'rejected')}
                          >
                            ❌ Odrzuć
                          </button>
                        </div>
                      )}
                      {reservation.dataState === 1 && reservation.status !== 'pending' && (
                        <div className={styles.reservationActions}>
                          <button
                            className={styles.archiveButton}
                            onClick={() => handleArchiveReservation(reservation.id)}
                          >
                            📁 Zarchiwizuj
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </>
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

  if (view === 'hours') {
    return (
      <div className={styles.adminContainer}>
        <div className={styles.sectionHeaderRow}>
          <div className={styles.sectionAppName}>Quick Table</div>
          <h2 className={styles.sectionTitle}>Godziny Otwarcia</h2>
          <div></div>
        </div>
        
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
                  
                  const dayHours = getDayHours(date);
                  const isToday = date.toDateString() === new Date().toDateString();
                  const isPast = date.getTime() < new Date().setHours(0, 0, 0, 0);
                  const isSelected = selectedDayForHours && selectedDayForHours.date === formatDate(date);
                  
                  return (
                    <div 
                      key={index} 
                      className={`${styles.calendarDay} ${isToday ? styles.today : ''} ${isPast ? styles.pastDay : ''} ${isSelected ? styles.selectedDay : ''}`}
                      onClick={() => {
                        if (dayHours) {
                          setSelectedDayForHours(dayHours);
                        } else {
                          const defaultHours = createDefaultHoursForDate(date);
                          setSelectedDayForHours(defaultHours);
                        }
                      }}
                    >
                      <div className={styles.dayNumber}>{date.getDate()}</div>
                      {dayHours ? (
                        <div className={styles.dayInfo}>
                          {dayHours.isOpen ? (
                            <div className={styles.openIndicator}>
                              <span className={styles.openDot}>🟢</span>
                            </div>
                          ) : (
                            <div className={styles.closedIndicator}>
                              <span className={styles.closedDot}>🔴</span>
                            </div>
                          )}
                          {dayHours.blockedHours && dayHours.blockedHours.length > 0 && (
                            <div className={styles.blockedIndicator}>
                              <span className={styles.blockedDot}>🚫</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className={styles.noHoursInfo}>
                          <div className={styles.noHoursIndicator}>
                            <span className={styles.noHoursDot}>⚪</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className={styles.dayDetailsPanel}>
            {selectedDayForHours ? (
              <div className={styles.dayDetails}>
                <h4>{selectedDayForHours.dayName} - {selectedDayForHours.date}</h4>
                
                <div className={styles.leftSection}>
                  <div className={styles.dateInfo}>
                    <h5>📅 Data</h5>
                    <p>{selectedDayForHours.dayName}, {selectedDayForHours.date}</p>
                  </div>
                  
                  <div className={styles.openStatus}>
                    <label>
                      <input
                        type="checkbox"
                        checked={selectedDayForHours.isOpen}
                        onChange={(e) => {
                          const updatedDay = { ...selectedDayForHours, isOpen: e.target.checked };
                          setSelectedDayForHours(updatedDay);
                          handleHoursUpdate(selectedDayForHours.id, { isOpen: e.target.checked });
                        }}
                      />
                      Restauracja otwarta
                    </label>
                  </div>
                  
                  {selectedDayForHours.isOpen && (
                    <div className={styles.hoursInputs}>
                      <label>
                        Godzina otwarcia:
                        <input
                          type="time"
                          value={selectedDayForHours.openTime}
                          onChange={(e) => {
                            const updatedDay = { ...selectedDayForHours, openTime: e.target.value };
                            setSelectedDayForHours(updatedDay);
                            handleHoursUpdate(selectedDayForHours.id, { openTime: e.target.value });
                          }}
                        />
                      </label>
                      <label>
                        Godzina zamknięcia:
                        <input
                          type="time"
                          value={selectedDayForHours.closeTime}
                          onChange={(e) => {
                            const updatedDay = { ...selectedDayForHours, closeTime: e.target.value };
                            setSelectedDayForHours(updatedDay);
                            handleHoursUpdate(selectedDayForHours.id, { closeTime: e.target.value });
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>
                
                <div className={styles.rightSection}>
                  <div className={styles.reservationHours}>
                    <h5>⏰ Godziny rezerwacji</h5>
                    <p className={styles.timeSlotsDescription}>
                      Kliknij na godzinę aby ją zablokować (czerwona) lub odblokować (zielona)
                    </p>
                    <div className={styles.timeSlotsGrid}>
                      {generateTimeSlots(selectedDayForHours.openTime, selectedDayForHours.closeTime).map(time => {
                        const isBlocked = (selectedDayForHours.blockedHours || []).some(range => {
                          const [start, end] = range.split('-');
                          return time >= start && time < end;
                        });
                        return (
                          <div 
                            key={time} 
                            className={`${styles.timeSlotItem} ${isBlocked ? styles.timeSlotBlocked : ''}`}
                            onClick={() => toggleTimeSlotInDetails(time)}
                          >
                            {time}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className={styles.detailActions}>
                  <button 
                    className={styles.saveBlockedHoursButton}
                    onClick={() => {
                      handleHoursUpdate(selectedDayForHours.id, {
                        blockedHours: selectedDayForHours.blockedHours || []
                      });
                    }}
                  >
                    💾 Zapisz
                  </button>
                  <button 
                    className={styles.closeDetailsButton}
                    onClick={() => setSelectedDayForHours(null)}
                  >
                    Zamknij
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.noDaySelected}>
                <h4>Wybierz dzień z kalendarza</h4>
                <p>Kliknij na dowolny dzień aby zobaczyć szczegóły i ustawić godziny</p>
              </div>
            )}
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
