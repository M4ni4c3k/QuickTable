import express from 'express';
import cors from 'cors';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

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
  console.log('✅ Order Service: Firebase Admin initialized');
} catch (error) {
  console.error('❌ Order Service: Failed to initialize Firebase:', error);
  process.exit(1);
}

// Get next auto-incrementing ID
async function getNextId() {
  try {
    const ordersRef = db.collection('orders');
    const snapshot = await ordersRef.orderBy('id', 'desc').limit(1).get();
    
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

// Calculate order total
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

// GET /orders - Get all orders
app.get('/orders', async (req, res) => {
  try {
    const { status, tableId, dataState } = req.query;
    let query = db.collection('orders');
    
    if (status) query = query.where('status', '==', status);
    if (tableId) query = query.where('tableId', '==', tableId);
    if (dataState) query = query.where('dataState', '==', parseInt(dataState));
    
    const snapshot = await query.get();
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /orders/:id - Get single order
app.get('/orders/:id', async (req, res) => {
  try {
    const doc = await db.collection('orders').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// POST /orders - Create new order
app.post('/orders', async (req, res) => {
  try {
    const { tableId, items, waiterName } = req.body;
    
    if (!tableId || !items || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields: tableId, items' });
    }
    
    const nextId = await getNextId();
    const total = calculateTotal(items);
    
    const orderData = {
      id: nextId,
      tableId,
      items,
      total,
      status: 'pending',
      waiterName: waiterName || '',
      dataState: 1,
      timestamp: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await db.collection('orders').add(orderData);
    
    // Emit real-time event
    try {
      await fetch('http://localhost:3007/events/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: docRef.id, action: 'create', data: { id: docRef.id, ...orderData } })
      }).catch(() => {}); // Ignore errors if real-time service is down
    } catch (e) {}
    
    res.status(201).json({ id: docRef.id, ...orderData });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// PATCH /orders/:id - Update order
app.patch('/orders/:id', async (req, res) => {
  try {
    const { status, items, waiterName } = req.body;
    const updateData = { updatedAt: new Date() };
    
    if (status) updateData.status = status;
    if (items) {
      updateData.items = items;
      updateData.total = calculateTotal(items);
    }
    if (waiterName !== undefined) updateData.waiterName = waiterName;
    
    await db.collection('orders').doc(req.params.id).update(updateData);
    
    // Emit real-time event
    try {
      await fetch('http://localhost:3007/events/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: req.params.id, action: 'update', data: updateData })
      }).catch(() => {});
    } catch (e) {}
    
    const updatedDoc = await db.collection('orders').doc(req.params.id).get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// PATCH /orders/:id/status - Update order status
app.patch('/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['pending', 'completed', 'done'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    await db.collection('orders').doc(req.params.id).update({
      status,
      updatedAt: new Date()
    });
    
    const updatedDoc = await db.collection('orders').doc(req.params.id).get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// DELETE /orders/:id - Archive order (soft delete)
app.delete('/orders/:id', async (req, res) => {
  try {
    await db.collection('orders').doc(req.params.id).update({
      dataState: 2,
      updatedAt: new Date()
    });
    
    res.json({ message: 'Order archived successfully' });
  } catch (error) {
    console.error('Error archiving order:', error);
    res.status(500).json({ error: 'Failed to archive order' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'order-service' });
});

app.listen(PORT, () => {
  console.log(`🚀 Order Service running on port ${PORT}`);
});

