import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppUser, UserRole } from '@/types';
import { createUser, deleteUserProfile, getUser, updateUserProfile } from '@/lib/firestore';
import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/firebase';
import { deleteUser } from 'firebase/auth';

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: { displayName?: string; username?: string; phoneNumber?: string; agentName?: string; photoURL?: string }) => Promise<void>;
  deleteCurrentAccount: () => Promise<void>;
  isFirebaseReady: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  refreshUser: async () => {},
  updateProfile: async () => {},
  deleteCurrentAccount: async () => {},
  isFirebaseReady: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    (async () => {
      const auth = await getFirebaseAuth();
      if (!auth) {
        setLoading(false);
        return;
      }

      const { onAuthStateChanged, signOut: fbSignOut } = await import('firebase/auth');
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const appUser = await getUser(firebaseUser.uid);
          if (appUser) {
            if ((appUser.accessStatus ?? "allowed") === "denied") {
              await fbSignOut(auth);
              setUser(null);
              setLoading(false);
              return;
            }
            setUser(appUser);
          } else {
            const newUser: AppUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email ?? '',
              displayName: firebaseUser.displayName ?? firebaseUser.email?.split('@')[0] ?? 'User',
              username: firebaseUser.email?.split('@')[0] ?? 'user',
              phoneNumber: '',
              role: 'viewer' as UserRole,
              accessStatus: 'allowed',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              ...(firebaseUser.photoURL ? { photoURL: firebaseUser.photoURL } : {}),
            };
            await createUser(newUser);
            setUser(newUser);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      });
    })();

    return () => unsubscribe?.();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const auth = await getFirebaseAuth();
    if (!auth) throw new Error('Firebase not configured');
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    const auth = await getFirebaseAuth();
    if (!auth) throw new Error('Firebase not configured');
    const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
  }, []);

  const signOut = useCallback(async () => {
    const auth = await getFirebaseAuth();
    if (!auth) return;
    const { signOut: fbSignOut } = await import('firebase/auth');
    await fbSignOut(auth);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!user) return;
    const fresh = await getUser(user.uid);
    if (fresh) setUser(fresh);
  }, [user]);

  const updateProfile = useCallback(async (data: { displayName?: string; username?: string; phoneNumber?: string; agentName?: string; photoURL?: string }) => {
    if (!user) return;
    await updateUserProfile(user.uid, data);
    setUser((u) => u ? { ...u, ...data } : u);
  }, [user]);

  const deleteCurrentAccount = useCallback(async () => {
    const auth = await getFirebaseAuth();
    if (!auth?.currentUser || !user) return;
    await deleteUserProfile(user.uid).catch(() => {});
    await deleteUser(auth.currentUser);
    setUser(null);
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn,
      signUp,
      signOut,
      refreshUser,
      updateProfile,
      deleteCurrentAccount,
      isFirebaseReady: isFirebaseConfigured,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
