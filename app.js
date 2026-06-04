
if(localStorage.getItem("loggedIn") !== "true"){
  window.location.href = "index.html";
}

function logout(){
  localStorage.removeItem("loggedIn");
  window.location.href = "index.html";
}

const staffContainer = document.getElementById("staffList");

const clock = document.createElement("div");
clock.className = "live-clock";
document.querySelector(".container").prepend(clock);

setInterval(()=>{
  clock.innerHTML = "🕒 " + new Date().toLocaleString();
},1000);

db.collection("staff").onSnapshot((snapshot)=>{

  staffContainer.innerHTML = "";

  snapshot.forEach((doc)=>{

    const staff = doc.data();

    const duration = staff.onDuty
      ? getSafeDuration(staff.startTime)
      : 0;

    const total =
      (Number(staff.totalTime) || 0) + duration;

    staffContainer.innerHTML += `

      <div class="staff-card"
      onclick="openModal('${doc.id}','${staff.pin}',${staff.onDuty})">

        <div class="staff-name">${staff.name}</div>
        <p>${staff.position}</p>

        <div class="status ${staff.onDuty ? 'on':'off'}">
          ${staff.onDuty ? '🟢 ON DUTY' : '🔴 OFF DUTY'}
        </div>

        <div class="timer">
          ⏱ ${formatTime(total)}
        </div>

      </div>

    `;
  });

});

function openModal(id,pin,onDuty){

  const modal = document.createElement("div");
  modal.className = "modal";

  modal.innerHTML = `
    <div class="modal-box">

      <h2>Staff Verification</h2>

      <input type="password" id="staffPin" placeholder="Enter PIN">

      <button onclick="checkPin('${id}','${pin}',${onDuty})">
        VERIFY
      </button>

      <button onclick="closeModal()">CANCEL</button>

    </div>
  `;

  document.body.appendChild(modal);
}

function closeModal(){
  const modal = document.querySelector(".modal");
  if(modal) modal.remove();
}

function checkPin(id,pin,onDuty){

  const input = document.getElementById("staffPin").value;

  if(input === pin){

    document.querySelector(".modal-box").innerHTML = `
      <h2>Duty Action</h2>

      <button onclick="onDutyFunc('${id}')">🟢 ON DUTY</button>
      <button onclick="offDuty('${id}')">🔴 OFF DUTY</button>
      <button onclick="closeModal()">CANCEL</button>
    `;

  }else{
    alert("Wrong PIN");
  }

}

async function onDutyFunc(id){

  await db.collection("staff").doc(id).update({
    onDuty:true,
    startTime:Date.now()
  });

  closeModal();
}

async function offDuty(id){

  const doc = await db.collection("staff").doc(id).get();
  const staff = doc.data();

  const duration = getSafeDuration(staff.startTime);

  const total =
    (Number(staff.totalTime) || 0) + duration;

  await db.collection("staff").doc(id).update({
    onDuty:false,
    totalTime:total
  });

  await sendLogToSheet(
    staff.name,
    "OFF DUTY",
    formatTime(duration),
    formatTime(total)
  );

  closeModal();
}

function searchStaff(){

  const input =
  document.getElementById("searchInput").value.toLowerCase();

  document.querySelectorAll(".staff-card").forEach(card=>{
    card.style.display =
    card.innerText.toLowerCase().includes(input)
    ? "block"
    : "none";
  });

}

async function sendLogToSheet(staff,action,duration="-",totalTime="-"){

  fetch("https://script.google.com/macros/s/AKfycbwjlLMfqn6bh1Vete1E2DF4ikguGqU0QIYDKLFOPhupA9CpIUEU5oYnUkve-uW4JgSh/exec",{

    method:"POST",
    mode:"no-cors",
    headers:{
      "Content-Type":"application/json"
    },

    body:JSON.stringify({
      staff,
      action,
      timestamp:new Date().toLocaleString(),
      duration,
      totalTime
    })

  });

}