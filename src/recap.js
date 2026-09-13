// recap.js

import { auth, db } from "./firebase.js";

import {
  collection,
  doc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { getRoutineDaysUntilNext } from "./routines.js";
import { getTodayMonitoredCalendarEvents } from "./google-calendar.js";


const dailyRecap = document.getElementById("daily-recap");
const connectCalendarButton = document.getElementById("connect-calendar-button");

let todos = [];
let plannedTodoIds = new Set();
let routines = [];
let birthdays = [];
let calendarEvents = [];


let todosUnsubscribe = null;
let plannerUnsubscribe = null;
let routinesUnsubscribe = null;
let birthdaysUnsubscribe = null;

let calendarRefreshInterval = null;




// CONNECT CALENDAR BUTTON ===================================
function showConnectCalendarButton() {

  if (!connectCalendarButton) {
    return;
  }

  connectCalendarButton.hidden = false;

}


function hideConnectCalendarButton() {

  if (!connectCalendarButton) {
    return;
  }

  connectCalendarButton.hidden = true;

}





// CALENDARIO GOOGLE ==============================================
async function loadCalendarEvents() {

  try {

    const events =
      await getTodayMonitoredCalendarEvents();

    setRecapEvents(events);
    hideConnectCalendarButton();

  } catch (error) {

    console.error(
      "Error loading calendar events:",
      error
    );

    setRecapEvents([]);
    showConnectCalendarButton();

  }

}


// DATA ===========================================================

function getTodayKey() {

  const today =
    new Date();

  const year =
    today.getFullYear();

  const month =
    String(
      today.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      today.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;

}


function getTodayDate() {

  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  return today;

}


// TESTO ==========================================================
function joinNames(names) {

  const formattedNames =
    names.map(name =>
      `<strong>${name}</strong>`
    );

  if (formattedNames.length === 1) {
    return formattedNames[0];
  }

  if (formattedNames.length === 2) {
    return `${formattedNames[0]} e ${formattedNames[1]}`;
  }

  const last =
    formattedNames[formattedNames.length - 1];

  return `${formattedNames
    .slice(0, -1)
    .join(", ")}, e ${last}`;

}


// RECAP ==========================================================

function updateRecap() {

  const sections = [];

  const today =
    getTodayDate();


  // COMPLEANNI ===================================================

  const todaysBirthdays =
    birthdays
      .filter(birthday => {

        return (
          Number(birthday.day) ===
            today.getDate() &&
          Number(birthday.month) ===
            today.getMonth() + 1
        );

      })
      .map(birthday =>
        birthday.name
      )
      .filter(Boolean);


  if (todaysBirthdays.length > 0) {

    if (todaysBirthdays.length === 1) {

      sections.push(
        `🎉È il compleanno di <strong>${todaysBirthdays[0]}</strong>!🎉`
      );

    } else {

      sections.push(
        `🎉 È il compleanno di ${joinNames(
          todaysBirthdays
        )}! 🎉`
      );

    }

  }


    // CALENDARIO + ROUTINE =========================================

  const calendarParts = [];

  if (calendarEvents.length > 0) {

    const eventNames =
      calendarEvents
        .map(event =>
          event.summary ||
          event.title ||
          event.name
        )
        .filter(Boolean)
        .map(name =>
          `“${name}”`
        );

    if (eventNames.length > 0) {

      calendarParts.push(
        `Hai ${joinNames(eventNames)} in calendario.`
      );

    }

  }


  const todaysRoutines =
    routines
      .filter(routine => {

        if (routine.enabled === false) {
          return false;
        }

        const days =
          getRoutineDaysUntilNext(
            routine
          );

        return days === 0;

      })
      .map(routine =>
        routine.name
      )
      .filter(Boolean);


  if (todaysRoutines.length > 0) {

    calendarParts.push(
      `${
        todaysRoutines.length === 1
          ? "La routine"
          : "Le routines"
      } ${joinNames(todaysRoutines)} ${
        todaysRoutines.length === 1
          ? "è prevista per oggi"
          : "sono previste per oggi"
      }.`
    );

  }


  if (calendarParts.length > 0) {

    sections.push(
      calendarParts.join(" ")
    );

  }



  // TODO =========================================================

  const remainingTodos =
    todos.filter(todo =>
      plannedTodoIds.has(todo.id) &&
      !todo.completed
    ).length;


  if (remainingTodos > 0) {

    sections.push(
      `Restano <strong>${remainingTodos} ${
        remainingTodos === 1
          ? "todo"
          : "todo"
      }</strong> da completare.`
    );

  }


  // NIENTE =======================================================

  if (sections.length === 0) {

    dailyRecap.innerHTML =
      "La tua giornata è libera.";

    return;

  }


  dailyRecap.innerHTML =
    sections.join("\n\n");

}


// TODO ============================================================

function listenToTodos(user) {

  if (todosUnsubscribe) {
    todosUnsubscribe();
  }


  const todosRef =
    collection(
      db,
      "users",
      user.uid,
      "todos"
    );


  todosUnsubscribe =
    onSnapshot(
      todosRef,
      snapshot => {

        todos = [];

        snapshot.forEach(
          documentSnapshot => {

            todos.push({
              id:
                documentSnapshot.id,
              ...documentSnapshot.data()
            });

          }
        );

        updateRecap();

      },
      error => {

        console.error(
          "Error loading recap todos:",
          error
        );

      }
    );

}


// DAILY PLANNER ==================================================

function listenToPlanner(user) {

  if (plannerUnsubscribe) {
    plannerUnsubscribe();
  }


  const plannerRef =
    doc(
      db,
      "users",
      user.uid,
      "dailyPlanner",
      getTodayKey()
    );


  plannerUnsubscribe =
    onSnapshot(
      plannerRef,
      snapshot => {

        plannedTodoIds =
          snapshot.exists()
            ? new Set(
                snapshot.data().todoIds || []
              )
            : new Set();

        updateRecap();

      },
      error => {

        console.error(
          "Error loading daily planner recap:",
          error
        );

      }
    );

}


// ROUTINE ========================================================

function listenToRoutines(user) {

  if (routinesUnsubscribe) {
    routinesUnsubscribe();
  }


  const routinesRef =
    collection(
      db,
      "users",
      user.uid,
      "routines"
    );


  routinesUnsubscribe =
    onSnapshot(
      routinesRef,
      snapshot => {

        routines = [];

        snapshot.forEach(
          documentSnapshot => {

            routines.push({
              id:
                documentSnapshot.id,
              ...documentSnapshot.data()
            });

          }
        );

        updateRecap();

      },
      error => {

        console.error(
          "Error loading recap routines:",
          error
        );

      }
    );

}


// COMPLEANNI ====================================================

function listenToBirthdays(user) {

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
      snapshot => {

        birthdays = [];

        snapshot.forEach(
          documentSnapshot => {

            birthdays.push({
              id:
                documentSnapshot.id,
              ...documentSnapshot.data()
            });

          }
        );

        updateRecap();

      },
      error => {

        console.error(
          "Error loading recap birthdays:",
          error
        );

      }
    );

}


// GOOGLE CALENDAR ================================================
export function setRecapEvents(events) {

  calendarEvents =
    Array.isArray(events)
      ? events
      : [];

  updateRecap();
}



export async function refreshCalendarEvents() {

  try {

    const events =
      await getTodayMonitoredCalendarEvents();

    setRecapEvents(events);
    hideConnectCalendarButton();


  } catch (error) {

    console.error(
      "Error refreshing calendar events:",
      error
    );

    showConnectCalendarButton();

  }

}

// INIT ===========================================================

export async function initRecap() {

  if (!dailyRecap) {
    return;
  }


  onAuthStateChanged(
    auth,
    async user => {

      if (!user) {

        todos = [];
        plannedTodoIds =
          new Set();

        routines = [];
        birthdays = [];
        calendarEvents = [];

        dailyRecap.innerHTML =
          "La tua giornata è libera.";

        return;

      }


      listenToTodos(user);
      listenToPlanner(user);
      listenToRoutines(user);
      listenToBirthdays(user);

      await loadCalendarEvents();

      if (calendarRefreshInterval) {
        clearInterval(calendarRefreshInterval);
      }
      
      calendarRefreshInterval = setInterval(
        refreshCalendarEvents,
        2 * 60 * 1000
      );

    }
  );

}
