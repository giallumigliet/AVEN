// todo.js
import { auth, db } from "./firebase.js";

import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,  
  getDoc
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";



// ELEMENTS ------------------
const todoPlannerButton = document.getElementById("todo-planner-button");
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

let todoPlanningMode = false;
let todoPlanningSelection = new Set();
let latestTodos = [];


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
  closeTodosPanel();
  editingTodoId = null;
  todoFormCategory = "";

  deleteTodoButton.hidden = true;
  todoSubmitButton.textContent = "Add";

  todoForm.reset();
  todoText.style.height = "23px";

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
  closeTodosPanel();
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

    if (
      todo.category &&
      !todo.completed
    ) {

      counts[todo.category] =
        (counts[todo.category] || 0) + 1;

    }

  });


  const allCount =
    todos.filter(
      todo => !todo.completed
    ).length;


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
        selectedTodoCategory === "archived"
          ? "active"
          : ""
      }"
      data-category="archived"
    >
      <span class="routine-category-icon">
        ARCHIVED 🗑
      </span>
    </button>


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
        completed,
        completedAt: completed
          ? serverTimestamp()
          : null,
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
    openTodoPanel();

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

  latestTodos = todos;

  renderTodoCategories(todos);
  renderTodosList(todos);
}




function getTodoTimestamp(todo, field) {

  return todo[field]?.seconds
    ? todo[field].seconds * 1000
    : 0;

}


function isTodoArchived(todo) {

  if (!todo.completed) {
    return false;
  }

  const completedAt =
    getTodoTimestamp(
      todo,
      "completedAt"
    );

  if (!completedAt) {
    return false;
  }

  return (
    Date.now() - completedAt >=
    24 * 60 * 60 * 1000
  );

}





function renderTodosList(todos) {

  const scrollContainer =
    todosList.closest(".todos-panel-content") ||
    todosList;

  const currentScroll =
    scrollContainer.scrollTop;


  todosList.innerHTML = "";


  // -----------------------------------------------------
  // FILTRO
  // -----------------------------------------------------

  let filteredTodos;


  if (selectedTodoCategory === "archived") {

    filteredTodos =
      todos.filter(
        todo =>
          isTodoArchived(todo)
      );

  } else {

    filteredTodos =
      selectedTodoCategory === "all"
        ? todos
        : todos.filter(
            todo =>
              todo.category ===
              selectedTodoCategory
          );

  }


  // -----------------------------------------------------
  // PLANNING MODE
  // -----------------------------------------------------

  const visibleTodos =
    todoPlanningMode

      ? filteredTodos.filter(
          todo =>
            !todo.completed
        )

      : filteredTodos;


  // -----------------------------------------------------
  // ORDINAMENTO
  // -----------------------------------------------------

  if (!todoPlanningMode) {

    visibleTodos.sort(
      (a, b) => {

        // ARCHIVED:
        // più recentemente completati sopra

        if (
          selectedTodoCategory ===
          "archived"
        ) {

          const timeA =
            getTodoTimestamp(
              a,
              "completedAt"
            );

          const timeB =
            getTodoTimestamp(
              b,
              "completedAt"
            );

          return timeB - timeA;

        }


        // LISTA NORMALE:
        // prima i non completati

        if (
          a.completed !==
          b.completed
        ) {

          return (
            Number(a.completed) -
            Number(b.completed)
          );

        }


        // TODO ATTIVI:
        // modificati più recentemente sopra

        if (!a.completed) {

          const timeA =
            getTodoTimestamp(
              a,
              "updatedAt"
            );

          const timeB =
            getTodoTimestamp(
              b,
              "updatedAt"
            );

          return timeB - timeA;

        }


        // COMPLETATI RECENTI:
        // completati più recentemente sopra

        const timeA =
          getTodoTimestamp(
            a,
            "completedAt"
          );

        const timeB =
          getTodoTimestamp(
            b,
            "completedAt"
          );

        return timeB - timeA;

      }
    );

  }


  // -----------------------------------------------------
  // EMPTY
  // -----------------------------------------------------

  if (visibleTodos.length === 0) {

    todosList.innerHTML = `
      <div class="todos-empty">

        <span>
          ${
            selectedTodoCategory ===
            "archived"
              ? "No archived todos"
              : "Nessun to do"
          }
        </span>

        <small>
          ${
            todoPlanningMode
              ? "Nessun to do da pianificare"
              : selectedTodoCategory ===
                "archived"
                  ? "I to do completati da più di 24 ore appariranno qui"
                  : "Nessun to do in questa categoria"
          }
        </small>

      </div>
    `;

    return;

  }


  // -----------------------------------------------------
  // RENDER
  // -----------------------------------------------------

  visibleTodos.forEach(
    (todo) => {

      const item =
        document.createElement(
          "div"
        );


      item.dataset.todoId =
        todo.id;


      item.className =
        `todo-list-item ${
          todo.completed
            ? "completed"
            : ""
        } ${
          todoPlanningMode &&
          todoPlanningSelection.has(
            todo.id
          )
            ? "todo-planning-selected"
            : ""
        }`;


      const category =
        TODO_CATEGORIES.find(
          category =>
            category.id ===
            todo.category
        );


      item.innerHTML = `

        ${
          todoPlanningMode
            ? ""
            : `
              <label class="todo-check">

                <input
                  type="checkbox"
                  ${todo.completed
                    ? "checked"
                    : ""}
                >

                <span></span>

              </label>
            `
        }


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


      // ---------------------------------------------------
      // NORMAL MODE
      // ---------------------------------------------------

      if (!todoPlanningMode) {

        const checkbox =
          item.querySelector(
            ".todo-check input"
          );


        checkbox.addEventListener(
          "click",
          event => {
            event.stopPropagation();
          }
        );


        checkbox.addEventListener(
          "change",
          () => {

            const completed =
              checkbox.checked;


            item.classList.toggle(
              "completed",
              completed
            );


            if (completed) {

              todosList.appendChild(
                item
              );

            } else {

              const firstCompleted =
                [
                  ...todosList.querySelectorAll(
                    ".todo-list-item"
                  )
                ].find(
                  element =>
                    element.classList.contains(
                      "completed"
                    )
                );


              if (firstCompleted) {

                todosList.insertBefore(
                  item,
                  firstCompleted
                );

              } else {

                todosList.appendChild(
                  item
                );

              }

            }


            updateTodoCompleted(
              todo.id,
              completed
            );

          }
        );


        item.addEventListener(
          "click",
          event => {

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

      }


      // ---------------------------------------------------
      // PLANNING MODE
      // ---------------------------------------------------

      else {

        item.addEventListener(
          "click",
          () => {

            if (
              todoPlanningSelection.has(
                todo.id
              )
            ) {

              todoPlanningSelection.delete(
                todo.id
              );

            } else {

              todoPlanningSelection.add(
                todo.id
              );

            }


            item.classList.toggle(
              "todo-planning-selected",
              todoPlanningSelection.has(
                todo.id
              )
            );

          }
        );

      }


      todosList.appendChild(
        item
      );

    }
  );


  requestAnimationFrame(
    () => {

      scrollContainer.scrollTop =
        currentScroll;

    }
  );

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
    openTodosPanel();

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
    
        completedAt:
          completed
            ? serverTimestamp()
            : null,
    
        updatedAt:
          serverTimestamp()
      }
    );

  } catch (error) {

    console.error(
      "Error updating todo:",
      error
    );

  }
}







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






async function saveTodoPlanningSelection() {

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
      todoIds: [
        ...todoPlanningSelection
      ]
    },
    {
      merge: true
    }
  );
}







async function toggleTodoPlanningMode() {

  if (!todoPlanningMode) {

    todoPlanningSelection.clear();

    try {

      const user =
        auth.currentUser;

      if (user) {

        const plannerRef =
          doc(
            db,
            "users",
            user.uid,
            "dailyPlanner",
            getTodayKey()
          );

        const snapshot =
          await getDoc(
            plannerRef
          );

        if (snapshot.exists()) {

          todoPlanningSelection =
            new Set(
              snapshot.data().todoIds || []
            );

        }

      }

    } catch (error) {

      console.error(
        "Error loading today's plan:",
        error
      );

    }

    todoPlanningMode = true;

    renderTodosList(
      latestTodos
    );

    return;
  }

  try {

    await saveTodoPlanningSelection();

  } catch (error) {

    console.error(
      "Error saving today's plan:",
      error
    );

  }

  todoPlanningMode = false;
  todoPlanningSelection.clear();

  renderTodosList(
    latestTodos
  );
  closeTodosPanel();
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





async function closeTodosPanel() {

  if (todoPlanningMode) {

    try {

      await saveTodoPlanningSelection();

    } catch (error) {

      console.error(
        "Error saving today's plan:",
        error
      );

    }

    todoPlanningMode = false;
    todoPlanningSelection.clear();
  }

  todosPanel.classList.remove(
    "open"
  );

  todosSidebar.classList.remove(
    "active"
  );

  renderTodosList(
    latestTodos
  );
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

  todoPlannerButton.addEventListener(
    "click",
    toggleTodoPlanningMode
  );

  todoForm.addEventListener(
    "submit",
    handleTodoSubmit
  );

  todoText.addEventListener("input", () => {
    todoText.style.height = "auto";
    todoText.style.height = `${todoText.scrollHeight}px`;
  });

  renderTodoCategoryPicker();
}

