// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBD3S_nOgf5nlq8yWdGwUOkWOP5q0RFdfg",
  authDomain: "finora-17178.firebaseapp.com",
  projectId: "finora-17178",
  storageBucket: "finora-17178.firebasestorage.app",
  messagingSenderId: "205225330212",
  appId: "1:205225330212:web:2ffc287194742584eb7ab1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
