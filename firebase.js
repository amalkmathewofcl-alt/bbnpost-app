import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBqbcR72odcVfvKvKFJoZrgDvl8Sthq98I",
  authDomain: "bbn-post.firebaseapp.com",
  projectId: "bbn-post",
  storageBucket: "bbn-post.firebasestorage.app",
  messagingSenderId: "410487669625",
  appId: "1:410487669625:web:a3523ec7f2091cbd5fe5a8",
  measurementId: "G-EETTTG4WD3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);