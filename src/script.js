// script.js

import { auth, db } from "./firebase.js";

import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  signOut,
  deleteUser
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";


// ELEMENTS =========================================================

const app = document.getElementById("app");
const menuButton = document.getElementById("menu-button");
const sidebarBackdrop = document.getElementById("sidebar-backdrop");

const profileButton = document.getElementById("profile-button");
const accountMenu = document.getElementById("account-menu");

const loginButton = document.querySelector(".login-button");
const changeAccountButton = document.querySelector(".change-account-button");
const logoutButton = document.querySelector(".logout-button");
const resetDataButton = document.querySelector(".reset-data-button");

const themeButton = document.getElementById("light-dark-button");
const userPhoto = document.getElementById("user-photo");

const navItems = document.querySelectorAll(".nav-item");


// AUTH =============================================================

const provider = new GoogleAuthProvider();


// MOBILE DETECTION =================================================

function isMobile() {
  return window.matchMedia("(max-width: 700px)").matches;
}


// LOGIN ============================================================

async function loginWithGoogle() {
  if (!loginButton) return;

  loginButton.disabled = true;

  try {
    await setPersistence(auth, browserLocalPersistence);

    /*
     * Popup is preferable because it does not depend
     * on the browser restoring sessionStorage after a redirect.
     */
    await signInWithPopup(auth, provider);

  } catch (error) {
    console.error("Google login error:", error);

    /*
     * Some mobile browsers may block popups.
     * In that case we fall back to redirect.
     */
    if (
      error.code === "auth/popup-blocked" ||
      error.code === "auth/popup-closed-by-user" ||
      error.code === "auth/cancelled-popup-request"
    ) {
      try {
        await signInWithRedirect(auth, provider);
      } catch (redirectError) {
        console.error("Google redirect error:", redirectError);
      }
    } else {
      alert("Unable to log in with Google.");
    }

  } finally {
    loginButton.disabled = false;
  }
}


// HANDLE REDIRECT RESULT ===========================================

getRedirectResult(auth)
  .then((result) => {
    if (result?.user) {
      console.log("Google redirect login successful.");
    }
  })
  .catch((error) => {
    console.error("Redirect login error:", error);
  });


// AUTH STATE =======================================================

onAuthStateChanged(auth, (user) => {

  if (user) {

    console.log("User logged in:", user.uid);

    document.body.classList.add("authenticated");
    document.body.classList.remove("unauthenticated");

    if (loginButton) {
      loginButton.classList.add("hidden");
    }

    if (userPhoto) {
      userPhoto.src = user.photoURL || "";
      userPhoto.alt = user.displayName || "Account";
    }

  } else {

    console.log("User not logged in.");

    document.body.classList.remove("authenticated");
    document.body.classList.add("unauthenticated");

    if (loginButton) {
      loginButton.classList.remove("hidden");
    }

    if (userPhoto) {
      userPhoto.removeAttribute("src");
    }

    closeAccountMenu();
    closeSidebar();
  }
});


// SIDEBAR ==========================================================

function openSidebar() {
  if (!app) return;

  app.classList.remove("sidebar-closed");

  if (menuButton) {
    menuButton.setAttribute("aria-expanded", "true");
  }
}


function closeSidebar() {
  if (!app) return;

  app.classList.add("sidebar-closed");

  if (menuButton) {
    menuButton.setAttribute("aria-expanded", "false");
  }
}


function toggleSidebar() {
  if (!auth.currentUser) return;

  app.classList.toggle("sidebar-closed");

  const isOpen = !app.classList.contains("sidebar-closed");

  if (menuButton) {
    menuButton.setAttribute("aria-expanded", String(isOpen));
  }
}


if (menuButton) {
  menuButton.addEventListener("click", toggleSidebar);
}


if (sidebarBackdrop) {
  sidebarBackdrop.addEventListener("click", closeSidebar);
}


// SIDEBAR NAVIGATION ===============================================

navItems.forEach((item) => {

  item.addEventListener("click", () => {

    if (!auth.currentUser) return;

    navItems.forEach((navItem) => {
      navItem.classList.remove("active");
    });

    item.classList.add("active");

    if (isMobile()) {
      closeSidebar();
    }
  });

});


// ACCOUNT MENU =====================================================

function openAccountMenu() {

  if (!accountMenu || !profileButton) return;

  accountMenu.classList.add("open");
  profileButton.classList.add("active");
  profileButton.setAttribute("aria-expanded", "true");
}


function closeAccountMenu() {

  if (!accountMenu || !profileButton) return;

  accountMenu.classList.remove("open");
  profileButton.classList.remove("active");
  profileButton.setAttribute("aria-expanded", "false");
}


if (profileButton) {

  profileButton.addEventListener("click", (event) => {

    event.stopPropagation();

    if (!auth.currentUser) return;

    const isOpen = accountMenu.classList.contains("open");

    if (isOpen) {
      closeAccountMenu();
    } else {
      openAccountMenu();
    }
  });

}


// CLOSE ACCOUNT MENU WHEN CLICKING OUTSIDE =========================

document.addEventListener("click", (event) => {

  if (!event.target.closest(".account")) {
    closeAccountMenu();
  }

});


// ACCOUNT ACTIONS ==================================================

if (loginButton) {
  loginButton.addEventListener("click", loginWithGoogle);
}


if (changeAccountButton) {

  changeAccountButton.addEventListener("click", async () => {

    try {
      await signOut(auth);
      await loginWithGoogle();
    } catch (error) {
      console.error("Change account error:", error);
    }

  });

}


if (logoutButton) {

  logoutButton.addEventListener("click", async () => {

    try {
      await signOut(auth);
      closeAccountMenu();
    } catch (error) {
      console.error("Logout error:", error);
    }

  });

}


if (resetDataButton) {

  resetDataButton.addEventListener("click", async () => {

    if (!auth.currentUser) return;

    const confirmed = confirm(
      "Your account and all associated data will be deleted permanently. Continue?"
    );

    if (!confirmed) return;

    try {

      const user = auth.currentUser;

      // Delete Firestore data here later.

      await deleteUser(user);

    } catch (error) {

      console.error("Error deleting account:", error);

      if (error.code === "auth/requires-recent-login") {
        alert("Please log in again before deleting your account.");
      }

    }

  });

}


// THEME ============================================================

function setTheme(theme) {

  document.body.classList.toggle("light-mode", theme === "light");

  localStorage.setItem("aven-theme", theme);
}


function toggleTheme() {

  const isLight = document.body.classList.contains("light-mode");

  setTheme(isLight ? "dark" : "light");

  closeAccountMenu();
}


if (themeButton) {
  themeButton.addEventListener("click", toggleTheme);
}


// INITIAL THEME ====================================================

const savedTheme = localStorage.getItem("aven-theme");

if (savedTheme) {

  setTheme(savedTheme);

} else {

  const prefersLight = window.matchMedia(
    "(prefers-color-scheme: light)"
  ).matches;

  setTheme(prefersLight ? "light" : "dark");
}


// INITIAL SIDEBAR ==================================================

if (isMobile()) {
  closeSidebar();
} else {
  openSidebar();
}


// HANDLE RESIZE ====================================================

window.addEventListener("resize", () => {

  if (isMobile()) {
    closeSidebar();
  } else {
    openSidebar();
  }

});
