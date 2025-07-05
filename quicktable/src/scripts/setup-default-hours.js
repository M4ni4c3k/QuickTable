/**
 * Setup script for default restaurant hours
 * 
 * This script defines the default operating hours for the restaurant:
 * - Monday-Friday: 10:00-22:00
 * - Saturday-Sunday: 11:00-01:00 (next day)
 * 
 * The script generates time slots at 30-minute intervals for reservation booking.
 * These hours can be configured through the admin interface after initial setup.
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, addDoc, updateDoc, doc } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "quicktable-XXXXX.firebaseapp.com",
  projectId: "quicktable-XXXXX",
  storageBucket: "quicktable-XXXXX.appspot.com",
  messagingSenderId: "XXXXXXXXXXXX",
  appId: "1:XXXXXXXXXXXX:web:XXXXXXXXXXXXXXXXXXXXXXXX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Default hours for each day of the week
const defaultHours = [
  { dayOfWeek: 0, dayName: 'Niedziela', isOpen: true, openTime: '11:00', closeTime: '01:00' },
  { dayOfWeek: 1, dayName: 'Poniedziałek', isOpen: true, openTime: '10:00', closeTime: '22:00' },
  { dayOfWeek: 2, dayName: 'Wtorek', isOpen: true, openTime: '10:00', closeTime: '22:00' },
  { dayOfWeek: 3, dayName: 'Środa', isOpen: true, openTime: '10:00', closeTime: '22:00' },
  { dayOfWeek: 4, dayName: 'Czwartek', isOpen: true, openTime: '10:00', closeTime: '22:00' },
  { dayOfWeek: 5, dayName: 'Piątek', isOpen: true, openTime: '10:00', closeTime: '22:00' },
  { dayOfWeek: 6, dayName: 'Sobota', isOpen: true, openTime: '11:00', closeTime: '01:00' },
];

// Generate time slots for given hours
function generateTimeSlots(openTime, closeTime) {
  const slots = [];
  const [openHour, openMinute] = openTime.split(':').map(Number);
  const [closeHour, closeMinute] = closeTime.split(':').map(Number);
  
  let currentHour = openHour;
  let currentMinute = openMinute;
  
  while (
    currentHour < closeHour || 
    (currentHour === closeHour && currentMinute < closeMinute)
  ) {
    slots.push(`${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`);
    
    currentMinute += 30;
    if (currentMinute >= 60) {
      currentHour += 1;
      currentMinute = 0;
    }
  }
  
  return slots;
}

async function setupDefaultHours() {
  try {
    console.log('🔄 Rozpoczynam ustawianie domyślnych godzin restauracji...');
    
    // Get existing hours
    const hoursSnapshot = await getDocs(collection(db, 'restaurantHours'));
    const existingHours = hoursSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    let createdCount = 0;
    let updatedCount = 0;
    
    for (const defaultHour of defaultHours) {
      const existingHour = existingHours.find(h => h.dayOfWeek === defaultHour.dayOfWeek);
      
      if (existingHour) {
        // Update existing hours with missing fields
        const updates = {};
        let needsUpdate = false;
        
        if (!existingHour.hasOwnProperty('blockedHours')) {
          updates.blockedHours = [];
          needsUpdate = true;
        }
        
        if (!existingHour.hasOwnProperty('timeSlots')) {
          updates.timeSlots = generateTimeSlots(defaultHour.openTime, defaultHour.closeTime);
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          console.log(`📝 Aktualizuję godziny dla ${defaultHour.dayName}...`);
          await updateDoc(doc(db, 'restaurantHours', existingHour.id), updates);
          updatedCount++;
          console.log(`✅ Zaktualizowano: ${defaultHour.dayName}`);
        } else {
          console.log(`ℹ️ Pomijam ${defaultHour.dayName} - już skonfigurowane`);
        }
      } else {
        // Create new hours
        console.log(`📝 Tworzę godziny dla ${defaultHour.dayName}...`);
        const timeSlots = generateTimeSlots(defaultHour.openTime, defaultHour.closeTime);
        
        await addDoc(collection(db, 'restaurantHours'), {
          ...defaultHour,
          timeSlots,
          blockedHours: [],
        });
        
        createdCount++;
        console.log(`✅ Utworzono: ${defaultHour.dayName}`);
      }
    }
    
    console.log(`\n🎉 Konfiguracja zakończona!`);
    console.log(`📊 Utworzono: ${createdCount} rekordów`);
    console.log(`📝 Zaktualizowano: ${updatedCount} rekordów`);
    
  } catch (error) {
    console.error('❌ Błąd podczas konfiguracji:', error);
  }
}

// Run the setup
setupDefaultHours()
  .then(() => {
    console.log('✅ Skrypt zakończony pomyślnie');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Błąd w skrypcie:', error);
    process.exit(1);
  }); 