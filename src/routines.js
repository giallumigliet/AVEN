// routines.js
import { auth, db } from "./firebase.js";
import { collection, addDoc, serverTimestamp, onSnapshot, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


// ELEMENTS =========================================================

const routinesSidebar = document.getElementById("routines-sidebar");

const routineModal = document.getElementById("routine-modal");
const routineModalBackdrop = document.getElementById("routine-modal-backdrop");

const closeRoutineModalButton = document.getElementById("close-routine-modal");

const deleteRoutineButton = document.getElementById("delete-routine");

const routineForm = document.getElementById("routine-form");
const routineName = document.getElementById("routine-name");

const routineInterval = document.getElementById("routine-interval");
const routineUnit = document.getElementById("routine-unit");

const weeklyDaysField = document.getElementById("weekly-days-field");
const monthlyDayField = document.getElementById("monthly-day-field");

const monthlyDay = document.getElementById("routine-month-day");
const routineStart = document.getElementById("routine-start");

const addRoutineTimeButton = document.getElementById("add-routine-time");
const routineTimes = document.getElementById("routine-times");

const routinePreview = document.getElementById("routine-preview");

const weekdayButtons = document.querySelectorAll(".weekday-picker button");

const routinesPanel = document.getElementById("routines-panel");
const closeRoutinesPanelButton = document.getElementById("close-routines-panel");
const routinesList = document.getElementById("routines-list");
const routinesPanelBackdrop = document.getElementById("routines-panel-backdrop");

const routineCategoryPicker = document.getElementById("routine-category-picker");
const routineCategoryFilter = document.getElementById("routine-category-filter");

let selectedRoutineCategory = "all";
let routineFormCategory = "";
let editingRoutineId = null;
let routinesPanelTrigger = null;

const ROUTINE_CATEGORIES = [
  { id: "money", label: "Money", icon: "💰" },
  { id: "home", label: "Home", icon: "🏠" },
  { id: "shopping", label: "Shopping", icon: "🛒" },
  { id: "people", label: "People", icon: "👨‍👩‍👧" },
  { id: "training", label: "Training", icon: "🏋️" },
  { id: "work", label: "Work", icon: "💼" },
  { id: "freeTime", label: "Free time", icon: "🎨" },
  { id: "car", label: "Car", icon: "🚗" },
  { id: "health", label: "Health", icon: "❤️" },
  { id: "study", label: "Study", icon: "📚" },
  { id: "pets", label: "Pets", icon: "🐾" },
  { id: "tech", label: "Tech", icon: "💻" }
];



// MODAL =========================================================

export function openRoutineModal() {
  editingRoutineId = null;

  deleteRoutineButton.hidden = true;

  routineForm.reset();
  routineTimes.innerHTML = "";

  routineFormCategory = "";
  RoutineCategoryPicker();

  weekdayButtons.forEach((button) => {
    button.classList.remove("active");
  });

  updateRoutineFrequencyUI();

  routineModal.classList.add("open");
  routineModalBackdrop.classList.add("open");
  routineModal.setAttribute("aria-hidden", "false");

  routineName.focus();
}



function openRoutineEditModal(routineId, routine) {

  editingRoutineId = routineId;
  deleteRoutineButton.hidden = false;

  routineName.value = routine.name || "";
  routineInterval.value = routine.interval || 1;
  routineUnit.value = routine.unit || "days";
  routineStart.value = routine.startDate || "";
  monthlyDay.value = routine.monthlyDay || 1;
  routineFormCategory = routine.category || "";
  RoutineCategoryPicker();

  weekdayButtons.forEach((button) => {

    const day = Number(button.dataset.day);

    button.classList.toggle(
      "active",
      (routine.weekdays || []).includes(day)
    );

  });

  routineTimes.innerHTML = "";

  (routine.times || []).forEach((time) => {
    addRoutineTime(time);
  });

  if (!routine.times || routine.times.length === 0) {
    addRoutineTime();
  }

  updateRoutineFrequencyUI();

  routineModal.classList.add("open");
  routineModalBackdrop.classList.add("open");
  routineModal.setAttribute("aria-hidden", "false");

  routineName.focus();
}





function closeRoutineModal() {
  // Sposta il focus fuori dal modal prima di nasconderlo
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }

  routineModal.classList.remove("open");
  routineModalBackdrop.classList.remove("open");
  routineModal.setAttribute("aria-hidden", "true");
}


// FREQUENCY =========================================================

function updateRoutineFrequencyUI() {

  const unit = routineUnit.value;

  weeklyDaysField.hidden = unit !== "weeks";
  monthlyDayField.hidden = unit !== "months";

  updateRoutinePreview();

}


// WEEKDAYS =========================================================

function getSelectedWeekdays() {

  return [...weekdayButtons]
    .filter(button => button.classList.contains("active"))
    .map(button => Number(button.dataset.day));

}


function setupWeekdayPicker() {

  weekdayButtons.forEach((button) => {

    button.addEventListener("click", () => {

      button.classList.toggle("active");

      updateRoutinePreview();

    });

  });

}


// TIMES =========================================================

function getRoutineTimes() {

  return [...routineTimes.querySelectorAll("input[type='time']")]
    .map(input => input.value)
    .filter(Boolean);

}


function addRoutineTime(value = "") {

  const row = document.createElement("div");

  row.className = "routine-time-row";

  row.innerHTML = `
    <input
      type="time"
      value="${value}"
      aria-label="Routine time"
    >

    <button
      type="button"
      class="remove-time-button"
      aria-label="Remove time"
    >
      ×
    </button>
  `;

  const input = row.querySelector("input");
  const removeButton = row.querySelector(".remove-time-button");

  input.addEventListener("input", updateRoutinePreview);

  removeButton.addEventListener("click", () => {

    row.remove();

    updateRoutinePreview();

  });

  routineTimes.appendChild(row);

  updateRoutinePreview();

}


// PREVIEW =========================================================

function getOrdinal(number) {

  if (number >= 11 && number <= 13) {
    return "th";
  }

  switch (number % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }

}


function updateRoutinePreview() {

  const interval = Math.max(
    1,
    Number(routineInterval.value) || 1
  );

  const unit = routineUnit.value;

  const times = getRoutineTimes();

  let text = "";


  // DAYS ------------------------------------------------------------

  if (unit === "days") {

    text = interval === 1
      ? "Every day"
      : `Every ${interval} days`;

  }


  // WEEKS -----------------------------------------------------------

  if (unit === "weeks") {

    const selectedDays = getSelectedWeekdays();

    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday"
    ];

    const names = selectedDays.map(
      day => dayNames[day]
    );

    text = interval === 1
      ? "Every week"
      : `Every ${interval} weeks`;


    if (names.length === 1) {

      text += ` on ${names[0]}`;

    } else if (names.length > 1) {

      const last = names.pop();

      text += ` on ${names.join(", ")} and ${last}`;

    }

  }


  // MONTHS ----------------------------------------------------------

  if (unit === "months") {

    const day = Math.min(
      31,
      Math.max(1, Number(monthlyDay.value) || 1)
    );

    text = interval === 1
      ? `Every month on the ${day}${getOrdinal(day)}`
      : `Every ${interval} months on the ${day}${getOrdinal(day)}`;

  }


  // TIMES -----------------------------------------------------------

  if (times.length === 1) {

    text += ` at ${times[0]}`;

  } else if (times.length > 1) {

    text += ` at ${times.join(" and ")}`;

  }


  routinePreview.textContent = text;

}


// CREATE ROUTINE OBJECT =========================================================

function getRoutineData() {

  return {

    name: routineName.value.trim(),

    category: routineFormCategory,

    interval: Math.max(
      1,
      Number(routineInterval.value) || 1
    ),

    unit: routineUnit.value,

    weekdays: getSelectedWeekdays(),

    monthlyDay:
      routineUnit.value === "months"
        ? Number(monthlyDay.value)
        : null,

    startDate:
      routineStart.value || null,

    times: getRoutineTimes(),

    enabled: true

  };

}



// FIRESTORE =========================================================

async function saveRoutine(routine) {

  const user = auth.currentUser;

  if (!user) {
    throw new Error("User not authenticated.");
  }

  const routinesRef = collection(
    db,
    "users",
    user.uid,
    "routines"
  );

  // MODIFICA
  if (editingRoutineId) {

    const routineRef = doc(
      routinesRef,
      editingRoutineId
    );

    await updateDoc(routineRef, {
      ...routine,
      updatedAt: serverTimestamp()
    });

    return;
  }

  // CREAZIONE
  await addDoc(routinesRef, {

    ...routine,

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()

  });
}


async function deleteRoutine() {
  const user = auth.currentUser;

  if (!user || !editingRoutineId) {
    return;
  }

  const confirmed = confirm(
    "Sei sicuro di voler eliminare questa routine?"
  );

  if (!confirmed) {
    return;
  }

  try {
    const routineRef = doc(
      db,
      "users",
      user.uid,
      "routines",
      editingRoutineId
    );

    await deleteDoc(routineRef);

    editingRoutineId = null;

    closeRoutineModal();

  } catch (error) {
    console.error("Error deleting routine:", error);
  }
}


// SUBMIT =========================================================
async function handleRoutineSubmit(event) {

  event.preventDefault();

  const routine = getRoutineData();

  if (!routine.name) {
    routineName.focus();
    return;
  }

  try {

    await saveRoutine(routine);

    console.log(
      editingRoutineId
        ? "Routine updated:"
        : "Routine saved:",
      routine
    );

    editingRoutineId = null;

    routineForm.reset();
    routineTimes.innerHTML = "";

    weekdayButtons.forEach((button) => {
      button.classList.remove("active");
    });

    updateRoutineFrequencyUI();

    closeRoutineModal();

  } catch (error) {

    console.error(
      "Error saving routine:",
      error
    );

  }
}


// INITIALIZATION =========================================================

export function initRoutines() {

  if (!routinesSidebar || !routineModal) {
    console.warn("Routine elements not found.");
    return;
  }

  routinesSidebar.addEventListener("click", () => { openRoutinesPanel(); });
  
  routinesPanelBackdrop.addEventListener("click", closeRoutinesPanel);

  closeRoutineModalButton.addEventListener("click", closeRoutineModal);
  
  closeRoutinesPanelButton.addEventListener("click", closeRoutinesPanel);

  deleteRoutineButton.addEventListener("click", deleteRoutine);

  routineModalBackdrop.addEventListener("click", closeRoutineModal);

  routineUnit.addEventListener("change", updateRoutineFrequencyUI);

  routineInterval.addEventListener("input", updateRoutinePreview);

  monthlyDay.addEventListener("input", updateRoutinePreview);

  routineStart.addEventListener("change", updateRoutinePreview);

  addRoutineTimeButton.addEventListener("click", () => addRoutineTime());

  routineForm.addEventListener("submit", handleRoutineSubmit);

  setupWeekdayPicker();

  updateRoutineFrequencyUI();

}



function getRoutineFrequencyText(routine) {
  const interval = routine.interval || 1;

  if (routine.unit === "days") {
    return interval === 1
      ? "Ogni giorno"
      : `Ogni ${interval} giorni`;
  }

  if (routine.unit === "weeks") {
    const dayNames = [
      "domenica",
      "lunedì",
      "martedì",
      "mercoledì",
      "giovedì",
      "venerdì",
      "sabato"
    ];

    const days = (routine.weekdays || [])
      .map(day => dayNames[day])
      .filter(Boolean);

    let text = interval === 1
      ? "Ogni settimana"
      : `Ogni ${interval} settimane`;

    if (days.length === 1) {
      text += ` · ${days[0]}`;
    } else if (days.length > 1) {
      text += ` · ${days.join(", ")}`;
    }

    return text;
  }

  if (routine.unit === "months") {
    const day = routine.monthlyDay || 1;

    return interval === 1
      ? `Ogni mese · giorno ${day}`
      : `Ogni ${interval} mesi · giorno ${day}`;
  }

  return "";
}


function RoutineCategoryPicker() {

  routineCategoryPicker.innerHTML = `
    <button
      type="button"
      class="routine-category-option ${
        routineFormCategory === "" ? "active" : ""
      }"
      data-category=""
    >
      <span class="routine-category-option-icon">✦</span>
      <span class="routine-category-option-name">None</span>
    </button>

    ${ROUTINE_CATEGORIES.map(
      (category) => `
        <button
          type="button"
          class="routine-category-option ${
            routineFormCategory === category.id
              ? "active"
              : ""
          }"
          data-category="${category.id}"
        >
          <span class="routine-category-option-icon">
            ${category.icon}
          </span>
          <span class="routine-category-option-name">
            ${category.label}
          </span>
        </button>
      `
    ).join("")}
  `;

  routineCategoryPicker
    .querySelectorAll(".routine-category-option")
    .forEach((button) => {

      button.addEventListener("click", () => {

        routineFormCategory =
          button.dataset.category;

        RoutineCategoryPicker();
      });

    });
}


function renderRoutineCategories(routines) {
  const counts = {};

  ROUTINE_CATEGORIES.forEach((category) => {
    counts[category.id] = 0;
  });

  routines.forEach((routine) => {
    if (routine.category) {
      counts[routine.category] =
        (counts[routine.category] || 0) + 1;
    }
  });

  const allCount = routines.length;

  routineCategoryFilter.innerHTML = `
    <button
      type="button"
      class="routine-category-item ${
        selectedRoutineCategory === "all" ? "active" : ""
      }"
      data-category="all"
    >
      <span class="routine-category-icon">✦</span>
      <span class="routine-category-count">${allCount}</span>
    </button>

    ${ROUTINE_CATEGORIES.map(
      (category) => `
        <button
          type="button"
          class="routine-category-item ${
            selectedRoutineCategory === category.id
              ? "active"
              : ""
          }"
          data-category="${category.id}"
        >
          <span class="routine-category-icon">
            ${category.icon}
          </span>
          <span class="routine-category-count">
            ${counts[category.id] || 0}
          </span>
        </button>
      `
    ).join("")}
  `;

  routineCategoryFilter
    .querySelectorAll(".routine-category-item")
    .forEach((button) => {
      button.addEventListener("click", () => {
        selectedRoutineCategory =
          button.dataset.category;

        renderRoutineCategories(routines);
        renderRoutinesList(routines);
      });
    });
}





function renderRoutines(snapshot) {
  const routines = [];

  snapshot.forEach((documentSnapshot) => {
    routines.push({
      id: documentSnapshot.id,
      ...documentSnapshot.data()
    });
  });

  renderRoutineCategories(routines);

  renderRoutinesList(routines);
}



function renderRoutinesList(routines) {

  routinesList.innerHTML = "";

  const filteredRoutines =
    selectedRoutineCategory === "all"
      ? routines
      : routines.filter(
          (routine) =>
            routine.category === selectedRoutineCategory
        );

  if (filteredRoutines.length === 0) {

    routinesList.innerHTML = `
      <div class="routines-empty">
        <span>Nessuna routine</span>
        <small>Nessuna routine in questa categoria</small>
      </div>
    `;

    return;
  }

  filteredRoutines.forEach((routine) => {

    const routineId = routine.id;

    const item = document.createElement("div");

    item.className = "routine-list-item";

    item.addEventListener("click", (event) => {

      if (event.target.closest(".routine-switch")) {
        return;
      }

      closeRoutinesPanel();

      openRoutineEditModal(
        routineId,
        routine
      );
    });

    item.innerHTML = `
      <div class="routine-list-info">
        <div class="routine-list-name"></div>
        <div class="routine-list-frequency"></div>
      </div>

      <label class="routine-switch">
        <input
          type="checkbox"
          class="routine-enabled-toggle"
          ${routine.enabled !== false ? "checked" : ""}
        >
        <span class="routine-switch-track"></span>
      </label>
    `;

    item.querySelector(
      ".routine-list-name"
    ).textContent =
      routine.name || "Routine senza nome";

    item.querySelector(
      ".routine-list-frequency"
    ).textContent =
      getRoutineFrequencyText(routine);

    const toggle =
      item.querySelector(
        ".routine-enabled-toggle"
      );

    toggle.addEventListener(
      "click",
      (event) => {
        event.stopPropagation();
      }
    );

    toggle.addEventListener(
      "change",
      () => {
        updateRoutineEnabled(
          routineId,
          toggle.checked
        );
      }
    );

    routinesList.appendChild(item);
  });
}



async function updateRoutineEnabled(routineId, enabled) {

  const user = auth.currentUser;

  if (!user) {
    console.error("User not authenticated.");
    return;
  }

  try {

    const routineRef = doc(
      db,
      "users",
      user.uid,
      "routines",
      routineId
    );

    await updateDoc(routineRef, {
      enabled
    });

    console.log(
      `Routine ${routineId} ${enabled ? "enabled" : "disabled"}`
    );

  } catch (error) {

    console.error(
      "Error updating routine:",
      error
    );

  }
}




let routinesUnsubscribe = null;

function listenToRoutines() {

  const user = auth.currentUser;

  if (!user) {
    return;
  }

  if (routinesUnsubscribe) {
    routinesUnsubscribe();
  }

  const routinesRef = collection(
    db,
    "users",
    user.uid,
    "routines"
  );

  routinesUnsubscribe = onSnapshot(
    routinesRef,
    (snapshot) => {
      renderRoutines(snapshot);
    },
    (error) => {
      console.error(
        "Error loading routines:",
        error
      );
    }
  );
}




function openRoutinesPanel() {
  listenToRoutines();

  routinesPanel.classList.add("open");
  routinesSidebar.classList.add("active");
}



function closeRoutinesPanel() {
  routinesPanel.classList.remove("open");
  routinesSidebar.classList.remove("active");
}


