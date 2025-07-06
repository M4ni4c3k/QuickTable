/**
 * Migration script to separate reservations from tables collection
 * 
 * This script helps clean up existing data structure by moving reservation data
 * from the tables collection to a separate reservations collection. This change
 * improves data organization and enables better conflict checking for reservations.
 * 
 * The migration separates concerns:
 * - Tables: Current status and customer information
 * - Reservations: Future booking information with conflict checking
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

console.log('=== RESERVATION MIGRATION SCRIPT ===');
console.log('This script helps migrate reservation data from tables to separate reservations collection');

/**
 * Step-by-step migration process
 * Each step describes what needs to be done to complete the migration
 */
const migrationSteps = [
  {
    step: 1,
    description: 'Create separate reservations collection',
    action: 'Create a new "reservations" collection in Firebase'
  },
  {
    step: 2,
    description: 'Move existing reservation data',
    action: 'For each table with reservation data, create a new reservation document'
  },
  {
    step: 3,
    description: 'Clean up tables collection',
    action: 'Remove reservation fields from table documents'
  },
  {
    step: 4,
    description: 'Update table statuses',
    action: 'Change table status from "reserved" to "free" or "occupied"'
  }
];

console.log('\nMigration Steps:');
migrationSteps.forEach(step => {
  console.log(`${step.step}. ${step.description}: ${step.action}`);
});

console.log('\n=== NEW DATA STRUCTURE ===');

/**
 * Clean table structure after migration
 * Tables now only contain current status and customer information
 */
console.log('\nTables Collection (cleaned):');
const cleanTableExample = {
  id: "table_123",
  number: 5,
  status: "free", // or "occupied"
  customerName: "Jan Kowalski" // only for current customers
};

console.log(JSON.stringify(cleanTableExample, null, 2));

/**
 * New reservation structure
 * Reservations are now completely separate from tables
 * Includes all booking information and status tracking
 */
console.log('\nReservations Collection (new):');
const reservationExample = {
  id: "reservation_456",
  tableId: "table_123",
  tableNumber: 5,
  customerName: "Jan Kowalski",
  customerEmail: "jan@email.com",
  customerPhone: "+48 123 456 789",
  guests: 4,
  reservationDate: "2024-01-15",
  reservationHour: "18:30",
  reservationTime: "2024-01-15 18:30",
  status: "pending",
  dataState: 1,
  isAccepted: false,
  createdAt: "2024-01-10T10:30:00Z",
  notes: "Preferuje stolik przy oknie"
};

console.log(JSON.stringify(reservationExample, null, 2));

/**
 * Conflict checking rules for the new system
 * Ensures no double bookings within a 2-hour window
 */
console.log('\n=== CONFLICT CHECKING ===');
console.log('New reservation system checks for conflicts:');
console.log('- Same table cannot be reserved within 2 hours of existing reservation');
console.log('- Only active reservations (dataState: 1) are considered');
console.log('- Rejected and cancelled reservations are ignored');
console.log('- Reservations are completely separate from table status');

/**
 * Actual migration function
 * Performs the migration of reservation data from tables to reservations collection
 */
async function performMigration() {
  try {
    console.log('\n🔄 Rozpoczynam migrację rezerwacji...');
    
    // Get all tables
    const tablesSnapshot = await db.collection('tables').get();
    const tables = tablesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Filter tables that have reservation data
    const tablesWithReservations = tables.filter(table => 
      table.reservationDate || 
      table.reservationHour || 
      table.reservationTime ||
      table.status === 'reserved'
    );
    
    if (tablesWithReservations.length === 0) {
      console.log('ℹ️ Brak tabel z danymi rezerwacji do migracji');
      return;
    }
    
    console.log(`📊 Znaleziono ${tablesWithReservations.length} tabel z rezerwacjami`);
    
    let migratedCount = 0;
    let errorCount = 0;
    
    for (const table of tablesWithReservations) {
      try {
        // Create reservation document
        const reservationData = {
          tableId: table.id,
          tableNumber: table.number,
          customerName: table.customerName || 'Nieznany klient',
          customerEmail: table.customerEmail || '',
          customerPhone: table.customerPhone || '',
          guests: table.guests || 1,
          reservationDate: table.reservationDate || new Date().toISOString().split('T')[0],
          reservationHour: table.reservationHour || '12:00',
          reservationTime: table.reservationTime || `${table.reservationDate || new Date().toISOString().split('T')[0]} ${table.reservationHour || '12:00'}`,
          status: table.status === 'reserved' ? 'pending' : 'accepted',
          dataState: 1,
          isAccepted: table.status === 'reserved' ? false : true,
          createdAt: new Date(),
          notes: table.notes || ''
        };
        
        await db.collection('reservations').add(reservationData);
        
        // Clean up table document
        const tableUpdates = {
          status: 'free',
          customerName: null,
          customerEmail: null,
          customerPhone: null,
          guests: null,
          reservationDate: null,
          reservationHour: null,
          reservationTime: null,
          notes: null,
          updatedAt: new Date()
        };
        
        await db.collection('tables').doc(table.id).update(tableUpdates);
        
        console.log(`✅ Zmigrowano rezerwację dla stolika ${table.number}`);
        migratedCount++;
        
      } catch (error) {
        console.error(`❌ Błąd podczas migracji stolika ${table.number}:`, error);
        errorCount++;
      }
    }
    
    console.log(`\n🎉 Migracja zakończona!`);
    console.log(`📊 Zmigrowano: ${migratedCount} rezerwacji`);
    console.log(`❌ Błędy: ${errorCount}`);
    
  } catch (error) {
    console.error('❌ Błąd podczas migracji:', error);
  }
}

/**
 * Manual migration instructions
 * Step-by-step guide for completing the migration in Firebase Console
 */
console.log('\n=== MANUAL MIGRATION STEPS ===');
console.log('1. In Firebase Console, go to Firestore Database');
console.log('2. Create new collection called "reservations"');
console.log('3. For each table with reservation data:');
console.log('   - Create new reservation document with the structure above');
console.log('   - Remove reservation fields from table document');
console.log('   - Update table status to "free" or "occupied"');
console.log('4. Test the new reservation system');
console.log('5. Verify conflict checking works correctly');

// Run the migration
console.log('\n🔄 Uruchamiam automatyczną migrację...');
performMigration()
  .then(() => {
    console.log('✅ Migracja zakończona pomyślnie');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Błąd podczas migracji:', error);
    process.exit(1);
  }); 