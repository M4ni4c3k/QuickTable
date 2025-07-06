import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load service account key
const serviceAccountPath = join(process.cwd(), 'serviceAccountKey.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

// Initialize Firebase Admin
initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const db = getFirestore();

/**
 * Setup script for auto-incrementing IDs
 * 
 * This script adds sequential numeric IDs to existing documents
 * that don't have them, ensuring proper ordering and unique identification.
 */

async function setupAutoIncrementIds() {
  try {
    console.log('🔄 Rozpoczynam ustawianie auto-incrementing IDs...');
    
    const collections = ['menu', 'orders', 'reservations', 'restaurantHours', 'tables'];
    
    for (const collectionName of collections) {
      console.log(`\n📝 Przetwarzam kolekcję: ${collectionName}`);
      
      // Get all documents in the collection
      const snapshot = await db.collection(collectionName).get();
      
      if (snapshot.empty) {
        console.log(`ℹ️ Kolekcja ${collectionName} jest pusta`);
        continue;
      }
      
      let updatedCount = 0;
      let idCounter = 1;
      
      // Sort documents by creation time if available, otherwise by document ID
      const docs = snapshot.docs.sort((a, b) => {
        const aData = a.data();
        const bData = b.data();
        
        // If both have createdAt timestamps, sort by them
        if (aData.createdAt && bData.createdAt) {
          return aData.createdAt.toMillis() - bData.createdAt.toMillis();
        }
        
        // Otherwise sort by document ID
        return a.id.localeCompare(b.id);
      });
      
      for (const docSnapshot of docs) {
        const data = docSnapshot.data();
        
        // Check if document already has a numeric ID
        if (data.id && typeof data.id === 'number') {
          console.log(`ℹ️ Dokument ${docSnapshot.id} już ma ID: ${data.id}`);
          idCounter = Math.max(idCounter, data.id + 1);
          continue;
        }
        
        // Add numeric ID to document
        console.log(`📝 Dodaję ID ${idCounter} do dokumentu ${docSnapshot.id}`);
        
        await db.collection(collectionName).doc(docSnapshot.id).update({
          id: idCounter,
          updatedAt: new Date()
        });
        
        updatedCount++;
        idCounter++;
      }
      
      console.log(`✅ Zaktualizowano ${updatedCount} dokumentów w kolekcji ${collectionName}`);
    }
    
    console.log('\n🎉 Konfiguracja auto-incrementing IDs zakończona!');
    console.log('📊 Wszystkie dokumenty mają teraz unikalne numeryczne ID');
    
  } catch (error) {
    console.error('❌ Błąd podczas konfiguracji:', error);
  }
}

// Run the setup
setupAutoIncrementIds()
  .then(() => {
    console.log('✅ Skrypt zakończony pomyślnie');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Błąd w skrypcie:', error);
    process.exit(1);
  }); 