import { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import styles from './AdminPage.module.css';
import type { MenuItem, Table, Reservation, RestaurantHours } from '../../types/types';  

export default function AdminPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
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
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showArchivedReservations, setShowArchivedReservations] = useState(false);
  const [calendarView, setCalendarView] = useState<'calendar' | 'hours'>('calendar');
  const [selectedDayForHours, setSelectedDayForHours] = useState<RestaurantHours | null>(null);
  const [newBlockedRange, setNewBlockedRange] = useState({ start: '', end: '' });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [modalHoursForm, setModalHoursForm] = useState({
    isOpen: true,
    openTime: '10:00',
    closeTime: '22:00',
  });
  const [selectedDateForModal, setSelectedDateForModal] = useState<Date | null>(null);
  const [modalBlockedRanges, setModalBlockedRanges] = useState<{ start: string; end: string }[]>([]);
  const [newModalBlockedRange, setNewModalBlockedRange] = useState({ start: '', end: '' });

  useEffect(() => {
    const fetchData = async () => {
      const menuSnapshot = await getDocs(collection(db, 'menu'));
      const tableSnapshot = await getDocs(collection(db, 'tables'));
      const reservationsSnapshot = await getDocs(collection(db, 'reservations'));
      const hoursSnapshot = await getDocs(collection(db, 'restaurantHours'));

      setMenuItems(menuSnapshot.docs.map(doc => ({
        ...(doc.data() as Omit<MenuItem, 'id'>),
        id: doc.id,
      })));

      setTables(tableSnapshot.docs.map(doc => ({
        ...(doc.data() as Omit<Table, 'id'>),
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
    const newDoc = await addDoc(collection(db, 'menu'), {
      name: newMenuItem.name,
      price: newMenuItem.price,
      ingredients: newMenuItem.ingredients,
    });
    setMenuItems([...menuItems, { ...newMenuItem, id: newDoc.id }]);
    setNewMenuItem({ id: '', name: '', price: 0, ingredients: [''] });
    setAddingNewMenuItem(false);
  };

  const handleDeleteMenuItem = async (id: string) => {
    await deleteDoc(doc(db, 'menu', id));
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
    setSelectedReservation(null);
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
      dataState: 2 // Archive the reservation
    });
    setReservations(reservations.map(res => 
      res.id === reservationId ? { ...res, dataState: 2 } : res
    ));
  };

  const handleHoursUpdate = async (dayId: string, updatedHours: Partial<RestaurantHours>) => {
    if (dayId) {
      await updateDoc(doc(db, 'restaurantHours', dayId), updatedHours);
      setRestaurantHours(restaurantHours.map(h => 
        h.id === dayId ? { ...h, ...updatedHours } : h
      ));
    } else {
      // Create new day hours if it doesn't exist
      const newDoc = await addDoc(collection(db, 'restaurantHours'), updatedHours);
      setRestaurantHours([...restaurantHours, { ...updatedHours, id: newDoc.id } as RestaurantHours]);
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
      const newOpenTime = updatedHours.openTime || dayHours.openTime;
      const newCloseTime = updatedHours.closeTime || dayHours.closeTime;
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
    return reservations.filter(res => 
      res.reservationDate === date && 
      (showArchived ? res.dataState === 2 : res.dataState === 1)
    );
  };

  const generateTimeSlots = (openTime: string, closeTime: string) => {
    const slots = [];
    const [openHour, openMinute] = openTime.split(':').map(Number);
    const [closeHour, closeMinute] = closeTime.split(':').map(Number);
    
    let currentHour = openHour;
    let currentMinute = openMinute;
    
    // Handle overnight hours (e.g., 11:00 to 01:00)
    const isOvernight = closeHour < openHour;
    const maxHour = isOvernight ? 24 : closeHour;
    
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
    return date.toISOString().split('T')[0];
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

  const handleCreateHoursForDate = (date: Date) => {
    setSelectedDateForModal(date);
    setModalHoursForm({
      isOpen: true,
      openTime: '10:00',
      closeTime: '22:00',
    });
    setModalBlockedRanges([]);
    setNewModalBlockedRange({ start: '', end: '' });
    setShowHoursModal(true);
  };

  const handleSaveModalHours = async () => {
    if (!selectedDateForModal) return;
    
    const blockedHoursStrings = modalBlockedRanges.map(range => `${range.start}-${range.end}`);
    
    const newHours = {
      date: formatDate(selectedDateForModal),
      dayName: getDayName(selectedDateForModal),
      isOpen: modalHoursForm.isOpen,
      openTime: modalHoursForm.openTime,
      closeTime: modalHoursForm.closeTime,
      timeSlots: generateTimeSlots(modalHoursForm.openTime, modalHoursForm.closeTime),
      blockedHours: blockedHoursStrings,
    };
    
    await handleHoursUpdate('', newHours);
    setShowHoursModal(false);
    setSelectedDateForModal(null);
  };

  const addModalBlockedRange = () => {
    if (newModalBlockedRange.start && newModalBlockedRange.end) {
      setModalBlockedRanges([...modalBlockedRanges, newModalBlockedRange]);
      setNewModalBlockedRange({ start: '', end: '' });
    }
  };

  const removeModalBlockedRange = (index: number) => {
    setModalBlockedRanges(modalBlockedRanges.filter((_, i) => i !== index));
  };

  const toggleTimeSlot = (time: string) => {
    const isBlocked = modalBlockedRanges.some(range => 
      time >= range.start && time < range.end
    );

    if (isBlocked) {
      setModalBlockedRanges(modalBlockedRanges.filter(range => 
        !(time >= range.start && time < range.end)
      ));
    } else {
      const [hours, minutes] = time.split(':').map(Number);
      const nextTime = new Date();
      nextTime.setHours(hours, minutes + 30, 0, 0);
      const nextTimeString = nextTime.getHours().toString().padStart(2, '0') + ':' + 
                           nextTime.getMinutes().toString().padStart(2, '0');
      setModalBlockedRanges([...modalBlockedRanges, { start: time, end: nextTimeString }]);
    }
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
      handleHoursUpdate(selectedDayForHours.id, { blockedHours: updatedBlockedHours });
    } else {
      const [hours, minutes] = time.split(':').map(Number);
      const nextTime = new Date();
      nextTime.setHours(hours, minutes + 30, 0, 0);
      const nextTimeString = nextTime.getHours().toString().padStart(2, '0') + ':' + 
                           nextTime.getMinutes().toString().padStart(2, '0');
      const newBlockedRange = `${time}-${nextTimeString}`;
      const updatedBlockedHours = [...(selectedDayForHours.blockedHours || []), newBlockedRange];
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

  const isTimeInBlockedRange = (time: string, blockedHours: string[]) => {
    return blockedHours.some(blockedRange => {
      const [start, end] = blockedRange.split('-');
      return time >= start && time < end;
    });
  };

  const addBlockedHours = (dayId: string, startTime: string, endTime: string) => {
    if (!startTime || !endTime || startTime >= endTime) {
      alert('Nieprawidłowy zakres godzin. Godzina rozpoczęcia musi być wcześniejsza niż zakończenia.');
      return;
    }

    const dayHours = restaurantHours.find(h => h.id === dayId);
    if (!dayHours) return;

    const newBlockedRange = `${startTime}-${endTime}`;
    const updatedBlockedHours = [...(dayHours.blockedHours || []), newBlockedRange];
    
    handleHoursUpdate(dayId, { blockedHours: updatedBlockedHours });
    setNewBlockedRange({ start: '', end: '' });
  };

  const removeBlockedHours = (dayId: string, blockedRange: string) => {
    const dayHours = restaurantHours.find(h => h.id === dayId);
    if (!dayHours) return;

    const updatedBlockedHours = (dayHours.blockedHours || []).filter(range => range !== blockedRange);
    handleHoursUpdate(dayId, { blockedHours: updatedBlockedHours });
  };

  const getAvailableTimeSlots = (dayHours: RestaurantHours) => {
    if (!dayHours.isOpen) return [];
    
    const allSlots = generateTimeSlots(dayHours.openTime, dayHours.closeTime);
    const blockedHours = dayHours.blockedHours || [];
    
    return allSlots.filter(slot => !isTimeInBlockedRange(slot, blockedHours));
  };

  if (!view) {
    return (
      <div className={styles.adminContainer}>
        <h2 className={styles.pageTitle}>Wybierz opcję</h2>
        <div className={styles.selectionPanel}>
          <button className={styles.bigButton} onClick={() => setView('menu')}>🍽️ Edycja Menu</button>
          <button className={styles.bigButton} onClick={() => setView('tables')}>🪑 Zarządzanie Stolikami</button>
          <button className={styles.bigButton} onClick={() => setView('reservations')}>📅 Zarządzanie Rezerwacjami</button>
          <button className={styles.bigButton} onClick={() => setView('hours')}>🕐 Godziny Otwarcia</button>
        </div>
      </div>
    );
  }

  if (view === 'menu') {
    if (!selectedMenuItem && !addingNewMenuItem) {
      return (
        <div className={styles.adminContainer}>
          <h2 className={styles.pageTitle}>Menu - lista dań</h2>
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
          <h2 className={styles.pageTitle}>Edycja dania</h2>
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
          <h2 className={styles.pageTitle}>Dodaj nowe danie</h2>
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
        <h2 className={styles.pageTitle}>Zarządzanie Stolikami</h2>
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
        <h2 className={styles.pageTitle}>Zarządzanie Rezerwacjami</h2>
        
        <div className={styles.dateSelector}>
          <label>
            Wybierz datę:
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </label>
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
          <h3>
            {showArchivedReservations ? 'Zarchiwizowane' : 'Aktywne'} rezerwacje na {selectedDate}
          </h3>
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
            ))
          )}
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
        <h2 className={styles.pageTitle}>Godziny Otwarcia</h2>
        
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
                  
                  return (
                    <div 
                      key={index} 
                      className={`${styles.calendarDay} ${isToday ? styles.today : ''} ${isPast ? styles.pastDay : ''}`}
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
                
                <div className={styles.hoursForm}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedDayForHours.isOpen}
                      onChange={(e) => handleHoursUpdate(selectedDayForHours.id, { isOpen: e.target.checked })}
                    />
                    Otwarte
                  </label>
                  
                  {selectedDayForHours.isOpen && (
                    <>
                      <div className={styles.timeInputs}>
                        <label>
                          Godzina otwarcia:
                          <input
                            type="time"
                            value={selectedDayForHours.openTime}
                            onChange={(e) => handleHoursUpdate(selectedDayForHours.id, { openTime: e.target.value })}
                          />
                        </label>
                        <label>
                          Godzina zamknięcia:
                          <input
                            type="time"
                            value={selectedDayForHours.closeTime}
                            onChange={(e) => handleHoursUpdate(selectedDayForHours.id, { closeTime: e.target.value })}
                          />
                        </label>
                      </div>
                      
                      <div className={styles.timeSlotsSection}>
                        <h5>⏰ Godziny rezerwacji - Kliknij aby zablokować/odblokować</h5>
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
                    </>
                  )}
                </div>
                
                <div className={styles.detailsActions}>
                  <button 
                    className={styles.setupHoursButton}
                    onClick={() => {
                      setSelectedDateForModal(new Date(selectedDayForHours.date));
                      setModalHoursForm({
                        isOpen: selectedDayForHours.isOpen,
                        openTime: selectedDayForHours.openTime,
                        closeTime: selectedDayForHours.closeTime,
                      });
                      setModalBlockedRanges(
                        (selectedDayForHours.blockedHours || []).map(range => {
                          const [start, end] = range.split('-');
                          return { start, end };
                        })
                      );
                      setShowHoursModal(true);
                    }}
                  >
                    Zmień godziny otwarcia
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



        {/* Hours Setup Modal */}
        {showHoursModal && selectedDateForModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h3>Ustaw godziny dla {selectedDateForModal.toLocaleDateString('pl-PL')} ({getDayName(selectedDateForModal)})</h3>
                <button 
                  className={styles.modalCloseButton}
                  onClick={() => setShowHoursModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className={styles.modalBody}>
                {/* Restaurant Open/Closed Toggle */}
                <div className={styles.modalSection}>
                  <h4>🕒 Status restauracji</h4>
                  <label className={styles.modalCheckbox}>
                    <input
                      type="checkbox"
                      checked={modalHoursForm.isOpen}
                      onChange={(e) => setModalHoursForm({ ...modalHoursForm, isOpen: e.target.checked })}
                    />
                    <span>Restauracja otwarta</span>
                  </label>
                </div>

                {/* Opening Hours */}
                {modalHoursForm.isOpen && (
                  <div className={styles.modalSection}>
                    <h4>⏰ Godziny otwarcia</h4>
                    <div className={styles.modalTimeInputs}>
                      <label>
                        <span>Od:</span>
                        <input
                          type="time"
                          value={modalHoursForm.openTime}
                          onChange={(e) => setModalHoursForm({ ...modalHoursForm, openTime: e.target.value })}
                        />
                      </label>
                      <label>
                        <span>Do:</span>
                        <input
                          type="time"
                          value={modalHoursForm.closeTime}
                          onChange={(e) => setModalHoursForm({ ...modalHoursForm, closeTime: e.target.value })}
                        />
                      </label>
                    </div>
                  </div>
                )}



                {/* Clickable time slots */}
                {modalHoursForm.isOpen && (
                  <div className={styles.modalSection}>
                    <h4>⏰ Godziny rezerwacji - Kliknij aby zablokować/odblokować</h4>
                    <p className={styles.modalDescription}>
                      Kliknij na godzinę aby ją zablokować (czerwona) lub odblokować (zielona)
                    </p>
                    <div className={styles.modalTimeSlots}>
                      {generateTimeSlots(modalHoursForm.openTime, modalHoursForm.closeTime).map(time => {
                        const isBlocked = modalBlockedRanges.some(range => 
                          time >= range.start && time < range.end
                        );
                        return (
                          <div 
                            key={time} 
                            className={`${styles.modalTimeSlot} ${isBlocked ? styles.modalTimeSlotBlocked : ''}`}
                            onClick={() => toggleTimeSlot(time)}
                          >
                            {time}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.modalFooter}>
                <button 
                  className={styles.modalCancelButton}
                  onClick={() => setShowHoursModal(false)}
                >
                  Anuluj
                </button>
                <button 
                  className={styles.modalSaveButton}
                  onClick={handleSaveModalHours}
                >
                  Zapisz godziny
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
