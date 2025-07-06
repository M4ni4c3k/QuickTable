/**
 * Setup script for initial restaurant hours
 * 
 * This script provides a basic configuration for restaurant operating hours.
 * It can be run in your browser console or as a Node.js script with Firebase admin SDK.
 * 
 * The script defines:
 * - Operating hours for each day of the week
 * - Time slots at 30-minute intervals for reservation booking
 * - Basic schedule suitable for most restaurants
 */

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

/**
 * Default restaurant hours configuration
 * Each day includes dayOfWeek (0=Sunday, 1=Monday, etc.), dayName, and time slots
 * Time slots are generated at 30-minute intervals from open to close time
 */
const defaultHours = [
  {
    dayOfWeek: 0,
    dayName: 'Niedziela',
    isOpen: true,
    openTime: '10:00',
    closeTime: '21:00',
    timeSlots: ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30']
  },
  {
    dayOfWeek: 1,
    dayName: 'Poniedziałek',
    isOpen: true,
    openTime: '10:00',
    closeTime: '21:00',
    timeSlots: ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30']
  },
  {
    dayOfWeek: 2,
    dayName: 'Wtorek',
    isOpen: true,
    openTime: '10:00',
    closeTime: '21:00',
    timeSlots: ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30']
  },
  {
    dayOfWeek: 3,
    dayName: 'Środa',
    isOpen: true,
    openTime: '10:00',
    closeTime: '21:00',
    timeSlots: ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30']
  },
  {
    dayOfWeek: 4,
    dayName: 'Czwartek',
    isOpen: true,
    openTime: '10:00',
    closeTime: '21:00',
    timeSlots: ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30']
  },
  {
    dayOfWeek: 5,
    dayName: 'Piątek',
    isOpen: true,
    openTime: '10:00',
    closeTime: '22:00',
    timeSlots: ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30']
  },
  {
    dayOfWeek: 6,
    dayName: 'Sobota',
    isOpen: true,
    openTime: '10:00',
    closeTime: '22:00',
    timeSlots: ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30']
  }
];

/**
 * Setup function to create restaurant hours in database
 */
async function setupRestaurantHours() {
  try {
    console.log('🔄 Rozpoczynam ustawianie godzin restauracji...');
    
    // Get existing hours to avoid duplicates
    const existingSnapshot = await db.collection('restaurantHours').get();
    const existingHours = existingSnapshot.docs.map(doc => doc.data());
    
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const hourConfig of defaultHours) {
      // Check if this day already exists
      const existing = existingHours.find(h => h.dayOfWeek === hourConfig.dayOfWeek);
      
      if (existing) {
        console.log(`ℹ️ Pomijam ${hourConfig.dayName} - już istnieje`);
        skippedCount++;
        continue;
      }
      
      // Create new hours document
      console.log(`📝 Tworzę godziny dla ${hourConfig.dayName}...`);
      await db.collection('restaurantHours').add({
        ...hourConfig,
        createdAt: new Date()
      });
      
      createdCount++;
      console.log(`✅ Utworzono: ${hourConfig.dayName}`);
    }
    
    console.log(`\n🎉 Konfiguracja zakończona!`);
    console.log(`📊 Utworzono: ${createdCount} rekordów`);
    console.log(`⏭️ Pominięto: ${skippedCount} rekordów (już istnieją)`);
    
  } catch (error) {
    console.error('❌ Błąd podczas konfiguracji:', error);
  }
}

// Run the setup
setupRestaurantHours()
  .then(() => {
    console.log('✅ Skrypt zakończony pomyślnie');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Błąd w skrypcie:', error);
    process.exit(1);
  }); 