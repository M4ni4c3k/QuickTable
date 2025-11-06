import express from 'express';
import cors from 'cors';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
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

const PORT = process.env.PORT || 3008;

// Initialize Firebase Admin
const serviceAccountPath = process.env.SERVICE_ACCOUNT_PATH || 
  join(__dirname, '../../serviceAccountKey.json');
let auth, db;

try {
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
  auth = getAuth();
  db = getFirestore();
  console.log('✅ Auth Service: Firebase Admin initialized');
} catch (error) {
  console.error('❌ Auth Service: Failed to initialize Firebase:', error);
  process.exit(1);
}

// POST /auth/login - Login with email and password
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password, idToken } = req.body;

    // If idToken is provided (from Google Sign-In on client), verify it
    if (idToken) {
      try {
        const decodedToken = await auth.verifyIdToken(idToken);
        const user = await auth.getUser(decodedToken.uid);
        
        // Get user data from Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        let userData = null;
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          userData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || data.displayName || null,
            role: data.role || 'client',
            photoURL: user.photoURL || data.photoURL || null,
          };
        } else {
          // Create user document if it doesn't exist
          await db.collection('users').doc(user.uid).set({
            email: user.email,
            displayName: user.displayName,
            role: 'client',
            photoURL: user.photoURL,
            createdAt: new Date(),
          });
          
          userData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            role: 'client',
            photoURL: user.photoURL,
          };
        }
        
        // Create custom token for client-side use
        const customToken = await auth.createCustomToken(user.uid);
        
        return res.json({
          user: userData,
          token: customToken,
          idToken: idToken
        });
      } catch (error) {
        console.error('Error verifying Google token:', error);
        return res.status(401).json({ error: 'Invalid Google token' });
      }
    }

    // Email/password login - verify credentials
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Note: Firebase Admin doesn't support password verification directly
    // This requires client-side Firebase Auth SDK to verify password
    // We'll return a response indicating the client should use Firebase Auth SDK
    return res.status(400).json({ 
      error: 'Email/password login should be done client-side. Use idToken from Firebase Auth SDK.' 
    });
  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({ error: 'Failed to login', details: error.message });
  }
});

// POST /auth/register - Register new user
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, displayName, role = 'client' } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: displayName || email.split('@')[0],
    });

    // Create user document in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      email: userRecord.email,
      displayName: userRecord.displayName || displayName || email.split('@')[0],
      role: role,
      createdAt: new Date(),
    });

    // Create custom token
    const customToken = await auth.createCustomToken(userRecord.uid);

    const userData = {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      role: role,
      photoURL: null,
    };

    res.status(201).json({
      user: userData,
      token: customToken
    });
  } catch (error) {
    console.error('Error in register:', error);
    if (error.code === 'auth/email-already-in-use') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    res.status(500).json({ error: 'Failed to register', details: error.message });
  }
});

// POST /auth/verify-token - Verify Firebase ID token
app.post('/auth/verify-token', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'ID token is required' });
    }

    const decodedToken = await auth.verifyIdToken(idToken);
    const user = await auth.getUser(decodedToken.uid);

    // Get user data from Firestore
    const userDoc = await db.collection('users').doc(user.uid).get();
    let userData = null;

    if (userDoc.exists()) {
      const data = userDoc.data();
      userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || data.displayName || null,
        role: data.role || 'client',
        photoURL: user.photoURL || data.photoURL || null,
      };
    } else {
      // Default user data if document doesn't exist
      userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: 'client',
        photoURL: user.photoURL,
      };
    }

    res.json({ user: userData, valid: true });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(401).json({ error: 'Invalid token', valid: false });
  }
});

// GET /auth/user/:uid - Get user data
app.get('/auth/user/:uid', async (req, res) => {
  try {
    const { uid } = req.params;

    const user = await auth.getUser(uid);
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists()) {
      return res.status(404).json({ error: 'User not found' });
    }

    const data = userDoc.data();
    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || data.displayName || null,
      role: data.role || 'client',
      photoURL: user.photoURL || data.photoURL || null,
    };

    res.json(userData);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user', details: error.message });
  }
});

// PATCH /auth/user/:uid - Update user data
app.patch('/auth/user/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { displayName, role, photoURL } = req.body;

    const updateData = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (role !== undefined) updateData.role = role;
    if (photoURL !== undefined) updateData.photoURL = photoURL;
    updateData.updatedAt = new Date();

    await db.collection('users').doc(uid).update(updateData);

    // Update Firebase Auth if displayName changed
    if (displayName !== undefined) {
      await auth.updateUser(uid, { displayName });
    }

    const userDoc = await db.collection('users').doc(uid).get();
    const user = await auth.getUser(uid);
    const data = userDoc.data();

    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || data.displayName || null,
      role: data.role || 'client',
      photoURL: user.photoURL || data.photoURL || null,
    };

    res.json(userData);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user', details: error.message });
  }
});

// POST /auth/create-test-accounts - Create test accounts (admin only)
app.post('/auth/create-test-accounts', async (req, res) => {
  try {
    const testAccounts = [
      { email: 'admin@quicktable.com', password: '123', role: 'admin', displayName: 'Administrator' },
      { email: 'manager@quicktable.com', password: '123', role: 'manager', displayName: 'Menedżer' },
      { email: 'client@quicktable.com', password: '123', role: 'client', displayName: 'Klient' },
      { email: 'waiter@quicktable.com', password: '123', role: 'waiter', displayName: 'Kelner' },
      { email: 'kitchen@quicktable.com', password: '123', role: 'kitchen', displayName: 'Kuchnia' },
    ];

    const results = [];
    let created = 0;
    let skipped = 0;

    for (const account of testAccounts) {
      try {
        const userRecord = await auth.createUser({
          email: account.email,
          password: account.password,
          displayName: account.displayName,
        });

        await db.collection('users').doc(userRecord.uid).set({
          email: account.email,
          displayName: account.displayName,
          role: account.role,
          createdAt: new Date(),
        });

        results.push({ email: account.email, status: 'created' });
        created++;
      } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
          results.push({ email: account.email, status: 'exists' });
          skipped++;
        } else {
          results.push({ email: account.email, status: 'error', error: error.message });
        }
      }
    }

    res.json({
      message: `Created ${created} accounts, ${skipped} already existed`,
      results
    });
  } catch (error) {
    console.error('Error creating test accounts:', error);
    res.status(500).json({ error: 'Failed to create test accounts', details: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth-service' });
});

app.listen(PORT, () => {
  console.log(`🚀 Auth Service running on port ${PORT}`);
});


