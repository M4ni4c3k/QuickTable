const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc } = require('firebase/firestore');

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

async function updateRestaurantHoursWithBlockedHours() {
  try {
    console.log('🔄 Rozpoczynam aktualizację godzin restauracji...');
    
    // Get all restaurant hours
    const hoursSnapshot = await getDocs(collection(db, 'restaurantHours'));
    
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
        await updateDoc(doc(db, 'restaurantHours', hourDoc.id), {
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