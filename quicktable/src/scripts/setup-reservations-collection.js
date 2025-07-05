/**
 * Setup script for reservations collection with dataState and isAccepted fields
 * 
 * This script defines the new structure for the reservations collection that
 * separates reservation data from table data. The new structure includes:
 * - Enhanced status management with dataState and isAccepted fields
 * - Complete customer information
 * - Conflict checking capabilities
 * - Archive functionality for completed reservations
 */

/**
 * Example reservation document structure
 * Shows all required and optional fields for the reservations collection
 */
const reservationExample = {
  // Basic reservation info
  tableId: "table_document_id",
  tableNumber: 5,
  customerName: "Jan Kowalski",
  customerEmail: "jan.kowalski@email.com",
  customerPhone: "+48 123 456 789",
  guests: 4,
  
  // Date and time
  reservationDate: "2024-01-15",
  reservationHour: "18:30",
  reservationTime: "2024-01-15 18:30",
  
  // Status management (like orders)
  status: "pending", // "pending" | "accepted" | "rejected" | "cancelled"
  dataState: 1, // 1 = active, 2 = archived (same as orders)
  isAccepted: false, // boolean for quick status check
  
  // Metadata
  createdAt: "2024-01-10T10:30:00Z", // serverTimestamp()
  notes: "Preferuje stolik przy oknie" // optional
};

console.log('New Reservation Collection Structure:');
console.log(JSON.stringify(reservationExample, null, 2));

/**
 * DataState field explanation
 * Used to separate active from archived reservations
 */
console.log('\nDataState Values:');
console.log('- dataState: 1 = Active reservation (pending/accepted)');
console.log('- dataState: 2 = Archived reservation (rejected/cancelled/completed)');

/**
 * Status field explanation
 * Tracks the current state of the reservation
 */
console.log('\nStatus Values:');
console.log('- status: "pending" = Waiting for acceptance');
console.log('- status: "accepted" = Accepted by restaurant');
console.log('- status: "rejected" = Rejected by restaurant');
console.log('- status: "cancelled" = Cancelled by customer');

/**
 * IsAccepted boolean field explanation
 * Provides quick status check for UI and filtering
 */
console.log('\nIsAccepted Boolean:');
console.log('- isAccepted: true = Restaurant has accepted');
console.log('- isAccepted: false = Not yet accepted or rejected');

/**
 * Setup instructions for Firebase
 * Step-by-step guide for creating the reservations collection
 */
console.log('\nTo set up in Firebase:');
console.log('1. Create collection "reservations"');
console.log('2. Add documents with the above structure');
console.log('3. Use the admin interface to manage reservations');
console.log('4. Active reservations (dataState: 1) will be shown by default');
console.log('5. Archived reservations (dataState: 2) can be viewed with toggle'); 