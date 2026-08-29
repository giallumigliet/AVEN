// birthdays.js


// ELEMENTS =========================================================

const birthdaysSidebar =
  document.getElementById("birthdays-sidebar");

const birthdayModal =
  document.getElementById("birthday-modal");

const birthdayModalBackdrop =
  document.getElementById("birthday-modal-backdrop");

const closeBirthdayModalButton =
  document.getElementById("close-birthday-modal");

const cancelBirthdayButton =
  document.getElementById("cancel-birthday");

const birthdayForm =
  document.getElementById("birthday-form");

const birthdayName =
  document.getElementById("birthday-name");

const birthdayDay =
  document.getElementById("birthday-day");

const birthdayMonth =
  document.getElementById("birthday-month");

const birthdayYear =
  document.getElementById("birthday-year");

const birthdayPreview =
  document.getElementById("birthday-preview");


// MODAL =========================================================

export function openBirthdayModal() {

  birthdayModal.classList.add("open");

  birthdayModalBackdrop.classList.add("open");

  birthdayModal.setAttribute(
    "aria-hidden",
    "false"
  );

  birthdayName.focus();

}


function closeBirthdayModal() {

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


// PREVIEW =========================================================

function updateBirthdayPreview() {

  const name =
    birthdayName.value.trim();

  const day =
    Number(birthdayDay.value);

  const month =
    Number(birthdayMonth.value);

  const year =
    Number(birthdayYear.value);


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

function handleBirthdaySubmit(event) {

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


  console.log(
    "New birthday:",
    birthday
  );


  /*
    FUTURO:

    Qui collegheremo Firestore.

    Esempio:

    await saveBirthday(birthday);
  */


  closeBirthdayModal();

}


// INITIALIZATION =========================================================

export function initBirthdays() {

  if (
    !birthdaysSidebar ||
    !birthdayModal
  ) {

    console.warn(
      "Birthday elements not found."
    );

    return;

  }


  birthdaysSidebar.addEventListener(
    "click",
    openBirthdayModal
  );


  closeBirthdayModalButton.addEventListener(
    "click",
    closeBirthdayModal
  );


  cancelBirthdayButton.addEventListener(
    "click",
    closeBirthdayModal
  );


  birthdayModalBackdrop.addEventListener(
    "click",
    closeBirthdayModal
  );


  birthdayName.addEventListener(
    "input",
    updateBirthdayPreview
  );


  birthdayDay.addEventListener(
    "input",
    updateBirthdayPreview
  );


  birthdayMonth.addEventListener(
    "change",
    updateBirthdayPreview
  );


  birthdayYear.addEventListener(
    "input",
    updateBirthdayPreview
  );


  birthdayForm.addEventListener(
    "submit",
    handleBirthdaySubmit
  );


  updateBirthdayPreview();

}
