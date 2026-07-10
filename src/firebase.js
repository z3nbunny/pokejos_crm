// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBVjo0riGHtFC5sDIckEuHjdmsQHuY4EL0",
    authDomain: "pok-e-jos-crm.firebaseapp.com",
    projectId: "pok-e-jos-crm",
    storageBucket: "pok-e-jos-crm.firebasestorage.app",
    messagingSenderId: "420258787440",
    appId: "1:420258787440:web:b83c3dd55db8aa09a184b5",
    measurementId: "G-08JGEZL0TR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore and EXPORT it so App.jsx can use it
export const db = getFirestore(app);