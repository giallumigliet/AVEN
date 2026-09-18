// daily-planner.js

import {
  auth,
  db
} from "./firebase.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

import {
  collection,
  onSnapshot,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";



const dailyPlannerStatus =
  document.getElementById(
    "daily-planner-status"
  );

const dailyPlannerList =
  document.getElementById(
    "daily-planner-list"
  );

let todos = [];
let selectedTodoIds = new Set();
let todosUnsubscribe = null;
let todosLoaded = false;

function getTodayKey() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(
    today.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    today.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


async function loadTodayPlan() {

  const user = auth.currentUser;

  if (!user) {
    selectedTodoIds = new Set();
    return;
  }

  selectedTodoIds = new Set();

  const todosRef =
    collection(
      db,
      "users",
      user.uid,
      "todos"
    );

  // Il listener dei todo farà il rendering.
}

async function saveTodayPlan() {
  const user = auth.currentUser;

  if (!user) {
    return;
  }

  const plannerRef = doc(
    db,
    "users",
    user.uid,
    "dailyPlanner",
    getTodayKey()
  );

  await setDoc(
    plannerRef,
    {
      todoIds: [...selectedTodoIds]
    },
    {
      merge: true
    }
  );
}




function getCategoryIcon(categoryId) {
  const categories = {
    money: "💰",
    home: "🏠",
    shopping: "🛒",
    presents: "🎁",
    people: "👨‍👩‍👧",
    training: "🏋️",
    work: "💼",
    freeTime: "🎨",
    car: "🚗",
    travel: "✈️",
    health: "❤️",
    study: "📚",
    pets: "🐾",
    tech: "💻"
  };

  return categories[categoryId]
    ? `
      <div class="daily-planner-category">
        ${categories[categoryId]}
      </div>
    `
    : "";
}





function renderDailyPlanner() {
  const todayKey =
    getTodayKey();
  
  const plannedTodos =
    todos.filter(todo =>
      todo.dailyPlannerDate &&
      !todo.completed
    );

  const remaining =
    plannedTodos.filter(
      todo => !todo.completed
    ).length;

  dailyPlannerStatus.textContent =
    remaining === 0
      ? "All tasks completed"
      : `${remaining} ${
          remaining === 1
            ? "task"
            : "tasks"
        } remaining`;

  dailyPlannerList.innerHTML = "";

  if (plannedTodos.length === 0) {
    dailyPlannerList.innerHTML = `
      <div class="daily-planner-empty">
        <span>Nothing planned</span>
        <small>Add tasks from To Do using "Do today"</small>
      </div>
    `;

    return;
  }

  plannedTodos.forEach(todo => {
    const item =
      document.createElement("div");

    const isOldDailyPlannerTodo =
      todo.dailyPlannerDate !==
      getTodayKey();
    
    item.className =
      `daily-planner-item ${
        todo.completed
          ? "completed"
          : ""
      } ${
        isOldDailyPlannerTodo
          ? "daily-planner-overdue"
          : ""
      }`;

    const category =
      todo.category
        ? todo.category
        : "";

    item.innerHTML = `
      <label class="daily-planner-check">

        <input
          type="checkbox"
          ${todo.completed ? "checked" : ""}
        >

        <span></span>

      </label>

      <div class="daily-planner-text"></div>

      ${
        isOldDailyPlannerTodo
          ? `
            <span
              class="daily-planner-overdue-mark"
              aria-label="From a previous day"
            >
              !
            </span>
          `
          : ""
      }

      ${
        getCategoryIcon(todo.category)
      }
    `;

    item.querySelector(
      ".daily-planner-text"
    ).textContent =
      todo.text || "";

    const checkbox =
      item.querySelector(
        ".daily-planner-check input"
      );

    checkbox.addEventListener(
      "click",
      event => {
        event.stopPropagation();
      }
    );

    checkbox.addEventListener(
      "change",
      async () => {
        await updateTodoCompleted(
          todo.id,
          checkbox.checked
        );
      }
    );

    dailyPlannerList.appendChild(item);
  });
}


async function updateTodoCompleted(
  todoId,
  completed
) {
  const user = auth.currentUser;

  if (!user) {
    return;
  }

  const todoRef = doc(
    db,
    "users",
    user.uid,
    "todos",
    todoId
  );

  await updateDoc(
    todoRef,
    {
      completed,
  
      completedAt:
        completed
          ? serverTimestamp()
          : null,
  
      updatedAt:
        serverTimestamp()
    }
  );
}


function listenToTodos() {
  const user = auth.currentUser;

  if (!user) {
    return;
  }

  if (todosUnsubscribe) {
    todosUnsubscribe();
  }

  const todosRef = collection(
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

            const data =
              documentSnapshot.data();

            todos.push({
              id: documentSnapshot.id,
              ...data
            });

          }
        );

        todosLoaded = true;

        renderDailyPlanner();
      },
      error => {
        console.error(
          "Error loading planner todos:",
          error
        );
      }
    );
}



export function initDailyPlanner() {

  if (
    !dailyPlannerStatus ||
    !dailyPlannerList
  ) {
    console.warn(
      "Daily planner elements not found."
    );

    return;
  }

  loadTodayPlan()
    .then(() => {
      listenToTodos();
    })
    .catch(error => {
      console.error(
        "Error initializing daily planner:",
        error
      );
    });

}




export async function refreshDailyPlanner() {
  await loadTodayPlan();
  renderDailyPlanner();
}
