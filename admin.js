// admin.js
// Requires: firebase-config.js, time-engine.js
// Assumptions: `db`, `formatTime`, `getSafeDuration` are available.

// =====================
// AUTH ADMIN
// =====================

const adminStatus =
  localStorage.getItem("admin");

const loginTime =
  Number(localStorage.getItem("loginTime") || 0);

const SESSION_DURATION =
  1000 * 60 * 30; // 30 menit

if (
  adminStatus !== "true" ||
  Date.now() - loginTime > SESSION_DURATION
) {

  localStorage.removeItem("admin");
  localStorage.removeItem("loginTime");

  window.location.href = "index.html";

}

function logout() {

  localStorage.removeItem("admin");
  localStorage.removeItem("loginTime");

  window.location.href = "index.html";

}

// =====================
// HELPER: Inventory Log to Google Sheets (Sheet2)
// =====================
const SHEET_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwjlLMfqn6bh1Vete1E2DF4ikguGqU0QIYDKLFOPhupA9CpIUEU5oYnUkve-uW4JgSh/exec"; // Provided Apps Script URL
function sendInventoryLogToSheet(data){

  fetch(SHEET_SCRIPT_URL,{
    method:"POST",
    mode:"no-cors",
    headers:{
      "Content-Type":"application/json"
    },
    body:JSON.stringify({

      type:"inventory",

      timestamp:new Date().toLocaleString(),

      actionType:data.actionType,
      actor:data.actor,

      productName:data.productName,
      qty:data.qty,

      description:data.description

    })
  });
}

// =====================
// MODAL SYSTEM (in-page confirmations)
// =====================
function showConfirm(message, onConfirm) {
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal-box">
      <h2>⚠️ Confirmation</h2>
      <p style="margin:15px 0; color:#cbd5e1;">${message}</p>
      <div style="display:flex; gap:10px;">
        <button id="yesBtn" class="red-btn">YES</button>
        <button onclick="closeModal()">CANCEL</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById("yesBtn").onclick = () => {
    closeModal();
    onConfirm();
  };
}

function closeModal() {
  const modal = document.querySelector(".modal");
  if (modal) modal.remove();
}

// =====================
// STAFF SYSTEM
// =====================
const staffContainer = document.getElementById("staffList");
db.collection("staff").onSnapshot(snapshot => {
  staffContainer.innerHTML = "";
  snapshot.forEach(doc => {
    const staff = doc.data();
    staffContainer.innerHTML += `
      <div class="staff-card">
        <h2>${staff.name}</h2>
        <input id="position-${doc.id}" value="${staff.position}">
        <input id="pin-${doc.id}" type="password" value="${staff.pin}"> <!-- CHANGED: hide PIN -->
        <p class="${staff.onDuty ? 'on' : 'off'}">
          ${staff.onDuty ? '🟢 ON DUTY' : '🔴 OFF DUTY'}
        </p>
        <p>⏱ ${formatTime(staff.totalTime || 0)}</p>
        <div class="staff-actions">
          <button onclick="saveStaff('${doc.id}')">SAVE</button>
          <button class="orange-btn" onclick="forceStop('${doc.id}')">FORCE STOP</button>
          <button onclick="resetTime('${doc.id}')">RESET TIME</button>
          <button class="red-btn" onclick="deleteStaff('${doc.id}')">DELETE</button>
        </div>
      </div>`;
  });
});

// =====================
// ADD STAFF
// =====================
async function addStaff() {
  const name = document.getElementById("name").value.trim();
  const position = document.getElementById("position").value.trim();
  const pin = document.getElementById("pin").value.trim();
  if (!name || !position || !pin) {
    alert("Complete all fields");
    return;
  }
  showConfirm(`Add staff ${name}?`, async () => {
    await db.collection("staff").add({
      name, position, pin,
      onDuty: false,
      totalTime: 0,
      startTime: 0
    });
    document.getElementById("name").value = "";
    document.getElementById("position").value = "";
    document.getElementById("pin").value = "";
  });
}

// =====================
// SAVE STAFF
// =====================
async function saveStaff(id) {
  const position = document.getElementById(`position-${id}`).value.trim();
  const pin = document.getElementById(`pin-${id}`).value.trim();
  showConfirm("Save changes?", async () => {
    await db.collection("staff").doc(id).update({ position, pin });
  });
}

// =====================
// DELETE STAFF
// =====================
async function deleteStaff(id) {
  showConfirm("DELETE this staff permanently?", async () => {
    await db.collection("staff").doc(id).delete();
  });
}

// =====================
// FORCE STOP (ends duty without losing time)
// =====================
async function forceStop(id) {
  showConfirm("Force stop duty?", async () => {
    const doc = await db.collection("staff").doc(id).get();
    const staff = doc.data();
    if (staff.onDuty) {
      const duration = getSafeDuration(staff.startTime);
      const total = (Number(staff.totalTime) || 0) + duration;
      await db.collection("staff").doc(id).update({
        onDuty: false,
        totalTime: total,
        startTime: 0 // CHANGED: reset startTime
      });
    }
  });
}

// =====================
// RESET TIME
// =====================
async function resetTime(id) {
  showConfirm("Reset time?", async () => {
    await db.collection("staff").doc(id).update({
      onDuty: false, // CHANGED: ensure off duty
      totalTime: 0,
      startTime: 0
    });
  });
}

// =====================
// RESET ALL STAFF
// =====================
async function resetAllTime() {
  showConfirm("RESET ALL STAFF TIME?", async () => {
    const snapshot = await db.collection("staff").get();
    snapshot.forEach(doc => {
      db.collection("staff").doc(doc.id).update({
        onDuty: false, // CHANGED: ensure off duty
        totalTime: 0,
        startTime: 0
      });
    });
  });
}

// =====================
// INVENTORY SYSTEM (Admin Panel)
// =====================
const inventoryContainer = document.getElementById("inventoryList");
db.collection("inventory").onSnapshot(snapshot => {
  inventoryContainer.innerHTML = "";
  snapshot.forEach(doc => {
    const item = doc.data();
    let html = "";

snapshot.forEach(doc => {

  const staff = doc.data();

  html += `
    <div class="staff-card">
      ...
    </div>
  `;

});

staffContainer.innerHTML = html;`
      <div class="inventory-card">
        <h3>${item.name}</h3>
        <input class="inventory-input" id="inv-name-${doc.id}" value="${item.name}">
        <input class="inventory-input" type="number" id="inv-qty-${doc.id}" value="${item.qty}">
        <div class="inventory-actions">
          <button onclick="saveInventory('${doc.id}')">SAVE</button>
          <button class="red-btn" onclick="deleteInventory('${doc.id}')">DELETE</button>
        </div>
      </div>`;
  });
});

// =====================
// ADD INVENTORY
// =====================
async function addInventory() {

  const name = document.getElementById("inventoryName").value.trim();
  const qty = Number(document.getElementById("inventoryQty").value);

  if (!name) {
    alert("Enter item name");
    return;
  }

  if (qty < 0) {
    alert("Invalid quantity");
    return;
  }

  showConfirm(`Add inventory item ${name}?`, async () => {

    await db.collection("inventory").add({
      name,
      qty
    });

    sendInventoryLogToSheet({
      actionType:"ADD",
      actor:"ADMIN",
      productName:name,
      qty:qty,
      description:"Added inventory"
    });

    document.getElementById("inventoryName").value = "";
    document.getElementById("inventoryQty").value = "";

  });

}

// =====================
// SAVE (EDIT) INVENTORY
// =====================
async function saveInventory(id) {

  const name = document.getElementById(`inv-name-${id}`).value.trim();
  const qty = Number(document.getElementById(`inv-qty-${id}`).value);

  if (!name) {
    alert("Item name required");
    return;
  }

  if (qty < 0) {
    alert("Invalid quantity");
    return;
  }

  showConfirm("Save inventory changes?", async () => {

    await db.collection("inventory").doc(id).update({
      name,
      qty
    });

    sendInventoryLogToSheet({
      actionType:"EDIT",
      actor:"ADMIN",
      productName:name,
      qty:qty,
      description:"Inventory edited"
    });

  });

}

// =====================
// DELETE INVENTORY
// =====================
async function deleteInventory(id) {

  showConfirm("Delete inventory item?", async () => {

    const doc = await db.collection("inventory").doc(id).get();

    if (!doc.exists) return;

    const item = doc.data();

    sendInventoryLogToSheet({
      actionType:"DELETE",
      actor:"ADMIN",
      productName:item.name,
      qty:item.qty,
      description:"Inventory deleted"
    });

    await db.collection("inventory").doc(id).delete();

  });

}
