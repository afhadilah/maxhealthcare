// =====================
// AUTH
// =====================
if(localStorage.getItem("admin") !== "true"){
  window.location.href = "index.html";
}

function logout(){
  localStorage.removeItem("admin");
  window.location.href = "index.html";
}

// =====================
// POPUP CONFIRM SYSTEM
// =====================
function showConfirm(message, onConfirm){

  const modal = document.createElement("div");
  modal.className = "modal";

  modal.innerHTML = `
    <div class="modal-box">

      <h2>⚠️ Confirmation</h2>

      <p style="margin:15px 0;color:#cbd5e1;">
        ${message}
      </p>

      <div style="display:flex;gap:10px;">

        <button id="yesBtn" class="red-btn">YES</button>
        <button onclick="closeModal()">CANCEL</button>

      </div>

    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("yesBtn").onclick = () => {
    closeModal();
    onConfirm();
  };

}

function closeModal(){
  const modal = document.querySelector(".modal");
  if(modal) modal.remove();
}

// =====================
// FIRESTORE
// =====================
const container = document.getElementById("staffList");

db.collection("staff").onSnapshot(snapshot=>{

  container.innerHTML = "";

  snapshot.forEach(doc=>{

    const staff = doc.data();

    container.innerHTML += `

      <div class="staff-card">

        <h2>${staff.name}</h2>

        <input id="position-${doc.id}" value="${staff.position}">
        <input id="pin-${doc.id}" value="${staff.pin}">

        <p class="${staff.onDuty ? 'on':'off'}">
          ${staff.onDuty ? '🟢 ON DUTY' : '🔴 OFF DUTY'}
        </p>

        <p>⏱ ${formatTime(staff.totalTime || 0)}</p>

        <div class="staff-actions">

          <button onclick="saveStaff('${doc.id}')">SAVE</button>

          <button class="orange-btn" onclick="forceStop('${doc.id}')">
            FORCE STOP
          </button>

          <button onclick="resetTime('${doc.id}')">
            RESET TIME
          </button>

          <button class="red-btn" onclick="deleteStaff('${doc.id}')">
            DELETE
          </button>

        </div>

      </div>

    `;

  });

});

// =====================
// ADD STAFF
// =====================
async function addStaff(){

  const name = document.getElementById("name").value;
  const position = document.getElementById("position").value;
  const pin = document.getElementById("pin").value;

  if(!name || !position || !pin){
    alert("Complete all fields");
    return;
  }

  showConfirm(`Add staff ${name}?`, async ()=>{

    await db.collection("staff").add({
      name,
      position,
      pin,
      onDuty:false,
      totalTime:0,
      startTime:0
    });

  });

}

// =====================
// SAVE STAFF
// =====================
async function saveStaff(id){

  const position = document.getElementById(`position-${id}`).value;
  const pin = document.getElementById(`pin-${id}`).value;

  showConfirm("Save changes?", async ()=>{

    await db.collection("staff").doc(id).update({
      position,
      pin
    });

  });

}

// =====================
// DELETE
// =====================
async function deleteStaff(id){

  showConfirm("DELETE this staff permanently?", async ()=>{

    await db.collection("staff").doc(id).delete();

  });

}

// =====================
// FORCE STOP
// =====================
async function forceStop(id){

  showConfirm("Force stop duty?", async ()=>{

    await db.collection("staff").doc(id).update({
      onDuty:false
    });

  });

}

// =====================
// RESET TIME
// =====================
async function resetTime(id){

  showConfirm("Reset time?", async ()=>{

    await db.collection("staff").doc(id).update({
      totalTime:0,
      startTime:0
    });

  });

}

// =====================
// RESET ALL
// =====================
async function resetAllTime(){

  showConfirm("RESET ALL STAFF TIME?", async ()=>{

    const snapshot = await db.collection("staff").get();

    snapshot.forEach(doc=>{
      db.collection("staff").doc(doc.id).update({
        totalTime:0,
        startTime:0
      });
    });

  });

}