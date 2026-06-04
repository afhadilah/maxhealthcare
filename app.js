if(localStorage.getItem("loggedIn") !== "true"){

  window.location.href = "index.html";

}

function logout(){

  localStorage.removeItem("loggedIn");

  window.location.href = "index.html";

}

const staffContainer =
document.getElementById("staffList");

const clock =
document.createElement("div");

clock.className = "live-clock";

document.querySelector(".container")
.prepend(clock);

setInterval(()=>{

  clock.innerHTML =
  "🕒 " +
  new Date().toLocaleString();

},1000);

db.collection("staff")
.onSnapshot((snapshot)=>{

  staffContainer.innerHTML = "";

  snapshot.forEach((doc)=>{

    const staff = doc.data();

    const duration =
    staff.onDuty
    ? (Date.now() - staff.startTime)
    : 0;

    const total =
    (staff.totalTime || 0) + duration;

    staffContainer.innerHTML += `

      <div class="staff-card"
      onclick="openModal(
      '${doc.id}',
      '${staff.pin}',
      ${staff.onDuty})">

        <div class="staff-name">

          ${staff.name}

        </div>

        <p>${staff.position}</p>

        <div class="status
        ${staff.onDuty ? 'on':'off'}">

          ${staff.onDuty
          ? '🟢 ON DUTY'
          : '🔴 OFF DUTY'}

        </div>

        <div class="timer">

          ⏱ ${formatTime(total)}

        </div>

      </div>

    `;

  });

});

function openModal(id,pin,onDuty){

  const modal =
  document.createElement("div");

  modal.className = "modal";

  modal.innerHTML = `

    <div class="modal-box">

      <h2>Staff Verification</h2>

      <input
      type="password"
      id="staffPin"
      placeholder="Enter PIN">

      <button onclick="
      checkPin(
      '${id}',
      '${pin}',
      ${onDuty})">

        VERIFY

      </button>

      <button onclick="closeModal()">

        CANCEL

      </button>

    </div>

  `;

  document.body.appendChild(modal);

}

function closeModal(){

  const modal =
  document.querySelector(".modal");

  if(modal){
    modal.remove();
  }

}

function checkPin(id,pin,onDuty){

  const input =
  document.getElementById("staffPin").value;

  if(input === pin){

    document.querySelector(".modal-box")
    .innerHTML = `

      <h2>Duty Action</h2>

      <button onclick="
      onDutyFunc('${id}')">

        🟢 ON DUTY

      </button>

      <button onclick="
      offDuty('${id}')">

        🔴 OFF DUTY

      </button>

      <button onclick="
      closeModal()">

        CANCEL

      </button>

    `;

  }else{

    alert("Wrong PIN");

  }

}

async function onDutyFunc(id){

  const docData =
  await db.collection("staff")
  .doc(id)
  .get();

  const staff =
  docData.data();

  await db.collection("staff")
  .doc(id)
  .update({

    onDuty:true,

    startTime:Date.now()

  });

  await sendLogToSheet(

    staff.name,

    "ON DUTY",

    "-",

    formatTime(
      staff.totalTime || 0
    )

  );

  closeModal();

}

async function offDuty(id){

  const doc =
  await db.collection("staff")
  .doc(id)
  .get();

  const staff =
  doc.data();

  const duration =
  Date.now() - staff.startTime;

  const total =
  (staff.totalTime || 0)
  + duration;

  await db.collection("staff")
  .doc(id)
  .update({

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

function formatTime(ms){

  const totalSeconds = Math.floor(ms / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
}

function searchStaff(){

  const input =
  document.getElementById("searchInput")
  .value.toLowerCase();

  const cards =
  document.querySelectorAll(".staff-card");

  cards.forEach(card=>{

    const text =
    card.innerText.toLowerCase();

    if(text.includes(input)){

      card.style.display = "block";

    }else{

      card.style.display = "none";

    }

  });

}

function openQRScanner(){

  const html5QrCode =
  new Html5Qrcode("reader");

  html5QrCode.start(

    { facingMode: "environment" },

    {
      fps:10,
      qrbox:250
    },

    async (decodedText)=>{

      const parts =
      decodedText.split("-");

      const name = parts[0];

      const pin = parts[1];

      const snapshot =
      await db.collection("staff").get();

      snapshot.forEach((doc)=>{

        const staff = doc.data();

        if(
          staff.name.toUpperCase()
          === name
          &&
          staff.pin === pin
        ){

          openModal(
            doc.id,
            pin,
            staff.onDuty
          );

        }

      });

      html5QrCode.stop();

    }

  );

}

async function sendLogToSheet(
  staff,
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

        staff:staff,

        action:action,

        timestamp:
        new Date()
        .toLocaleString(),

        duration:duration,

        totalTime:totalTime

      })

    }

  );

}