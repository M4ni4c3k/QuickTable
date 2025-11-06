/**
 * Creates test accounts for development and testing
 * Accounts: user@user.pl, waiter@waiter.pl, kitchen@kitchen.pl, admin@admin.pl
 * Password for all: 123
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serviceAccountPath = process.env.SERVICE_ACCOUNT_PATH || 
  join(__dirname, '../../../serviceAccountKey.json');

let auth, db;

try {
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
  auth = getAuth();
  db = getFirestore();
  console.log('✅ Firebase Admin initialized');
} catch (error) {
  console.error('❌ Failed to initialize Firebase:', error.message);
  console.error('Make sure serviceAccountKey.json exists in the project root');
  process.exit(1);
}

const testAccounts = [
  { email: 'user@user.pl', password: '123', role: 'client', displayName: 'Test User' },
  { email: 'waiter@waiter.pl', password: '123', role: 'waiter', displayName: 'Test Waiter' },
  { email: 'kitchen@kitchen.pl', password: '123', role: 'kitchen', displayName: 'Test Kitchen' },
  { email: 'admin@admin.pl', password: '123', role: 'admin', displayName: 'Test Admin' },
];

async function createTestAccounts() {
  console.log('🔄 Creating test accounts...\n');
  
  const results = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const account of testAccounts) {
    try {
      let userRecord;
      
      // Try to get existing user
      try {
        const existingUser = await auth.getUserByEmail(account.email);
        userRecord = existingUser;
        console.log(`📧 Found existing user: ${account.email}`);
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          // User doesn't exist, create it
          userRecord = await auth.createUser({
            email: account.email,
            password: account.password,
            displayName: account.displayName,
            emailVerified: true,
          });
          console.log(`✅ Created user: ${account.email}`);
          created++;
        } else {
          throw error;
        }
      }

      // Update or create Firestore document
      const userDoc = await db.collection('users').doc(userRecord.uid).get();
      
      if (userDoc.exists()) {
        // Update existing document
        await db.collection('users').doc(userRecord.uid).update({
          email: account.email,
          displayName: account.displayName,
          role: account.role,
          updatedAt: new Date(),
        });
        console.log(`📝 Updated Firestore document for: ${account.email} (role: ${account.role})`);
        updated++;
      } else {
        // Create new document
        await db.collection('users').doc(userRecord.uid).set({
          email: account.email,
          displayName: account.displayName,
          role: account.role,
          createdAt: new Date(),
        });
        console.log(`📝 Created Firestore document for: ${account.email} (role: ${account.role})`);
        if (created === 0) created++;
      }

      results.push({ 
        email: account.email, 
        role: account.role,
        status: userDoc.exists() ? 'updated' : 'created',
        uid: userRecord.uid 
      });
    } catch (error) {
      console.error(`❌ Error processing ${account.email}:`, error.message);
      results.push({ 
        email: account.email, 
        status: 'error', 
        error: error.message 
      });
      errors++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Errors: ${errors}`);
  console.log('\n📋 Account Details:');
  results.forEach(result => {
    if (result.status !== 'error') {
      console.log(`   ${result.email} (${result.role}) - ${result.status}`);
    }
  });

  if (errors > 0) {
    console.log('\n⚠️  Some accounts failed to create. Check errors above.');
  } else {
    console.log('\n🎉 All test accounts ready!');
    console.log('\n📝 Login credentials:');
    console.log('   Email: user@user.pl | waiter@waiter.pl | kitchen@kitchen.pl | admin@admin.pl');
    console.log('   Password: 123 (for all accounts)');
  }

  process.exit(errors > 0 ? 1 : 0);
}

createTestAccounts();

