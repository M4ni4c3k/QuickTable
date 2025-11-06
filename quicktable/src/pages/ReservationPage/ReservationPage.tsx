import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Table, Reservation, RestaurantHours } from '../../types/types';
import { reservationAPI, tableAPI, hoursAPI } from '../../utils/apiClient';
import Breadcrumb from '../../components/Breadcrumb/Breadcrumb';
import { useAuth } from '../../hooks/useAuth';

export default function ReservationPage() {
  const navigate = useNavigate();
  const { userData } = useAuth();
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
        const hours = await hoursAPI.getAll();
        setRestaurantHours(hours as RestaurantHours[]);
      } catch (error) {
        console.error('Błąd podczas pobierania godzin otwarcia:', error);
        setAvailableTimeSlots(generateDefaultTimeSlots());
      }
    };

    fetchRestaurantHours();
  }, []);

  useEffect(() => {
    if (userData) {
      if (userData.displayName) {
        setName(userData.displayName);
      }
      if (userData.email) {
        setEmail(userData.email);
      }
    }
  }, [userData]);

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
      const allReservations = await reservationAPI.getAll({ 
        tableId, 
        date,
        dataState: 1 
      });

      const tableReservations = (allReservations as Reservation[]).filter(reservation => 
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
        const allTables = await tableAPI.getAll();
        setTables(allTables as Table[]);
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

  // Update time slots when date changes and check if restaurant is open
  useEffect(() => {
    if (selectedDate) {
      const dayHours = restaurantHours.find(h => h.date === selectedDate);
      if (dayHours && !dayHours.isOpen) {
        setError('Restauracja jest zamknięta w wybranym dniu. Proszę wybrać inny termin.');
        setAvailableTimeSlots([]);
      } else {
        setError('');
        updateAvailableTimeSlots(selectedDate);
      }
    }
  }, [selectedDate, restaurantHours]);

  const checkAvailability = async () => {
    if (!selectedDate || !selectedTime) return;
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

  const handleDateTableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedTable) {
      setError('Proszę wybrać datę i stolik');
      return;
    }

    // Check if restaurant is open on selected date
    const dayHours = restaurantHours.find(h => h.date === selectedDate);
    if (dayHours && !dayHours.isOpen) {
      setError('Restauracja jest zamknięta w wybranym dniu. Proszę wybrać inny termin.');
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
      await reservationAPI.create({
        tableId: selectedTable.id,
        tableNumber: selectedTable.number,
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        guests: guests,
        reservationDate: selectedDate,
        reservationHour: selectedTime,
      });

      setReservationSaved(true);
      setError('');
    } catch (error: any) {
      console.error('Błąd przy zapisie rezerwacji:', error);
      setError(error.message || 'Nie udało się zapisać rezerwacji. Spróbuj ponownie.');
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
      <div className="w-full">
        <div className="text-center py-12">
          <p className="text-lg text-gray-600">Ładowanie dostępnych stolików...</p>
        </div>
      </div>
    );
  }

  if (reservationSaved) {
    return (
      <div className="w-full">
        <Breadcrumb 
          items={[
            { label: 'Strona główna', path: '/client' },
            { label: 'Rezerwacja', path: '/reservation' },
            { label: 'Potwierdzenie' }
          ]}
        />
        <div className="bg-green-100 border border-green-400 text-green-700 rounded-lg p-8 mb-6">
          <h3 className="text-2xl font-bold mb-4">✅ Rezerwacja została zapisana!</h3>
          <p className="mb-2">Dziękujemy za rezerwację stolika {selectedTable?.number}.</p>
          <p className="mb-2">Data: {selectedDate} o godzinie {selectedTime}</p>
          <p className="mb-2">Liczba gości: {guests}</p>
          <p>Potwierdzenie zostało wysłane na adres: {email}</p>
        </div>
        <div className="flex justify-center">
          <button 
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            onClick={() => navigate('/')}
          >
            ⬅ Wróć do strony głównej
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Breadcrumb 
        items={[
          { label: 'Strona główna', path: '/client' },
          { label: 'Rezerwacja', path: '/reservation' },
          ...(currentStep >= 2 ? [{ label: 'Wybór stolika' }] : []),
          ...(currentStep >= 3 ? [{ label: 'Wybór godziny' }] : [])
        ]}
      />
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Rezerwacja Stolika</h2>
      </div>

      {/* Step Indicator */}
      <div className="flex justify-between items-center mb-8 max-w-2xl">
        <div className={`flex flex-col items-center ${currentStep >= 1 ? 'text-primary' : 'text-gray-400'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${currentStep >= 1 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'}`}>
            1
          </div>
          <span className="mt-2 text-sm font-medium">Dane kontaktowe</span>
        </div>
        <div className={`flex flex-col items-center ${currentStep >= 2 ? 'text-primary' : 'text-gray-400'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${currentStep >= 2 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'}`}>
            2
          </div>
          <span className="mt-2 text-sm font-medium">Data i stolik</span>
        </div>
        <div className={`flex flex-col items-center ${currentStep >= 3 ? 'text-primary' : 'text-gray-400'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${currentStep >= 3 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'}`}>
            3
          </div>
          <span className="mt-2 text-sm font-medium">Wybór godziny</span>
        </div>
      </div>

      {currentStep === 1 && (
        <form onSubmit={handlePersonalInfoSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-4">📋 Dane kontaktowe</h3>
            <div className="space-y-4">
              <label className="block">
                <span className="block mb-2 font-semibold text-gray-700">Imię i nazwisko:</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Wprowadź swoje imię i nazwisko"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </label>
              
              <label className="block">
                <span className="block mb-2 font-semibold text-gray-700">Email:</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Wprowadź swój email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </label>
              
              <label className="block">
                <span className="block mb-2 font-semibold text-gray-700">Telefon:</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="Wprowadź swój numer telefonu"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </label>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              <p>{error}</p>
            </div>
          )}

          <button 
            type="submit" 
            className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!name || !email || !phone}
          >
            ➡️ Przejdź do wyboru daty i stolika
          </button>
        </form>
      )}

      {currentStep === 2 && (
        <form onSubmit={handleDateTableSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-4">📅 Szczegóły rezerwacji</h3>
            <div className="space-y-4">
              <label className="block">
                <span className="block mb-2 font-semibold text-gray-700">Data:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  required
                  min={getMinDate()}
                  max={getMaxDate()}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </label>
              
              <label className="block">
                <span className="block mb-2 font-semibold text-gray-700">Stolik:</span>
                <select
                  value={selectedTable?.id || ''}
                  onChange={(e) => {
                    const table = tables.find(t => t.id === e.target.value);
                    setSelectedTable(table || null);
                  }}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">-- Wybierz stolik --</option>
                  {tables.map((table) => (
                    <option key={table.id} value={table.id}>
                      Stolik {table.number}
                    </option>
                  ))}
                </select>
              </label>
              
              <label className="block">
                <span className="block mb-2 font-semibold text-gray-700">Liczba gości:</span>
                <select
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
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
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              <p>{error}</p>
            </div>
          )}

          <div className="flex gap-4">
            <button 
              type="button" 
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              onClick={() => setCurrentStep(1)}
            >
              ⬅️ Wstecz
            </button>
            <button 
              type="submit" 
              className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedDate || !selectedTable}
            >
              ➡️ Przejdź do wyboru godziny
            </button>
          </div>
        </form>
      )}

      {currentStep === 3 && (
        <form onSubmit={handleFinalSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-4">🕐 Wybór godziny rezerwacji</h3>
            <p className="mb-4 text-gray-600 font-medium">
              Stolik {selectedTable?.number} - {selectedDate}
            </p>
            
            {tableReservations.length > 0 && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-bold text-gray-800 mb-3">Istniejace rezerwacje na ten stolik:</h4>
                <div className="flex flex-wrap gap-2">
                  {tableReservations.map(reservation => (
                    <div key={reservation.id} className="px-3 py-1 bg-white rounded border border-gray-300">
                      <span className="font-medium">{reservation.reservationHour}</span>
                      <span className="ml-2 text-sm text-gray-600">
                        {reservation.status === 'pending' && 'Oczekująca'}
                        {reservation.status === 'accepted' && 'Zaakceptowana'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="font-bold text-gray-800 mb-3">Dostępne godziny:</h4>
              
              {getBlockedHoursInfo(selectedDate).length > 0 && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
                  <h5 className="font-bold text-yellow-800 mb-2">🚫 Zablokowane godziny:</h5>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {getBlockedHoursInfo(selectedDate).map((blockedRange, index) => (
                      <span key={index} className="px-2 py-1 bg-yellow-200 rounded text-yellow-800 text-sm">
                        {blockedRange}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-yellow-700">
                    Te godziny są niedostępne do rezerwacji.
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 mb-4">
                {availableTimeSlots.map((timeSlot) => {
                  const isBlocked = isTimeSlotBlocked(timeSlot);
                  const hasPending = hasPendingConflict(timeSlot);
                  const reservationStatus = getReservationStatus(timeSlot);
                  
                  return (
                    <button
                      key={timeSlot}
                      type="button"
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        isBlocked 
                          ? 'bg-red-100 text-red-700 cursor-not-allowed border border-red-300' 
                          : hasPending 
                          ? 'bg-yellow-100 text-yellow-700 border border-yellow-300 hover:bg-yellow-200' 
                          : selectedTime === timeSlot
                          ? 'bg-primary text-white border border-blue-600'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => !isBlocked && setSelectedTime(timeSlot)}
                      disabled={isBlocked}
                    >
                      <div className="text-center">
                        <div>{timeSlot}</div>
                        {isBlocked && <div className="text-xs mt-1">Zajęte</div>}
                        {hasPending && !isBlocked && <div className="text-xs mt-1">Oczekująca</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
              
              {hasPendingConflict(selectedTime) && (
                <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg mb-4">
                  <p>⚠️ Uwaga: Istnieje oczekująca rezerwacja na ten czas. 
                  Twoja rezerwacja może nie zostać zaakceptowana jeśli tamta zostanie potwierdzona.</p>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              <p>{error}</p>
            </div>
          )}

          <div className="flex gap-4">
            <button 
              type="button" 
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              onClick={() => setCurrentStep(2)}
            >
              ⬅️ Wstecz
            </button>
            <button 
              type="submit" 
              className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedTime}
            >
              🎯 Zarezerwuj stolik
            </button>
          </div>
        </form>
      )}

      <div className="flex justify-center">
        <button 
          className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          onClick={() => navigate('/')}
        >
          ⬅ Wróć do strony głównej
        </button>
      </div>
    </div>
  );
}
