import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Setup script with Firebase Admin SDK authentication
 * 
 * This script uses a service account key file for authentication,
 * which provides full access to the Firebase project.
 * 
 * To use this:
 * 1. Go to Firebase Console > Project Settings > Service Accounts
 * 2. Click "Generate new private key"
 * 3. Save the JSON file as 'serviceAccountKey.json' in the project root
 * 4. Add 'serviceAccountKey.json' to .gitignore
 */

// Check if service account key exists
const serviceAccountPath = join(process.cwd(), 'serviceAccountKey.json');

try {
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  
  // Initialize Firebase Admin with service account
  initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
  
  const db = getFirestore();
  
  console.log('✅ Firebase Admin SDK initialized with service account');
  console.log(`📁 Project: ${serviceAccount.project_id}`);
  
  // Example function to test database access
  async function testDatabaseAccess() {
    try {
      console.log('🔄 Testing database access...');
      
      // Try to read from a collection
      const menuSnapshot = await db.collection('menu').limit(1).get();
      console.log(`✅ Successfully read ${menuSnapshot.size} documents from 'menu' collection`);
      
      // Try to write a test document
      const testDoc = await db.collection('test').add({
        message: 'Test document from Admin SDK',
        timestamp: new Date(),
        script: 'setup-auth-admin.js'
      });
      console.log(`✅ Successfully wrote test document: ${testDoc.id}`);
      
      // Clean up test document
      await testDoc.delete();
      console.log('✅ Test document cleaned up');
      
    } catch (error) {
      console.error('❌ Database access test failed:', error);
    }
  }
  
  // Run the test
  testDatabaseAccess();
  
} catch (error) {
  console.error('❌ Service account key not found or invalid');
  console.log('\n📋 To set up service account authentication:');
  console.log('1. Go to Firebase Console > Project Settings > Service Accounts');
  console.log('2. Click "Generate new private key"');
  console.log('3. Save the JSON file as "serviceAccountKey.json" in the project root');
  console.log('4. Add "serviceAccountKey.json" to .gitignore');
  console.log('5. Run this script again');
  
  process.exit(1);
} 