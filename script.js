/* Trafikplattformsspel — oändligt, frågebaserat.
   Controls: ← → för sida, Space för hopp.
   Landar du på en plattform så kommer en trafikfråga.
   Rätt svar -> plattform blir grön (får poäng) och reverteras senare.
*/

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const qContainer = document.getElementById("questionContainer");
const qText = document.getElementById("questionText");
const answerBtns = Array.from(document.querySelectorAll(".answerBtn"));
const closeQ = document.getElementById("closeQuestion");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// spelare (världskordinater)
let player = { x: WIDTH/2 - 20, y: HEIGHT - 100, w: 40, h: 40, dy: 0, speed: 4, jump: -11, onGround: false };
let cameraY = 0; // world y som motsvarar canvas top
let keys = {};
let platforms = [];
let score = 0;

let questionActive = false;
let activePlatform = null;

// frågor (utökade och varierade)
const questions = [
  { q: "Vad betyder en stoppskylt?", a: ["Stanna helt vid linjen", "Sakta ner", "Fortsätt om ingen bil kommer", "Bara vid gatukorsningar"], correct: 0 },
  { q: "Vilken sida kör man på i Sverige?", a: ["Höger", "Vänster", "Mitten", "Beroende på väg"], correct: 0 },
  { q: "Vad gäller i en oskyltad korsning?", a: ["Högerregeln", "Väjningsplikt", "Stopplikt", "Gäller ingen regel"], correct: 0 },
  { q: "Vad innebär väjningspliktsskylt?", a: ["Ge företräde till annan trafik", "Stanna alltid", "Sakta till 10 km/h", "Parkera bara där"], correct: 0 },
  { q: "Vad betyder siffran på hastighetsskylten (t.ex. 30)?", a: ["Max tillåten hastighet i km/h", "Minsta hastighet", "Rekommenderad hast.", "Tid i minuter"], correct: 0 },
  { q: "Vilket ljus betyder stopp?", a: ["Rött", "Gult", "Grönt", "Blinkande grönt"], correct: 0 },
  { q: "Vad gör du vid ett övergångsställe?", a: ["Stannar om någon går över", "Håller hastigheten", "Tutar", "Kör omgående"], correct: 0 },
  { q: "Vad bör du göra vid skolområde?", a: ["Sänka farten och vara uppmärksam", "Öka farten", "Tuta vid barn", "Ignorera skylten"], correct: 0 },
  { q: "När måste du blinka?", a: ["När du svänger eller byter körfält", "Aldrig", "Endast på motorväg", "Endast vid parkering"], correct: 0 },
  { q: "Vem har företräde vid stopplikt?", a: ["De som ej har stopplikt", "Den som kommer sist", "Vänstertrafiken", "Cyklar alltid"], correct: 0 },
  { q: "Vad är trafikfarligt vid regn?", a: ["Halka och längre bromssträcka", "Allt bättre grepp", "Ingen skillnad", "Bara för cyklar"], correct: 0 },
  { q: "När får du köra om på höger sida?", a: ["Sällan — i vissa köer kan det tillåtas", "Alltid", "Aldrig", "Endast i rondell"], correct: 0 }
];

// --- init ---
function init() {
  generateInitialPlatforms();
  bindEvents();
  updateHUD();
  gameLoop();
}

// skapar initiala plattformar - uppradat i världen (y minskar uppåt)
function generateInitialPlatforms() {
  platforms = [];
  let startY = 500;
  for (let i = 0; i < 10; i++) {
    platforms.push(makePlatform(randBetween(60, WIDTH-160), startY, randBetween(80, 140)));
    startY -= randBetween(60, 110);
  }
  // markplattform längst ner (säker start)
  platforms.push(makePlatform(WIDTH/2 - 120, 580, 250));
}

// plattformsfabrik
function makePlatform(x, y, w) {
  return {
    x, y, w,
    h: 12,
    state: "neutral", // neutral | correct | wrong
    revertAt: 0 // timestamp för återställning
  };
}

function randBetween(a,b){ return Math.floor(Math.random()*(b-a))+a; }

// bind keys och answer-knappar
function bindEvents() {
  window.addEventListener("keydown", (e) => { if (!e.repeat) keys[e.key] = true; });
  window.addEventListener("keyup", (e) => { keys[e.key] = false; });

  answerBtns.forEach(btn => btn.addEventListener("click", () => {
    const idx = parseInt(btn.dataset.index,10);
    handleAnswer(idx);
  }));
  closeQ.addEventListener("click", () => hideQuestion());
}

// huvudloop
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// uppdatering — fysik, kamerahantering, plattformslogik
function update() {
  // spelarrörelse
  if (keys["ArrowLeft"]) player.x -= player.speed;
  if (keys["ArrowRight"]) player.x += player.speed;

  // hoppa
  if (keys[" "] && player.onGround && !questionActive) {
    player.dy = player.jump;
    player.onGround = false;
  }

  // grav
  player.dy += 0.5;
  player.y += player.dy;

  // koll till plattformar (endast när faller)
  player.onGround = false;
  for (let plat of platforms) {
    // enkel AABB-landing: spelaren kommer ovanifrån och landar på plattformens y
    if (player.x + player.w > plat.x && player.x < plat.x + plat.w) {
      // check vertical collision: tidigare under kanten -> now on top
      if (player.y + player.h > plat.y && player.y + player.h - player.dy <= plat.y && player.dy >= 0) {
        // placera ovanpå
        player.y = plat.y - player.h;
        player.dy = 0;
        player.onGround = true;

        // trigger fråga om plattform neutral och ingen fråga aktiv
        if (!questionActive && plat.state === "neutral") {
          askQuestionForPlatform(plat);
        }
      }
    }
  }

  // kamera följer spelare uppåt (minska cameraY när spelarens y går över mitt)
  const screenTopWorld = cameraY;
  const screenMidWorld = cameraY + HEIGHT * 0.45;
  if (player.y < screenMidWorld) {
    cameraY -= (screenMidWorld - player.y) * 0.12; // mjuk följning
  }

  // generera nya plattformar överst om behövs
  const highestY = Math.min(...platforms.map(p => p.y));
  while (highestY > cameraY - 300) {
    // skapa ovanför
    const newY = highestY - randBetween(60, 140);
    platforms.push(makePlatform(randBetween(40, WIDTH-140), newY, randBetween(80, 140)));
    // recalc highestY
    if (platforms.length > 500) break;
    // recompute highestY for next loop
    highestY = Math.min(...platforms.map(p => p.y));
  }

  // ta bort plattformar som är långt under view
  platforms = platforms.filter(p => p.y < cameraY + HEIGHT + 400);

  // återställ plattformar efter timeout
  const now = Date.now();
  for (let p of platforms) {
    if ((p.state === "correct" || p.state === "wrong") && p.revertAt && now > p.revertAt) {
      p.state = "neutral";
      p.revertAt = 0;
    }
  }

  // begränsa spelare i sidled
  if (player.x < 0) player.x = 0;
  if (player.x + player.w > WIDTH) player.x = WIDTH - player.w;

  // om spelaren faller långt under skärmen -> teleportera upp till en säker plattform
  if (player.y > cameraY + HEIGHT + 200) {
    // hitta genast en plattform nära botten av view och placera spelaren ovanför den
    const candidate = platforms.reduce((lowest, p) => (!lowest || p.y > lowest.y) ? p : lowest, null);
    if (candidate) {
      player.x = candidate.x + 10;
      player.y = candidate.y - player.h - 2;
      player.dy = 0;
      cameraY = candidate.y - HEIGHT/2;
    } else {
      // fallback
      player.x = WIDTH/2;
      player.y = cameraY + HEIGHT - 150;
      player.dy = 0;
    }
  }
}

// --- Rita hela världen (kameratransform) ---
function draw() {
  ctx.clearRect(0,0,WIDTH,HEIGHT);

  // bakgrund: himmel + lite "djup" grund
  // (ingen world-transformation; vi ritar med offset)
  const offsetY = cameraY;

  // rita "mark" gradient
  ctx.fillStyle = "#cfe9c7";
  ctx.fillRect(0, HEIGHT - 80 + (offsetY % 20), WIDTH, 80);

  // plattformar
  for (let plat of platforms) {
    const screenX = plat.x;
    const screenY = plat.y - offsetY;
    // platform synlighet check
    if (screenY > -100 && screenY < HEIGHT + 100) {
      if (plat.state === "neutral") ctx.fillStyle = "#7a4f2a";
      else if (plat.state === "correct") ctx.fillStyle = "#2ecc40";
      else if (plat.state === "wrong") ctx.fillStyle = "#e74c3c";
      roundedRect(ctx, screenX, screenY, plat.w, plat.h, 6, true, false);
      // eventuellt rita question-ikon
      if (plat.state === "neutral") {
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        ctx.fillRect(screenX, screenY - 12, 28, 6);
      }
    }
  }

  // spelare
  const playerScreenY = player.y - offsetY;
  ctx.fillStyle = "#0b66c3";
  roundedRect(ctx, player.x, playerScreenY, player.w, player.h, 8, true, false);
  // öga/markör
  ctx.fillStyle = "white";
  ctx.fillRect(player.x + player.w/2 - 6, playerScreenY + 10, 12, 8);

  // HUD-ruta (fixed)
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(6,6,220,36);
  ctx.fillStyle = "#fff";
  ctx.font = "16px Arial";
  ctx.fillText(`Poäng: ${score}`, 14, 30);
  ctx.fillStyle = "#fff";
  ctx.font = "12px Arial";
  ctx.fillText("← → = rörelse  ·  Space = hoppa", 270, 26);
}

// helper för rundade rektanglar
function roundedRect(ctx, x, y, w, h, r, fill, stroke) {
  if (r === undefined) r = 5;
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
function askQuestionForPlatform(platform) {
  questionActive = true;
  activePlatform = platform;

  // välj slumpad fråga
  const qObj = questions[Math.floor(Math.random() * questions.length)];

  // mixa svarens ordning och behåll index för rätt svar
  const originalAnswers = qObj.a.slice();
  const order = shuffleArray([0,1,2,3]);
  const answersShuffled = order.map(i => originalAnswers[i]);
  const correctIndexShuffled = order.indexOf(qObj.correct);

  // visa modal
  qText.textContent = qObj.q;
  answerBtns.forEach((btn, idx) => {
    btn.textContent = answersShuffled[idx];
    btn.dataset.index = idx;
    btn.dataset.correct = (idx === correctIndexShuffled) ? "1" : "0";
  });
  qContainer.classList.remove("hidden");
  closeQ.classList.add("hidden");
}

// shuffle helper
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// svarshantering
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
  // planera återställning efter t.ex. 10 sek
  activePlatform.revertAt = Date.now() + 10000;
  updateHUD();
  hideQuestion();
}

// göm modal
function hideQuestion() {
  questionActive = false;
  activePlatform = null;
  qContainer.classList.add("hidden");
}

// HUD updater
function updateHUD() {
  scoreEl.textContent = `Poäng: ${score}`;
}

// uppdatera score DOM när score ändras
const scoreObserver = new MutationObserver(() => {});
// starta
init();

// uppdatera score DOM regelbundet (eftersom vi ritar score i canvas också)
setInterval(updateHUD, 250);
