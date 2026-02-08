// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCwCGcaWjiRY_0IyEIEReuH0pRXX07bHAE",
  authDomain: "to-do-app-cc795.firebaseapp.com",
  projectId: "to-do-app-cc795",
  storageBucket: "to-do-app-cc795.firebasestorage.app",
  messagingSenderId: "816531933656",
  appId: "1:816531933656:web:17462737a0c35e6cc5caad",
  measurementId: "G-NKTYX713FD",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Firestore DB instance (this is what `db` is)
export const db = getFirestore(app);

// ✅ Analytics is optional (and should be guarded for some environments)
export let analytics;
isSupported().then((ok) => {
  if (ok) analytics = getAnalytics(app);
});
