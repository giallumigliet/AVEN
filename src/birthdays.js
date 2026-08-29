// birthdays.js


// ELEMENTS =========================================================

const birthdaysSidebar =
  document.getElementById("birthdays-sidebar");

const birthdaysPage =
  document.getElementById("birthdays-page");

const addBirthdayButton =
  document.getElementById("add-birthday-button");

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

const birthdayDate =
  document.getElementById("birthday-date");

const birthdayPreview =
  document.getElementById("birthday-preview");

const birthdaysList =
  document.getElementById("birthdays-list");


// MODAL =========================================================

function openBirthdayModal() {

  birthdayModal.classList.add("open");

  birthdayModal.setAttribute(
    "aria-hidden",
    "false"
  );

  birthdayName.focus();

}


function closeBirthdayModal() {

  birthdayModal.classList.remove("open");

  birthdayModal.setAttribute(
    "aria-hidden",
    "true"
  );

}


// PAGE =========================================================

function showBirthdaysPage() {

  birthdaysPage.hidden = false;

}


function hideBirthdaysPage() {

  birthdaysPage.hidden = true;

}


// DATE =========================================================

function calculateAge(dateString) {

  if (!dateString) {
    return null;
  }

  const birthDate = new Date(`${dateString}T00:00:00`);

  const today = new Date();

  let age =
    today.getFullYear() -
    birthDate.getFullYear();

  const monthDifference =
    today.getMonth() -
    birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (
      monthDifference === 0 &&
      today.getDate() < birthDate.getDate()
    )
  ) {
    age--;
  }

  return age;

}


function formatBirthdayDate(dateString) {

  if (!dateString) {
    return "";
  }

  const date =
    new Date(`${dateString}T00:00:00`);

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "long",
      year: "numeric"
    }
  ).format(date);

}


// PREVIEW =========================================================

function updateBirthdayPreview() {

  const name =
    birthdayName.value.trim();

  const date =
    birthdayDate.value;

  if (!name || !date) {

    birthdayPreview.textContent = "";

    return;
  }


  const age =
    calculateAge(date);

  birthdayPreview.textContent =
    `${name} · ${formatBirthdayDate(date)} · ${age} years old`;

}


// DATA =========================================================

function getBirthdayData() {

  return {

    name:
      birthdayName.value.trim(),

    birthDate:
      birthdayDate.value

  };

}


// LIST =========================================================

function renderBirthday(birthday) {

  const article =
    document.createElement("article");

  article.className =
    "birthday-card";

  const age =
    calculateAge(birthday.birthDate);

  article.innerHTML = `

    <div class="birthday-card-info">

      <div class="birthday-card-name">
        ${birthday.name}
      </div>

      <div class="birthday-card-date">
        ${formatBirthdayDate(birthday.birthDate)}
      </div>

    </div>

    <div class="birthday-card-age">
      ${age} years
    </div>

  `;

  birthdaysList.appendChild(article);

}


// SUBMIT =========================================================

function handleBirthdaySubmit(event) {

  event.preventDefault();

  const birthday =
    getBirthdayData();

  console.log(
    "New birthday:",
    birthday
  );

  /*
    FUTURO:

    qui salveremo su Firestore.

    await saveBirthday(birthday);
  */


  renderBirthday(birthday);

  birthdayForm.reset();

  birthdayPreview.textContent = "";

  closeBirthdayModal();

}


// INITIALIZATION =========================================================

export function initBirthdays() {

  if (
    !birthdaysSidebar ||
    !birthdaysPage ||
    !birthdayModal
  ) {

    console.warn(
      "Birthday elements not found."
    );

    return;
  }


  birthdaysSidebar.addEventListener(
    "click",
    () => {

      showBirthdaysPage();

    }
  );


  addBirthdayButton.addEventListener(
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


  birthdayDate.addEventListener(
    "change",
    updateBirthdayPreview
  );


  birthdayForm.addEventListener(
    "submit",
    handleBirthdaySubmit
  );

}
