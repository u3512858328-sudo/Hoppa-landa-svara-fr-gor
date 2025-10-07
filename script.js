// === Globala variabler ===
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let player = { x: 400, y: 500, width: 40, height: 40, dy: 0, onGround: false };
let keys = {};
let platforms = [];
let score = 0;

// Frågor
const questions = [
  {
    question: "Vad betyder en stoppskylt?",
    answers: ["Stanna helt vid linjen", "Sakta ner", "Fortsätt om ingen bil kommer", "Bara stanna på dagen"],
    correct: 0
  },
  {
    question: "Vilken sida ska du köra på i Sverige?",
    answers: ["Höger", "Vänster", "Mitten", "Var som helst"],
    correct: 0
  },
  {
    question: "Vad gör en väjningspliktsskylt?",
    answers: ["Ge företräde till annan trafik", "Stoppa alltid bilen", "Sakta ner till 10 km/h", "Parkera"],
    correct: 0
  },
  {
    question: "Får du köra för fort över hastighetsgränsen?",
    answers: ["Nej", "Ja ibland", "Endast på natten", "Om ingen polis ser"],
    correct: 0
  }
];

let currentQuestion = null;

// === Händelser ===
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

// === Plattformar ===
function generatePlatforms() {
  platforms = [];
  for (let i = 0; i < 10; i++) {
    platforms.push({
      x: Math.random() * 760,
      y: 550 - i * 60,
      width: 80,
      height: 10
    });
  }
}

// === Spel loop ===
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// === Uppdatera ===
function update() {
  // Rörelse
  if (keys["ArrowLeft"]) player.x -= 5;
  if (keys["ArrowRight"]) player.x += 5;

  // Gravitation
  player.dy += 0.5;
  player.y += player.dy;

  // Plattformskollision
  player.onGround = false;
  for (let plat of platforms) {
    if (
      player.x + player.width > plat.x &&
      player.x < plat.x + plat.width &&
      player.y + player.height > plat.y &&
      player.y + player.height < plat.y + plat.height + player.dy &&
      player.dy >= 0
    ) {
      player.y = plat.y - player.height;
      player.dy = 0;
      player.onGround = true;
      askQuestion();
    }
  }

  // Hoppa
  if (keys[" "] && player.onGround) {
    player.dy = -10;
    player.onGround = false;
  }

  // Gränser
  if (player.y > canvas.height) {
    player.y = 500;
    player.dy = 0;
  }
  if (player.x < 0) player.x = 0;
  if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
}

// === Rita ===
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Plattformar
  ctx.fillStyle = "brown";
  for (let plat of platforms) {
    ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
  }

  // Spelare
  ctx.fillStyle = "blue";
  ctx.fillRect(player.x, player.y, player.width, player.height);
}

// === Frågor ===
function askQuestion() {
  if (currentQuestion) return; // fråga redan visad
  currentQuestion = questions[Math.floor(Math.random() * questions.length)];

  const container = document.getElementById("questionContainer");
  container.classList.remove("hidden");
  document.getElementById("questionText").textContent = currentQuestion.question;

  const buttons = document.querySelectorAll(".answerBtn");
  buttons.forEach((btn, i) => {
    btn.textContent = currentQuestion.answers[i];
    btn.onclick = () => checkAnswer(i);
  });
}

// === Kontrollera svar ===
function checkAnswer(index) {
  if (index === currentQuestion.correct) {
    alert("Rätt svar!");
    score += 10;
  } else {
    alert("Fel svar!");
    score -= 5;
  }
  document.getElementById("score").textContent = score;
  document.getElementById("questionContainer").classList.add("hidden");
  currentQuestion = null;
}

// === Starta spelet ===
generatePlatforms();
gameLoop();
