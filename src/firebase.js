// Firebase App + Auth + Firestore initialization
// NOTE: Replace the firebaseConfig values with your actual Firebase project config.
// Run: npx -y firebase-tools@latest apps:sdkconfig <APP_ID>
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD1tDqlR7SuBfECTLryLTiNI3lTimHBkTk",
  authDomain: "vanpool-coordinator.firebaseapp.com",
  projectId: "vanpool-coordinator",
  storageBucket: "vanpool-coordinator.firebasestorage.app",
  messagingSenderId: "389274587216",
  appId: "1:389274587216:web:5171395e6f07b276438155"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Connect to emulators in development
if (location.hostname === 'localhost') {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, 'localhost', 8080);
  } catch (e) {
    // Emulators may not be running — ignore
  }
}

export { app, auth, db };
