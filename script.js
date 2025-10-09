const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 1000;
canvas.height = 560;

const CW = canvas.width;
const CH = canvas.height;

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
  x: 80,
  y: CH - 160,
  w: 48,
  h: 60,
  vx: 0,
  vy: 0,
  speed: 6.5, // snabbare
  jumpPower: -17.5, // högre hopp
  onGround: false,
};

let cameraX = 0;
const gravity = 0.7;
let keys = {};

function rand(a, b) {
  return Math.floor(Math.random() * (b - a) + a);
}

let platforms = [];

function makePlatform(x, y, w) {
  return { x, y, w, h: 16, state: "neutral" };
}

function generateInitialPlatforms() {
  platforms = [];
  platforms.push(makePlatform(-40, CH - 80, 260));
  let x = 260;
  for (let i = 0; i < 40; i++) {
    const w = rand(110, 200);
    const y = CH - rand(120, 340);
    platforms.push(makePlatform(x, y, w));
    x += rand(180, 340);
  }
}

const questions = [
  { q: "Vad betyder rött trafikljus?", a: ["Stanna", "Kör", "Sakta ner", "Kör om"], correct: 0 },
  { q: "Vilken sida kör man på i Sverige?", a: ["Höger", "Vänster", "Mitten", "Valfri"], correct: 0 },
  { q: "Vad ska du göra vid gult ljus?", a: ["Stanna om du kan", "Köra fortare", "Tuta", "Stänga av motorn"], correct: 0 },
  { q: "Vilken färg har varningsskyltar?", a: ["Gul med röd kant", "Blå", "Grön", "Svartvit"], correct: 0 },
  { q: "Vilket fordon har alltid företräde med blåljus?", a: ["Utryckningsfordon", "Buss", "Taxi", "Lastbil"], correct: 0 },
  { q: "Vad innebär väjningsplikt?", a: ["Du måste ge företräde", "Du får alltid köra", "Endast bussar får passera", "Ingen betydelse"], correct: 0 },
  { q: "Vad betyder skylten med blå bakgrund och P?", a: ["Parkering tillåten", "Parkering förbjuden", "Privat väg", "Polisstation"], correct: 0 },
  { q: "Vad innebär heldragen linje?", a: ["Får ej köra om", "Får parkera", "Får svänga vänster", "Får köra om cykel"], correct: 0 },
  { q: "Vad betyder 'högersväng förbjuden'?", a: ["Du får ej svänga höger", "Du måste svänga höger", "Du får ej köra rakt fram", "Gäller ej cyklister"], correct: 0 },
];

let askedIndices = new Set();

function pickQuestion() {
  if (askedIndices.size >= questions.length) askedIndices.clear();
  let idx;
  do {
    idx = Math.floor(Math.random() * questions.length);
  } while (askedIndices.has(idx));
  askedIndices.add(idx);
  return { idx, q: questions[idx] };
}

let currentPlatform = null;
let modalVisible = false;

function showQuestionModal(platform) {
  if (modalVisible || platform.state === "correct") return;
  const { q } = pickQuestion();
  currentPlatform = platform;
  modalVisible = true;
  qText.textContent = q.q;
  qAnswers.innerHTML = "";
  qFeedback.classList.add("hidden");

  // Slumpa ordningen på svaren
  const shuffled = q.a.map((text, index) => ({ text, index }));
  shuffled.sort(() => Math.random() - 0.5);

  shuffled.forEach((option) => {
    const b = document.createElement("button");
    b.className = "answerBtn";
    b.textContent = option.text;
    b.onclick = () => {
      if (option.index === q.correct) {
        platform.state = "correct";
        score += 10;
        scoreDOM.textContent = `Poäng: ${score}`;
        qAnswers.innerHTML = "";
        qFeedback.classList.remove("hidden");
        qFeedback.textContent = "Rätt! Bra jobbat – hoppa vidare.";
        qFeedback.style.background = "#dff6e1";
      } else {
        score = Math.max(0, score - 3);
        scoreDOM.textContent = `Poäng: ${score}`;
        qFeedback.classList.remove("hidden");
        qFeedback.textContent = "Fel – försök igen!";
        qFeedback.style.background = "#ffe3e3";
      }
    };
    qAnswers.appendChild(b);
  });

  qModal.classList.remove("hidden");
}

function hideQuestionModal() {
  modalVisible = false;
  currentPlatform = null;
  qModal.classList.add("hidden");
}

// Rörelse
document.addEventListener("keydown", (e) => {
  keys[e.code] = true;
  if (e.code === "Space" && player.onGround && !modalVisible) {
    player.vy = player.jumpPower;
    player.onGround = false;
  }
});
document.addEventListener("keyup", (e) => (keys[e.code] = false));

function update() {
  if (modalVisible) return;

  if (keys["ArrowLeft"]) player.vx = -player.speed;
  else if (keys["ArrowRight"]) player.vx = player.speed;
  else player.vx = 0;

  player.x += player.vx;
  player.y += player.vy;
  player.vy += gravity;

  if (player.y + player.h > CH) {
    player.y = CH - player.h;
    player.vy = 0;
    player.onGround = true;
  }

  player.onGround = false;
  for (let p of platforms) {
    if (
      player.x + player.w > p.x &&
      player.x < p.x + p.w &&
      player.y + player.h > p.y &&
      player.y + player.h < p.y + p.h &&
      player.vy >= 0
    ) {
      player.y = p.y - player.h;
      player.vy = 0;
      player.onGround = true;
      if (p.state === "neutral") showQuestionModal(p);
    }
  }

  cameraX = player.x - CW / 2 + player.w / 2;
}

function draw() {
  ctx.fillStyle = "#8ee7ff";
  ctx.fillRect(0, 0, CW, CH);

  ctx.save();
  ctx.translate(-cameraX, 0);

  for (let p of platforms) {
    if (p.state === "neutral") ctx.fillStyle = "#4b8bff";
    else if (p.state === "correct") ctx.fillStyle = "#4cff85";
    else ctx.fillStyle = "#ff4b4b";
    ctx.fillRect(p.x, p.y, p.w, p.h);
  }

  ctx.fillStyle = "#222";
  ctx.fillRect(player.x, player.y, player.w, player.h);

  ctx.restore();
}

function loop() {
  if (running) {
    update();
    draw();
    requestAnimationFrame(loop);
  }
}

startBtn.addEventListener("click", () => {
  startOverlay.style.display = "none";
  generateInitialPlatforms();
  running = true;
  loop();
});
