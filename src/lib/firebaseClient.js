import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// These values come from: Firebase Console -> Project Settings -> General ->
// "Your apps" -> Web app -> SDK setup and configuration.
// This config is safe to keep in the source code and commit to GitHub —
// it identifies your project, it isn't a secret. Real protection comes from
// the Firestore/Storage security rules (see firestore.rules / storage.rules),
// not from hiding this object.
const firebaseConfig = {
  apiKey: 'PASTE_YOUR_API_KEY_HERE',
  authDomain: 'PASTE_YOUR_PROJECT_ID.firebaseapp.com',
  projectId: 'PASTE_YOUR_PROJECT_ID',
  storageBucket: 'PASTE_YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'PASTE_YOUR_SENDER_ID',
  appId: 'PASTE_YOUR_APP_ID',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
