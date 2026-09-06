// routines.js
import { auth, db } from "./firebase.js";
import { collection, addDoc, serverTimestamp, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


// ELEMENTS =========================================================

const routinesSidebar = document.getElementById("routines-sidebar");

const routineModal = document.getElementById("routine-modal");
const routineModalBackdrop = document.getElementById("routine-modal-backdrop");

const closeRoutineModalButton = document.getElementById("close-routine-modal");
const cancelRoutineButton = document.getElementById("cancel-routine");

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

let editingRoutineId = null;


// MODAL =========================================================

export function openRoutineModal() {

  editingRoutineId = null;

  routineForm.reset();
  routineTimes.innerHTML = "";

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

  routineName.value = routine.name || "";

  routineInterval.value = routine.interval || 1;

  routineUnit.value = routine.unit || "days";

  routineStart.value = routine.startDate || "";

  monthlyDay.value = routine.monthlyDay || 1;

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

  routinesSidebar.addEventListener("click", openRoutinesPanel);

  closeRoutineModalButton.addEventListener("click", closeRoutineModal);
  
  closeRoutinesPanelButton.addEventListener("click", closeRoutinesPanel);

  cancelRoutineButton.addEventListener("click", closeRoutineModal);

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




function renderRoutines(snapshot) {

  routinesList.innerHTML = "";

  if (snapshot.empty) {

    routinesList.innerHTML = `
      <div class="routines-empty">
        <span>Nessuna routine</span>
        <small>Creane una con il pulsante +</small>
      </div>
    `;

    return;
  }

  snapshot.forEach((documentSnapshot) => {

    const routine = documentSnapshot.data();
    const routineId = documentSnapshot.id;

    const item = document.createElement("div");

    item.className = "routine-list-item";

    item.addEventListener("click", (event) => {
    
      if (
        event.target.closest(".routine-switch")
      ) {
        return;
      }
    
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

    item.querySelector(".routine-list-name").textContent =
      routine.name || "Routine senza nome";

    item.querySelector(".routine-list-frequency").textContent =
      getRoutineFrequencyText(routine);

    const toggle = item.querySelector(".routine-enabled-toggle");

    toggle.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    
    toggle.addEventListener("change", () => {
      updateRoutineEnabled(
        routineId,
        toggle.checked
      );
    });

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
  routinesPanel.setAttribute("aria-hidden", "false");
}



function closeRoutinesPanel() {

  routinesPanel.classList.remove("open");
  routinesPanel.setAttribute("aria-hidden", "true");
}
