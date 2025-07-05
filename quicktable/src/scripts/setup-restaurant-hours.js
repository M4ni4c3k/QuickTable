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
 * Output the configuration and setup instructions
 * Provides JSON data and step-by-step Firebase setup guide
 */
console.log('Default restaurant hours configuration:');
console.log(JSON.stringify(defaultHours, null, 2));
console.log('\nTo set up these hours in Firebase:');
console.log('1. Go to your Firebase Console');
console.log('2. Navigate to Firestore Database');
console.log('3. Create a collection called "restaurantHours"');
console.log('4. Add documents with the above data');
console.log('5. Or use the admin interface in your app to configure hours'); 