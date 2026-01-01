import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
// You can use environment variables (recommended) or hardcode your values
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID"
};

// Validate configuration
const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingFields = requiredFields.filter(field => 
  !firebaseConfig[field as keyof typeof firebaseConfig] || 
  firebaseConfig[field as keyof typeof firebaseConfig]?.startsWith('YOUR_')
);

if (missingFields.length > 0) {
  console.error('❌ Firebase Configuration Error!');
  console.error('Missing or invalid fields:', missingFields.join(', '));
  console.error('\nPlease configure Firebase:');
  console.error('1. Create .env file from .env.example');
  console.error('2. Or update src/services/firebase.ts with your Firebase credentials');
  console.error('\nGet your config from: https://console.firebase.google.com/project/_/settings/general');
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Export app for potential future use
export default app;