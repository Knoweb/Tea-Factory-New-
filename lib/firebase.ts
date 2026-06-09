import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  // Firebase public config — these are intentionally public (baked into browser JS bundle)
  apiKey: "AIzaSyBouQmV8-VcXPZpfrEEQoYKNvsELo0lPxw",
  authDomain: "tea-withering-system-4d483.firebaseapp.com",
  databaseURL: "https://tea-withering-system-4d483-default-rtdb.firebaseio.com",
  projectId: "tea-withering-system-4d483",
  storageBucket: "tea-withering-system-4d483.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1013822265984",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1013822265984:web:placeholder"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const database = getDatabase(app);

export { app, auth, database };
