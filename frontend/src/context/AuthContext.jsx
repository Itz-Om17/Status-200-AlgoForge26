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
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [is2faVerified, setIs2faVerified] = useState(true);

  async function signup(email, password, name, role) {
    localStorage.removeItem('current_audit');
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const user = credential.user;
    if (name) {
      await updateProfile(user, { displayName: name });
    }
    await setDoc(doc(db, 'users', user.uid), {
      name: name || 'User',
      email: email,
      role: role || 'Analyst',
      createdAt: new Date().toISOString()
    });
    return credential;
  }

  function login(email, password) {
    localStorage.removeItem('current_audit');
    return signInWithEmailAndPassword(auth, email, password);
  }

  function loginWithGoogle() {
    localStorage.removeItem('current_audit');
    return signInWithPopup(auth, googleProvider);
  }

  function logout() {
    localStorage.removeItem('current_audit');
    if (currentUser) {
      sessionStorage.removeItem('mfa_' + currentUser.uid);
    }
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

  async function verifyMfa(code) {
    if (!currentUser || !userProfile?.mfaSecret) throw new Error("MFA not set up");
    const res = await fetch('http://127.0.0.1:5000/api/mfa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: userProfile.mfaSecret, code: code })
    });
    const data = await res.json();
    if (data.valid) {
      sessionStorage.setItem('mfa_' + currentUser.uid, 'true');
      setIs2faVerified(true);
      return true;
    }
    throw new Error("Invalid 2FA code");
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const role = docSnap.data().role || 'Analyst';
            setUserRole(role);
            localStorage.setItem('fairai-user-role', role);
            
            const data = docSnap.data();
            setUserProfile(data);
            if (data.mfaEnabled && !sessionStorage.getItem('mfa_' + user.uid)) {
              setIs2faVerified(false);
            } else {
              setIs2faVerified(true);
            }
          } else {
            // First-time Google Sign-In — create a Firestore doc
            const defaultRole = 'Analyst';
            await setDoc(docRef, {
              name: user.displayName || '',
              email: user.email || '',
              role: defaultRole,
              createdAt: new Date().toISOString()
            });
            setUserRole(defaultRole);
            localStorage.setItem('fairai-user-role', defaultRole);
            setUserProfile(null);
            setIs2faVerified(true);
          }
        } catch (err) {
          console.warn('Firestore role fetch failed:', err.message);
          // Fall back to localStorage
          const cached = localStorage.getItem('fairai-user-role');
          if (cached) setUserRole(cached);
        }
      } else {
        setUserRole('Analyst');
        setUserProfile(null);
        setIs2faVerified(true);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    userProfile,
    setUserProfile,
    signup,
    login,
    loginWithGoogle,
    logout,
    resetPassword,
    updateUserPassword,
    updateUserProfile,
    updateUserRole,
    is2faVerified,
    verifyMfa
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}