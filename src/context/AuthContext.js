import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, serverTimestamp } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "../config/firebase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore stored offline session on app mount
  useEffect(() => {
    const loadStoredUser = async () => {
      try {
        const saved = await AsyncStorage.getItem("@mandi_auth_user");
        if (saved) {
          const parsed = JSON.parse(saved);
          setCurrentUser({ uid: parsed.uid, phoneNumber: parsed.phoneNumber });
          setUserProfile(parsed);
        }
      } catch (e) {
        console.warn("Storage restore error:", e);
      }
    };
    loadStoredUser();
  }, []);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const userRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(userRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserProfile(data);
            await AsyncStorage.setItem(
              "@mandi_auth_user",
              JSON.stringify(data),
            );
          }
        } catch (err) {
          console.warn("Could not load user profile:", err);
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const setDirectUser = async (profile) => {
    setCurrentUser({ uid: profile.uid, phoneNumber: profile.phoneNumber });
    setUserProfile(profile);
    await AsyncStorage.setItem("@mandi_auth_user", JSON.stringify(profile));
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (_) {}
    setCurrentUser(null);
    setUserProfile(null);
    await AsyncStorage.removeItem("@mandi_auth_user");
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        logout,
        setDirectUser,
        isAuthenticated: !!currentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
