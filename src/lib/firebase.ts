import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with your app's Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyCpDYVO671eGXCr4y-u59cAN6vUdw_CQGc",
    authDomain: "bible-talks-tracker.firebaseapp.com",
    projectId: "bible-talks-tracker",
    storageBucket: "bible-talks-tracker.firebasestorage.app",
    messagingSenderId: "404547655226",
    appId: "1:404547655226:web:dc92e44827ba45020d4703"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
