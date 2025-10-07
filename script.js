/* Sidscrollande plattformsspel med trafikfrågor.
   Kamera följer spelaren åt höger.
   Landar du på plattform -> frågeomodal.
   Rätt svar -> plattform lyser grön, fel -> röd.
   Plattform återgår till neutral efter timeout så du kan träna oändligt.
   Frågebank genereras för hundratals frågor (varianter).
*/

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const scoreDOM = document.getElementById("score");
const qContainer = document.getElementById("questionContainer");
const qText = document.getElementById("questionText");
const answerBtns = Array.from(document.querySelectorAll(".answerBtn"));
const closeQ = document.getElementById("closeQuestion");

let keys = {};
window.addEventListener("keydown", (e) => { if (!e.repeat) keys[e.key] = true; });
window.addEventListener("keyup", (e) => { keys[e.key] = false; });

// --- Spelare & värld ---
let player = { x: 120, y: HEIGHT - 160, w: 40, h: 48, dy: 0, vx: 0, speed: 3.4, jump: -10.5, onGround: false };
let cameraX = 0; // world x corresponding to canvas left
let gravity = 0.6;

let platforms = []; // plattformobjekt {x,y,w,h,state,revertAt}
let score = 0;

let questionActive = false;
let activePlatform = null;

// --- Frågebank ---
// Basfrågor - vi skapar varianter för att nå hundratals
const baseQuestions = [
  { q: "Vad betyder STOPP-skylten?", a: ["Stanna helt vid linjen", "Sakta ner", "Fortsätt om det är fritt", "Parkera här"], correct: 0 },
  { q: "Vilken sida kör man på i Sverige?", a: ["Höger", "Vänster", "Mitten", "Ingen särskild"], correct: 0 },
  { q: "Vad innebär väjningsplikt?", a: ["Ge företräde åt annan trafik", "Stanna alltid", "Köra först", "Tuta"], correct: 0 },
  { q: "Vilket ljus betyder stopp?", a: ["Rött", "Gult", "Grönt", "Blinkande blått"], correct: 0 },
  { q: "Vad betyder skylten med '30'?", a: ["Max 30 km/h", "Min 30 km/h", "Köra i 30 m", "Du får parkera 30 min"], correct: 0 },
  { q: "Vad gör du vid ett övergångsställe där någon gått ut på vägen?", a: ["Stannar och släpper över personen", "Fortsätter långsamt", "Tutar", "Kör runt personen"], correct: 0 },
  { q: "När måste du använda blinkers?", a: ["När du svänger eller byter körfält", "Aldrig", "Endast på kvällstid", "Endast i rondell"], correct: 0 },
  { q: "Vad är viktigt när det regnar?", a: ["Minska hastigheten pga längre bromssträcka", "Köra snabbare", "Köra som vanligt", "Öka avståndet till kantstenen"], correct: 0 },
  { q: "Vad betyder en vägmärke med cyklist?", a: ["Cykelpassage/upplysning om cykeltrafik", "Förbud för cyklar", "Parkeringsinformation", "Busshållplats"], correct: 0 },
  { q: "Vad betyder en gul varningsskylt?", a: ["Varning för farlig situation", "Parkering åsidosatt", "P-tillstånd", "Fritidsområde"], correct: 0 }
];

// Generera större frågebank genom att göra varianter
let questions = [];
function generateQuestionBank(target = 300) {
  questions = [];
  // Lägg till baseQuestions oförändrade
  for (const b of baseQuestions) questions.push(JSON.parse(JSON.stringify(b)));
  // Skapa varianter genom att lägga till små förändringar i texten
  let i = 0;
  while (questions.length < target) {
    const base = baseQuestions[i % baseQuestions.length];
    const clone = JSON.parse(JSON.stringify(base));
    // lägg till enklare variation i frågetext för att skapa "nya" frågor
    clone.q = base.q + " (variant " + (Math.floor(questions.length / baseQuestions.length) + 1) + ")";
    // rotera svaren slumpmässigt men håll reda på rätt index
    const indices = shuffle([0,1,2,3]);
    const answers = indices.map(idx => base.a[idx]);
    const correct = indices.indexOf(base.correct);
    clone.a = answers;
    clone.correct = correct;
    questions.push(clone);
    i++;
  }
}
generateQuestionBank(400); // skapa ~400 frågor

// shuffle helper
function shuffle(arr) {
  const a = arr.slice();
  for (let i=a.length-1;i>0;i--) {
    const j = Math.floor(Math.random()*(i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --- Plattformsgenerator ---
// layout: plattformar sprids horisontellt, kameran rullar åt höger. Vi genererar vid behov.
function initPlatforms() {
  platforms = [];
  // startplattformer nära början
  platforms.push(makePlatform(50, HEIGHT - 80, 220)); // startyta
  let x = 300;
  for (let i=0;i<12;i++) {
    const w = randBetween(100, 180);
    const y = HEIGHT - randBetween(120, 300);
    platforms.push(makePlatform(x, y, w));
    x += randBetween(180, 320);
  }
}
function makePlatform(x,y,w) {
  return { x, y, w, h: 14, state: "neutral", revertAt: 0 };
}
function randBetween(a,b){ return Math.floor(Math.random()*(b-a))+a; }

// --- Init ---
initPlatforms();
updateScoreDOM();
bindQuestionButtons();
requestAnimationFrame(loop);

// --- Eventer för frågeknapparna ---
function bindQuestionButtons() {
  answerBtns.forEach((btn, idx) => {
    btn.addEventListener("click", () => handleAnswer(idx));
  });
  closeQ.addEventListener("click", hideQuestion);
}

// --- Huvudloop ---
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

// --- Uppdatering: fysik, kamera, plattformsgenerering, revert osv ---
function update() {
  // horisontell rörelse
  if (keys["ArrowLeft"]) player.vx = -player.speed;
  else if (keys["ArrowRight"]) player.vx = player.speed;
  else player.vx = 0;

  // hoppa
  if (keys[" "] && player.onGround && !questionActive) {
    player.dy = player.jump;
    player.onGround = false;
  }

  // physics
  player.dy += gravity;
  player.x += player.vx;
  player.y += player.dy;

  // collision: plattformlandning (när vi faller och spod)
  player.onGround = false;
  for (const p of platforms) {
    // horizontal overlap
    if (player.x + player.w > p.x && player.x < p.x + p.w) {
      // vertical: land från ovan
      if (player.y + player.h > p.y && player.y + player.h - player.dy <= p.y && player.dy >= 0) {
        player.y = p.y - player.h;
        player.dy = 0;
        player.onGround = true;
        // trigger question om neutral och ingen aktiv fråga
        if (!questionActive && p.state === "neutral") askQuestionForPlatform(p);
      }
    }
  }

  // kamera följer spelaren - låt kameran ha en vänlig offset så spelaren inte är i mitten
  const followX = player.x - WIDTH * 0.35;
  if (followX > cameraX) cameraX += (followX - cameraX) * 0.12; // mjuk följning

  // generera fler plattformar om kameran närmar sig slutet
  const furthestX = Math.max(...platforms.map(p => p.x + p.w));
  while (furthestX < cameraX + WIDTH*2) {
    const lastX = furthestX + randBetween(120, 300);
    const w = randBetween(90, 170);
    const y = HEIGHT - randBetween(100, 320);
    platforms.push(makePlatform(lastX, y, w));
    // safety break
    if (platforms.length > 1200) break;
    // update furthestX
    const arr = platforms.map(p => p.x + p.w);
    // assign new value
    // eslint-disable-next-line no-unused-vars
    var _ = arr; // just to avoid lint
    // compute again
    // (cheaper to recompute in while loop head)
    break; // one at a time to maintain spacing predictability
  }

  // radera plattformar som är långt till vänster utanför view
  platforms = platforms.filter(p => p.x + p.w > cameraX - WIDTH);

  // återställ plattformar vid timeout
  const now = Date.now();
  for (const p of platforms) {
    if ((p.state === "correct" || p.state === "wrong") && p.revertAt && now > p.revertAt) {
      p.state = "neutral";
      p.revertAt = 0;
    }
  }

  // begränsningar
  if (player.y > HEIGHT + 600) {
    // om faller långt -> teleportera till en plattform nära kamerans vänsterkant
    const safe = platforms.find(p => p.x > cameraX && p.x < cameraX + WIDTH*0.8);
    if (safe) {
      player.x = safe.x + 10;
      player.y = safe.y - player.h - 2;
      player.dy = 0;
    } else {
      player.x = cameraX + 120;
      player.y = HEIGHT - 160;
      player.dy = 0;
    }
  }
  // sidbegränsning: ej nödvändigt, världen scrollar men vi förhindra att spelaren går för långt bakåt
  if (player.x < cameraX + 10) player.x = cameraX + 10;
}

// --- Rita med kameratransform (vänster = cameraX) ---
function draw() {
  ctx.clearRect(0,0,WIDTH,HEIGHT);

  // bakgrund
  ctx.fillStyle = "#cfe9c7";
  ctx.fillRect(0, HEIGHT - 80, WIDTH, 80);

  // draw platforms
  for (const p of platforms) {
    const sx = Math.round(p.x - cameraX);
    const sy = Math.round(p.y);
    // synlighet
    if (sx + p.w < -100 || sx > WIDTH + 100) continue;
    if (p.state === "neutral") ctx.fillStyle = "#7a4f2a";
    else if (p.state === "correct") ctx.fillStyle = "#2ecc40";
    else ctx.fillStyle = "#e74c3c";
    roundedRect(ctx, sx, sy, p.w, p.h, 6, true, false);

    // optionally draw a small marker indicating question availability
    if (p.state === "neutral") {
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(sx + Math.min(10, p.w-20), sy - 10, 28, 6);
    }
  }

  // draw player
  const px = Math.round(player.x - cameraX);
  const py = Math.round(player.y);
  ctx.fillStyle = "#0b66c3";
  roundedRect(ctx, px, py, player.w, player.h, 8, true, false);
  // eye marker
  ctx.fillStyle = "#fff";
  ctx.fillRect(px + player.w/2 - 6, py + 10, 12, 8);

  // HUD (top-left screen-fixed)
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(8,8,220,34);
  ctx.fillStyle = "#fff";
  ctx.font = "16px Arial";
  ctx.fillText(`Poäng: ${score}`, 16, 32);
  ctx.font = "12px Arial";
  ctx.fillText("← → = rörelse  ·  Space = hoppa", 260, 26);
}

// rounded rect helper
function roundedRect(ctx,x,y,w,h,r, fill, stroke) {
  if (r === undefined) r = 6;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

// --- Frågehantering ---
// När spelaren landar på en neutral plattform: askQuestionForPlatform(p)
function askQuestionForPlatform(p) {
  questionActive = true;
  activePlatform = p;

  // pick random question
  const qObj = questions[Math.floor(Math.random() * questions.length)];

  // shuffle answers and determine new correct index
  const order = shuffle([0,1,2,3]);
  const answersShuffled = order.map(i => qObj.a[i]);
  const correctIndex = order.indexOf(qObj.correct);

  // fill modal
  qText.textContent = qObj.q;
  answerBtns.forEach((btn, idx) => {
    btn.textContent = answersShuffled[idx];
    btn.dataset.correct = (idx === correctIndex) ? "1" : "0";
    btn.disabled = false;
    btn.style.opacity = "1";
  });

  // show
  qContainer.classList.remove("hidden");
  qContainer.setAttribute("aria-hidden","false");
  closeQ.classList.add("hidden");
}

// handleAnswer called by button handlers
function handleAnswer(idx) {
  if (!questionActive || !activePlatform) return;
  const btn = answerBtns[idx];
  const correct = btn.dataset.correct === "1";
  if (correct) {
    score += 10;
    activePlatform.state = "correct";
  } else {
    score = Math.max(0, score - 5);
    activePlatform.state = "wrong";
  }
  activePlatform.revertAt = Date.now() + 9000; // revertera efter 9s
  updateScoreDOM();
  hideQuestion();
}

// hide modal
function hideQuestion() {
  questionActive = false;
  activePlatform = null;
  qContainer.classList.add("hidden");
  qContainer.setAttribute("aria-hidden","true");
}

// update DOM scoreboard (in addition to canvas)
function updateScoreDOM() {
  scoreDOM.textContent = `Poäng: ${score}`;
}

// --- utility shuffle reused above (local copy) ---
function shuffle(arr) {
  const a = arr.slice();
  for (let i=a.length-1;i>0;i--) {
    const j = Math.floor(Math.random()*(i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// wire up answer button events to numeric index mapping
answerBtns.forEach((b, idx) => b.addEventListener("click", () => {
  // find which button index in the visible set:
  handleAnswer(idx);
}));

closeQ.addEventListener("click", hideQuestion);

// start score display update loop
setInterval(updateScoreDOM, 300);

// finished init message (console)
console.log("Trafikplattformsspel sidscroll — initialiserat.");
