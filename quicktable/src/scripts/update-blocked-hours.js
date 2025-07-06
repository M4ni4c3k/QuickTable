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

async function updateRestaurantHoursWithBlockedHours() {
  try {
    console.log('🔄 Rozpoczynam aktualizację godzin restauracji...');
    
    // Get all restaurant hours
    const hoursSnapshot = await db.collection('restaurantHours').get();
    
    if (hoursSnapshot.empty) {
      console.log('ℹ️ Brak godzin restauracji do aktualizacji');
      return;
    }
    
    let updatedCount = 0;
    
    for (const hourDoc of hoursSnapshot.docs) {
      const hourData = hourDoc.data();
      
      // Check if blockedHours field already exists
      if (!hourData.hasOwnProperty('blockedHours')) {
        console.log(`📝 Aktualizuję godziny dla ${hourData.dayName || `dzień ${hourData.dayOfWeek}`}...`);
        
        // Add blockedHours field with empty array
        await db.collection('restaurantHours').doc(hourDoc.id).update({
          blockedHours: []
        });
        
        updatedCount++;
        console.log(`✅ Zaktualizowano: ${hourData.dayName || `dzień ${hourData.dayOfWeek}`}`);
      } else {
        console.log(`ℹ️ Pomijam ${hourData.dayName || `dzień ${hourData.dayOfWeek}`} - już ma blockedHours`);
      }
    }
    
    console.log(`\n🎉 Aktualizacja zakończona! Zaktualizowano ${updatedCount} rekordów.`);
    
  } catch (error) {
    console.error('❌ Błąd podczas aktualizacji:', error);
  }
}

// Run the update
updateRestaurantHoursWithBlockedHours()
  .then(() => {
    console.log('✅ Skrypt zakończony pomyślnie');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Błąd w skrypcie:', error);
    process.exit(1);
  }); 