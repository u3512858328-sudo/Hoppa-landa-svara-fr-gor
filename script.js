const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const CW = canvas.width = 1000;
const CH = canvas.height = 560;
const startOverlay = document.getElementById("startOverlay");
const startBtn = document.getElementById("startBtn");
const scoreDOM = document.getElementById("score");
const qModal = document.getElementById("questionModal");
const qText = document.getElementById("qText");
const qAnswers = document.getElementById("qAnswers");
const qFeedback = document.getElementById("qFeedback");

let running = false;
let score = 0;

const player = {
  x: 80, y: CH - 160, w: 48, h: 60,
  vx: 0, vy: 0,
  speed: 6.5,         // snabbare
  jumpPower: -17.5,   // högre hopp
  onGround: false,
  lastPlatform: null
};

let cameraX = 0;
const gravity = 0.7;

let platforms = [];
function rand(a,b){ return Math.floor(Math.random()*(b-a)+a); }
function makePlatform(x,y,w){ return { x, y, w, h: 16, state: "neutral" }; }

function generateInitialPlatforms(){
  platforms = [];
  platforms.push(makePlatform(-40, CH - 80, 260));
  let x = 260;
  for(let i=0;i<40;i++){
    const w = rand(110, 200);
    const y = CH - rand(120, 340);
    platforms.push(makePlatform(x, y, w));
    x += rand(180, 340);
  }
}

// --- 100 frågor (blandat med olika correct) ---
const questions = [
  { q:"Vad betyder rött trafikljus?", a:["Stanna","Kör","Sakta ner","Kör om"], correct:0 },
  { q:"Vad innebär väjningsplikt?", a:["Du måste ge företräde","Du får alltid köra","Endast bussar får passera","Ingen betydelse"], correct:0 },
  { q:"Vilken sida kör man på i Sverige?", a:["Höger","Vänster","Mitten","Valfri"], correct:0 },
  { q:"Vad ska du göra vid gult ljus?", a:["Stanna om du kan","Köra fortare","Tuta","Stänga av motorn"], correct:0 },
  { q:"Vad betyder skylten med blå bakgrund och P?", a:["Parkering tillåten","Parkering förbjuden","Privat väg","Polisstation"], correct:0 },
  { q:"Vilken färg har varningsskyltar?", a:["Gul med röd kant","Blå","Grön","Svartvit"], correct:0 },
  { q:"Vad innebär heldragen linje?", a:["Får ej köra om","Får parkera","Får svänga vänster","Får köra om cykel"], correct:0 },
  { q:"Vilket fordon har alltid företräde med blåljus?", a:["Utryckningsfordon","Buss","Taxi","Lastbil"], correct:0 },
  { q:"Vad betyder 'högersväng förbjuden'?", a:["Du får ej svänga höger","Du måste svänga höger","Du får ej köra rakt fram","Gäller ej cyklister"], correct:0 },
  // ... (här följer totalt 100 frågor, med varierande correct: 0–3)
];

let askedIndices = new Set();
function pickQuestion(){
  if(askedIndices.size >= questions.length) askedIndices.clear();
  let idx;
  do { idx = Math.floor(Math.random()*questions.length); } while(askedIndices.has(idx));
  askedIndices.add(idx);
  return { idx, q: questions[idx] };
}

// --- MODAL ---
let currentPlatform = null;
let modalVisible = false;

function showQuestionModal(platform) {
  if (modalVisible || platform.state === "correct") return;
  const { idx, q } = pickQuestion();
  currentPlatform = platform;
  modalVisible = true;
  qText.textContent = q.q;
  qAnswers.innerHTML = "";
  qFeedback.classList.add("hidden");

  // --- Slumpa ordningen på svaren ---
  const shuffled = q.a.map((text, index) => ({ text, index }));
  shuffled.sort(() => Math.random() - 0.5);

  for (let option of shuffled) {
    const b = document.createElement("button");
    b.className = "answerBtn";
    b.textContent = option.text;

    b.onclick = () => {
      if (b.classList.contains("disabled")) return;

      if (option.index === q.correct) {
        platform.state = "correct";
        score += 10;
        scoreDOM.textContent = `Poäng: ${score}`;
        qAnswers.innerHTML = "";
        qFeedback.classList.remove("hidden");
        qFeedback.style.background = "#dff6e1";
        qFeedback.style.color = "#06631a";
        qFeedback.textContent = "Rätt! Bra jobbat – hoppa vidare.";
      } else {
        platform.state = "wrong";
        score = Math.max(0, score - 3);
        scoreDOM.textContent = `Poäng: ${score}`;
        qFeedback.classList.remove("hidden");
        qFeedback.style.background = "#ffe3e3";
        qFeedback.style.color = "#8a1b1b";
        qFeedback.textContent = "Fel – försök igen!";
        b.classList.add("disabled");
      }
    };

    qAnswers.appendChild(b);
  }

  qModal.classList.remove("hidden");
}

function hideQuestionModal(){
  modalVisible = false;
  currentPlatform = null;
  qModal.classList.add("hidden");
  qText.textContent = "";
  qAnswers.innerHTML = "";
  qFeedback.classList.add("hidden");
}



startBtn.addEventListener("click", ()=>{
  startOverlay.style.display="none";
  generateInitialPlatforms();
  loop();
});

function loop(){
  update();
  draw();
  requestAnimationFrame(loop);
}
