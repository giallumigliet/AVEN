// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBWZL9-AJc9RqmwdiVkOBMVnk5ed3woNoo",
  authDomain: "aven-aven.firebaseapp.com",
  projectId: "aven-aven",
  storageBucket: "aven-aven.firebasestorage.app",
  messagingSenderId: "760754542696",
  appId: "1:760754542696:web:f842dbd67cd5f8be0cc3dd",
  measurementId: "G-ESVSP4MLMN"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
