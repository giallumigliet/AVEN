// backpack.js
import { auth, db } from "./firebase.js";

import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  doc,
  updateDoc,
  getDocs,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";



// ELEMENTS =========================================================
const backpackSidebar = document.getElementById("backpacks-sidebar");

const backpackPanel = document.getElementById("backpacks-panel");
const closeBackpackPanelButton = document.getElementById("close-backpacks-panel");
const addBackpackPanelButton = document.getElementById("panel-add-backpack");
const backpackPanelBackdrop = document.getElementById("backpacks-panel-backdrop");

const backpacksList = document.getElementById("backpacks-list");
const backpackDetail = document.getElementById("backpack-detail");
const backpackDetailTitle = document.getElementById("backpack-detail-title");
const backpackDetailItems = document.getElementById("backpack-detail-items");
const backpackDetailBackButton = document.getElementById("backpack-detail-back");
const backpackDetailEditButton = document.getElementById("backpack-detail-edit");

let currentBackpackId = null;
let currentBackpackData = null;

const addBackpackButton = document.getElementById("add-backpack");
const backpackModal = document.getElementById("backpack-modal");
const backpackModalBackdrop = document.getElementById("backpack-modal-backdrop");
const closeBackpackModalButton = document.getElementById("close-backpack-modal");
const deleteBackpackButton = document.getElementById("delete-backpack");
const backpackForm = document.getElementById("backpack-form");
const backpackSubmitButton = backpackForm.querySelector('button[type="submit"]');

const backpackName = document.getElementById("backpack-name");

const backpackPreview = document.getElementById("backpack-preview");
const backpackSourceCarousel = document.getElementById("backpack-source-carousel");
const backpackSourceField = backpackSourceCarousel.closest(".backpack-field");

let availableBackpacks = [];
let selectedSourceBackpackId = null;

let editingBackpackId = null;
let backpacksUnsubscribe = null;

// MODAL =========================================================
function renderBackpackSourceCarousel() {
  backpackSourceCarousel.innerHTML = "";

  const options = [
    { id: null, name: "NEW" },
    ...availableBackpacks.map((backpack) => ({
      id: backpack.id,
      name: backpack.name || "Viaggio senza nome"
    }))
  ];

  options.forEach((option) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "backpack-source-option";
    button.textContent = option.name;
    button.classList.toggle(
      "selected",
      option.id === selectedSourceBackpackId
    );
    button.setAttribute(
      "aria-pressed",
      String(option.id === selectedSourceBackpackId)
    );

    button.addEventListener("click", () => {
      selectedSourceBackpackId = option.id;
      renderBackpackSourceCarousel();
    });

    backpackSourceCarousel.appendChild(button);
  });
}



export async function openBackpackModal() {
  closeBackpackPanel();

  editingBackpackId = null;
  selectedSourceBackpackId = null;

  backpackSubmitButton.textContent = "Crea viaggio";
  backpackForm.reset();
  backpackPreview.textContent = "Inserisci il nome del viaggio";
  deleteBackpackButton.hidden = true;
  backpackSourceField.hidden = false;

  try {
    const user = auth.currentUser;

    if (!user) {
      throw new Error("User not authenticated.");
    }

    const snapshot = await getDocs(
      collection(db, "users", user.uid, "backpacks")
    );

    availableBackpacks = snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data()
    }));

    renderBackpackSourceCarousel();

    backpackModal.classList.add("open");
    backpackModalBackdrop.classList.add("open");
    backpackModal.setAttribute("aria-hidden", "false");

    backpackName.focus();
  } catch (error) {
    console.error("Error loading trips:", error);
  }
}



function openBackpackEditModal(backpackId, backpack) {
  editingBackpackId = backpackId;

  deleteBackpackButton.hidden = false;
  backpackSourceField.hidden = true;
  backpackSubmitButton.textContent = "Salva modifiche";

  backpackName.value = backpack.name || "";
  updateBackpackPreview();

  backpackModal.classList.add("open");
  backpackModalBackdrop.classList.add("open");
  backpackModal.setAttribute("aria-hidden", "false");

  backpackName.focus();
}


function closeBackpackModal() {
  if (
    document.activeElement instanceof HTMLElement
  ) {
    document.activeElement.blur();
  }

  backpackModal.classList.remove("open");
  backpackModalBackdrop.classList.remove("open");

  backpackModal.setAttribute(
    "aria-hidden",
    "true"
  );
}

// DATA =========================================================
function getBackpackData() {
  return {
    name: backpackName.value.trim()
  };
}


// FIRESTORE =========================================================

async function saveBackpack(
  backpack
) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      "User not authenticated."
    );
  }

  const backpacksRef =
    collection(
      db,
      "users",
      user.uid,
      "backpacks"
    );

  if (editingBackpackId) {

    const backpackRef =
      doc(
        backpacksRef,
        editingBackpackId
      );

    await updateDoc(
      backpackRef,
      {
        ...backpack,
        updatedAt:
          serverTimestamp()
      }
    );

    return;
  }

  await addDoc(
    backpacksRef,
    {
      ...backpack,
      createdAt:
        serverTimestamp(),
      updatedAt:
        serverTimestamp()
    }
  );
}


async function deleteBackpack() {
  const user = auth.currentUser;

  if (
    !user ||
    !editingBackpackId
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

    const backpackRef =
      doc(
        db,
        "users",
        user.uid,
        "backpacks",
        editingBackpackId
      );

    await deleteDoc(
      backpackRef
    );

    editingBackpackId = null;

    closeBackpackModal();
    openBackpackPanel();

  } catch (error) {

    console.error(
      "Error deleting backpack:",
      error
    );

  }
}





// PREVIEW =========================================================

function updateBackpackPreview() {
  const name = backpackName.value.trim();

  backpackPreview.textContent = name
    ? `Viaggio: ${name}`
    : "Inserisci il nome del viaggio";
}


// SUBMIT =========================================================
async function handleBackpackSubmit(event) {
  event.preventDefault();

  const backpack = getBackpackData();

  if (!backpack.name) {
    backpackPreview.textContent = "Inserisci un nome per il viaggio.";
    backpackName.focus();
    return;
  }

  try {
    if (editingBackpackId) {
      await saveBackpack(backpack);
    } else if (selectedSourceBackpackId) {
      await duplicateBackpack(
        selectedSourceBackpackId,
        backpack.name
      );
    } else {
      await saveBackpack(backpack);
    }

    editingBackpackId = null;
    backpackForm.reset();
    selectedSourceBackpackId = null;

    closeBackpackModal();

    if (typeof window.showAddedToast === "function") {
      window.showAddedToast();
    }
  } catch (error) {
    console.error("Error saving trip:", error);
  }
}

// INITIALIZATION =========================================================
export function initBackpacks() {

  if (
    !backpackSidebar ||
    !backpackPanel ||
    !backpackModal
  ) {

    console.warn(
      "Backpack elements not found."
    );

    return;
  }


  backpackSidebar.addEventListener("click", openBackpackPanel);
  closeBackpackPanelButton.addEventListener("click", closeBackpackPanel);
  addBackpackPanelButton.addEventListener("click", openBackpackModal);
  backpackPanelBackdrop.addEventListener("click", closeBackpackPanel);
  addBackpackButton.addEventListener("click", openBackpackModal);
  closeBackpackModalButton.addEventListener("click", closeBackpackModal);
  deleteBackpackButton.addEventListener("click", deleteBackpack);
  backpackModalBackdrop.addEventListener("click", closeBackpackModal);
  backpackDetailBackButton.addEventListener("click", showBackpacksList);
  backpackDetailEditButton.addEventListener("click", editCurrentBackpack);
  
  backpackName.addEventListener("input", updateBackpackPreview);
  backpackForm.addEventListener("submit", handleBackpackSubmit);

  updateBackpackPreview();
}

// DUPLICATE ======================================================

async function duplicateBackpack(sourceBackpackId, newName) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User not authenticated.");
  }

  const backpacksRef = collection(
    db,
    "users",
    user.uid,
    "backpacks"
  );

  const sourceItemsRef = collection(
    db,
    "users",
    user.uid,
    "backpacks",
    sourceBackpackId,
    "items"
  );

  const sourceItemsSnapshot = await getDocs(sourceItemsRef);

  const newBackpackRef = await addDoc(backpacksRef, {
    name: newName.trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  const newItemsRef = collection(
    db,
    "users",
    user.uid,
    "backpacks",
    newBackpackRef.id,
    "items"
  );

  for (const itemSnapshot of sourceItemsSnapshot.docs) {
    const item = itemSnapshot.data();

    await addDoc(newItemsRef, {
      ...item,
      checked: false
    });
  }

  return newBackpackRef.id;
}




// RENDER =========================================================
function openBackpackDetail(backpackId, backpack) {
  currentBackpackId = backpackId;
  currentBackpackData = backpack;

  backpacksList.hidden = true;
  backpackDetail.hidden = false;

  renderBackpackDetail();
}

function renderBackpackDetail() {
  if (!currentBackpackData) return;

  backpackDetailTitle.textContent =
    currentBackpackData.name || "Viaggio senza nome";

  backpackDetailItems.innerHTML = `
    <div class="backpacks-empty">
      <span>Nessun oggetto</span>
      <small>La lista degli oggetti verrà aggiunta qui.</small>
    </div>
  `;
}

function showBackpacksList() {
  currentBackpackId = null;
  currentBackpackData = null;

  backpackDetail.hidden = true;
  backpacksList.hidden = false;
}

function editCurrentBackpack() {
  if (!currentBackpackId || !currentBackpackData) return;

  openBackpackEditModal(currentBackpackId, currentBackpackData);
}

async function deleteCurrentBackpack() {
  if (!currentBackpackId) return;

  const confirmed = confirm(
    `Vuoi eliminare il viaggio "${currentBackpackData.name}"? Questa azione non può essere annullata.`
  );

  if (!confirmed) return;

  const user = auth.currentUser;
  if (!user) return;

  try {
    const itemsRef = collection(
      db,
      "users",
      user.uid,
      "backpacks",
      currentBackpackId,
      "items"
    );

    const itemsSnapshot = await getDocs(itemsRef);

    for (const itemSnapshot of itemsSnapshot.docs) {
      await deleteDoc(itemSnapshot.ref);
    }

    await deleteDoc(
      doc(db, "users", user.uid, "backpacks", currentBackpackId)
    );

    showBackpacksList();
  } catch (error) {
    console.error("Error deleting trip:", error);
  }
}

function renderBackpacks(snapshot) {
  backpacksList.innerHTML = "";

  if (snapshot.empty) {
    backpacksList.innerHTML = `
      <div class="backpacks-empty">
        <span>Nessun viaggio</span>
        <small>Crea il tuo primo viaggio con il pulsante +</small>
      </div>
    `;
    return;
  }

  snapshot.forEach((documentSnapshot) => {
    const data = documentSnapshot.data();
    const id = documentSnapshot.id;

    const item = document.createElement("div");
    item.className = "backpack-list-item";

    const name = document.createElement("div");
    name.className = "backpack-list-name";
    name.textContent = data.name || "Viaggio senza nome";

    item.appendChild(name);

    item.addEventListener("click", () => {
      openBackpackDetail(id, data);
    });

    backpacksList.appendChild(item);
  });


  if (currentBackpackId) {
    const updatedTrip = snapshot.docs.find(
      (item) => item.id === currentBackpackId
    );
  
    if (updatedTrip) {
      currentBackpackData = {
        id: updatedTrip.id,
        ...updatedTrip.data()
      };
  
      renderBackpackDetail();
    } else {
      showBackpacksList();
    }
  }
  
}


function listenToBackpacks() {
  const user = auth.currentUser;

  if (!user) {
    return;
  }

  if (backpacksUnsubscribe) {
    backpacksUnsubscribe();
  }

  const backpacksRef =
    collection(
      db,
      "users",
      user.uid,
      "backpacks"
    );

  backpacksUnsubscribe =
    onSnapshot(
      backpacksRef,
      (snapshot) => {
        renderBackpacks(snapshot);
      },
      (error) => {
        console.error(
          "Error loading backpacks:",
          error
        );
      }
    );
}



function openBackpackPanel() {
  listenToBackpacks();

  backpackPanel.classList.add("open");

  backpackSidebar.classList.add("active");
}


function closeBackpackPanel() {
  backpackPanel.classList.remove("open");

  backpackSidebar.classList.remove("active");
}
