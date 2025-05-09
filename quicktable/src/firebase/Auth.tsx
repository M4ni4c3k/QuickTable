import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from './firebaseConfig';

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