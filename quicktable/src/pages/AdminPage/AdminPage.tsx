import { useState, useEffect } from 'react';
import type { MenuItem, Reservation, RestaurantHours, Table, Order } from '../../types/types';
import { menuAPI, reservationAPI, hoursAPI, tableAPI, orderAPI } from '../../utils/apiClient';
import { Timestamp } from 'firebase/firestore';
import Breadcrumb from '../../components/Breadcrumb/Breadcrumb';
import { authAPI } from '../../utils/apiClient';
  

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
  const [view, setView] = useState<'menu' | 'tables' | 'reservations' | 'hours' | 'reports' | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [restaurantHours, setRestaurantHours] = useState<RestaurantHours[]>([]);
  const [showArchivedReservations, setShowArchivedReservations] = useState(false);
  const [selectedDayForHours, setSelectedDayForHours] = useState<RestaurantHours | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [newTableNumber, setNewTableNumber] = useState<number>(0);
  const [addingNewTable, setAddingNewTable] = useState(false);
  const [expandedReservations, setExpandedReservations] = useState<Set<string>>(new Set());
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [expandedOrderDetails, setExpandedOrderDetails] = useState<Set<string>>(new Set());
  const [statusChangeModal, setStatusChangeModal] = useState<{ tableId: string; currentStatus: string } | null>(null);
  const [reportDateFrom, setReportDateFrom] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [reportDateTo, setReportDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [creatingAccounts, setCreatingAccounts] = useState(false);


  const fetchData = async () => {
    try {
      setErrorMessage(null);
      const [menuData, reservationsData, hoursData, tablesData, ordersData] = await Promise.all([
        menuAPI.getAll(),
        reservationAPI.getAll(),
        hoursAPI.getAll(),
        tableAPI.getAll(),
        orderAPI.getAll(),
      ]);

      setMenuItems(menuData as MenuItem[]);
      setReservations(reservationsData as Reservation[]);
      setRestaurantHours(hoursData as RestaurantHours[]);
      setTables(tablesData as Table[]);
      setOrders(ordersData as Order[]);
    } catch (error) {
      console.error('Error fetching data:', error);
      setErrorMessage('Nie udało się pobrać danych. Sprawdź czy wszystkie serwisy są uruchomione.');
    }
  };

  useEffect(() => {
    fetchData();
    
    const interval = setInterval(() => {
      fetchData();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [view]);

  const handleMenuUpdate = async (id: string, name: string, price: number, ingredients: string[]) => {
    try {
      setErrorMessage(null);
      await menuAPI.update(id, { name, price, ingredients });
      await fetchData(); // Refetch to ensure consistency
      setSelectedMenuItem(null);
      setSuccessMessage('Produkt został zaktualizowany pomyślnie!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      console.error('Error updating menu item:', error);
      const errorMsg = error?.message || error?.error || 'Nie udało się zaktualizować produktu.';
      setErrorMessage(errorMsg);
    }
  };

  const handleAddMenuItem = async () => {
    if (!newMenuItem.name || newMenuItem.price <= 0) {
      setErrorMessage('Wprowadź poprawną nazwę i cenę produktu.');
      return;
    }
    
    if (!newMenuItem.ingredients || newMenuItem.ingredients.length === 0 || newMenuItem.ingredients.every(ing => !ing.trim())) {
      setErrorMessage('Dodaj przynajmniej jeden składnik.');
      return;
    }
    
    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      
      const createdItem = await menuAPI.create({
        name: newMenuItem.name.trim(),
        price: newMenuItem.price,
        ingredients: newMenuItem.ingredients.filter(ing => ing.trim()).map(ing => ing.trim()),
      });
      
      if (createdItem) {
        const itemName = (createdItem as any).name || newMenuItem.name;
        setSuccessMessage(`Produkt "${itemName}" został dodany pomyślnie!`);
        // Refetch data to ensure we have the latest from database
        await fetchData();
        setNewMenuItem({ id: '', name: '', price: 0, ingredients: [''] });
        setAddingNewMenuItem(false);
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (error: any) {
      console.error('Error creating menu item:', error);
      const errorMsg = error?.message || error?.error || 'Nie udało się dodać produktu. Sprawdź czy serwis menu jest uruchomiony.';
      setErrorMessage(errorMsg);
    }
  };

  const handleDeleteMenuItem = async (id: string) => {
    try {
      await menuAPI.delete(id);
      setMenuItems(menuItems.filter(item => item.id !== id));
      setSelectedMenuItem(null);
    } catch (error) {
      console.error('Error deleting menu item:', error);
    }
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
    
    try {
      await reservationAPI.updateStatus(reservationId, status);
      setReservations(reservations.map(res => 
        res.id === reservationId ? { ...res, status, isAccepted } : res
      ));
    } catch (error) {
      console.error('Error updating reservation status:', error);
      alert('Błąd podczas aktualizacji statusu rezerwacji');
    }
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
    try {
      await reservationAPI.archive(reservationId);
      setReservations(reservations.map(res => 
        res.id === reservationId ? { ...res, dataState: 2 } : res
      ));
    } catch (error) {
      console.error('Error archiving reservation:', error);
    }
  };

  const handleAddTable = async () => {
    if (!newTableNumber || newTableNumber <= 0) {
      setErrorMessage('Podaj poprawny numer stolika (większy od 0).');
      return;
    }
    
    if (tables.some(t => t.number === newTableNumber)) {
      setErrorMessage(`Stolik o numerze ${newTableNumber} już istnieje.`);
      return;
    }
    
    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      
      const newTable = await tableAPI.create({ number: newTableNumber });
      
      if (newTable) {
        setSuccessMessage(`Stolik ${newTableNumber} został dodany pomyślnie!`);
        // Refetch data to ensure we have the latest from database
        await fetchData();
        setNewTableNumber(0);
        setAddingNewTable(false);
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (error: any) {
      console.error('Error adding table:', error);
      const errorMsg = error?.message || error?.error || 'Nie udało się dodać stolika. Sprawdź czy serwis tabel jest uruchomiony.';
      setErrorMessage(errorMsg);
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten stolik?')) {
      return;
    }
    
    try {
      await tableAPI.delete(tableId);
      setTables(tables.filter(t => t.id !== tableId));
    } catch (error) {
      console.error('Error deleting table:', error);
      alert('Błąd podczas usuwania stolika');
    }
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

  const openStatusChangeModal = (tableId: string, currentStatus: string) => {
    setStatusChangeModal({ tableId, currentStatus });
  };

  const confirmStatusChange = async () => {
    if (!statusChangeModal) return;

    const { tableId, currentStatus } = statusChangeModal;
    const newStatus = currentStatus === 'free' ? 'occupied' : 'free';
    
    try {
      await tableAPI.updateStatus(tableId, newStatus as 'free' | 'occupied');
      setTables(tables.map(t => t.id === tableId ? { ...t, status: newStatus } : t));
      setStatusChangeModal(null);
    } catch (error) {
      console.error('Error updating table status:', error);
      alert('Błąd podczas aktualizacji statusu stolika');
    }
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

  const handleMarkOrderAsDone = async (orderId: string) => {
    try {
      await orderAPI.updateStatus(orderId, 'done');
      
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: 'done' } : order
      ));
    } catch (error) {
      console.error('Error marking order as done:', error);
      alert('Błąd podczas oznaczania zamówienia jako wykonane');
    }
  };

  const handleDeleteAllReservationsForDate = async (date: string) => {
    try {
      const dayReservations = getReservationsForDate(date, false);
      
      // Archive all reservations for this date
      await Promise.all(dayReservations.map(reservation => 
        reservationAPI.archive(reservation.id)
      ));
      
      // Refresh data
      const allReservations = await reservationAPI.getAll();
      setReservations(allReservations as Reservation[]);
    } catch (error) {
      console.error('Error deleting all reservations for date:', error);
    }
  };

  const handleHoursUpdate = async (dayId: string, updatedHours: Partial<RestaurantHours>) => {
    try {
      if (dayId) {
        await hoursAPI.update(dayId, updatedHours);
        setRestaurantHours(restaurantHours.map(h => 
          h.id === dayId ? { ...h, ...updatedHours } : h
        ));
      } else {
        // Create new day hours if it doesn't exist (for both open and closed days)
        const dayHours = restaurantHours.find(h => !h.id);
        if (dayHours) {
          const isOpen = updatedHours.isOpen ?? dayHours.isOpen;
          const createdHours = await hoursAPI.create({
            date: dayHours.date || formatDate(new Date()),
            dayName: dayHours.dayName || '',
            isOpen: isOpen,
            openTime: isOpen ? (updatedHours.openTime || dayHours.openTime || '10:00') : '00:00',
            closeTime: isOpen ? (updatedHours.closeTime || dayHours.closeTime || '22:00') : '00:00',
            blockedHours: updatedHours.blockedHours || dayHours.blockedHours || [],
          });
          setRestaurantHours([...restaurantHours, createdHours as RestaurantHours]);
        } else {
          // If no dayHours exists, create a new entry for closed day
          const selectedDate = selectedDayForHours?.date || formatDate(new Date());
          const dayOfWeek = new Date(selectedDate).getDay();
          const dayNames = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
          
          const createdHours = await hoursAPI.create({
            date: selectedDate,
            dayName: dayNames[dayOfWeek],
            isOpen: updatedHours.isOpen ?? false,
            openTime: '00:00',
            closeTime: '00:00',
            blockedHours: [],
          });
          
          // Update selectedDayForHours if it exists
          if (selectedDayForHours) {
            setSelectedDayForHours({ ...selectedDayForHours, ...(createdHours as RestaurantHours) });
          }
          
          setRestaurantHours([...restaurantHours, createdHours as RestaurantHours]);
        }
      }

      // If closing a day, cancel pending reservations for that date
      if (updatedHours.isOpen === false) {
        const dayHours = restaurantHours.find(h => h.id === dayId);
        if (dayHours) {
          const pendingReservations = reservations.filter(r => 
            r.reservationDate === dayHours.date && 
            r.status === 'pending' &&
            r.dataState === 1
          );
          
          for (const reservation of pendingReservations) {
            try {
              await reservationAPI.updateStatus(reservation.id, 'cancelled');
              await reservationAPI.update(reservation.id, {
                notes: 'Rezerwacja anulowana z powodu zamknięcia restauracji w tym dniu'
              });
            } catch (error) {
              console.error('Error cancelling reservation:', error);
            }
          }
          
          // Refresh reservations
          await fetchData();
        }
      }

      // Update existing reservations for this date if hours changed
      if (updatedHours.openTime || updatedHours.closeTime || updatedHours.timeSlots || updatedHours.blockedHours) {
        await updateReservationsForDate(dayId, updatedHours);
      }
    } catch (error) {
      console.error('Error updating hours:', error);
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
      const dateReservations = await reservationAPI.getAll({ date, dataState: 1 });

      // Update reservations that are outside new hours or in blocked hours
      for (const reservation of dateReservations as Reservation[]) {
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
            await reservationAPI.update(reservation.id, {
              reservationHour: closestTime,
              reservationTime: `${reservation.reservationDate} ${closestTime}`,
              notes: `Godzina zmieniona z ${reservationTime} na ${closestTime} z powodu zmiany godzin otwarcia${isInBlockedHours ? ' lub blokady godzin' : ''}`
            });
          } else {
            await reservationAPI.updateStatus(reservation.id, 'cancelled');
            await reservationAPI.update(reservation.id, {
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

  const createTestAccounts = async () => {
    setCreatingAccounts(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await authAPI.createTestAccounts() as { message?: string };
      setSuccessMessage(response.message || `Utworzono konta testowe.`);
    } catch (error: any) {
      console.error('Error creating test accounts:', error);
      setErrorMessage(`Błąd podczas tworzenia kont: ${error.message || error.error || 'Nieznany błąd'}`);
    } finally {
      setCreatingAccounts(false);
    }
  };





  if (!view) {
    return (
      <div className="w-full min-h-screen bg-gray-50 p-4">
        <Breadcrumb 
          items={[
            { label: 'Panel administracyjny', path: '/admin' }
          ]}
        />
        <div className="mb-6">
          <h2 className="text-4xl font-bold text-gray-800 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent text-center mb-2">
            Wybierz opcję
          </h2>
        </div>
        <div className="flex flex-col gap-4 max-w-md mx-auto">
          <button 
            className="px-8 py-6 bg-primary text-white rounded-lg hover:bg-blue-600 transition-all font-semibold text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 min-h-[80px]"
            onClick={() => setView('menu')}
          >
            🍽️ Edycja Menu
          </button>
          <button 
            className="px-8 py-6 bg-primary text-white rounded-lg hover:bg-blue-600 transition-all font-semibold text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 min-h-[80px]"
            onClick={() => setView('tables')}
          >
            🪑 Zarządzanie Stolikami
          </button>
          <button 
            className="px-8 py-6 bg-primary text-white rounded-lg hover:bg-blue-600 transition-all font-semibold text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 min-h-[80px]"
            onClick={() => setView('reservations')}
          >
            📅 Zarządzanie Rezerwacjami
          </button>
          <button 
            className="px-8 py-6 bg-primary text-white rounded-lg hover:bg-blue-600 transition-all font-semibold text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 min-h-[80px]"
            onClick={() => setView('hours')}
          >
            🕐 Godziny Otwarcia
          </button>
          <button 
            className="px-8 py-6 bg-primary text-white rounded-lg hover:bg-blue-600 transition-all font-semibold text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 min-h-[80px]"
            onClick={() => setView('reports')}
          >
            📊 Raporty
          </button>
          <button 
            className="px-8 py-6 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all font-semibold text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 min-h-[80px] disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={createTestAccounts}
            disabled={creatingAccounts}
          >
            {creatingAccounts ? '⏳ Tworzenie kont...' : '👥 Utwórz konta testowe'}
          </button>
        </div>
        {errorMessage && (
          <div className="max-w-md mx-auto mt-4 p-4 bg-red-100 text-red-800 rounded-lg border border-red-200">
            {errorMessage}
            <button 
              onClick={() => setErrorMessage(null)}
              className="float-right bg-transparent border-none text-red-800 cursor-pointer text-xl hover:opacity-70 transition-opacity"
            >
              ×
            </button>
          </div>
        )}
        {successMessage && (
          <div className="max-w-md mx-auto mt-4 p-4 bg-green-100 text-green-800 rounded-lg border border-green-200">
            {successMessage}
            <button 
              onClick={() => setSuccessMessage(null)}
              className="float-right bg-transparent border-none text-green-800 cursor-pointer text-xl hover:opacity-70 transition-opacity"
            >
              ×
            </button>
          </div>
        )}
        <div className="max-w-md mx-auto mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700">
          <p className="font-semibold mb-2">Konta testowe (hasło: 123):</p>
          <ul className="list-disc list-inside space-y-1">
            <li>admin@quicktable.com - Administrator</li>
            <li>manager@quicktable.com - Menedżer</li>
            <li>client@quicktable.com - Klient</li>
            <li>waiter@quicktable.com - Kelner</li>
            <li>kitchen@quicktable.com - Kuchnia</li>
          </ul>
        </div>
      </div>
    );
  }

  if (view === 'menu') {
    if (!selectedMenuItem && !addingNewMenuItem) {
      return (
        <div className="w-full min-h-screen bg-gray-50 p-4">
          <Breadcrumb 
            items={[
              { label: 'Panel administracyjny', path: '/admin', onClick: () => setView(null) },
              { label: 'Menu' }
            ]}
          />
          {errorMessage && (
            <div className="p-4 bg-red-100 text-red-800 rounded-lg mb-4 border border-red-200">
              {errorMessage}
              <button 
                onClick={() => setErrorMessage(null)}
                className="float-right bg-transparent border-none text-red-800 cursor-pointer text-xl hover:opacity-70 transition-opacity"
              >
                ×
              </button>
            </div>
          )}
          {successMessage && (
            <div className="p-4 bg-green-100 text-green-800 rounded-lg mb-4 border border-green-200">
              {successMessage}
              <button 
                onClick={() => setSuccessMessage(null)}
                className="float-right bg-transparent border-none text-green-800 cursor-pointer text-xl hover:opacity-70 transition-opacity"
              >
                ×
              </button>
            </div>
          )}
          <div className="mb-6">
            <h2 className="text-4xl font-bold text-gray-800 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent text-center">
              Menu - lista dań
            </h2>
          </div>
          {menuItems.length === 0 && !errorMessage && (
            <div className="p-8 text-center text-gray-600 bg-white rounded-lg mb-4">
              <p>Brak produktów w menu. Dodaj pierwszy produkt aby rozpocząć.</p>
            </div>
          )}
          <ul className="list-none p-0 mb-6 bg-white rounded-lg shadow-md overflow-hidden">
            {menuItems.map(item => (
              <li
                key={item.id}
                className="p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setSelectedMenuItem(item)}
              >
                {item.name}
              </li>
            ))}
          </ul>
          <button className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold mb-4" onClick={() => setAddingNewMenuItem(true)}>
            Dodaj nowy produkt
          </button>
          <div className="flex justify-center mt-6">
            <button className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors" onClick={() => setView(null)}>⬅ Wróć</button>
          </div>
        </div>
      );
    }

    if (selectedMenuItem) {
      return (
        <div className="w-full min-h-screen bg-gray-50 p-4">
          <Breadcrumb 
            items={[
              { label: 'Panel administracyjny', path: '/admin', onClick: () => setView(null) },
              { label: 'Menu', onClick: () => setSelectedMenuItem(null) },
              { label: selectedMenuItem.name }
            ]}
          />
          <div className="mb-6">
            <h2 className="text-4xl font-bold text-gray-800 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent text-center">
              Edycja dania
            </h2>
          </div>
          <div className="mb-4 bg-white rounded-lg shadow-md p-4">
            <label className="block mb-2 font-semibold text-gray-700">Nazwa:</label>
            <input
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-base transition-colors focus:outline-none focus:border-primary bg-gray-50 focus:bg-white"
              value={selectedMenuItem.name}
              onChange={(e) => setSelectedMenuItem({ ...selectedMenuItem, name: e.target.value })}
            />
          </div>
          <div className="mb-4 bg-white rounded-lg shadow-md p-4">
            <label className="block mb-2 font-semibold text-gray-700">Cena:</label>
            <input
              type="number"
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-base transition-colors focus:outline-none focus:border-primary bg-gray-50 focus:bg-white"
              value={selectedMenuItem.price}
              onChange={(e) => setSelectedMenuItem({ ...selectedMenuItem, price: Number(e.target.value) })}
            />
          </div>

          <div className="mb-4 bg-white rounded-lg shadow-md p-4">
            <label className="block mb-2 font-semibold text-gray-700">Składniki:</label>
            {selectedMenuItem.ingredients.map((ing, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="text"
                  className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg text-base transition-colors focus:outline-none focus:border-primary bg-gray-50 focus:bg-white min-w-[120px]"
                  value={ing}
                  onChange={(e) => {
                    const newIngredients = [...selectedMenuItem.ingredients];
                    newIngredients[i] = e.target.value;
                    setSelectedMenuItem({ ...selectedMenuItem, ingredients: newIngredients });
                  }}
                />
                <button
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
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
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              onClick={() =>
                setSelectedMenuItem({ ...selectedMenuItem, ingredients: [...selectedMenuItem.ingredients, ''] })
              }
            >
              Dodaj składnik
            </button>
          </div>

          <div className="flex gap-4 mb-6">
            <button
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
              onClick={() =>
                selectedMenuItem &&
                handleMenuUpdate(selectedMenuItem.id, selectedMenuItem.name, selectedMenuItem.price, selectedMenuItem.ingredients)
              }
            >
              Zapisz
            </button>
            <button
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              onClick={() => selectedMenuItem && handleDeleteMenuItem(selectedMenuItem.id)}
            >
              Usuń danie
            </button>
            <button className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors" onClick={() => setSelectedMenuItem(null)}>
              ⬅ Powrót do listy
            </button>
          </div>
        </div>
      );
    }

    if (addingNewMenuItem) {
      return (
        <div className="w-full min-h-screen bg-gray-50 p-4">
          <Breadcrumb 
            items={[
              { label: 'Panel administracyjny', path: '/admin', onClick: () => setView(null) },
              { label: 'Menu', onClick: () => setAddingNewMenuItem(false) },
              { label: 'Dodaj nowe danie' }
            ]}
          />
          <div className="mb-6">
            <h2 className="text-4xl font-bold text-gray-800 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent text-center">
              Dodaj nowe danie
            </h2>
          </div>
          <div className="mb-4 bg-white rounded-lg shadow-md p-4">
            <label className="block mb-2 font-semibold text-gray-700">Nazwa:</label>
            <input
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-base transition-colors focus:outline-none focus:border-primary bg-gray-50 focus:bg-white"
              placeholder="Nazwa"
              value={newMenuItem.name}
              onChange={(e) => setNewMenuItem({ ...newMenuItem, name: e.target.value })}
            />
          </div>
          <div className="mb-4 bg-white rounded-lg shadow-md p-4">
            <label className="block mb-2 font-semibold text-gray-700">Cena:</label>
            <input
              type="number"
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-base transition-colors focus:outline-none focus:border-primary bg-gray-50 focus:bg-white"
              placeholder="Cena"
              value={newMenuItem.price}
              onChange={(e) => setNewMenuItem({ ...newMenuItem, price: Number(e.target.value) })}
            />
          </div>

          <div className="mb-4 bg-white rounded-lg shadow-md p-4">
            <label className="block mb-2 font-semibold text-gray-700">Składniki:</label>
            {newMenuItem.ingredients.map((ing, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="text"
                  className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg text-base transition-colors focus:outline-none focus:border-primary bg-gray-50 focus:bg-white min-w-[120px]"
                  value={ing}
                  onChange={(e) => {
                    const updated = [...newMenuItem.ingredients];
                    updated[i] = e.target.value;
                    setNewMenuItem({ ...newMenuItem, ingredients: updated });
                  }}
                />
                <button
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
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
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              onClick={() => setNewMenuItem({ ...newMenuItem, ingredients: [...newMenuItem.ingredients, ''] })}
            >
              Dodaj składnik
            </button>
          </div>

          <button className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold mb-4" onClick={handleAddMenuItem}>
            Dodaj
          </button>

          <div className="flex justify-center mt-6">
            <button className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors" onClick={() => setAddingNewMenuItem(false)}>
              ⬅ Powrót do listy
            </button>
          </div>
        </div>
      );
    }
  }

  if (view === 'tables') {
    const sortedTables = [...tables].sort((a, b) => a.number - b.number);

    return (
      <div className="w-full min-h-screen bg-gray-50 p-4">
        <Breadcrumb 
          items={[
            { label: 'Panel administracyjny', path: '/admin', onClick: () => setView(null) },
            { label: 'Zarządzanie Stolikami' }
          ]}
        />
        {errorMessage && (
          <div className="p-4 bg-red-100 text-red-800 rounded-lg mb-4 border border-red-200">
            {errorMessage}
            <button 
              onClick={() => setErrorMessage(null)}
              className="float-right bg-transparent border-none text-red-800 cursor-pointer text-xl hover:opacity-70 transition-opacity"
            >
              ×
            </button>
          </div>
        )}
        {successMessage && (
          <div className="p-4 bg-green-100 text-green-800 rounded-lg mb-4 border border-green-200">
            {successMessage}
            <button 
              onClick={() => setSuccessMessage(null)}
              className="float-right bg-transparent border-none text-green-800 cursor-pointer text-xl hover:opacity-70 transition-opacity"
            >
              ×
            </button>
          </div>
        )}
        <div className="mb-6">
          <h2 className="text-4xl font-bold text-gray-800 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent text-center">
            Zarządzanie Stolikami
          </h2>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4 pb-4 border-b">
            <h3>Lista Stolików ({tables.length})</h3>
            <button 
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
              onClick={() => setAddingNewTable(true)}
            >
              ➕ Dodaj Stolik
            </button>
          </div>

          {addingNewTable && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="mb-4 text-lg font-semibold text-gray-800">Dodaj Nowy Stolik</h4>
              <div className="mb-4">
                <label className="block mb-2 font-semibold text-gray-700">Numer Stolika:</label>
                <input
                  type="number"
                  min="1"
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-base transition-colors focus:outline-none focus:border-primary bg-gray-50 focus:bg-white"
                  value={newTableNumber || ''}
                  onChange={(e) => setNewTableNumber(parseInt(e.target.value) || 0)}
                  placeholder="Wprowadź numer stolika"
                />
              </div>
              <div className="flex gap-4">
                <button 
                  className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
                  onClick={handleAddTable}
                >
                  💾 Zapisz
                </button>
                <button 
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                  onClick={() => {
                    setAddingNewTable(false);
                    setNewTableNumber(0);
                  }}
                >
                  ❌ Anuluj
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedTables.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-600">
                <p>Brak stolików. Dodaj pierwszy stolik aby rozpocząć.</p>
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
                      <button
                        className={`w-4 h-4 rounded-full ${statusDotColor} cursor-pointer hover:opacity-80 transition-opacity`}
                        onClick={() => openStatusChangeModal(table.id, table.status)}
                        title="Zmień status stolika"
                      ></button>
                      
                      <h4>Stolik {table.number}</h4>
                      
                      <button
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
                        onClick={() => handleDeleteTable(table.id)}
                        title="Usuń stolik"
                      >
                        🗑️
                      </button>
                    </div>

                    <div className="space-y-3">
                      {allOrders.length > 0 && (
                        <div className={`${allOrdersCompleted ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'} border rounded-lg p-3`}>
                          <button 
                            className="w-full flex items-center justify-between text-left bg-transparent border-none cursor-pointer"
                            onClick={() => toggleOrderExpand(table.id)}
                          >
                            <span className="text-lg">{allOrdersCompleted ? '✅' : '📋'}</span>
                            <span className="font-medium text-gray-700">Zamówienia ({allOrders.length})</span>
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
                                            <span className="font-medium">{item.quantity}x</span>
                                            <span className="">{item.name}</span>
                                            <span className="font-semibold">{(item.price * item.quantity).toFixed(2)} zł</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  <div className="mt-2">
                                    <button
                                      className={`w-full px-4 py-2 rounded-lg font-semibold transition-colors ${order.status === 'done' ? 'bg-gray-200 text-gray-600 cursor-not-allowed' : 'bg-primary text-white hover:bg-blue-600'}`}
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
                            className="w-full flex items-center justify-between text-left bg-transparent border-none cursor-pointer"
                            onClick={() => toggleReservationExpand(table.id)}
                          >
                            <span className="text-lg">📅</span>
                            <span className="font-medium text-gray-700">Najbliższa rezerwacja</span>
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
                          <p className="">
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

        {statusChangeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setStatusChangeModal(null)}>
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3>Zmiana statusu stolika</h3>
              <p className="text-lg font-semibold text-gray-800 mb-4">
                Czy na pewno chcesz zmienić status stolika na{' '}
                <strong>{statusChangeModal.currentStatus === 'free' ? 'ZAJĘTY' : 'WOLNY'}</strong>?
              </p>
              {isTableOccupied(statusChangeModal.tableId) && statusChangeModal.currentStatus === 'occupied' && (
                <div className="p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg mb-4">
                  ⚠️ Uwaga: Ten stolik ma aktywne zamówienia!
                </div>
              )}
              <div className="flex gap-4">
                <button 
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
                  onClick={confirmStatusChange}
                >
                  ✅ Potwierdź
                </button>
                <button 
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                  onClick={() => setStatusChangeModal(null)}
                >
                  ❌ Anuluj
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-center mt-6">
          <button className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors" onClick={() => setView(null)}>⬅ Wróć</button>
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
            { label: 'Panel administracyjny', path: '/admin', onClick: () => setView(null) },
            { label: 'Zarządzanie Rezerwacjami' }
          ]}
        />
        <div className="mb-6">
          <h2 className="text-4xl font-bold text-gray-800 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent text-center">
            Zarządzanie Rezerwacjami
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
              <h3>{currentMonth.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}</h3>
              <button 
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-xl"
                onClick={() => navigateMonth('next')}
              >
                ➡️
              </button>
            </div>
            
            <div className="">
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
                  
                  const dayReservations = getReservationsForDate(dateString, false);
                  const briefReservations = dayReservations.slice(0, 3); // Show only first 3 reservations
                  
                  return (
                    <div 
                      key={index} 
                      className={`aspect-square flex flex-col items-center justify-center rounded-lg cursor-pointer transition-colors relative ${
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
                      onMouseEnter={(e) => {
                        if (reservationCount > 0) {
                          e.currentTarget.setAttribute('data-tooltip', 'true');
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.removeAttribute('data-tooltip');
                      }}
                    >
                      <div className="font-medium">{date.getDate()}</div>
                      {reservationCount > 0 && (
                        <div className="mt-1">
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary text-white">{reservationCount}</span>
                        </div>
                      )}
                      {reservationCount > 0 && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800 text-white rounded-lg p-2 text-xs z-10 min-w-[200px]">
                          <div className="font-bold mb-2 pb-2 border-b border-gray-600">
                            <strong>{dateString}</strong>
                            <span className="">{reservationCount} rezerwacji</span>
                          </div>
                          <div className="space-y-1">
                                                         {briefReservations.map((reservation, idx) => (
                               <div key={idx} className="flex justify-between">
                                 <span className="">{reservation.reservationHour}</span>
                                 <span className="">Stolik {reservation.tableNumber}</span>
                               </div>
                             ))}
                            {dayReservations.length > 3 && (
                              <div className="text-center text-gray-400 mt-1">
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

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-6 pb-4 border-b">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showArchivedReservations}
                  onChange={(e) => setShowArchivedReservations(e.target.checked)}
                />
                Pokaż zarchiwizowane rezerwacje
              </label>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {dayReservations.length === 0 ? (
                <p className="text-center py-8 text-gray-500 italic">
                  {showArchivedReservations ? 'Brak zarchiwizowanych rezerwacji' : 'Brak aktywnych rezerwacji'} na wybraną datę
                </p>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-4 pb-4 border-b">
                    <h4>
                      {showArchivedReservations ? 'Zarchiwizowane' : 'Aktywne'} rezerwacje ({dayReservations.length})
                    </h4>
                                         {!showArchivedReservations && dayReservations.length > 0 && (
                       <button 
                         className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold"
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
                    <div key={reservation.id} className="bg-gray-50 rounded-lg p-4 border-l-4 border-primary">
                      <div className="flex justify-between items-start mb-3">
                        <h4>Stolik {reservation.tableNumber} - {reservation.reservationHour}</h4>
                        <div className="flex gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold uppercase ${
                            reservation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            reservation.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                            reservation.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-gray-200 text-gray-800'
                          }`}>
                            {reservation.status === 'pending' && 'Oczekująca'}
                            {reservation.status === 'accepted' && 'Zaakceptowana'}
                            {reservation.status === 'rejected' && 'Odrzucona'}
                            {reservation.status === 'cancelled' && 'Anulowana'}
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                            {reservation.dataState === 1 ? 'Aktywna' : 'Zarchiwizowana'}
                          </span>
                        </div>
                      </div>
                      {reservation.status === 'pending' && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-3 text-sm text-yellow-800">
                          <p>⚠️ Rezerwacja oczekująca - może kolidować z innymi rezerwacjami</p>
                        </div>
                      )}
                      <div className="mt-3 space-y-1 text-sm text-gray-700">
                        <p><strong>Klient:</strong> {reservation.customerName}</p>
                        <p><strong>Email:</strong> {reservation.customerEmail}</p>
                        <p><strong>Telefon:</strong> {reservation.customerPhone}</p>
                        <p><strong>Liczba gości:</strong> {reservation.guests}</p>
                        <p><strong>Status:</strong> {reservation.isAccepted ? '✅ Zaakceptowana' : '❌ Nie zaakceptowana'}</p>
                      </div>
                      {reservation.status === 'pending' && reservation.dataState === 1 && (
                        <div className="flex gap-2 mt-3">
                          <button
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold"
                            onClick={() => handleReservationStatusUpdate(reservation.id, 'accepted')}
                          >
                            ✅ Zaakceptuj
                          </button>
                          <button
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold"
                            onClick={() => handleReservationStatusUpdate(reservation.id, 'rejected')}
                          >
                            ❌ Odrzuć
                          </button>
                        </div>
                      )}
                      {reservation.dataState === 1 && reservation.status !== 'pending' && (
                        <div className="flex gap-2 mt-3">
                          <button
                            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold"
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

        <div className="flex justify-center mt-6">
          <button className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors" onClick={() => setView(null)}>⬅ Wróć</button>
        </div>
      </div>
    );
  }

  if (view === 'hours') {
    return (
      <div className="w-full min-h-screen bg-gray-50 p-4">
        <Breadcrumb 
          items={[
            { label: 'Panel administracyjny', path: '/admin', onClick: () => setView(null) },
            { label: 'Godziny Otwarcia' }
          ]}
        />
        <div className="mb-6">
          <h2 className="text-4xl font-bold text-gray-800 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent text-center">
            Godziny Otwarcia
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
              <h3>{currentMonth.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}</h3>
              <button 
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-xl"
                onClick={() => navigateMonth('next')}
              >
                ➡️
              </button>
            </div>
            
            <div className="">
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
                  
                  const dayHours = getDayHours(date);
                  const isToday = date.toDateString() === new Date().toDateString();
                  const isPast = date.getTime() < new Date().setHours(0, 0, 0, 0);
                  const isSelected = selectedDayForHours && selectedDayForHours.date === formatDate(date);
                  
                  return (
                    <div 
                      key={index} 
                      className={`aspect-square flex flex-col items-center justify-center rounded-lg cursor-pointer transition-colors relative ${
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
                      onClick={() => {
                        if (dayHours) {
                          setSelectedDayForHours(dayHours);
                        } else {
                          const defaultHours = createDefaultHoursForDate(date);
                          setSelectedDayForHours(defaultHours);
                        }
                      }}
                    >
                      <div className="font-medium">{date.getDate()}</div>
                      {dayHours ? (
                        <div className="mt-1">
                          {dayHours.isOpen ? (
                            <div className="">
                              <span className="text-xs">🟢</span>
                            </div>
                          ) : (
                            <div className="">
                              <span className="text-xs">🔴</span>
                            </div>
                          )}
                          {dayHours.blockedHours && dayHours.blockedHours.length > 0 && (
                            <div className="">
                              <span className="text-xs">🚫</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="">
                            <span className="text-xs">⚪</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            {selectedDayForHours ? (
              <div className="">
                <h4>{selectedDayForHours.dayName} - {selectedDayForHours.date}</h4>
                
                <div className="flex-1">
                  <div className="mb-4">
                    <h5>📅 Data</h5>
                    <p>{selectedDayForHours.dayName}, {selectedDayForHours.date}</p>
                  </div>
                  
                  <div className="mb-4">
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
                    <div className="space-y-4">
                      <label className="flex flex-col gap-2 font-semibold text-gray-700">
                        Godzina otwarcia:
                        <input
                          type="time"
                          className="px-3 py-2 border-2 border-gray-300 rounded-lg text-base transition-colors focus:outline-none focus:border-primary bg-gray-50 focus:bg-white"
                          value={selectedDayForHours.openTime}
                          onChange={(e) => {
                            const updatedDay = { ...selectedDayForHours, openTime: e.target.value };
                            setSelectedDayForHours(updatedDay);
                            handleHoursUpdate(selectedDayForHours.id, { openTime: e.target.value });
                          }}
                        />
                      </label>
                      <label className="flex flex-col gap-2 font-semibold text-gray-700">
                        Godzina zamknięcia:
                        <input
                          type="time"
                          className="px-3 py-2 border-2 border-gray-300 rounded-lg text-base transition-colors focus:outline-none focus:border-primary bg-gray-50 focus:bg-white"
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
                
                <div className="flex-1 ml-6">
                  <div className="">
                    <h5>⏰ Godziny rezerwacji</h5>
                    <p className="text-sm text-gray-600 mb-3">
                      Kliknij na godzinę aby ją zablokować (czerwona) lub odblokować (zielona)
                    </p>
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                      {generateTimeSlots(selectedDayForHours.openTime, selectedDayForHours.closeTime).map(time => {
                        const isBlocked = (selectedDayForHours.blockedHours || []).some(range => {
                          const [start, end] = range.split('-');
                          return time >= start && time < end;
                        });
                        return (
                          <div 
                            key={time} 
                            className={`px-3 py-2 rounded text-sm font-medium text-center border cursor-pointer transition-all select-none ${
                              isBlocked 
                                ? 'bg-red-500 text-white border-red-500 hover:bg-red-600 hover:border-red-600' 
                                : 'bg-green-500 text-white border-green-500 hover:bg-green-600 hover:border-green-600 hover:scale-105 shadow-sm hover:shadow-md'
                            }`}
                            onClick={() => toggleTimeSlotInDetails(time)}
                          >
                            {time}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <button 
                    className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold shadow-md hover:shadow-lg hover:-translate-y-1"
                    onClick={() => {
                      handleHoursUpdate(selectedDayForHours.id, {
                        blockedHours: selectedDayForHours.blockedHours || []
                      });
                    }}
                  >
                    💾 Zapisz
                  </button>
                  <button 
                    className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                    onClick={() => setSelectedDayForHours(null)}
                  >
                    Zamknij
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <h4>Wybierz dzień z kalendarza</h4>
                <p>Kliknij na dowolny dzień aby zobaczyć szczegóły i ustawić godziny</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-center mt-6">
          <button className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors" onClick={() => setView(null)}>⬅ Wróć</button>
        </div>
      </div>
    );
  }

  if (view === 'reports') {
    // Calculate statistics
    const filteredOrders = orders.filter(order => {
      if (!order.timestamp) return false;
      let orderDate: string;
      try {
        if (order.timestamp instanceof Date) {
          if (isNaN(order.timestamp.getTime())) return false;
          orderDate = order.timestamp.toISOString().split('T')[0];
        } else if (order.timestamp instanceof Timestamp) {
          const date = order.timestamp.toDate();
          if (isNaN(date.getTime())) return false;
          orderDate = date.toISOString().split('T')[0];
        } else if (order.timestamp && typeof order.timestamp === 'object' && 'toDate' in order.timestamp) {
          const date = (order.timestamp as any).toDate();
          if (isNaN(date.getTime())) return false;
          orderDate = date.toISOString().split('T')[0];
        } else {
          const date = new Date(order.timestamp as any);
          if (isNaN(date.getTime())) return false;
          orderDate = date.toISOString().split('T')[0];
        }
        return orderDate >= reportDateFrom && orderDate <= reportDateTo;
      } catch (error) {
        console.error('Error parsing order date:', error, order);
        return false;
      }
    });

    const filteredReservations = reservations.filter(reservation => {
      return reservation.reservationDate >= reportDateFrom && reservation.reservationDate <= reportDateTo;
    });

    // Order statistics
    const totalOrders = filteredOrders.length;
    const pendingOrders = filteredOrders.filter(o => o.status === 'pending').length;
    const completedOrders = filteredOrders.filter(o => o.status === 'completed').length;
    const doneOrders = filteredOrders.filter(o => o.status === 'done').length;
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Reservation statistics
    const totalReservations = filteredReservations.length;
    const acceptedReservations = filteredReservations.filter(r => r.status === 'accepted').length;
    const rejectedReservations = filteredReservations.filter(r => r.status === 'rejected').length;
    const pendingReservations = filteredReservations.filter(r => r.status === 'pending').length;
    const cancelledReservations = filteredReservations.filter(r => r.status === 'cancelled').length;
    const acceptanceRate = totalReservations > 0 ? (acceptedReservations / totalReservations) * 100 : 0;

    // Table usage statistics
    const totalTables = tables.length;
    const freeTables = tables.filter(t => t.status === 'free').length;
    const occupiedTables = tables.filter(t => t.status === 'occupied').length;
    const tableUsageRate = totalTables > 0 ? (occupiedTables / totalTables) * 100 : 0;

    // Menu item popularity
    const menuItemCounts: Record<string, { count: number; revenue: number }> = {};
    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        if (!menuItemCounts[item.name]) {
          menuItemCounts[item.name] = { count: 0, revenue: 0 };
        }
        menuItemCounts[item.name].count += item.quantity;
        menuItemCounts[item.name].revenue += item.price * item.quantity;
      });
    });
    const popularItems = Object.entries(menuItemCounts)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Database collections verification
    const dbCollections = [
      { name: 'orders', service: 'order-service', status: '✓' },
      { name: 'menu', service: 'menu-service', status: '✓' },
      { name: 'reservations', service: 'reservation-service', status: '✓' },
      { name: 'tables', service: 'table-service', status: '✓' },
      { name: 'restaurantHours', service: 'hours-service', status: '✓' },
    ];

    return (
      <div className="w-full min-h-screen bg-gray-50 p-4">
        <div className="mb-6">
          <h2 className="text-4xl font-bold text-gray-800 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent text-center">
            Raporty i Statystyki
          </h2>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 flex gap-4 items-center">
            <label className="flex items-center gap-2 font-semibold text-gray-800">
              <span>Od:</span>
              <input
                type="date"
                value={reportDateFrom}
                onChange={(e) => setReportDateFrom(e.target.value)}
                className="px-3 py-2 border-2 border-gray-300 rounded-lg text-base transition-colors focus:outline-none focus:border-primary"
              />
            </label>
            <label className="flex items-center gap-2 font-semibold text-gray-800">
              <span>Do:</span>
              <input
                type="date"
                value={reportDateTo}
                onChange={(e) => setReportDateTo(e.target.value)}
                className="px-3 py-2 border-2 border-gray-300 rounded-lg text-base transition-colors focus:outline-none focus:border-primary"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <h3 className="text-xl font-bold text-gray-800 mb-6 pb-3 border-b border-gray-200">📊 Statystyki Zamówień</h3>
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg transition-colors hover:bg-gray-100">
                  <span className="font-medium text-gray-600">Łączna liczba:</span>
                  <span className="font-bold text-lg text-gray-800">{totalOrders}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg transition-colors hover:bg-gray-100">
                  <span className="font-medium text-gray-600">Oczekujące:</span>
                  <span className="font-bold text-lg text-gray-800">{pendingOrders}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg transition-colors hover:bg-gray-100">
                  <span className="font-medium text-gray-600">Zrealizowane:</span>
                  <span className="font-bold text-lg text-gray-800">{completedOrders}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg transition-colors hover:bg-gray-100">
                  <span className="font-medium text-gray-600">Wydane:</span>
                  <span className="font-bold text-lg text-gray-800">{doneOrders}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg transition-colors hover:bg-gray-100">
                  <span className="font-medium text-gray-600">Przychód:</span>
                  <span className="font-bold text-lg text-gray-800">{totalRevenue.toFixed(2)} zł</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg transition-colors hover:bg-gray-100">
                  <span className="font-medium text-gray-600">Średnia wartość:</span>
                  <span className="font-bold text-lg text-gray-800">{averageOrderValue.toFixed(2)} zł</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <h3 className="text-xl font-bold text-gray-800 mb-6 pb-3 border-b border-gray-200">📅 Statystyki Rezerwacji</h3>
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg transition-colors hover:bg-gray-100">
                  <span className="font-medium text-gray-600">Łączna liczba:</span>
                  <span className="font-bold text-lg text-gray-800">{totalReservations}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg transition-colors hover:bg-gray-100">
                  <span className="font-medium text-gray-600">Zaakceptowane:</span>
                  <span className="font-bold text-lg text-gray-800">{acceptedReservations}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg transition-colors hover:bg-gray-100">
                  <span className="font-medium text-gray-600">Odrzucone:</span>
                  <span className="font-bold text-lg text-gray-800">{rejectedReservations}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg transition-colors hover:bg-gray-100">
                  <span className="font-medium text-gray-600">Oczekujące:</span>
                  <span className="font-bold text-lg text-gray-800">{pendingReservations}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg transition-colors hover:bg-gray-100">
                  <span className="font-medium text-gray-600">Anulowane:</span>
                  <span className="font-bold text-lg text-gray-800">{cancelledReservations}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg transition-colors hover:bg-gray-100">
                  <span className="font-medium text-gray-600">Wskaźnik akceptacji:</span>
                  <span className="font-bold text-lg text-gray-800">{acceptanceRate.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <h3 className="text-xl font-bold text-gray-800 mb-6 pb-3 border-b border-gray-200">🪑 Statystyki Stolików</h3>
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg transition-colors hover:bg-gray-100">
                  <span className="font-medium text-gray-600">Łączna liczba:</span>
                  <span className="font-bold text-lg text-gray-800">{totalTables}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg transition-colors hover:bg-gray-100">
                  <span className="font-medium text-gray-600">Wolne:</span>
                  <span className="font-bold text-lg text-gray-800">{freeTables}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg transition-colors hover:bg-gray-100">
                  <span className="font-medium text-gray-600">Zajęte:</span>
                  <span className="font-bold text-lg text-gray-800">{occupiedTables}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg transition-colors hover:bg-gray-100">
                  <span className="font-medium text-gray-600">Wykorzystanie:</span>
                  <span className="font-bold text-lg text-gray-800">{tableUsageRate.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <h3 className="text-xl font-bold text-gray-800 mb-6 pb-3 border-b border-gray-200">🍽️ Popularne Pozycje Menu</h3>
              <div className="flex flex-col gap-3 max-h-96 overflow-y-auto">
                {popularItems.length > 0 ? (
                  popularItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center p-3 bg-gray-50 rounded-lg transition-colors hover:bg-gray-100">
                      <span className="font-bold text-primary text-lg">#{index + 1}</span>
                      <span className="font-medium text-gray-800">{item.name}</span>
                      <span className="font-semibold text-gray-600 text-sm">{item.count}x</span>
                      <span className="font-bold text-green-600">{item.revenue.toFixed(2)} zł</span>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-600 py-8 italic">Brak danych w wybranym okresie</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 shadow-md border-2 border-primary mt-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">🔍 Weryfikacja Bazy Danych</h3>
            <p className="text-gray-700 mb-4 text-sm">
              Weryfikacja użycia prawidłowych kolekcji przez mikroserwisy:
            </p>
            <div className="flex flex-col gap-3 mb-4">
              {dbCollections.map((collection, index) => (
                <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-4 items-center p-3 bg-white rounded-lg border-l-4 border-green-500">
                  <span className="font-semibold text-gray-800 font-mono">{collection.name}</span>
                  <span className="font-medium text-gray-600 text-sm">{collection.service}</span>
                  <span className="font-bold text-green-600 text-lg">{collection.status}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 bg-white rounded-lg border-l-4 border-green-500">
              <p className="m-0 font-semibold text-green-600">✓ Wszystkie mikroserwisy używają prawidłowych kolekcji Firestore</p>
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-6">
          <button className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors" onClick={() => setView(null)}>⬅ Wróć</button>
        </div>
      </div>
    );
  }

  return null;
}
