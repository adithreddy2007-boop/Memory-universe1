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
  apiKey: "AIzaSyClEJijull6ThzlID7lWfISax-JtywKYcQ",
  authDomain: "aether-universe.firebaseapp.com",
  projectId: "aether-universe",
  storageBucket: "aether-universe.firebasestorage.app",
  messagingSenderId: "714005832083",
  appId: "1:714005832083:web:14aa24c873e8be5bd88866"
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
