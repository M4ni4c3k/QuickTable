import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  getAuth,
  type User,
  type UserCredential,
  type Unsubscribe,
} from 'firebase/auth';
import { useEffect, useState } from 'react';
import { app } from '../firebase/firebaseConfig';
import type { FirebaseError } from 'firebase/app';
import type { AuthHookReturn } from '../types/types';

/**
 * Custom hook for managing Firebase authentication state and actions
 * Provides real-time user state updates and authentication methods
 */
export const useAuth = (): AuthHookReturn => {
  const auth = getAuth(app);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirebaseError | null>(null);

  // Real-time authentication state observer
  useEffect(() => {
    const unsubscribe: Unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [auth]);

  const login = async (email: string, password: string): Promise<UserCredential> => {
    try {
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setError(null);
      return userCredential;
    } catch (err) {
      const firebaseError = err as FirebaseError;
      setError(firebaseError);
      throw firebaseError;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string): Promise<UserCredential> => {
    try {
      setLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      setError(null);
      return userCredential;
    } catch (err) {
      const firebaseError = err as FirebaseError;
      setError(firebaseError);
      throw firebaseError;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setLoading(true);
      await signOut(auth);
      setError(null);
    } catch (err) {
      const firebaseError = err as FirebaseError;
      setError(firebaseError);
      throw firebaseError;
    } finally {
      setLoading(false);
    }
  };

  return { user, loading, error, login, register, logout };
};