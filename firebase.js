import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCl54gaWVj8HPH0iPONtRZw7eJquhg1HSs",
  authDomain: "bbn-post.firebaseapp.com",
  projectId: "bbn-post",
  storageBucket: "bbn-post.firebasestorage.app",
  messagingSenderId: "410487669625",
  appId: "1:410487669625:android:d8240ae1c769bdcd5fe5a8" 
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);