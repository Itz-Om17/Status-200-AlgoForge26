import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
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
            const data = docSnap.data();
            setUserProfile(data);
            if (data.mfaEnabled && !sessionStorage.getItem('mfa_' + user.uid)) {
              setIs2faVerified(false);
            } else {
              setIs2faVerified(true);
            }
          } else {
            setUserProfile(null);
            setIs2faVerified(true);
          }
        } catch (e) {
          console.error("Error fetching user profile:", e);
        }
      } else {
        setUserProfile(null);
        setIs2faVerified(true);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    setUserProfile,
    signup,
    login,
    loginWithGoogle,
    logout,
    resetPassword,
    is2faVerified,
    verifyMfa
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
