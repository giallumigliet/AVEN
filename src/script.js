// script.js
import { auth, db } from "./firebase.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import {
  GoogleAuthProvider, signInWithPopup, setPersistence,
  browserLocalPersistence, onAuthStateChanged, signOut, deleteUser 
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { getDocs, deleteDoc, doc, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


//   ELEMENTS ========================================================= 

const app = document.getElementById("app");
const menuButton = document.getElementById("menu-button");
const sidebarBackdrop = document.getElementById("sidebar-backdrop");

const profileButton = document.getElementById("profile-button");
const accountMenu = document.getElementById("account-menu");
const loginButton = document.querySelectorAll("login-button");
const changeAccountButton = document.querySelectorAll("change-account-button");
const logoutButton = document.querySelectorAll("logout-button");
const resetDataButton = document.querySelectorAll("reset-data-button");

const themeButton = document.getElementById("light-dark-button");
const navItems = document.querySelectorAll(".nav-item");



// ---- FIREBASE AUTH ----
const provider = new GoogleAuthProvider();
(async () => {
  await setPersistence(auth, browserLocalPersistence);
})();


// ---- AUTH STATE ----
onAuthStateChanged(auth, async user => {
  if(user){
    console.log("user logged: ", user.uid);
    loginButton.classList.add("hidden");
    userPhoto.src = user.photoURL;
    let first = true;
  } else {
    console.log("user NOT logged!!");
    loginButton.classList.remove("hidden");
  }
});



//   RESPONSIVE SIDEBAR ========================================================= 
function isMobile() {
  return window.matchMedia("(max-width: 700px)").matches;
}

function openSidebar() {
  app.classList.remove("sidebar-closed");
  menuButton.setAttribute("aria-expanded", "true");
}

function closeSidebar() {
  app.classList.add("sidebar-closed");
  menuButton.setAttribute("aria-expanded", "false");
}

function toggleSidebar() {
  app.classList.toggle("sidebar-closed");
  const isOpen = !app.classList.contains("sidebar-closed");
  menuButton.setAttribute("aria-expanded", String(isOpen));
}

menuButton.addEventListener("click", toggleSidebar);
sidebarBackdrop.addEventListener("click", closeSidebar);


///   SIDEBAR NAVIGATION =========================================================
navItems.forEach((item) => {
  item.addEventListener(
    "click",
    () => {
      navItems.forEach((navItem) => {
        navItem.classList.remove("active");
      });
      item.classList.add("active");

      /*
       * On mobile the drawer closes after
       * selecting a section.
       */
      if (isMobile()) {
        closeSidebar();
      }
      
    }
  );
});


//   ACCOUNT MENU ========================================================= 
profileButton.addEventListener(
  "click",
  (event) => {
    event.stopPropagation();
    const isOpen = accountMenu.classList.contains("open");

    if (isOpen) {
      closeAccountMenu();
    } else {
      openAccountMenu();
    }
  }
);


function openAccountMenu() {
  accountMenu.classList.add("open");
  profileButton.classList.add("active");
  profileButton.setAttribute("aria-expanded", "true");
}

function closeAccountMenu() {
  accountMenu.classList.remove("open");
  profileButton.classList.remove("active");
  profileButton.setAttribute("aria-expanded", "false");
}

/* Close account menu when clicking outside */
document.addEventListener(
  "click",
  (event) => {

    if (
      !event.target.closest(".account")
    ) {
      closeAccountMenu();
    }
  }
);



// ---- AUTH UI ----
loginButton.addEventListener("click", async () => {
  try { await signInWithPopup(auth, provider); } catch(err) { console.error(err); }
});

changeAccountButton.addEventListener("click", async () => {
  try { await signOut(auth); await signInWithPopup(auth, provider); } catch(err){ console.error(err); }
});

logoutButton.addEventListener("click", async () => { 
  await signOut(auth); 
});

resetDataButton.addEventListener("click", async () => {
  if (!auth.currentUser) return;

  const confirmDelete = confirm("Your account and all associated data will be deleted permanently. Continue?");
  if (!confirmDelete) return;

  try {
    const uid = auth.currentUser.uid;
    await deleteUser(auth.currentUser);
  } catch (err) {
    console.error("Error deleting account:", err);

    // important case
    if (err.code === "auth/requires-recent-login") {
      alert("Please log in again before deleting your account.");
    }
  }
});



//  THEME ========================================================= 
function setTheme(theme) {
  document.body.classList.toggle("light-mode", theme === "light");
  localStorage.setItem("aven-theme", theme);
}

function toggleTheme() {
  const isLight = document.body.classList.contains("light-mode");
  setTheme(
    isLight
      ? "dark"
      : "light"
  );
  closeAccountMenu();
}

themeButton.addEventListener(
  "click",
  toggleTheme
);

 
//  INITIAL THEME ========================================================= 
const savedTheme =
  localStorage.getItem(
    "aven-theme"
  );

if (savedTheme) {
  setTheme(savedTheme);
} else {
  const prefersLight =
    window.matchMedia(
      "(prefers-color-scheme: light)"
    ).matches;

  setTheme(
    prefersLight
      ? "light"
      : "dark"
  );
}


//  INITIAL SIDEBAR STATE ========================================================= 
/*
 * Desktop: sidebar starts open.
 * Mobile: sidebar starts closed.
 */
if (isMobile()) {
  closeSidebar();
} else {
  openSidebar();
}


//  HANDLE RESIZE ========================================================= 
window.addEventListener("resize",
  () => {
    /*
     * When switching between desktop
     * and mobile, reset the sidebar state.
     */
    if (isMobile()) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }
);
