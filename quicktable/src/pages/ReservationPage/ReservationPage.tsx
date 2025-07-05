import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { useNavigate } from 'react-router-dom';
import styles from './ReservationPage.module.css';
import type { Table, Reservation, RestaurantHours } from '../../types/types';

export default function ReservationPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [guests, setGuests] = useState(2);
  const [tables, setTables] = useState<Table[]>([]);

  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [loading, setLoading] = useState(true);
  const [reservationSaved, setReservationSaved] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [restaurantHours, setRestaurantHours] = useState<RestaurantHours[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [tableReservations, setTableReservations] = useState<Reservation[]>([]);

  useEffect(() => {
    const fetchRestaurantHours = async () => {
      try {
        const hoursSnapshot = await getDocs(collection(db, 'restaurantHours'));
        const hours = hoursSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as RestaurantHours[];
        
        setRestaurantHours(hours);
      } catch (error) {
        console.error('Błąd podczas pobierania godzin otwarcia:', error);
        setAvailableTimeSlots(generateDefaultTimeSlots());
      }
    };

    fetchRestaurantHours();
  }, []);

  const generateDefaultTimeSlots = () => {
    const slots = [];
    for (let hour = 10; hour <= 21; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < 21) {
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
    }
    return slots;
  };



  const updateAvailableTimeSlots = (selectedDate: string) => {
    if (!selectedDate) return;

    const dayHours = restaurantHours.find(h => h.date === selectedDate);
    
    if (dayHours && dayHours.isOpen && dayHours.timeSlots.length > 0) {
      const blockedHours = dayHours.blockedHours || [];
      const availableSlots = dayHours.timeSlots.filter(slot => {
        return !blockedHours.some(blockedRange => {
          const [start, end] = blockedRange.split('-');
          return slot >= start && slot < end;
        });
      });
      setAvailableTimeSlots(availableSlots);
    } else {
      setAvailableTimeSlots(generateDefaultTimeSlots());
    }
  };

  const fetchTableReservations = async (tableId: string, date: string) => {
    try {
      const reservationsSnapshot = await getDocs(collection(db, 'reservations'));
      const allReservations = reservationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Reservation[];

      const tableReservations = allReservations.filter(reservation => 
        reservation.tableId === tableId && 
        reservation.reservationDate === date &&
        reservation.dataState === 1 &&
        reservation.status !== 'rejected' &&
        reservation.status !== 'cancelled'
      );

      setTableReservations(tableReservations);
    } catch (error) {
      console.error('Błąd podczas pobierania rezerwacji stolika:', error);
    }
  };

  const getReservationStatus = (timeSlot: string) => {
    const reservation = tableReservations.find(res => res.reservationHour === timeSlot);
    if (!reservation) return null;
    
    return {
      status: reservation.status,
      customerName: reservation.customerName,
      isAccepted: reservation.isAccepted
    };
  };

  const getBlockedHoursInfo = (selectedDate: string) => {
    const dayHours = restaurantHours.find(h => h.date === selectedDate);
    
    if (dayHours && dayHours.blockedHours && dayHours.blockedHours.length > 0) {
      return dayHours.blockedHours;
    }
    return [];
  };



  const hasPendingConflict = (timeSlot: string) => {
    const selectedDateTime = new Date(`${selectedDate}T${timeSlot}`);
    const endDateTime = new Date(selectedDateTime.getTime() + (2 * 60 * 60 * 1000)); // +2 hours

    return tableReservations.some(reservation => {
      if (reservation.status !== 'pending') return false;
      
      const reservationDateTime = new Date(`${reservation.reservationDate}T${reservation.reservationHour}`);
      const reservationEndTime = new Date(reservationDateTime.getTime() + (2 * 60 * 60 * 1000));

      // Check for overlap
      return (
        (selectedDateTime >= reservationDateTime && selectedDateTime < reservationEndTime) ||
        (endDateTime > reservationDateTime && endDateTime <= reservationEndTime) ||
        (selectedDateTime <= reservationDateTime && endDateTime >= reservationEndTime)
      );
    });
  };

  const isTimeSlotBlocked = (timeSlot: string) => {
    if (!tableReservations.length) return false;

    const selectedDateTime = new Date(`${selectedDate}T${timeSlot}`);
    const endDateTime = new Date(selectedDateTime.getTime() + (2 * 60 * 60 * 1000)); // +2 hours

    return tableReservations.some(reservation => {
      // Only block if reservation is accepted
      if (reservation.status !== 'accepted') return false;
      
      const reservationDateTime = new Date(`${reservation.reservationDate}T${reservation.reservationHour}`);
      const reservationEndTime = new Date(reservationDateTime.getTime() + (2 * 60 * 60 * 1000));

      // Check for overlap
      return (
        (selectedDateTime >= reservationDateTime && selectedDateTime < reservationEndTime) ||
        (endDateTime > reservationDateTime && endDateTime <= reservationEndTime) ||
        (selectedDateTime <= reservationDateTime && endDateTime >= reservationEndTime)
      );
    });
  };

  // Fetch all tables
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'tables'));
        const allTables = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Table[];

        setTables(allTables);
        setLoading(false);
      } catch (error) {
        console.error('Błąd podczas pobierania stolików:', error);
        setError('Nie udało się pobrać dostępnych stolików');
        setLoading(false);
      }
    };

    fetchTables();
  }, []);

  // Check availability when date or time changes
  useEffect(() => {
    if (selectedDate && selectedTime) {
      checkAvailability();
    }
  }, [selectedDate, selectedTime]);

  // Update time slots when date changes
  useEffect(() => {
    if (selectedDate) {
      updateAvailableTimeSlots(selectedDate);
    }
  }, [selectedDate, restaurantHours]);

  const checkAvailability = async () => {
    if (!selectedDate || !selectedTime) return;

    try {
      // Check for existing reservations in the reservations collection
      // const reservationsSnapshot = await getDocs(collection(db, 'reservations'));

      // Calculate time range (selected time + 2 hours)
      // const selectedDateTime = new Date(`${selectedDate}T${selectedTime}`);
      // const endDateTime = new Date(selectedDateTime.getTime() + (2 * 60 * 60 * 1000)); // +2 hours

      // Filter out tables that have conflicting reservations
      // const filteredTables = tables.filter(table => {
      //   // Check if this table has any active reservations that conflict
      //   const conflictingReservation = existingReservations.find(reservation => 
      //     reservation.tableId === table.id && 
      //     reservation.dataState === 1 && // Only check active reservations
      //     reservation.status !== 'rejected' && // Ignore rejected reservations
      //     reservation.status !== 'cancelled' && // Ignore cancelled reservations
      //     reservation.reservationDate === selectedDate
      //   );
      //
      //   if (!conflictingReservation) return true;
      //
      //   // Check if the reservation time conflicts with our 2-hour window
      //   const reservationDateTime = new Date(`${conflictingReservation.reservationDate}T${conflictingReservation.reservationHour}`);
      //   const reservationEndTime = new Date(reservationDateTime.getTime() + (2 * 60 * 60 * 1000));
      //
      //   // Check for overlap
      //   const hasConflict = (
      //     (selectedDateTime >= reservationDateTime && selectedDateTime < reservationEndTime) ||
      //     (endDateTime > reservationDateTime && endDateTime <= reservationEndTime) ||
      //     (selectedDateTime <= reservationDateTime && endDateTime >= reservationEndTime)
      //   );
      //
      //   return !hasConflict;
      // });

      
    } catch (error) {
      console.error('Błąd podczas sprawdzania dostępności:', error);
      setError('Nie udało się sprawdzić dostępności stolików');
    }
  };

  const handlePersonalInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !phone) {
      setError('Proszę wypełnić wszystkie pola kontaktowe');
      return;
    }

    setError('');
    setCurrentStep(2);
  };

  const handleDateTableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedTable) {
      setError('Proszę wybrać datę i stolik');
      return;
    }

    // Fetch reservations for the selected table and date
    fetchTableReservations(selectedTable.id, selectedDate);
    
    setError('');
    setCurrentStep(3);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTable) {
      setError('Proszę wybrać stolik');
      return;
    }

    try {
      const reservationDateTime = `${selectedDate} ${selectedTime}`;
      
      // Create a new reservation document
      const reservationData = {
        tableId: selectedTable.id,
        tableNumber: selectedTable.number,
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        guests: guests,
        reservationDate: selectedDate,
        reservationHour: selectedTime,
        reservationTime: reservationDateTime,
        status: 'pending',
        dataState: 1, // Active reservation
        isAccepted: false, // Not accepted yet
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'reservations'), reservationData);

      setReservationSaved(true);
      setError('');
    } catch (error) {
      console.error('Błąd przy zapisie rezerwacji:', error);
      setError('Nie udało się zapisać rezerwacji. Spróbuj ponownie.');
    }
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30); // Allow reservations up to 30 days in advance
    return maxDate.toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <div className={styles.reservationPage}>
        <div className={styles.loadingMessage}>
          <p>Ładowanie dostępnych stolików...</p>
        </div>
      </div>
    );
  }

  if (reservationSaved) {
    return (
      <div className={styles.reservationPage}>
        <div className={styles.successMessage}>
          <h3>✅ Rezerwacja została zapisana!</h3>
          <p>Dziękujemy za rezerwację stolika {selectedTable?.number}.</p>
          <p>Data: {selectedDate} o godzinie {selectedTime}</p>
          <p>Liczba gości: {guests}</p>
          <p>Potwierdzenie zostało wysłane na adres: {email}</p>
          <button className={styles.backButton} onClick={() => navigate('/')}>
            ⬅ Wróć do strony głównej
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.reservationPage}>
      <div className={styles.headerSection}>
        <h2>Rezerwacja Stolika</h2>
        <button className={styles.backButton} onClick={() => navigate('/')}>
          ⬅ Wróć do strony głównej
        </button>
      </div>

      {/* Step Indicator */}
      <div className={styles.stepIndicator}>
        <div className={`${styles.step} ${currentStep >= 1 ? styles.active : ''}`}>
          <span className={styles.stepNumber}>1</span>
          <span className={styles.stepLabel}>Dane kontaktowe</span>
        </div>
        <div className={`${styles.step} ${currentStep >= 2 ? styles.active : ''}`}>
          <span className={styles.stepNumber}>2</span>
          <span className={styles.stepLabel}>Data i stolik</span>
        </div>
        <div className={`${styles.step} ${currentStep >= 3 ? styles.active : ''}`}>
          <span className={styles.stepNumber}>3</span>
          <span className={styles.stepLabel}>Wybór godziny</span>
        </div>
      </div>

      {currentStep === 1 && (
        <form onSubmit={handlePersonalInfoSubmit} className={styles.reservationForm}>
          <div className={styles.formSection}>
            <h3>📋 Dane kontaktowe</h3>
            <div className={styles.formRow}>
              <label>
                Imię i nazwisko:
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Wprowadź swoje imię i nazwisko"
                />
              </label>
            </div>
            
            <div className={styles.formRow}>
              <label>
                Email:
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Wprowadź swój email"
                />
              </label>
            </div>
            
            <div className={styles.formRow}>
              <label>
                Telefon:
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="Wprowadź swój numer telefonu"
                />
              </label>
            </div>
          </div>

          {error && (
            <div className={styles.errorMessage}>
              <p>{error}</p>
            </div>
          )}

          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={!name || !email || !phone}
          >
            ➡️ Przejdź do wyboru daty i stolika
          </button>
        </form>
      )}

      {currentStep === 2 && (
        <form onSubmit={handleDateTableSubmit} className={styles.reservationForm}>
          <div className={styles.formSection}>
            <h3>📅 Szczegóły rezerwacji</h3>
            <div className={styles.formRow}>
              <label>
                Data:
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  required
                  min={getMinDate()}
                  max={getMaxDate()}
                />
              </label>
            </div>
            
            <div className={styles.formRow}>
              <label>
                Stolik:
                <select
                  value={selectedTable?.id || ''}
                  onChange={(e) => {
                    const table = tables.find(t => t.id === e.target.value);
                    setSelectedTable(table || null);
                  }}
                  required
                >
                  <option value="">-- Wybierz stolik --</option>
                  {tables.map((table) => (
                    <option key={table.id} value={table.id}>
                      Stolik {table.number}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            
            <div className={styles.formRow}>
              <label>
                Liczba gości:
                <select
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  required
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                    <option key={num} value={num}>
                      {num} {num === 1 ? 'osoba' : num < 5 ? 'osoby' : 'osób'}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {error && (
            <div className={styles.errorMessage}>
              <p>{error}</p>
            </div>
          )}

          <div className={styles.buttonGroup}>
            <button 
              type="button" 
              className={styles.backStepButton}
              onClick={() => setCurrentStep(1)}
            >
              ⬅️ Wstecz
            </button>
            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={!selectedDate || !selectedTable}
            >
              ➡️ Przejdź do wyboru godziny
            </button>
          </div>
        </form>
      )}

      {currentStep === 3 && (
        <form onSubmit={handleFinalSubmit} className={styles.reservationForm}>
          <div className={styles.formSection}>
            <h3>🕐 Wybór godziny rezerwacji</h3>
            <p className={styles.tableInfo}>
              Stolik {selectedTable?.number} - {selectedDate}
            </p>
            
            {tableReservations.length > 0 && (
              <div className={styles.existingReservations}>
                <h4>Istniejące rezerwacje na ten stolik:</h4>
                <div className={styles.reservationList}>
                  {tableReservations.map(reservation => (
                    <div key={reservation.id} className={styles.existingReservation}>
                      <span className={styles.reservationTime}>{reservation.reservationHour}</span>
                      <span className={styles.reservationStatus}>
                        {reservation.status === 'pending' && 'Oczekująca'}
                        {reservation.status === 'accepted' && 'Zaakceptowana'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.timeSelection}>
              <h4>Dostępne godziny:</h4>
              
              {getBlockedHoursInfo(selectedDate).length > 0 && (
                <div className={styles.blockedHoursInfo}>
                  <h5>🚫 Zablokowane godziny:</h5>
                  <div className={styles.blockedHoursList}>
                    {getBlockedHoursInfo(selectedDate).map((blockedRange, index) => (
                      <span key={index} className={styles.blockedRange}>
                        {blockedRange}
                      </span>
                    ))}
                  </div>
                  <p className={styles.blockedHoursNote}>
                    Te godziny są niedostępne do rezerwacji.
                  </p>
                </div>
              )}
              
              <div className={styles.timeSlotsGrid}>
                {availableTimeSlots.map((timeSlot) => {
                  const isBlocked = isTimeSlotBlocked(timeSlot);
                  const hasPending = hasPendingConflict(timeSlot);
                  const reservationStatus = getReservationStatus(timeSlot);
                  
                  return (
                    <button
                      key={timeSlot}
                      type="button"
                      className={`${styles.timeSlot} ${isBlocked ? styles.blocked : ''} ${hasPending ? styles.pending : ''} ${selectedTime === timeSlot ? styles.selected : ''}`}
                      onClick={() => !isBlocked && setSelectedTime(timeSlot)}
                      disabled={isBlocked}
                    >
                      {timeSlot}
                      {isBlocked && <span className={styles.blockedLabel}>Zajęte</span>}
                      {hasPending && !isBlocked && (
                        <span className={styles.pendingLabel}>Oczekująca</span>
                      )}
                      {reservationStatus && (
                        <span className={styles.reservationInfo}>
                          {reservationStatus.customerName}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              
              {hasPendingConflict(selectedTime) && (
                <div className={styles.pendingWarning}>
                  <p>⚠️ Uwaga: Istnieje oczekująca rezerwacja na ten czas. 
                  Twoja rezerwacja może nie zostać zaakceptowana jeśli tamta zostanie potwierdzona.</p>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className={styles.errorMessage}>
              <p>{error}</p>
            </div>
          )}

          <div className={styles.buttonGroup}>
            <button 
              type="button" 
              className={styles.backStepButton}
              onClick={() => setCurrentStep(2)}
            >
              ⬅️ Wstecz
            </button>
            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={!selectedTime}
            >
              🎯 Zarezerwuj stolik
            </button>
          </div>
        </form>
      )}
    </div>
  );
} 