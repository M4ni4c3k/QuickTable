import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  getAuth,
  type User,
  type UserCredential,
  type Unsubscribe,
} from 'firebase/auth';
import { useEffect, useState } from 'react';
import { app, db } from '../firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import type { FirebaseError } from 'firebase/app';
import type { AuthHookReturn, UserRole, AppUser } from '../types/types';
import { authAPI } from '../utils/apiClient';

/**
 * Authentication hook with fallback strategy:
 * 1. Try auth microservice
 * 2. Fallback to Firestore if service unavailable
 * 3. Default to client role if no data found
 */
export const useAuth = (): AuthHookReturn => {
  const auth = getAuth(app);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userData, setUserData] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirebaseError | null>(null);

  const fetchUserData = async (user: User): Promise<AppUser | null> => {
    const getFirestoreUserData = async (): Promise<AppUser> => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        let role: UserRole = 'client';
        let displayName = user.displayName;
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          role = data.role as UserRole || 'client';
          displayName = displayName || data.displayName || user.email?.split('@')[0] || null;
        }
        
        return {
          uid: user.uid,
          email: user.email,
          displayName: displayName,
          role: role,
          photoURL: user.photoURL,
        };
      } catch (err) {
        return {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          role: 'client',
          photoURL: user.photoURL,
        };
      }
    };

    try {
      const idToken = await user.getIdToken();
      const response = await authAPI.verifyToken(idToken);
      return response.user as AppUser;
    } catch (err: any) {
      const isServiceUnavailable = err.status === 504 || err.status === 503 || 
                                   err.message?.includes('Gateway Timeout') || 
                                   err.message?.includes('Network error') ||
                                   err.message?.includes('timeout');
      
      if (isServiceUnavailable) {
        return getFirestoreUserData();
      }
      
      try {
        const userData = await authAPI.getUser(user.uid);
        return userData as AppUser;
      } catch (fallbackErr: any) {
        const isFallbackUnavailable = fallbackErr.status === 504 || fallbackErr.status === 503 || 
                                     fallbackErr.message?.includes('Gateway Timeout') ||
                                     fallbackErr.message?.includes('timeout');
        
        if (isFallbackUnavailable) {
          return getFirestoreUserData();
        }
        
        console.error('Error fetching user data:', fallbackErr);
        return null;
      }
    }
  };

  useEffect(() => {
    const unsubscribe: Unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const data = await fetchUserData(currentUser);
        if (data) {
          setUserRole(data.role);
          setUserData(data);
        } else {
          setUserRole('client');
          setUserData(null);
        }
      } else {
        setUserRole(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [auth]);

  const login = async (email: string, password: string): Promise<UserCredential> => {
    try {
      setLoading(true);
      setError(null);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential;
    } catch (err) {
      const firebaseError = err as FirebaseError;
      setError(firebaseError);
      throw firebaseError;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (): Promise<UserCredential> => {
    try {
      setLoading(true);
      setError(null);
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      const idToken = await userCredential.user.getIdToken();
      try {
        await authAPI.login({ idToken });
      } catch (serviceErr) {
        console.error('Error syncing with auth service:', serviceErr);
      }
      
      return userCredential;
    } catch (err) {
      const firebaseError = err as FirebaseError;
      setError(firebaseError);
      throw firebaseError;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, role: UserRole = 'client'): Promise<UserCredential> => {
    try {
      setLoading(true);
      setError(null);
      
      try {
        await authAPI.register({ email, password, role, displayName: email.split('@')[0] });
      } catch (serviceErr: any) {
        if (serviceErr.status === 409) {
          throw new Error('Email already in use');
        }
        console.warn('Auth service registration failed, using Firebase directly:', serviceErr);
      }
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
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
      setError(null);
      await signOut(auth);
    } catch (err) {
      const firebaseError = err as FirebaseError;
      setError(firebaseError);
      throw firebaseError;
    } finally {
      setLoading(false);
    }
  };

  return { user, userRole, userData, loading, error, login, loginWithGoogle, register, logout };
};