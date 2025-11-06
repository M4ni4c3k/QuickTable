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

const PORT = process.env.PORT || 3005;

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
  console.log('✅ Hours Service: Firebase Admin initialized');
} catch (error) {
  console.error('❌ Hours Service: Failed to initialize Firebase:', error);
  process.exit(1);
}

// Generate time slots for given hours
function generateTimeSlots(openTime, closeTime) {
  const slots = [];
  const [openHour, openMinute] = openTime.split(':').map(Number);
  const [closeHour, closeMinute] = closeTime.split(':').map(Number);
  
  let currentHour = openHour;
  let currentMinute = openMinute;
  
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
    
    if (isOvernight && currentHour === closeHour && currentMinute >= closeMinute) {
      break;
    }
  }
  
  return slots;
}

// Get next auto-incrementing ID
async function getNextId() {
  try {
    const hoursRef = db.collection('restaurantHours');
    const snapshot = await hoursRef.orderBy('id', 'desc').limit(1).get();
    
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

// GET /hours - Get all restaurant hours
app.get('/hours', async (req, res) => {
  try {
    const { date, dayOfWeek } = req.query;
    let query = db.collection('restaurantHours');
    
    if (date) query = query.where('date', '==', date);
    if (dayOfWeek !== undefined) query = query.where('dayOfWeek', '==', parseInt(dayOfWeek));
    
    const snapshot = await query.get();
    const hours = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(hours);
  } catch (error) {
    console.error('Error fetching restaurant hours:', error);
    res.status(500).json({ error: 'Failed to fetch restaurant hours' });
  }
});

// GET /hours/:id - Get single restaurant hours entry
app.get('/hours/:id', async (req, res) => {
  try {
    const doc = await db.collection('restaurantHours').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Restaurant hours not found' });
    }
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error fetching restaurant hours:', error);
    res.status(500).json({ error: 'Failed to fetch restaurant hours' });
  }
});

// POST /hours - Create new restaurant hours
app.post('/hours', async (req, res) => {
  try {
    const { date, dayName, dayOfWeek, isOpen, openTime, closeTime, blockedHours } = req.body;
    
    if (!date || isOpen === undefined) {
      return res.status(400).json({ error: 'Missing required fields: date, isOpen' });
    }
    
    // Check if hours entry already exists for this date
    const existingSnapshot = await db.collection('restaurantHours')
      .where('date', '==', date)
      .get();
    
    if (!existingSnapshot.empty) {
      return res.status(409).json({ error: 'Restaurant hours already exist for this date. Use PATCH to update.' });
    }
    
    const nextId = await getNextId();
    
    // For closed days, use empty time slots
    const timeSlots = isOpen ? generateTimeSlots(openTime || '10:00', closeTime || '22:00') : [];
    
    const hoursData = {
      id: nextId.toString(),
      date,
      dayName: dayName || '',
      dayOfWeek: dayOfWeek !== undefined ? dayOfWeek : null,
      isOpen,
      openTime: isOpen ? (openTime || '10:00') : '00:00',
      closeTime: isOpen ? (closeTime || '22:00') : '00:00',
      timeSlots,
      blockedHours: blockedHours || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await db.collection('restaurantHours').add(hoursData);
    
    res.status(201).json({ id: docRef.id, ...hoursData });
  } catch (error) {
    console.error('Error creating restaurant hours:', error);
    res.status(500).json({ error: 'Failed to create restaurant hours' });
  }
});

// PATCH /hours/:id - Update restaurant hours
app.patch('/hours/:id', async (req, res) => {
  try {
    const { isOpen, openTime, closeTime, blockedHours, dayName } = req.body;
    const updateData = { updatedAt: new Date() };
    
    // Get current document to check current state
    const currentDoc = await db.collection('restaurantHours').doc(req.params.id).get();
    if (!currentDoc.exists) {
      return res.status(404).json({ error: 'Restaurant hours not found' });
    }
    const currentData = currentDoc.data();
    
    if (isOpen !== undefined) updateData.isOpen = isOpen;
    if (openTime !== undefined) updateData.openTime = openTime;
    if (closeTime !== undefined) updateData.closeTime = closeTime;
    if (dayName !== undefined) updateData.dayName = dayName;
    if (blockedHours !== undefined) {
      if (!Array.isArray(blockedHours)) {
        return res.status(400).json({ error: 'blockedHours must be an array' });
      }
      updateData.blockedHours = blockedHours;
    }
    
    // Regenerate time slots based on isOpen status
    const finalIsOpen = isOpen !== undefined ? isOpen : currentData.isOpen;
    const finalOpenTime = openTime !== undefined ? openTime : currentData.openTime;
    const finalCloseTime = closeTime !== undefined ? closeTime : currentData.closeTime;
    
    if (finalIsOpen) {
      // If open, generate time slots
      updateData.timeSlots = generateTimeSlots(finalOpenTime, finalCloseTime);
    } else {
      // If closed, set empty time slots
      updateData.timeSlots = [];
      updateData.openTime = '00:00';
      updateData.closeTime = '00:00';
    }
    
    await db.collection('restaurantHours').doc(req.params.id).update(updateData);
    
    const updatedDoc = await db.collection('restaurantHours').doc(req.params.id).get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    console.error('Error updating restaurant hours:', error);
    res.status(500).json({ error: 'Failed to update restaurant hours' });
  }
});

// PATCH /hours/:id/blocked - Update blocked hours
app.patch('/hours/:id/blocked', async (req, res) => {
  try {
    const { blockedHours } = req.body;
    
    if (!Array.isArray(blockedHours)) {
      return res.status(400).json({ error: 'blockedHours must be an array' });
    }
    
    await db.collection('restaurantHours').doc(req.params.id).update({
      blockedHours,
      updatedAt: new Date()
    });
    
    const updatedDoc = await db.collection('restaurantHours').doc(req.params.id).get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    console.error('Error updating blocked hours:', error);
    res.status(500).json({ error: 'Failed to update blocked hours' });
  }
});

// DELETE /hours/:id - Delete restaurant hours
app.delete('/hours/:id', async (req, res) => {
  try {
    await db.collection('restaurantHours').doc(req.params.id).delete();
    res.json({ message: 'Restaurant hours deleted successfully' });
  } catch (error) {
    console.error('Error deleting restaurant hours:', error);
    res.status(500).json({ error: 'Failed to delete restaurant hours' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'hours-service' });
});

app.listen(PORT, () => {
  console.log(`🚀 Hours Service running on port ${PORT}`);
});

