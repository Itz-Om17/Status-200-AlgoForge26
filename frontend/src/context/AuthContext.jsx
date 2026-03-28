import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState('Analyst');
  const [loading, setLoading] = useState(true);

  function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function loginWithGoogle() {
    return signInWithPopup(auth, googleProvider);
  }

  function logout() {
    return signOut(auth);
  }

  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  function updateUserPassword(newPassword) {
    return updatePassword(auth.currentUser, newPassword);
  }

  function updateUserProfile(profileData) {
    return updateProfile(auth.currentUser, profileData);
  }

  async function updateUserRole(newRole) {
    if (!auth.currentUser) throw new Error('No authenticated user');
    const userRef = doc(db, 'users', auth.currentUser.uid);
    await updateDoc(userRef, { role: newRole });
    setUserRole(newRole);
    localStorage.setItem('fairai-user-role', newRole);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userRef);
          if (docSnap.exists()) {
            const role = docSnap.data().role || 'Analyst';
            setUserRole(role);
            localStorage.setItem('fairai-user-role', role);
          } else {
            // First-time Google Sign-In — create a Firestore doc
            const defaultRole = 'Analyst';
            await setDoc(userRef, {
              name: user.displayName || '',
              email: user.email || '',
              role: defaultRole,
              createdAt: new Date().toISOString()
            });
            setUserRole(defaultRole);
            localStorage.setItem('fairai-user-role', defaultRole);
          }
        } catch (err) {
          console.warn('Firestore role fetch failed:', err.message);
          // Fall back to localStorage
          const cached = localStorage.getItem('fairai-user-role');
          if (cached) setUserRole(cached);
        }
      } else {
        setUserRole('Analyst');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    signup,
    login,
    loginWithGoogle,
    logout,
    resetPassword,
    updateUserPassword,
    updateUserProfile,
    updateUserRole
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
