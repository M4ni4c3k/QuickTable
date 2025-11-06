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

const PORT = process.env.PORT || 3004;

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
  console.log('✅ Menu Service: Firebase Admin initialized');
} catch (error) {
  console.error('❌ Menu Service: Failed to initialize Firebase:', error);
  process.exit(1);
}

// Get next auto-incrementing ID
async function getNextId() {
  try {
    const menuRef = db.collection('menu');
    const snapshot = await menuRef.get();
    
    if (snapshot.empty) {
      return 1;
    }
    
    // Find the highest numeric ID
    let maxId = 0;
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.id) {
        const idNum = typeof data.id === 'string' ? parseInt(data.id, 10) : data.id;
        if (!isNaN(idNum) && idNum > maxId) {
          maxId = idNum;
        }
      }
    });
    
    return maxId > 0 ? maxId + 1 : 1;
  } catch (error) {
    console.error('Error getting next ID:', error);
    // Fallback: count documents and add 1
    try {
      const snapshot = await db.collection('menu').get();
      return snapshot.size + 1;
    } catch (fallbackError) {
      return 1;
    }
  }
}

// GET /menu - Get all menu items
app.get('/menu', async (req, res) => {
  try {
    const snapshot = await db.collection('menu').get();
    const menuItems = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(menuItems);
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// GET /menu/:id - Get single menu item
app.get('/menu/:id', async (req, res) => {
  try {
    const doc = await db.collection('menu').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error fetching menu item:', error);
    res.status(500).json({ error: 'Failed to fetch menu item' });
  }
});

// POST /menu - Create new menu item
app.post('/menu', async (req, res) => {
  try {
    const { name, price, ingredients } = req.body;
    
    if (!name || price === undefined || !ingredients) {
      return res.status(400).json({ error: 'Missing required fields: name, price, ingredients' });
    }
    
    if (price <= 0) {
      return res.status(400).json({ error: 'Price must be greater than 0' });
    }
    
    if (!Array.isArray(ingredients)) {
      return res.status(400).json({ error: 'Ingredients must be an array' });
    }
    
    const nextId = await getNextId();
    
    const menuItemData = {
      id: nextId.toString(),
      name,
      price: parseFloat(price),
      ingredients,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await db.collection('menu').add(menuItemData);
    
    // Emit real-time event
    try {
      await fetch('http://localhost:3007/events/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuItemId: docRef.id, action: 'create', data: { id: docRef.id, ...menuItemData } })
      }).catch(() => {});
    } catch (e) {}
    
    res.status(201).json({ id: docRef.id, ...menuItemData });
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({ error: 'Failed to create menu item' });
  }
});

// PATCH /menu/:id - Update menu item
app.patch('/menu/:id', async (req, res) => {
  try {
    const { name, price, ingredients } = req.body;
    const updateData = { updatedAt: new Date() };
    
    if (name !== undefined) updateData.name = name;
    if (price !== undefined) {
      if (price <= 0) {
        return res.status(400).json({ error: 'Price must be greater than 0' });
      }
      updateData.price = parseFloat(price);
    }
    if (ingredients !== undefined) {
      if (!Array.isArray(ingredients)) {
        return res.status(400).json({ error: 'Ingredients must be an array' });
      }
      updateData.ingredients = ingredients;
    }
    
    await db.collection('menu').doc(req.params.id).update(updateData);
    
    // Emit real-time event
    try {
      await fetch('http://localhost:3007/events/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuItemId: req.params.id, action: 'update', data: updateData })
      }).catch(() => {});
    } catch (e) {}
    
    const updatedDoc = await db.collection('menu').doc(req.params.id).get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

// DELETE /menu/:id - Delete menu item
app.delete('/menu/:id', async (req, res) => {
  try {
    await db.collection('menu').doc(req.params.id).delete();
    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'menu-service' });
});

app.listen(PORT, () => {
  console.log(`🚀 Menu Service running on port ${PORT}`);
});

