import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../firebase/config';
import type { UserProfile } from '../types/store';
import { BOOTSTRAPPED_ADMIN_EMAIL, emailToDocId } from '../utils/storeLogic';

interface AuthContextValue {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  authModalOpen: boolean;
  openAuthModal: (callback?: () => void) => void;
  closeAuthModal: (authenticated?: boolean) => void;
  loginWithEmail: (email: string, password: string) => Promise<User>;
  registerWithEmail: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const postAuthCallbackRef = useRef<(() => void) | null>(null);

  const ensureUserDoc = async (firebaseUser: User, explicitDisplayName?: string) => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    try {
      const snap = await getDoc(userRef);
      const envAdmin = import.meta.env.VITE_ADMIN_EMAIL?.toLowerCase();
      const userEmailLower = firebaseUser.email?.toLowerCase() || '';
      const isInitialAdmin =
        firebaseUser.emailVerified &&
        (userEmailLower === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase() ||
          (Boolean(envAdmin) && userEmailLower === envAdmin));

      let inviteData: {
        id: string;
        role: 'admin' | 'reseller';
        resellerDiscountPct: number;
      } | null = null;

      if (!isInitialAdmin && firebaseUser.emailVerified && userEmailLower) {
        try {
          const inviteId = emailToDocId(userEmailLower);
          const inviteSnap = await getDoc(doc(db, 'roleInvites', inviteId));
          if (inviteSnap.exists()) {
            const raw = inviteSnap.data();
            if (raw.role === 'admin' || raw.role === 'reseller') {
              inviteData = {
                id: inviteSnap.id,
                role: raw.role,
                resellerDiscountPct: Number(raw.resellerDiscountPct || 0),
              };
            }
          }
        } catch {
          // Ignore invite lookup errors for non-invited users
        }
      }

      if (!snap.exists()) {
        const assignedRole = isInitialAdmin
          ? 'admin'
          : inviteData?.role || 'user';
        const basePayload: Record<string, unknown> = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName:
            explicitDisplayName ||
            firebaseUser.displayName ||
            firebaseUser.email?.split('@')[0] ||
            'Cyber User',
          photoURL: firebaseUser.photoURL || '',
          role: assignedRole,
          walletBalance: 0,
          totalSpent: 0,
          totalKeys: 0,
          createdAt: serverTimestamp(),
        };
        if (inviteData) {
          basePayload.appliedInviteId = inviteData.id;
          if (inviteData.role === 'reseller') {
            basePayload.resellerDiscountPct = inviteData.resellerDiscountPct;
          }
        }
        await setDoc(userRef, basePayload);
      } else if (isInitialAdmin && snap.data().role !== 'admin') {
        await setDoc(userRef, { role: 'admin' }, { merge: true });
      } else if (
        inviteData &&
        snap.data().role !== inviteData.role &&
        snap.data().role !== 'admin'
      ) {
        await setDoc(
          userRef,
          {
            role: inviteData.role,
            resellerDiscountPct:
              inviteData.role === 'reseller' ? inviteData.resellerDiscountPct : 0,
            appliedInviteId: inviteData.id,
          },
          { merge: true }
        );
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}`);
    }
  };

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (firebaseUser) {
        try {
          await ensureUserDoc(firebaseUser);
          const userRef = doc(db, 'users', firebaseUser.uid);
          unsubProfile = onSnapshot(
            userRef,
            (docSnap) => {
              if (docSnap.exists()) {
                setUserProfile({
                  id: docSnap.id,
                  ...(docSnap.data() as UserProfile),
                });
              }
              setLoading(false);
            },
            (err) => {
              handleFirestoreError(
                err,
                OperationType.GET,
                `users/${firebaseUser.uid}`
              );
            }
          );
        } catch (err) {
          console.error('Error syncing user profile:', err);
          setLoading(false);
        }
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const loginWithEmail = async (email: string, password: string) => {
    await setPersistence(auth, browserLocalPersistence);
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await ensureUserDoc(cred.user);
    return cred.user;
  };

  const registerWithEmail = async (
    email: string,
    password: string,
    displayName: string
  ) => {
    await setPersistence(auth, browserLocalPersistence);
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }
    await ensureUserDoc(cred.user, displayName);
    return cred.user;
  };

  const loginWithGoogle = async () => {
    await setPersistence(auth, browserLocalPersistence);
    const cred = await signInWithPopup(auth, googleProvider);
    await ensureUserDoc(cred.user);
    return cred.user;
  };

  const logout = async () => {
    await signOut(auth);
  };

  const openAuthModal = (callback?: () => void) => {
    postAuthCallbackRef.current = callback || null;
    setAuthModalOpen(true);
  };

  const closeAuthModal = (authenticated = false) => {
    setAuthModalOpen(false);
    const cb = postAuthCallbackRef.current;
    postAuthCallbackRef.current = null;
    if (authenticated && cb) {
      cb();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        authModalOpen,
        openAuthModal,
        closeAuthModal,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
