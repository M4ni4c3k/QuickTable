import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

const serviceAccountPath = join(process.cwd(), 'serviceAccountKey.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const db = getFirestore();

// Default hours for each day of the week
const defaultHours = {
  0: { openTime: '11:00', closeTime: '01:00' }, // Sunday
  1: { openTime: '10:00', closeTime: '22:00' }, // Monday
  2: { openTime: '10:00', closeTime: '22:00' }, // Tuesday
  3: { openTime: '10:00', closeTime: '22:00' }, // Wednesday
  4: { openTime: '10:00', closeTime: '22:00' }, // Thursday
  5: { openTime: '10:00', closeTime: '22:00' }, // Friday
  6: { openTime: '11:00', closeTime: '01:00' }, // Saturday
};

// Day names for display
const dayNames = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];

// Generate time slots for given hours
function generateTimeSlots(openTime, closeTime) {
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
}

// Format date as YYYY-MM-DD
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

async function setupDateSpecificHours() {
  try {
    console.log('🔄 Rozpoczynam ustawianie godzin dla konkretnych dat...');
    
    // Get existing hours
    const hoursSnapshot = await db.collection('restaurantHours').get();
    const existingHours = hoursSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    let createdCount = 0;
    let updatedCount = 0;
    
    // Create hours for the next 30 days
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dateString = formatDate(date);
      const dayOfWeek = date.getDay();
      const dayName = dayNames[dayOfWeek];
      const hours = defaultHours[dayOfWeek];
      
      // Check if hours already exist for this date
      const existingHour = existingHours.find(h => h.date === dateString);
      
      if (existingHour) {
        // Update existing hours with missing fields
        const updates = {};
        let needsUpdate = false;
        
        if (!existingHour.hasOwnProperty('blockedHours')) {
          updates.blockedHours = [];
          needsUpdate = true;
        }
        
        if (!existingHour.hasOwnProperty('timeSlots')) {
          updates.timeSlots = generateTimeSlots(hours.openTime, hours.closeTime);
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          console.log(`📝 Aktualizuję godziny dla ${dateString} (${dayName})...`);
          await db.collection('restaurantHours').doc(existingHour.id).update(updates);
          updatedCount++;
          console.log(`✅ Zaktualizowano: ${dateString} (${dayName})`);
        } else {
          console.log(`ℹ️ Pomijam ${dateString} (${dayName}) - już skonfigurowane`);
        }
      } else {
        // Create new hours
        console.log(`📝 Tworzę godziny dla ${dateString} (${dayName})...`);
        const timeSlots = generateTimeSlots(hours.openTime, hours.closeTime);
        
        await db.collection('restaurantHours').add({
          date: dateString,
          dayName,
          isOpen: true,
          openTime: hours.openTime,
          closeTime: hours.closeTime,
          timeSlots,
          blockedHours: [],
        });
        
        createdCount++;
        console.log(`✅ Utworzono: ${dateString} (${dayName})`);
      }
    }
    
    console.log(`\n🎉 Konfiguracja zakończona!`);
    console.log(`📊 Utworzono: ${createdCount} rekordów`);
    console.log(`📝 Zaktualizowano: ${updatedCount} rekordów`);
    console.log(`📅 Zakres dat: ${formatDate(today)} - ${formatDate(new Date(today.getTime() + 29 * 24 * 60 * 60 * 1000))}`);
    
  } catch (error) {
    console.error('❌ Błąd podczas konfiguracji:', error);
  }
}

// Run the setup
setupDateSpecificHours()
  .then(() => {
    console.log('✅ Skrypt zakończony pomyślnie');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Błąd w skrypcie:', error);
    process.exit(1);
  }); 