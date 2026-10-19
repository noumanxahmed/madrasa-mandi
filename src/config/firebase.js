import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyBLYy-JpRKt-474jtDpC_M9kEuGOSJ5JpY",
  authDomain: "madrasa-mandi.firebaseapp.com",
  projectId: "madrasa-mandi",
  storageBucket: "madrasa-mandi.firebasestorage.app",
  messagingSenderId: "750597462837",
  appId: "1:750597462837:web:e296d909768d8d22c08a7c",
  measurementId: "G-90Q6CCV9C8",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const storage = getStorage(app);

let authInstance;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  authInstance = getAuth(app);
}

export const auth = authInstance;
export default app;
