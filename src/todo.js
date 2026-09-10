// todo.js
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


// ELEMENTS ------------------
const todosSidebar = document.getElementById("to-do-sidebar");
const todosPanel = document.getElementById("todos-panel");
const closeTodosPanelButton = document.getElementById("close-todos-panel");
const todosPanelBackdrop = document.getElementById("todos-panel-backdrop");
const todosList = document.getElementById("todos-list");
const todoModal = document.getElementById("todo-modal");
const todoModalBackdrop = document.getElementById("todo-modal-backdrop");
const closeTodoModalButton = document.getElementById("close-todo-modal");
const deleteTodoButton = document.getElementById("delete-todo");

const todoForm = document.getElementById("todo-form");
const todoSubmitButton = todoForm.querySelector('button[type="submit"]');
const todoText = document.getElementById("todo-text");
const todoCategoryPicker = document.getElementById("todo-category-picker");
const todoCategoryFilter = document.getElementById("todo-category-filter");

let selectedTodoCategory = "all";
let editingTodoId = null;
let todoFormCategory = "";
let todosUnsubscribe = null;


const TODO_CATEGORIES = [
  { id: "money", label: "Money", icon: "💰" },
  { id: "home", label: "Home", icon: "🏠" },
  { id: "shopping", label: "Shopping", icon: "🛒" },
  { id: "presents", label: "Presents", icon: "🎁" },
  { id: "people", label: "People", icon: "👨‍👩‍👧" },
  { id: "training", label: "Training", icon: "🏋️" },
  { id: "work", label: "Work", icon: "💼" },
  { id: "freeTime", label: "Free time", icon: "🎨" },
  { id: "car", label: "Car", icon: "🚗" },
  { id: "travel", label: "Travel", icon: "✈️" },
  { id: "health", label: "Health", icon: "❤️" },
  { id: "study", label: "Study", icon: "📚" },
  { id: "pets", label: "Pets", icon: "🐾" },
  { id: "tech", label: "Tech", icon: "💻" }
];




// MODAL ------------------------------
export function openTodoModal() {
  editingTodoId = null;
  todoFormCategory = "";

  deleteTodoButton.hidden = true;
  todoSubmitButton.textContent = "Add";

  todoForm.reset();

  renderTodoCategoryPicker();

  todoModal.classList.add("open");
  todoModalBackdrop.classList.add("open");

  todoModal.setAttribute(
    "aria-hidden",
    "false"
  );

  todoText.focus();
}


function openTodoEditModal(todoId, todo) {
  editingTodoId = todoId;

  todoText.value = todo.text || "";
  todoFormCategory = todo.category || "";

  deleteTodoButton.hidden = false;
  todoSubmitButton.textContent = "Edit";

  renderTodoCategoryPicker();

  todoModal.classList.add("open");
  todoModalBackdrop.classList.add("open");

  todoModal.setAttribute(
    "aria-hidden",
    "false"
  );

  todoText.focus();
}


function closeTodoModal() {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }

  todoModal.classList.remove("open");
  todoModalBackdrop.classList.remove("open");

  todoModal.setAttribute(
    "aria-hidden",
    "true"
  );
}




function renderTodoCategoryPicker() {

  todoCategoryPicker.innerHTML = `
    <button
      type="button"
      class="routine-category-option ${
        todoFormCategory === "" ? "active" : ""
      }"
      data-category=""
    >
      <span class="routine-category-option-icon">ANY</span>
      <span class="routine-category-option-name">
        None
      </span>
    </button>

    ${TODO_CATEGORIES.map(
      (category) => `
        <button
          type="button"
          class="routine-category-option ${
            todoFormCategory === category.id
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

  todoCategoryPicker
    .querySelectorAll(".routine-category-option")
    .forEach((button) => {

      button.addEventListener("click", () => {

        todoFormCategory =
          button.dataset.category;

        renderTodoCategoryPicker();
      });

    });
}



function renderTodoCategories(todos) {

  const counts = {};

  TODO_CATEGORIES.forEach((category) => {
    counts[category.id] = 0;
  });


  todos.forEach((todo) => {

    if (todo.category) {

      counts[todo.category] =
        (counts[todo.category] || 0) + 1;

    }

  });


  const allCount = todos.length;


  const sortedCategories =
    [...TODO_CATEGORIES].sort(
      (a, b) =>
        (counts[b.id] || 0) -
        (counts[a.id] || 0)
    );


  todoCategoryFilter.innerHTML = `

    <button
      type="button"
      class="routine-category-item ${
        selectedTodoCategory === "all"
          ? "active"
          : ""
      }"
      data-category="all"
    >
      <span class="routine-category-icon">
        ALL
      </span>

      <span class="routine-category-count">
        ${allCount}
      </span>
    </button>


    ${sortedCategories.map(
      (category) => `

        <button
          type="button"
          class="routine-category-item ${
            selectedTodoCategory === category.id
              ? "active"
              : ""
          }"
          data-category="${category.id}"
        >

          <span class="routine-category-name">
            ${category.label}
          </span>
          
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


  todoCategoryFilter
    .querySelectorAll(
      ".routine-category-item"
    )
    .forEach((button) => {

      button.addEventListener(
        "click",
        () => {

          selectedTodoCategory =
            button.dataset.category;

          renderTodoCategories(todos);

          renderTodosList(todos);

        }
      );

    });

}

// FIRESTORE -------------------
async function saveTodo() {

  const user = auth.currentUser;

  if (!user) {
    throw new Error("User not authenticated.");
  }

  const todosRef =
    collection(
      db,
      "users",
      user.uid,
      "todos"
    );

  const todoData = {
    text: todoText.value.trim(),
    category: todoFormCategory,
    completed: false
  };

  if (editingTodoId) {

    const todoRef =
      doc(
        todosRef,
        editingTodoId
      );

    await updateDoc(
      todoRef,
      {
        text: todoData.text,
        category: todoData.category,
        updatedAt: serverTimestamp()
      }
    );

    return;
  }

  await addDoc(
    todosRef,
    {
      ...todoData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
  );
}





async function deleteTodo() {

  const user = auth.currentUser;

  if (!user || !editingTodoId) {
    return;
  }

  if (
    !confirm(
      "Sei sicuro di voler eliminare questo to do?"
    )
  ) {
    return;
  }

  try {

    await deleteDoc(
      doc(
        db,
        "users",
        user.uid,
        "todos",
        editingTodoId
      )
    );

    editingTodoId = null;

    closeTodoModal();

  } catch (error) {

    console.error(
      "Error deleting todo:",
      error
    );

  }
}




function renderTodos(snapshot) {

  const todos = [];

  snapshot.forEach((documentSnapshot) => {

    todos.push({
      id: documentSnapshot.id,
      ...documentSnapshot.data()
    });

  });

  const scrollTop =
    todosList.scrollTop;

  renderTodoCategories(todos);

  renderTodosList(
    todos,
    null,
    scrollTop
  );
}


function renderTodosList(
  todos,
  anchorTodoId = null,
  anchorOffset = null
) {

  todosList.innerHTML = "";

  const filteredTodos =
    selectedTodoCategory === "all"
      ? todos
      : todos.filter(
          (todo) =>
            todo.category === selectedTodoCategory
        );

  if (filteredTodos.length === 0) {

    todosList.innerHTML = `
      <div class="todos-empty">
        <span>Nessun to do</span>
        <small>Nessun to do in questa categoria</small>
      </div>
    `;

    return;
  }

  filteredTodos.sort((a, b) =>
    Number(a.completed) -
    Number(b.completed)
  );

  filteredTodos.forEach((todo) => {

    const item =
      document.createElement("div");

    item.dataset.todoId = todo.id;

    item.className =
      `todo-list-item ${
        todo.completed
          ? "completed"
          : ""
      }`;

    const category =
      TODO_CATEGORIES.find(
        (category) =>
          category.id === todo.category
      );

    item.innerHTML = `
      <label class="todo-check">
        <input
          type="checkbox"
          ${todo.completed ? "checked" : ""}
        >
        <span></span>
      </label>

      <div class="todo-list-text"></div>

      ${
        category &&
        selectedTodoCategory === "all"
          ? `
            <div class="todo-list-category">
              ${category.icon}
            </div>
          `
          : ""
      }
    `;

    item.querySelector(
      ".todo-list-text"
    ).textContent =
      todo.text || "";

    const checkbox =
      item.querySelector(
        ".todo-check input"
      );

    checkbox.addEventListener(
      "click",
      (event) => {
        event.stopPropagation();
      }
    );

    checkbox.addEventListener(
      "change",
      () => {
        updateTodoCompleted(
          todo.id,
          checkbox.checked
        );
      }
    );

    item.addEventListener(
      "click",
      (event) => {

        if (
          event.target.closest(
            ".todo-check"
          )
        ) {
          return;
        }

        openTodoEditModal(
          todo.id,
          todo
        );
      }
    );

    todosList.appendChild(item);

  });

  if (anchorOffset !== null) {

    requestAnimationFrame(() => {
  
      todosList.scrollTop =
        anchorOffset;
  
    });
  
  }
}


// SUBMIT -------------------------------
async function handleTodoSubmit(event) {

  event.preventDefault();

  const text =
    todoText.value.trim();

  if (!text) {
    todoText.focus();
    return;
  }

  try {

    await saveTodo();

    editingTodoId = null;

    closeTodoModal();

  } catch (error) {

    console.error(
      "Error saving todo:",
      error
    );

  }
}










async function updateTodoCompleted(
  todoId,
  completed
) {
  const user = auth.currentUser;

  if (!user) return;

  try {

    const todoRef =
      doc(
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
        updatedAt: serverTimestamp()
      }
    );

  } catch (error) {

    console.error(
      "Error updating todo:",
      error
    );

  }
}





function listenToTodos() {

  const user = auth.currentUser;

  if (!user) return;

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
      (snapshot) => {

        renderTodos(snapshot);

      },
      (error) => {

        console.error(
          "Error loading todos:",
          error
        );

      }
    );
}



function openTodosPanel() {

  listenToTodos();

  todosPanel.classList.add("open");
  todosSidebar.classList.add("active");
}

function closeTodosPanel() {

  todosPanel.classList.remove("open");
  todosSidebar.classList.remove("active");
}


// INITIALIZATION ------------------------------------------
export function initTodos() {

  if (
    !todosSidebar ||
    !todosPanel ||
    !todoModal
  ) {
    console.warn(
      "Todo elements not found."
    );
    return;
  }

  todosSidebar.addEventListener(
    "click",
    openTodosPanel
  );

  closeTodosPanelButton.addEventListener(
    "click",
    closeTodosPanel
  );

  todosPanelBackdrop.addEventListener(
    "click",
    closeTodosPanel
  );

  closeTodoModalButton.addEventListener(
    "click",
    closeTodoModal
  );

  todoModalBackdrop.addEventListener(
    "click",
    closeTodoModal
  );

  deleteTodoButton.addEventListener(
    "click",
    deleteTodo
  );

  todoForm.addEventListener(
    "submit",
    handleTodoSubmit
  );

  renderTodoCategoryPicker();
}



