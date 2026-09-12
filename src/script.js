// script.js

import { auth } from "./firebase.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  signOut,
  deleteUser
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
    getWeather,
    getCurrentWeather,
    getHourlyPreview,
    getNextDays,
    hasPrecipitationToday
} from "./weather.js";

import { initTodos, openTodoModal } from "./todo.js";
import { initDailyPlanner } from "./daily-planner.js";
import { initRoutines, openRoutineModal } from "./routines.js";
import { initBirthdays, openBirthdayModal } from "./birthdays.js";
import { isHealthKitAvailable, requestHealthPermission, getTodayHealth } from "./health.js";
import { initRecap } from "./recap.js";
import {
  getGoogleCalendarList,
  getGoogleCalendarSettings,
  saveMonitoredCalendarIds
} from "./google-calendar.js";

// ELEMENTS =========================================================

const app = document.getElementById("app");
const authGate = document.getElementById("auth-gate");
const loginButton = document.getElementById("login-button");

const menuButton = document.getElementById("menu-button");
const sidebarBackdrop = document.getElementById("sidebar-backdrop");

const checkCalendarSidebar = document.getElementById("check-calendar-sidebar");

const profileButton = document.getElementById("profile-button");
const userPhoto = document.getElementById("user-photo");
const accountMenu = document.getElementById("account-menu");

const themeButton = document.getElementById("light-dark-button");
const changeAccountButton = document.getElementById("change-account-button");
const logoutButton = document.getElementById("logout-button");
const resetDataButton = document.getElementById("reset-data-button");

const navItems = document.querySelectorAll(".nav-item");

const monitoredCalendarsPanel = document.getElementById("monitored-calendars-panel");
const monitoredCalendarsPanelBackdrop = document.getElementById("monitored-calendars-panel-backdrop");
const monitoredCalendarsClose = document.getElementById("monitored-calendars-close");
const monitoredCalendarsList = document.getElementById("monitored-calendars-list");



// AUTH =========================================================
const provider = new GoogleAuthProvider();

provider.addScope(
  "https://www.googleapis.com/auth/calendar.events.readonly"
);

provider.addScope(
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly"
);


setPersistence(
  auth,
  browserLocalPersistence
).catch((err) => {

  console.error(
    "Persistence error:",
    err
  );

});


// AUTH STATE =========================================================

onAuthStateChanged(auth, (user) => {

  if (user) {

    console.log("User logged:", user.uid);

    authGate.classList.add("hidden");

    if (user.photoURL) {
      userPhoto.src = user.photoURL;
    }

  } else {

    console.log("User NOT logged");

    authGate.classList.remove("hidden");

    closeAccountMenu();
    closeSidebar();

  }

});


// LOGIN =========================================================

loginButton.addEventListener(
  "click",
  async () => {

    loginButton.disabled = true;
    loginButton.textContent = "Signing in...";

    try {

      const result =
        await signInWithPopup(
          auth,
          provider
        );


      const credential =
        GoogleAuthProvider
          .credentialFromResult(
            result
          );


      if (
        credential?.accessToken
      ) {

        sessionStorage.setItem(
          "aven-google-access-token",
          credential.accessToken
        );

        const settings = await getGoogleCalendarSettings();

        if (!settings.configured) {
          await openMonitoredCalendarsPanel();
        }
      }

    } catch (err) {

      console.error(
        "Login error:",
        err
      );

      loginButton.disabled = false;
      loginButton.innerHTML = '<span class="google-icon">G</span> Continue with Google';
    }
  }
);


// RESPONSIVE SIDEBAR =========================================================

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

  if (app.classList.contains("sidebar-closed")) {
    openSidebar();
  } else {
    closeSidebar();
  }

}


menuButton.addEventListener("click", toggleSidebar);

sidebarBackdrop.addEventListener("click", closeSidebar);


// SIDEBAR NAVIGATION =========================================================

navItems.forEach((item) => {

  item.addEventListener("click", () => {

    navItems.forEach((navItem) => {
      navItem.classList.remove("active");
    });

    item.classList.add("active");

    if (isMobile()) {
      closeSidebar();
    }

  });

});


checkCalendarSidebar.addEventListener("click", () => {
  window.location.href = "https://giallumigliet.github.io/check_calendar/";
});


// ACCOUNT MENU =========================================================

profileButton.addEventListener("click", (event) => {

  event.stopPropagation();

  if (accountMenu.classList.contains("open")) {
    closeAccountMenu();
  } else {
    openAccountMenu();
  }
  closeWeatherPanel();

});


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


document.addEventListener("click", (event) => {

  if (!event.target.closest(".account")) {
    closeAccountMenu();
  }

});



// MONITORED CALENDARS =========================================================

const monitoredCalendarsButton =
  document.getElementById(
    "monitored-calendars-button"
  );

const monitoredCalendarsPanel =
  document.getElementById(
    "monitored-calendars-panel"
  );

const monitoredCalendarsPanelBackdrop =
  document.getElementById(
    "monitored-calendars-panel-backdrop"
  );

const monitoredCalendarsClose =
  document.getElementById(
    "monitored-calendars-close"
  );

const monitoredCalendarsList =
  document.getElementById(
    "monitored-calendars-list"
  );


// ---------------------------------------------------------
// OPEN
// ---------------------------------------------------------

async function openMonitoredCalendarsPanel() {

  if (!auth.currentUser) {
    return;
  }


  monitoredCalendarsList.innerHTML = `
    <p class="monitored-calendars-empty">
      Loading calendars...
    </p>
  `;


  monitoredCalendarsPanel.classList.add(
    "open"
  );

  monitoredCalendarsPanel.setAttribute(
    "aria-hidden",
    "false"
  );


  try {

    const [
      calendars,
      settings
    ] = await Promise.all([

      getGoogleCalendarList(),

      getGoogleCalendarSettings()

    ]);


    const selectedIds =
      settings.calendarIds || [];


    monitoredCalendarsList.innerHTML =
      "";


    if (!calendars.length) {

      monitoredCalendarsList.innerHTML = `
        <p class="monitored-calendars-empty">
          No calendars available.
        </p>
      `;

      return;

    }


    calendars.forEach(
      (calendar) => {

        const label =
          document.createElement(
            "label"
          );


        label.className =
          "monitored-calendar-item";


        const checkbox =
          document.createElement(
            "input"
          );


        checkbox.type =
          "checkbox";

        checkbox.value =
          calendar.id;

        checkbox.checked =
          selectedIds.includes(
            calendar.id
          );


        const text =
          document.createElement(
            "span"
          );


        text.textContent =
          calendar.summary;


        label.appendChild(
          checkbox
        );

        label.appendChild(
          text
        );


        monitoredCalendarsList.appendChild(
          label
        );

      }
    );


  } catch (error) {

    console.error(
      "Error opening monitored calendars:",
      error
    );


    monitoredCalendarsList.innerHTML = `
      <p class="monitored-calendars-empty">
        Unable to load calendars.
      </p>
    `;

  }

}


// ---------------------------------------------------------
// CLOSE + SAVE
// ---------------------------------------------------------

let monitoredCalendarsClosing =
  false;


async function closeMonitoredCalendarsPanel() {

  if (
    monitoredCalendarsClosing
  ) {
    return;
  }


  monitoredCalendarsClosing =
    true;


  try {

    const checkboxes =
      monitoredCalendarsList.querySelectorAll(
        'input[type="checkbox"]'
      );


    const selectedIds =
      [...checkboxes]

        .filter(
          (checkbox) =>
            checkbox.checked
        )

        .map(
          (checkbox) =>
            checkbox.value
        );


    await saveMonitoredCalendarIds(
      selectedIds
    );


    monitoredCalendarsPanel.classList.remove(
      "open"
    );

    monitoredCalendarsPanel.setAttribute(
      "aria-hidden",
      "true"
    );


  } catch (error) {
    console.error(
      "Error saving monitored calendars:",
      error
    );


  } finally {
    monitoredCalendarsClosing =
      false;

  }

}


monitoredCalendarsButton.addEventListener(
  "click",
  async () => {

    closeAccountMenu();

    await openMonitoredCalendarsPanel();

  }
);

monitoredCalendarsClose.addEventListener(
  "click",
  closeMonitoredCalendarsPanel
);

monitoredCalendarsPanelBackdrop.addEventListener(
  "click",
  closeMonitoredCalendarsPanel
);



// CHANGE ACCOUNT =========================================================
changeAccountButton.addEventListener(
  "click",
  async () => {

    try {

      closeAccountMenu();


      await signOut(auth);


      sessionStorage.removeItem(
        "aven-google-access-token"
      );


      const result =
        await signInWithPopup(
          auth,
          provider
        );


      const credential =
        GoogleAuthProvider
          .credentialFromResult(
            result
          );


      if (
        credential?.accessToken
      ) {

        sessionStorage.setItem(
          "aven-google-access-token",
          credential.accessToken
        );


        const settings = await getGoogleCalendarSettings();


        if (
          !settings.configured
        ) {

          await openMonitoredCalendarsPanel();
        }
      }


    } catch (err) {

      console.error(
        "Change account error:",
        err
      );
    }
  }
);



// LOGOUT =========================================================

logoutButton.addEventListener("click", async () => {

  try {

    closeAccountMenu();
    await signOut(auth);

  } catch (err) {

    console.error("Logout error:", err);

  }

});


// RESET DATA / ACCOUNT =========================================================

resetDataButton.addEventListener("click", async () => {

  if (!auth.currentUser) return;

  const confirmDelete = confirm(
    "Your account and all associated data will be deleted permanently. Continue?"
  );

  if (!confirmDelete) return;

  try {

    await deleteUser(auth.currentUser);

  } catch (err) {

    console.error("Error deleting account:", err);

    if (err.code === "auth/requires-recent-login") {

      alert("Please log in again before deleting your account.");

    }

  }

});


// THEME =========================================================

function setTheme(theme) {

  document.body.classList.toggle("light-mode", theme === "light");

  localStorage.setItem("aven-theme", theme);

}


function toggleTheme() {

  const isLight = document.body.classList.contains("light-mode");

  setTheme(isLight ? "dark" : "light");

  closeAccountMenu();

}


themeButton.addEventListener("click", toggleTheme);


// INITIAL THEME =========================================================

const savedTheme = localStorage.getItem("aven-theme");

if (savedTheme) {

  setTheme(savedTheme);

} else {

  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;

  setTheme(prefersLight ? "light" : "dark");

}


// INITIAL SIDEBAR =========================================================

if (isMobile()) {
  closeSidebar();
} else {
  openSidebar();
}


// HANDLE RESIZE =========================================================

window.addEventListener("resize", () => {

  if (isMobile()) {
    closeSidebar();
  } else {
    openSidebar();
  }

});





// ADD MENU =========================================================

const addPanel = document.getElementById("add-panel");
const addToggle = document.getElementById("add-toggle");

const addRoutineButton = document.getElementById("add-routine");
const addBirthdayButton = document.getElementById("add-birthday");
const addTodoButton = document.getElementById("add-todo");


addToggle.addEventListener("click", () => {
  addPanel.classList.toggle("open");
});


document.addEventListener("click", (event) => {
  if (
    addPanel.classList.contains("open") &&
    !addPanel.contains(event.target)
  ) {
    addPanel.classList.remove("open");
  }
});


addRoutineButton.addEventListener("click", () => {
  addPanel.classList.remove("open");
  openRoutineModal();
});


addBirthdayButton.addEventListener("click", () => {
  addPanel.classList.remove("open");
  openBirthdayModal();
});


addTodoButton.addEventListener("click", () => {
  addPanel.classList.remove("open");
  openTodoModal();
});


// ROUTINES ======================================================
initRoutines();

// BIRTHDAYS =====================================================
initBirthdays();

// TODOS =========================================================
initTodos();

// DAILY PLANNER =================================================
initDailyPlanner();

// DAILY RECAP ===================================================
initRecap();



// WEATHER =========================================================
const weatherButton = document.getElementById("weather-button");
const weatherHourly = document.getElementById("weather-hourly");
const weatherDaily = document.getElementById("weather-daily");
const weatherWarning = document.querySelector(".weather-warning");

const weatherPanel = document.getElementById("weather-panel");

const hourlyTab = document.getElementById("weather-hourly-tab");
const dailyTab = document.getElementById("weather-daily-tab");


const weatherData = await getWeather();
const currentWeather = getCurrentWeather(weatherData);
const hours = getHourlyPreview(weatherData);
const days = getNextDays(weatherData);


weatherButton.innerHTML = `
    <span class="weather-icon">${weatherData.location}</span>
    <span class="weather-icon">${currentWeather.icon}</span>
    <span class="temperature">${currentWeather.temperature}°</span>
    <span class="weather-warning">${hasPrecipitationToday(weatherData) ? "⚠" : ""}</span>
`;


weatherHourly.innerHTML = hours.map(hour => `

    <div class="weather-hour">
        <span class="weather-hour-time"> ${hour.hour} </span>
        <span class="weather-hour-icon"> ${hour.icon} </span>
        <span class="weather-hour-temperature"> ${hour.temperature}° </span>
        ${hour.probability >= 30
            ? `<span class="weather-hour-probability">${hour.probability}%</span>`
            : ""
        }
    </div>
`).join("");


weatherDaily.innerHTML = days.map(day => `
    <div class="weather-day">
        <span class="weather-day-name"> ${day.day} </span>
        <span class="weather-day-icon"> ${day.icon} </span>
        <span class="weather-day-temperature"> ${day.min}° / ${day.max}° </span>
        ${day.probability >= 30
            ? `<span class="weather-day-probability">${day.probability}%</span>`
            : ""
        }
    </div>
`).join("");






hourlyTab.addEventListener("click", () => {
  weatherHourly.style.display = "flex";
  weatherDaily.style.display = "none";
  hourlyTab.classList.add("active");
  dailyTab.classList.remove("active");
});

dailyTab.addEventListener("click", () => {
  weatherHourly.style.display = "none";
  weatherDaily.style.display = "flex";
  dailyTab.classList.add("active");
  hourlyTab.classList.remove("active");
});




weatherButton.addEventListener("click", (event) => {
  event.stopPropagation();

  if (weatherPanel.classList.contains("open")) {
    closeWeatherPanel();
  } else {
    openWeatherPanel();
  }
  closeAccountMenu();
});


function openWeatherPanel() {
  weatherPanel.classList.add("open");
  weatherButton.classList.add("active");
  weatherButton.setAttribute("aria-expanded", "true");
}


function closeWeatherPanel() {
  weatherPanel.classList.remove("open");
  weatherButton.classList.remove("active");
  weatherButton.setAttribute("aria-expanded", "false");
}


document.addEventListener("click", (event) => {
  if (!event.target.closest(".weather")) {
    closeWeatherPanel();
  }
});




// HEALTH =========================================================
const healthSidebar = document.getElementById("health-sidebar");
const healthPanel = document.getElementById("health-panel");
const healthClose = document.getElementById("health-close");

const healthSteps = document.getElementById("health-steps");
const healthDistance = document.getElementById("health-distance");
const healthConnectButton = document.getElementById("health-connect-button");
const healthStatus = document.getElementById("health-status");
const healthPanelBackdrop = document.getElementById("health-panel-backdrop");


function openHealthPanel() {
  healthPanel.classList.add("open");
  healthSidebar.classList.add("active");
}

function closeHealthPanel() {
  healthPanel.classList.remove("open");
  healthSidebar.classList.remove("active");
}

healthSidebar.addEventListener("click", () => {
  openHealthPanel();

  if (!isHealthKitAvailable()) {
    healthStatus.textContent =
      "Apple Health è disponibile nell'app AVEN per iPhone.";

    healthConnectButton.disabled = true;
    return;
  }

  healthStatus.textContent = "";
  healthConnectButton.disabled = false;
});

healthClose.addEventListener("click", closeHealthPanel);

healthConnectButton.addEventListener("click", async () => {

  if (!isHealthKitAvailable()) {
    healthStatus.textContent =
      "Apple Health è disponibile nell'app AVEN per iPhone.";
    return;
  }

  healthConnectButton.disabled = true;
  healthStatus.textContent = "Connecting to Apple Health…";

  try {

    await requestHealthPermission();

    const health = await getTodayHealth();

    healthSteps.textContent =
      Number(health.steps || 0).toLocaleString("it-IT");

    healthDistance.textContent =
      Number(health.distanceKm || 0).toFixed(2);

    healthStatus.textContent = "Dati aggiornati";

  } catch (error) {

    console.error("HealthKit:", error);

    healthStatus.textContent =
      error.message ||
      "Impossibile leggere i dati Apple Health.";

  } finally {

    healthConnectButton.disabled = false;

  }
});

healthPanelBackdrop.addEventListener("click", closeHealthPanel);
