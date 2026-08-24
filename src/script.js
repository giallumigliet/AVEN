// script.js
import { auth, db } from "./firebase.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import {
  GoogleAuthProvider, signInWithPopup, setPersistence,
  browserLocalPersistence, onAuthStateChanged, signOut, deleteUser 
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { getDocs, deleteDoc, doc, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";




const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const resetDataBtn = document.getElementById("resetData-btn");

const profileBtn = document.getElementById("profile-btn");
const userPhoto = document.getElementById("user-photo");
const accountPanel = document.getElementById("account-floating-panel");
const changeAccountBtn = document.getElementById("changeAccount-btn");




// ---- LIGHT/DARK MODE ----
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
document.body.classList.add(prefersDark ? 'dark' : 'light');
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
mediaQuery.addEventListener('change', e => {
  document.body.classList.toggle('dark', e.matches);
  document.body.classList.toggle('light', !e.matches);
});

const lightDarkButton = document.getElementById('lightDark-btn');

lightDarkButton.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  document.body.classList.toggle('light');
  
  const metaTheme = document.querySelector("#theme-color-meta");
  const bgColor = getComputedStyle(document.body)
    .getPropertyValue("--bg-color")
    .trim();
  metaTheme.setAttribute("content", bgColor);
});



// ---- FIREBASE AUTH ----
const provider = new GoogleAuthProvider();
(async () => {
  await setPersistence(auth, browserLocalPersistence);
})();

// ---- AUTH UI ----
loginBtn.addEventListener("click", async () => {
  try { await signInWithPopup(auth, provider); } catch(err) { console.error(err); }
});

changeAccountBtn.addEventListener("click", async () => {
  try { await signOut(auth); await signInWithPopup(auth, provider); } catch(err){ console.error(err); }
  accountPanel.classList.add("hidden");
});

logoutBtn.addEventListener("click", async () => { 
  await signOut(auth); 
  accountPanel.classList.add("hidden"); 
});


resetDataBtn.addEventListener("click", async () => {
  if (!auth.currentUser) return;

  const confirmDelete = confirm("Your account and all associated data will be deleted permanently. Continue?");
  if (!confirmDelete) return;

  try {
    const uid = auth.currentUser.uid;
    await deleteUser(auth.currentUser);

    // reset UI
    accountPanel.classList.add("hidden");
    document.body.classList.remove("color-mode");

  } catch (err) {
    console.error("Error deleting account:", err);

    // important case
    if (err.code === "auth/requires-recent-login") {
      alert("Please log in again before deleting your account.");
    }
  }
});


profileBtn.addEventListener("click", e => { e.stopPropagation(); accountPanel.classList.toggle("hidden"); });
document.addEventListener("click", e => { if (!accountPanel.contains(e.target) && !profileBtn.contains(e.target)) accountPanel.classList.add("hidden"); });

// ---- AUTH STATE ----
onAuthStateChanged(auth, async user => {
  if(user){
    console.log("user logged: ", user.uid);
    
    loginBtn.classList.add("hidden");
    profileBtn.classList.remove("hidden");
    userPhoto.src = user.photoURL;
    let first = true;
    
  } else {
    console.log("user NOT logged!!");
    loginBtn.classList.remove("hidden");
    profileBtn.classList.add("hidden");
    
  }
});
