import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';
import type { UserRole } from '../types/types';

interface TestAccount {
  email: string;
  password: string;
  role: UserRole;
  displayName: string;
}

const testAccounts: TestAccount[] = [
  {
    email: 'admin@quicktable.com',
    password: '123',
    role: 'admin',
    displayName: 'Administrator',
  },
  {
    email: 'manager@quicktable.com',
    password: '123',
    role: 'manager',
    displayName: 'Menedżer',
  },
  {
    email: 'client@quicktable.com',
    password: '123',
    role: 'client',
    displayName: 'Klient',
  },
  {
    email: 'waiter@quicktable.com',
    password: '123',
    role: 'waiter',
    displayName: 'Kelner',
  },
  {
    email: 'kitchen@quicktable.com',
    password: '123',
    role: 'kitchen',
    displayName: 'Kuchnia',
  },
];

/**
 * Creates test accounts in Firebase Auth and Firestore
 * This should be run once to set up test accounts
 * Run this function from the browser console or create a temporary admin page
 */
export async function createTestAccounts(): Promise<void> {
  console.log('Creating test accounts...');
  
  for (const account of testAccounts) {
    try {
      // Check if user already exists
      try {
        // Try to create the user
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          account.email,
          account.password
        );

        // Create user document in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: account.email,
          displayName: account.displayName,
          role: account.role,
          createdAt: serverTimestamp(),
        });

        console.log(`✅ Created account: ${account.email} (${account.role})`);
      } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
          console.log(`⚠️ Account already exists: ${account.email}`);
          
          // Update the role in Firestore if user exists
          // Note: You'll need to get the user ID from Firebase Console
          // or create a separate function to update existing users
        } else {
          console.error(`❌ Error creating ${account.email}:`, error);
        }
      }
    } catch (error) {
      console.error(`❌ Error processing ${account.email}:`, error);
    }
  }
  
  console.log('Test accounts creation completed!');
}

/**
 * Helper function to run from browser console:
 * import { createTestAccounts } from './utils/createTestAccounts';
 * await createTestAccounts();
 */

