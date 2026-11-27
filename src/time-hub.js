// time-hub.js
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
const timeHubSidebar = document.getElementById("timeHub-sidebar");

const timeHubPanel = document.getElementById("timeHub-panel");
const closeTimeHubPanelButton = document.getElementById("close-timeHub-panel");
const addTimeHubPanelButton = document.getElementById("panel-add-timeHub");
const timeHubPanelBackdrop = document.getElementById("timeHub-panel-backdrop");

const timeHubList = document.getElementById("timeHub-list");
const deleteTimeButton = document.getElementById("delete-time");


// INITIALIZATION =========================================================
export function initTimeHub() {

  if (
    !timeHubSidebar ||
    !timeHubPanel
  ) {

    console.warn(
      "Time elements not found."
    );

    return;
  }
  
  timeHubSidebar.addEventListener("click", openTimeHubPanel);
  closeTimeHubPanelButton.addEventListener("click", closeTimeHubPanel);
  addTimeHubPanelButton.addEventListener("click", openTimeHubPanel);
  timeHubPanelBackdrop.addEventListener("click", closeTimeHubPanel);
  deleteTimeHubButton.addEventListener("click", deleteTime);

  updateTimeHubPreview();
}





function listenToTimeHub() {
  const user = auth.currentUser;

  if (!user) {
    return;
  }

  
}










// sunrise- sunset
// moon phase
// time list places
// add time place / delete














function openTimeHubPanel() {
  listenToTimeHub();

  timeHubPanel.classList.add(
    "open"
  );

  timeHubSidebar.classList.add(
    "active"
  );
}


function closeTimeHubPanel() {
  timeHubPanel.classList.remove(
    "open"
  );

  timeHubSidebar.classList.remove(
    "active"
  );
}
