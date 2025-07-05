import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from './firebaseConfig';

/**
 * Authenticates a waiter with email and password
 * @param email - The waiter's email address
 * @param password - The waiter's password
 * @returns Promise resolving to the authenticated user
 * @throws Firebase authentication error if login fails
 */
export const loginWaiter = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Login error: ", error);
    throw error;
  }
};

export const logout = async () => {
  await signOut(auth);
};

export interface AuthError {
  code: string;
  message: string;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}