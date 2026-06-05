// =====================
// AUTH
// =====================

const loginStatus =
  localStorage.getItem("loggedIn");

const loginTime =
  Number(localStorage.getItem("loginTime") || 0);

const SESSION_DURATION =
  1000 * 60 * 30; // 30 menit

if (
  loginStatus !== "true" ||
  Date.now() - loginTime > SESSION_DURATION
) {

  localStorage.removeItem("loggedIn");
  localStorage.removeItem("loginTime");

  window.location.href = "index.html";

}

function logout() {

  localStorage.removeItem("loggedIn");
  localStorage.removeItem("loginTime");

  window.location.href = "index.html";

}

// =====================
// LIVE CLOCK & STAFF LIST
// =====================
const staffContainer = document.getElementById("staffList");
const clock = document.createElement("div");
clock.className = "live-clock";
document.querySelector(".container").prepend(clock);
setInterval(() => {
  clock.innerHTML = "🕒 " + new Date().toLocaleString();
}, 60000);

let inventoryItems = [];

db.collection("inventory").onSnapshot(snapshot => {

  inventoryItems =
    snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

}); // <-- PENUTUP INVENTORY SNAPSHOT

db.collection("staff").onSnapshot(snapshot => {

  let html = "";

  snapshot.forEach(doc => {

    const staff = doc.data();

    const duration =
      staff.onDuty
        ? getSafeDuration(staff.startTime)
        : 0;

    const total =
      (Number(staff.totalTime) || 0) + duration;

    html += `
      <div class="staff-card" onclick="openModal('${doc.id}')">

        <div class="staff-name">
          ${staff.name}
        </div>

        <p>${staff.position}</p>

        <div class="status ${staff.onDuty ? 'on' : 'off'}">
          ${staff.onDuty ? '🟢 ON DUTY' : '🔴 OFF DUTY'}
        </div>

        <div class="timer">
          ⏱ ${formatTime(total)}
        </div>

      </div>
    `;

  });

  staffContainer.innerHTML = html;

}); // <-- PENUTUP STAFF SNAPSHOT

// =====================
// MODAL DIALOG (Staff)
// =====================
async function openModal(id) {
  const doc = await db.collection("staff").doc(id).get();
  const staff = doc.data();
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal-box">
      <h2>${staff.name}</h2>
      <input type="password" id="staffPin" placeholder="Enter PIN">
      <button onclick="checkPin('${id}')">VERIFY</button>
      <button onclick="closeModal()">CANCEL</button>
    </div>`;
  document.body.appendChild(modal);
}

function closeModal() {
  const modal = document.querySelector(".modal");
  if (modal) modal.remove();
}

async function checkPin(id) {
  const doc = await db.collection("staff").doc(id).get();
  const staff = doc.data();
  const input = document.getElementById("staffPin").value;
  if (input !== staff.pin) {
    showAlert("Wrong PIN");
    return;
  }
  let inventoryOptions = "";
  inventoryItems.forEach(item => {
    if (Number(item.qty) <= 0) return; // skip jika stok kosong
    inventoryOptions += `<option value="${item.id}">${item.name} (${item.qty})</option>`;
  });
  document.querySelector(".modal-box").innerHTML = `
    <h2>${staff.name}</h2>
    ${
      staff.onDuty
        ? `<button onclick="offDuty('${id}')">🔴 OFF DUTY</button>`
        : `<button onclick="onDutyFunc('${id}')">🟢 ON DUTY</button>`
    }
    <hr style="margin:15px 0;">
    <h3>📦 Inventory Request</h3>
    <select id="inventoryProduct" style="width:100%; padding:15px; margin-top:15px; border-radius:12px; background:#111827; color:white;">
      <option value="">Select Product</option>
      ${inventoryOptions}
    </select>
    <input type="number" id="inventoryQty" placeholder="Quantity">
    <input type="text" id="inventoryDesc" placeholder="Description">
    <button onclick="submitInventoryRequest('${id}')">SUBMIT REQUEST</button>
    <button onclick="closeModal()">CLOSE</button>`;
}

// =====================
// DUTY FUNCTIONS
// =====================
async function onDutyFunc(id) {

  const doc = await db.collection("staff").doc(id).get();
  const staff = doc.data();

  if (staff.onDuty) {
    showAlert("Already ON DUTY");
    return;
  }

  await db.collection("staff").doc(id).update({
    onDuty: true,
    startTime: Date.now()
  });

  sendLogToSheet(
    staff.name,
    "ON DUTY",
    "-",
    formatTime(Number(staff.totalTime || 0))
  );

  closeModal();
}

async function offDuty(id) {

  const doc = await db.collection("staff").doc(id).get();
  const staff = doc.data();

  if (!staff.onDuty) {
    showAlert("Already OFF DUTY");
    return;
  }

  const duration = getSafeDuration(staff.startTime);
  const total = (Number(staff.totalTime) || 0) + duration;

  await db.collection("staff").doc(id).update({
    onDuty: false,
    totalTime: total,
    startTime: 0
  });

  sendLogToSheet(
    staff.name,
    "OFF DUTY",
    formatTime(duration),
    formatTime(total)
  );

  closeModal();

} // <-- PENUTUP offDuty HILANG

function showAlert(message){

  const modal = document.createElement("div");

  modal.className = "modal";

  modal.innerHTML = `
    <div class="modal-box">

      <h2>✅ Notification</h2>

      <p style="margin:15px 0;">
        ${message}
      </p>

      <button id="okBtn">OK</button>

    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("okBtn").onclick = () => {
    closeModal();
  };

}
function showConfirm(message,onConfirm){

  const modal = document.createElement("div");

  modal.className = "modal";

  modal.innerHTML = `
    <div class="modal-box">

      <h2>📦 Inventory Confirmation</h2>

      <p style="margin:15px 0;">
        ${message.replace(/\n/g,"<br>")}
      </p>

      <div style="display:flex;gap:10px;justify-content:center;">

        <button id="confirmBtn">
          CONFIRM
        </button>

        <button id="cancelBtn">
          CANCEL
        </button>

      </div>

    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("confirmBtn").onclick = () => {
    closeModal();
    onConfirm();
  };

  document.getElementById("cancelBtn").onclick = () => {
    closeModal();
  };

}
// =====================
// INVENTORY REQUEST
// =====================
async function submitInventoryRequest(id) {

  const productId = document.getElementById("inventoryProduct").value;
  const qty = Number(document.getElementById("inventoryQty").value);
  const description = document.getElementById("inventoryDesc").value.trim();

  if (!productId) {
    showAlert("Select product");
    return;
  }

  if (qty <= 0) {
    showAlert("Invalid quantity");
    return;
  }

  if (!description) {
    showAlert("Description required");
    return;
  }

  const product = inventoryItems.find(x => x.id === productId);

  if (!product) {
    showAlert("Product not found");
    return;
  }

  const staffDoc = await db.collection("staff").doc(id).get();
  const staff = staffDoc.data();

  const confirmText =
`Product: ${product.name}
Qty: ${qty}
Description: ${description}

Continue?`;

  showConfirm(confirmText, async () => {

    try {

      await db.runTransaction(async (transaction) => {

        const inventoryRef =
          db.collection("inventory").doc(productId);

        const inventoryDoc =
          await transaction.get(inventoryRef);

        if (!inventoryDoc.exists) {
          throw new Error("Inventory item not found");
        }

        const currentQty =
          Number(inventoryDoc.data().qty || 0);

        if (currentQty < qty) {
          throw new Error(
            `Stock not enough. Available: ${currentQty}`
          );
        }

        const newQty = currentQty - qty;

        transaction.update(inventoryRef, {
          qty: newQty
        });

        const requestRef =
          db.collection("inventory_requests").doc();

        transaction.set(requestRef, {
          staffId: id,
          staffName: staff.name,
          productId: productId,
          productName: product.name,
          qty: qty,
          description: description,
          previousStock: currentQty,
          remainingStock: newQty,
          timestamp: Date.now()
        });

      });

      sendInventoryLogToSheet({
        actionType: "REQUEST",
        actor: staff.name,
        productName: product.name,
        qty: qty,
        description: description
      });

      showAlert("Request submitted successfully");

    } catch (error) {

      showAlert(error.message);

    }

  });

}
// =====================
// SEARCH STAFF
// =====================

function searchStaff() {

  const keyword =
    document
      .getElementById("searchInput")
      .value
      .toLowerCase();

  document
    .querySelectorAll(".staff-card")
    .forEach(card => {

      const text =
        card.textContent.toLowerCase();

      card.style.display =
        text.includes(keyword)
          ? ""
          : "none";

    });

}
// =====================
// GOOGLE SHEETS LOG (Staff Attendance)
// =====================
// =====================
// STAFF LOG (SHEET1)
// =====================
function sendLogToSheet(
  staffName,
  action,
  duration = "-",
  totalTime = "-"
){

  fetch(
    "https://script.google.com/macros/s/AKfycbwjlLMfqn6bh1Vete1E2DF4ikguGqU0QIYDKLFOPhupA9CpIUEU5oYnUkve-uW4JgSh/exec",
    {
      method:"POST",
      mode:"no-cors",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({

        type:"duty",

        staffName:staffName,
        action:action,

        timestamp:new Date().toLocaleString(),

        duration:duration,
        totalTime:totalTime

      })
    }
  );

}

// =====================
// HELPER: Inventory Log to Google Sheets (Sheet2)
// =====================
// =====================
// INVENTORY LOG (SHEET2)
// =====================
function sendInventoryLogToSheet({

  actionType,
  actor,
  productName,
  qty,
  description

}){

  fetch(
    "https://script.google.com/macros/s/AKfycbwjlLMfqn6bh1Vete1E2DF4ikguGqU0QIYDKLFOPhupA9CpIUEU5oYnUkve-uW4JgSh/exec",
    {
      method:"POST",
      mode:"no-cors",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({

        type:"inventory",

        timestamp:new Date().toLocaleString(),

        actionType:actionType,

        staffName:actor, // <---- WAJIB GANTI

        productName:productName,
        qty:qty,

        description:description

      })
    }
  );

}
