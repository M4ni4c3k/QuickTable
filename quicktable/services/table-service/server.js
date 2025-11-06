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

const PORT = process.env.PORT || 3003;

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
  console.log('✅ Table Service: Firebase Admin initialized');
} catch (error) {
  console.error('❌ Table Service: Failed to initialize Firebase:', error);
  process.exit(1);
}

// GET /tables - Get all tables
app.get('/tables', async (req, res) => {
  try {
    const { status } = req.query;
    let query = db.collection('tables');
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    const snapshot = await query.get();
    const tables = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(tables);
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
});

// GET /tables/:id - Get single table
app.get('/tables/:id', async (req, res) => {
  try {
    const doc = await db.collection('tables').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Table not found' });
    }
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error fetching table:', error);
    res.status(500).json({ error: 'Failed to fetch table' });
  }
});

// POST /tables - Create new table
app.post('/tables', async (req, res) => {
  try {
    const { number } = req.body;
    
    if (!number) {
      return res.status(400).json({ error: 'Missing required field: number' });
    }
    
    // Check if table number already exists
    const existingSnapshot = await db.collection('tables')
      .where('number', '==', number)
      .get();
    
    if (!existingSnapshot.empty) {
      return res.status(409).json({ error: 'Table number already exists' });
    }
    
    const tableData = {
      number,
      status: 'free',
      customerName: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await db.collection('tables').add(tableData);
    
    res.status(201).json({ id: docRef.id, ...tableData });
  } catch (error) {
    console.error('Error creating table:', error);
    res.status(500).json({ error: 'Failed to create table' });
  }
});

// PATCH /tables/:id - Update table
app.patch('/tables/:id', async (req, res) => {
  try {
    const { status, customerName, number } = req.body;
    const updateData = { updatedAt: new Date() };
    
    if (status !== undefined) {
      if (!['free', 'occupied'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be "free" or "occupied"' });
      }
      updateData.status = status;
    }
    
    if (customerName !== undefined) {
      updateData.customerName = customerName || null;
    }
    
    if (number !== undefined) {
      // Check if new number already exists
      const existingSnapshot = await db.collection('tables')
        .where('number', '==', number)
        .get();
      
      const existingTable = existingSnapshot.docs.find(doc => doc.id !== req.params.id);
      if (existingTable) {
        return res.status(409).json({ error: 'Table number already exists' });
      }
      
      updateData.number = number;
    }
    
    await db.collection('tables').doc(req.params.id).update(updateData);
    
    // Emit real-time event
    try {
      await fetch('http://localhost:3007/events/table', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId: req.params.id, action: 'update', data: updateData })
      }).catch(() => {});
    } catch (e) {}
    
    const updatedDoc = await db.collection('tables').doc(req.params.id).get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    console.error('Error updating table:', error);
    res.status(500).json({ error: 'Failed to update table' });
  }
});

// PATCH /tables/:id/status - Update table status
app.patch('/tables/:id/status', async (req, res) => {
  try {
    const { status, customerName } = req.body;
    
    if (!['free', 'occupied'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const updateData = {
      status,
      updatedAt: new Date()
    };
    
    if (customerName !== undefined) {
      updateData.customerName = customerName || null;
    }
    
    await db.collection('tables').doc(req.params.id).update(updateData);
    
    // Emit real-time event
    try {
      await fetch('http://localhost:3007/events/table', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId: req.params.id, action: 'update', data: updateData })
      }).catch(() => {});
    } catch (e) {}
    
    const updatedDoc = await db.collection('tables').doc(req.params.id).get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    console.error('Error updating table status:', error);
    res.status(500).json({ error: 'Failed to update table status' });
  }
});

// DELETE /tables/:id - Delete table
app.delete('/tables/:id', async (req, res) => {
  try {
    await db.collection('tables').doc(req.params.id).delete();
    res.json({ message: 'Table deleted successfully' });
  } catch (error) {
    console.error('Error deleting table:', error);
    res.status(500).json({ error: 'Failed to delete table' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'table-service' });
});

app.listen(PORT, () => {
  console.log(`🚀 Table Service running on port ${PORT}`);
});

