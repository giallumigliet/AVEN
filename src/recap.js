// recap.js
import { auth, db } from "./firebase.js";

import {
  collection,
  doc,
  onSnapshot,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


const dailyRecap =
  document.getElementById("daily-recap");


let todos = [];
let plannedTodoIds = new Set();

let todosUnsubscribe = null;
let plannerUnsubscribe = null;


function getTodayKey() {

  const today = new Date();

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


function updateRecap() {

  const plannedTodos =
    todos.filter(todo =>
      plannedTodoIds.has(todo.id)
    );

  const total =
    plannedTodos.length;

  const remaining =
    plannedTodos.filter(
      todo => !todo.completed
    ).length;


  if (total === 0) {

    dailyRecap.textContent =
      "Your day is clear.";

    return;
  }


  if (remaining === 0) {

    dailyRecap.textContent =
      "Everything planned for today is done.";

    return;
  }


  if (total === 1) {

    dailyRecap.textContent =
      "You have 1 task planned for today.";

    return;
  }


  dailyRecap.textContent =
    `You have ${total} tasks planned for today, ${remaining} still to complete.`;

}


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
              id: documentSnapshot.id,
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

        if (!snapshot.exists()) {

          plannedTodoIds =
            new Set();

        } else {

          plannedTodoIds =
            new Set(
              snapshot.data().todoIds || []
            );

        }

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


export function initRecap() {

  if (!dailyRecap) {
    return;
  }


  auth.onAuthStateChanged?.(() => {});


  const start =
    setInterval(() => {

      const user =
        auth.currentUser;

      if (!user) {
        return;
      }

      clearInterval(start);

      listenToTodos(user);
      listenToPlanner(user);

    }, 300);

}
