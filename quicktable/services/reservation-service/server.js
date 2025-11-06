import express from 'express';
import cors from 'cors';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;

// Initialize Firebase Admin
const serviceAccountPath = process.env.SERVICE_ACCOUNT_PATH || 
  join(__dirname, '../../serviceAccountKey.json');
let db;

try {
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
  db = getFirestore();
  console.log('✅ Reservation Service: Firebase Admin initialized');
} catch (error) {
  console.error('❌ Reservation Service: Failed to initialize Firebase:', error);
  process.exit(1);
}

// Get next auto-incrementing ID
async function getNextId() {
  try {
    const reservationsRef = db.collection('reservations');
    const snapshot = await reservationsRef.orderBy('id', 'desc').limit(1).get();
    
    if (snapshot.empty) {
      return 1;
    }
    
    const lastDoc = snapshot.docs[0];
    const lastId = lastDoc.data().id;
    return typeof lastId === 'number' ? lastId + 1 : 1;
  } catch (error) {
    console.error('Error getting next ID:', error);
    return 1;
  }
}

// Check for conflicts (2-hour window)
function hasConflict(newReservation, existingReservations) {
  const newStart = new Date(`${newReservation.reservationDate}T${newReservation.reservationHour}`);
  const newEnd = new Date(newStart.getTime() + (2 * 60 * 60 * 1000)); // +2 hours
  
  return existingReservations.some(reservation => {
    if (reservation.status !== 'accepted' && reservation.status !== 'pending') {
      return false;
    }
    
    const resStart = new Date(`${reservation.reservationDate}T${reservation.reservationHour}`);
    const resEnd = new Date(resStart.getTime() + (2 * 60 * 60 * 1000));
    
    return (
      (newStart >= resStart && newStart < resEnd) ||
      (newEnd > resStart && newEnd <= resEnd) ||
      (newStart <= resStart && newEnd >= resEnd)
    );
  });
}

// GET /reservations - Get all reservations
app.get('/reservations', async (req, res) => {
  try {
    const { tableId, date, status, dataState } = req.query;
    let query = db.collection('reservations');
    
    if (tableId) query = query.where('tableId', '==', tableId);
    if (date) query = query.where('reservationDate', '==', date);
    if (status) query = query.where('status', '==', status);
    if (dataState) query = query.where('dataState', '==', parseInt(dataState));
    
    const snapshot = await query.get();
    const reservations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(reservations);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({ error: 'Failed to fetch reservations' });
  }
});

// GET /reservations/:id - Get single reservation
app.get('/reservations/:id', async (req, res) => {
  try {
    const doc = await db.collection('reservations').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error fetching reservation:', error);
    res.status(500).json({ error: 'Failed to fetch reservation' });
  }
});

// GET /reservations/availability/check - Check availability
app.get('/reservations/availability/check', async (req, res) => {
  try {
    const { tableId, date, time } = req.query;
    
    if (!tableId || !date || !time) {
      return res.status(400).json({ error: 'Missing required fields: tableId, date, time' });
    }
    
    // Get existing reservations for this table and date
    const reservationsSnapshot = await db.collection('reservations')
      .where('tableId', '==', tableId)
      .where('reservationDate', '==', date)
      .where('dataState', '==', 1)
      .get();
    
    const existingReservations = reservationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    const newReservation = { reservationDate: date, reservationHour: time };
    const conflict = hasConflict(newReservation, existingReservations);
    
    res.json({
      available: !conflict,
      hasConflict: conflict,
      conflictingReservations: conflict ? existingReservations.filter(r => {
        const resStart = new Date(`${r.reservationDate}T${r.reservationHour}`);
        const resEnd = new Date(resStart.getTime() + (2 * 60 * 60 * 1000));
        const newStart = new Date(`${date}T${time}`);
        const newEnd = new Date(newStart.getTime() + (2 * 60 * 60 * 1000));
        return (
          (newStart >= resStart && newStart < resEnd) ||
          (newEnd > resStart && newEnd <= resEnd) ||
          (newStart <= resStart && newEnd >= resEnd)
        );
      }) : []
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({ error: 'Failed to check availability' });
  }
});

// Check if restaurant is open on given date
async function isRestaurantOpen(date) {
  try {
    // Check hours service for this specific date
    const hoursResponse = await fetch(`http://localhost:3005/hours?date=${date}`);
    if (!hoursResponse.ok) {
      console.error('Failed to check restaurant hours:', hoursResponse.statusText);
      return true; // Default to open if check fails
    }
    
    const hours = await hoursResponse.json();
    
    // If no hours entry exists, default to open (backward compatibility)
    if (!hours || hours.length === 0) {
      return true;
    }
    
    // Get the hours entry for this date
    const dayHours = hours.find(h => h.date === date) || hours[0];
    
    // Check if restaurant is open
    return dayHours.isOpen === true;
  } catch (error) {
    console.error('Error checking restaurant hours:', error);
    return true; // Default to open if check fails
  }
}

// POST /reservations - Create new reservation
app.post('/reservations', async (req, res) => {
  try {
    const { tableId, tableNumber, customerName, customerEmail, customerPhone, 
            guests, reservationDate, reservationHour, notes } = req.body;
    
    if (!tableId || !tableNumber || !customerName || !customerEmail || !customerPhone || 
        !reservationDate || !reservationHour) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if restaurant is open on the chosen date
    const restaurantOpen = await isRestaurantOpen(reservationDate);
    if (!restaurantOpen) {
      return res.status(400).json({ error: 'Restauracja jest zamknięta w wybranym dniu' });
    }
    
    // Check availability
    const reservationsSnapshot = await db.collection('reservations')
      .where('tableId', '==', tableId)
      .where('reservationDate', '==', reservationDate)
      .where('dataState', '==', 1)
      .get();
    
    const existingReservations = reservationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    const newReservation = { reservationDate, reservationHour };
    if (hasConflict(newReservation, existingReservations.filter(r => r.status === 'accepted'))) {
      return res.status(409).json({ error: 'Time slot conflicts with existing reservation' });
    }
    
    const nextId = await getNextId();
    const reservationDateTime = `${reservationDate} ${reservationHour}`;
    
    const reservationData = {
      id: nextId,
      tableId,
      tableNumber,
      customerName,
      customerEmail,
      customerPhone,
      guests: guests || 2,
      reservationDate,
      reservationHour,
      reservationTime: reservationDateTime,
      status: 'pending',
      dataState: 1,
      isAccepted: false,
      notes: notes || '',
      createdAt: new Date()
    };
    
    const docRef = await db.collection('reservations').add(reservationData);
    
    // Emit real-time event
    try {
      await fetch('http://localhost:3007/events/reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId: docRef.id, action: 'create', data: { id: docRef.id, ...reservationData } })
      }).catch(() => {});
    } catch (e) {}
    
    res.status(201).json({ id: docRef.id, ...reservationData });
  } catch (error) {
    console.error('Error creating reservation:', error);
    res.status(500).json({ error: 'Failed to create reservation' });
  }
});

// PATCH /reservations/:id - Update reservation
app.patch('/reservations/:id', async (req, res) => {
  try {
    const updateData = { ...req.body };
    delete updateData.id;
    
    updateData.updatedAt = new Date();
    
    if (updateData.status === 'accepted') {
      updateData.isAccepted = true;
    } else if (updateData.status === 'rejected' || updateData.status === 'cancelled') {
      updateData.isAccepted = false;
    }
    
    await db.collection('reservations').doc(req.params.id).update(updateData);
    
    // Emit real-time event
    try {
      await fetch('http://localhost:3007/events/reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId: req.params.id, action: 'update', data: updateData })
      }).catch(() => {});
    } catch (e) {}
    
    const updatedDoc = await db.collection('reservations').doc(req.params.id).get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    console.error('Error updating reservation:', error);
    res.status(500).json({ error: 'Failed to update reservation' });
  }
});

// PATCH /reservations/:id/status - Update reservation status
app.patch('/reservations/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['pending', 'accepted', 'rejected', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const updateData = {
      status,
      isAccepted: status === 'accepted',
      updatedAt: new Date()
    };
    
    await db.collection('reservations').doc(req.params.id).update(updateData);
    
    // Emit real-time event
    try {
      await fetch('http://localhost:3007/events/reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId: req.params.id, action: 'update', data: updateData })
      }).catch(() => {});
    } catch (e) {}
    
    const updatedDoc = await db.collection('reservations').doc(req.params.id).get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    console.error('Error updating reservation status:', error);
    res.status(500).json({ error: 'Failed to update reservation status' });
  }
});

// DELETE /reservations/:id - Archive reservation
app.delete('/reservations/:id', async (req, res) => {
  try {
    await db.collection('reservations').doc(req.params.id).update({
      dataState: 2,
      updatedAt: new Date()
    });
    
    res.json({ message: 'Reservation archived successfully' });
  } catch (error) {
    console.error('Error archiving reservation:', error);
    res.status(500).json({ error: 'Failed to archive reservation' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'reservation-service' });
});

app.listen(PORT, () => {
  console.log(`🚀 Reservation Service running on port ${PORT}`);
});

