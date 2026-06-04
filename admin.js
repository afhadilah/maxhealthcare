if(localStorage.getItem("admin") !== "true"){

  window.location.href = "index.html";

}

function logout(){

  localStorage.removeItem("admin");

  window.location.href = "index.html";

}

const container =
document.getElementById("staffList");

db.collection("staff")
.onSnapshot((snapshot)=>{

  container.innerHTML = "";

  snapshot.forEach((doc)=>{

    const staff = doc.data();

    container.innerHTML += `

      <div class="staff-card">

        <h2>${staff.name}</h2>

        <input
        id="position-${doc.id}"
        value="${staff.position}">

        <input
        id="pin-${doc.id}"
        value="${staff.pin}">

        <p class="${staff.onDuty ? 'on':'off'}">

          ${staff.onDuty
          ? '🟢 ON DUTY'
          : '🔴 OFF DUTY'}

        </p>

        <p>

          ⏱
          ${formatTime(
          staff.totalTime || 0)}

        </p>

        <div class="staff-actions">

          <button
          onclick="saveStaff('${doc.id}')">

            SAVE

          </button>

          <button
          class="orange-btn"
          onclick="forceStop('${doc.id}')">

            FORCE STOP

          </button>

          <button
          onclick="resetTime('${doc.id}')">

            RESET TIME

          </button>

          <button
          class="red-btn"
          onclick="deleteStaff('${doc.id}')">

            DELETE

          </button>

        </div>

      </div>

    `;

  });

});

async function addStaff(){

  const name =
  document.getElementById("name").value;

  const position =
  document.getElementById("position").value;

  const pin =
  document.getElementById("pin").value;

  if(!name || !position || !pin){

    alert("Complete all fields");

    return;

  }

  await db.collection("staff").add({

    name:name,

    position:position,

    pin:pin,

    onDuty:false,

    totalTime:0,

    startTime:0

  });

}

async function saveStaff(id){

  const position =
  document.getElementById(`position-${id}`).value;

  const pin =
  document.getElementById(`pin-${id}`).value;

  await db.collection("staff")
  .doc(id)
  .update({

    position:position,

    pin:pin

  });

}

async function deleteStaff(id){

  await db.collection("logs").add({

    staffId:id,

    action:"DELETE STAFF",

    timestamp:Date.now()

  });

  await db.collection("staff")
  .doc(id)
  .delete();

}

async function forceStop(id){

  await db.collection("logs").add({

    staffId:id,

    action:"FORCE STOP",

    timestamp:Date.now()

  });

  await db.collection("staff")
  .doc(id)
  .update({

    onDuty:false

  });

}

async function resetTime(id){

  await db.collection("logs").add({

    staffId:id,

    action:"RESET TIME",

    timestamp:Date.now()

  });

  await db.collection("staff")
  .doc(id)
  .update({

    totalTime:0,

    startTime:0

  });

}

async function resetAllTime(){

  const snapshot =
  await db.collection("staff").get();

  snapshot.forEach(async (doc)=>{

    await db.collection("staff")
    .doc(doc.id)
    .update({

      totalTime:0,

      startTime:0

    });

  });

}

function formatTime(ms){

  const totalSeconds =
  Math.floor(ms / 1000);

  const hours =
  Math.floor(totalSeconds / 3600);

  const minutes =
  Math.floor((totalSeconds % 3600)/60);

  const seconds =
  totalSeconds % 60;

  return `
  ${hours}h
  ${minutes}m
  ${seconds}s
  `;

}