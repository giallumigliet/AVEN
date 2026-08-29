// routines.js

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


// MODAL =========================================================

function openRoutineModal() {

  routineModal.classList.add("open");
  routineModalBackdrop.classList.add("open");

  routineModal.setAttribute("aria-hidden", "false");

  routineName.focus();

}


function closeRoutineModal() {

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

    times: getRoutineTimes()

  };

}


// SUBMIT =========================================================

function handleRoutineSubmit(event) {

  event.preventDefault();

  const routine = getRoutineData();

  console.log("New routine:", routine);

  /*
    FUTURO:

    qui salveremo la routine su Firestore.

    Esempio:

    await saveRoutine(routine);
  */

  closeRoutineModal();

}


// INITIALIZATION =========================================================

export function initRoutines() {

  if (!routinesSidebar || !routineModal) {
    console.warn("Routine elements not found.");
    return;
  }


  routinesSidebar.addEventListener(
    "click",
    openRoutineModal
  );


  closeRoutineModalButton.addEventListener(
    "click",
    closeRoutineModal
  );


  cancelRoutineButton.addEventListener(
    "click",
    closeRoutineModal
  );


  routineModalBackdrop.addEventListener(
    "click",
    closeRoutineModal
  );


  routineUnit.addEventListener(
    "change",
    updateRoutineFrequencyUI
  );


  routineInterval.addEventListener(
    "input",
    updateRoutinePreview
  );


  monthlyDay.addEventListener(
    "input",
    updateRoutinePreview
  );


  routineStart.addEventListener(
    "change",
    updateRoutinePreview
  );


  addRoutineTimeButton.addEventListener(
    "click",
    () => addRoutineTime()
  );


  routineForm.addEventListener(
    "submit",
    handleRoutineSubmit
  );


  setupWeekdayPicker();

  updateRoutineFrequencyUI();

}
