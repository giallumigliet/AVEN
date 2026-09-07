// birthdays.js
import { auth, db } from "./firebase.js";

import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";



// ELEMENTS =========================================================
const birthdaysSidebar = document.getElementById("birthdays-sidebar");

const birthdaysPanel = document.getElementById("birthdays-panel");
const closeBirthdaysPanelButton = document.getElementById("close-birthdays-panel");
const birthdaysPanelBackdrop = document.getElementById("birthdays-panel-backdrop");

const birthdaysList = document.getElementById("birthdays-list");

const addBirthdayButton = document.getElementById("add-birthday");
const birthdayModal = document.getElementById("birthday-modal");
const birthdayModalBackdrop = document.getElementById("birthday-modal-backdrop");
const closeBirthdayModalButton = document.getElementById("close-birthday-modal");
const deleteBirthdayButton = document.getElementById("delete-birthday");

const birthdayForm = document.getElementById("birthday-form");
const birthdayName = document.getElementById("birthday-name");
const birthdayDay = document.getElementById("birthday-day");
const birthdayMonth = document.getElementById("birthday-month");
const birthdayYear = document.getElementById("birthday-year");

const birthdayPreview = document.getElementById("birthday-preview");

let editingBirthdayId = null;
let birthdaysUnsubscribe = null;

// MODAL =========================================================

export function openBirthdayModal() {
  editingBirthdayId = null;

  deleteBirthdayButton.hidden = true;

  birthdayForm.reset();

  birthdayPreview.textContent =
    "Enter a name and date";

  birthdayModal.classList.add("open");
  birthdayModalBackdrop.classList.add("open");

  birthdayModal.setAttribute(
    "aria-hidden",
    "false"
  );

  birthdayName.focus();
}


function openBirthdayEditModal(
  birthdayId,
  birthday
) {
  editingBirthdayId = birthdayId;

  deleteBirthdayButton.hidden = false;

  birthdayName.value = birthday.name || "";
  birthdayDay.value = birthday.day || "";
  birthdayMonth.value = birthday.month || "";
  birthdayYear.value = birthday.year || "";

  updateBirthdayPreview();

  birthdayModal.classList.add("open");
  birthdayModalBackdrop.classList.add("open");

  birthdayModal.setAttribute(
    "aria-hidden",
    "false"
  );

  birthdayName.focus();
}


function closeBirthdayModal() {
  if (
    document.activeElement instanceof HTMLElement
  ) {
    document.activeElement.blur();
  }

  birthdayModal.classList.remove("open");
  birthdayModalBackdrop.classList.remove("open");

  birthdayModal.setAttribute(
    "aria-hidden",
    "true"
  );
}

// DATE =========================================================

function getBirthdayData() {

  return {

    name: birthdayName.value.trim(),

    day: Number(birthdayDay.value),

    month: Number(birthdayMonth.value),

    year: Number(birthdayYear.value)

  };

}



// FIRESTORE =========================================================

async function saveBirthday(
  birthday
) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      "User not authenticated."
    );
  }

  const birthdaysRef =
    collection(
      db,
      "users",
      user.uid,
      "birthdays"
    );

  if (editingBirthdayId) {

    const birthdayRef =
      doc(
        birthdaysRef,
        editingBirthdayId
      );

    await updateDoc(
      birthdayRef,
      {
        ...birthday,
        updatedAt:
          serverTimestamp()
      }
    );

    return;
  }

  await addDoc(
    birthdaysRef,
    {
      ...birthday,
      createdAt:
        serverTimestamp(),
      updatedAt:
        serverTimestamp()
    }
  );
}


async function deleteBirthday() {
  const user = auth.currentUser;

  if (
    !user ||
    !editingBirthdayId
  ) {
    return;
  }

  const confirmed =
    confirm(
      "Sei sicuro di voler eliminare questo compleanno?"
    );

  if (!confirmed) {
    return;
  }

  try {

    const birthdayRef =
      doc(
        db,
        "users",
        user.uid,
        "birthdays",
        editingBirthdayId
      );

    await deleteDoc(
      birthdayRef
    );

    editingBirthdayId = null;

    closeBirthdayModal();

  } catch (error) {

    console.error(
      "Error deleting birthday:",
      error
    );

  }
}


// DATE VALIDATION =========================================================

function isValidBirthdayDate(day, month, year) {

  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    !Number.isInteger(year)
  ) {
    return false;
  }


  if (month < 1 || month > 12) {
    return false;
  }


  if (day < 1 || day > 31) {
    return false;
  }


  if (year < 1900 || year > 2100) {
    return false;
  }


  const date = new Date(
    year,
    month - 1,
    day
  );


  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );

}



// BIRTHDAY CALCULATIONS =========================================================

function getNextBirthdayDate(
  day,
  month
) {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  let year = today.getFullYear();

  let nextBirthday = new Date(
    year,
    month - 1,
    day
  );

  nextBirthday.setHours(0, 0, 0, 0);

  if (nextBirthday < today) {
    nextBirthday = new Date(
      year + 1,
      month - 1,
      day
    );

    nextBirthday.setHours(0, 0, 0, 0);
  }

  return nextBirthday;
}


function getDaysUntilBirthday(
  day,
  month
) {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const nextBirthday =
    getNextBirthdayDate(
      day,
      month
    );

  return Math.round(
    (
      nextBirthday - today
    ) /
    (1000 * 60 * 60 * 24)
  );
}


function getAgeOnNextBirthday(
  day,
  month,
  year
) {
  const nextBirthday =
    getNextBirthdayDate(
      day,
      month
    );

  return (
    nextBirthday.getFullYear() -
    year
  );
}



function formatBirthdayDate(
  day,
  month
) {
  const date = new Date(
    2000,
    month - 1,
    day
  );

  return date.toLocaleDateString(
    "en-US",
    {
      day: "numeric",
      month: "long"
    }
  );
}


function getBirthdayCountdown(
  days
) {
  if (days === 0) {
    return "Today, Happy birthday!";
  }

  if (days === 1) {
    return "Tomorrow";
  }

  return `In ${days} days`;
}


// PREVIEW =========================================================

function updateBirthdayPreview() {

  const name = birthdayName.value.trim();
  const day = Number(birthdayDay.value);
  const month = Number(birthdayMonth.value);
  const year = Number(birthdayYear.value);

  if (
    !name ||
    !day ||
    !month ||
    !year
  ) {

    birthdayPreview.textContent =
      "Enter a name and date";

    return;

  }


  if (
    !isValidBirthdayDate(
      day,
      month,
      year
    )
  ) {

    birthdayPreview.textContent =
      "Invalid date";

    return;

  }


  const date = new Date(
    year,
    month - 1,
    day
  );


  const formattedDate =
    date.toLocaleDateString(
      "en-US",
      {
        day: "numeric",
        month: "long",
        year: "numeric"
      }
    );


  birthdayPreview.textContent =
    `${name} · ${formattedDate}`;

}


// SUBMIT =========================================================
async function handleBirthdaySubmit(
  event
) {
  event.preventDefault();

  const birthday =
    getBirthdayData();

  if (
    !birthday.name ||
    !isValidBirthdayDate(
      birthday.day,
      birthday.month,
      birthday.year
    )
  ) {

    birthdayPreview.textContent =
      "Please enter a valid name and date.";

    return;
  }

  try {

    await saveBirthday(
      birthday
    );

    editingBirthdayId = null;

    birthdayForm.reset();

    closeBirthdayModal();

  } catch (error) {

    console.error(
      "Error saving birthday:",
      error
    );

  }
}

// INITIALIZATION =========================================================
export function initBirthdays() {

  if (
    !birthdaysSidebar ||
    !birthdaysPanel ||
    !birthdayModal
  ) {

    console.warn(
      "Birthday elements not found."
    );

    return;
  }
  
  birthdaysSidebar.addEventListener("click", openBirthdaysPanel);
  closeBirthdaysPanelButton.addEventListener("click", closeBirthdaysPanel);
  birthdaysPanelBackdrop.addEventListener("click", closeBirthdaysPanel);
  addBirthdayButton.addEventListener("click", openBirthdayModal);
  closeBirthdayModalButton.addEventListener("click", closeBirthdayModal);
  deleteBirthdayButton.addEventListener("click", deleteBirthday);
  birthdayModalBackdrop.addEventListener("click", closeBirthdayModal);
  birthdayName.addEventListener("input", updateBirthdayPreview);
  birthdayDay.addEventListener("input", updateBirthdayPreview);
  birthdayMonth.addEventListener("change", updateBirthdayPreview);
  birthdayYear.addEventListener("input", updateBirthdayPreview);
  birthdayForm.addEventListener("submit", handleBirthdaySubmit);

  updateBirthdayPreview();
}



// RENDER =========================================================

function renderBirthdays(
  snapshot
) {
  birthdaysList.innerHTML = "";

  if (snapshot.empty) {

    birthdaysList.innerHTML = `
      <div class="birthdays-empty">
        <span>Nessun compleanno</span>
        <small>Aggiungine uno con il pulsante +</small>
      </div>
    `;

    return;
  }

  const birthdays = [];

  snapshot.forEach(
    (documentSnapshot) => {

      const birthday =
        documentSnapshot.data();

      const birthdayId =
        documentSnapshot.id;

      const daysUntil =
        getDaysUntilBirthday(
          birthday.day,
          birthday.month
        );

      const age =
        getAgeOnNextBirthday(
          birthday.day,
          birthday.month,
          birthday.year
        );

      birthdays.push({
        id: birthdayId,
        data: birthday,
        daysUntil,
        age
      });

    }
  );

  birthdays.sort(
    (a, b) =>
      a.daysUntil -
      b.daysUntil
  );

  birthdays.forEach(
    ({
      id,
      data,
      daysUntil,
      age
    }) => {

      const item =
        document.createElement(
          "div"
        );

      item.className =
        "birthday-list-item";

      item.innerHTML = `
        <div class="birthday-list-info">

          <div class="birthday-list-name"></div>

          <div class="birthday-list-date"></div>

        </div>

        <div class="birthday-list-age"></div>
      `;

      item.querySelector(
        ".birthday-list-name"
      ).textContent =
        data.name ||
        "Compleanno senza nome";

      item.querySelector(
        ".birthday-list-date"
      ).textContent =
        `${formatBirthdayDate(
          data.day,
          data.month
        )} · ${getBirthdayCountdown(
          daysUntil
        )}`;

      item.querySelector(
        ".birthday-list-age"
      ).textContent =
        age;

      item.addEventListener(
        "click",
        () => {

          closeBirthdaysPanel();

          openBirthdayEditModal(
            id,
            data
          );

        }
      );

      birthdaysList.appendChild(
        item
      );

    }
  );
}



function listenToBirthdays() {
  const user = auth.currentUser;

  if (!user) {
    return;
  }

  if (birthdaysUnsubscribe) {
    birthdaysUnsubscribe();
  }

  const birthdaysRef =
    collection(
      db,
      "users",
      user.uid,
      "birthdays"
    );

  birthdaysUnsubscribe =
    onSnapshot(
      birthdaysRef,
      (snapshot) => {
        renderBirthdays(snapshot);
      },
      (error) => {
        console.error(
          "Error loading birthdays:",
          error
        );
      }
    );
}



function openBirthdaysPanel() {
  listenToBirthdays();

  birthdaysPanel.classList.add(
    "open"
  );

  birthdaysSidebar.classList.add(
    "active"
  );
}


function closeBirthdaysPanel() {
  birthdaysPanel.classList.remove(
    "open"
  );

  birthdaysSidebar.classList.remove(
    "active"
  );
}
