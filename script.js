const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const questionText = document.getElementById("questionText");
const answersDiv = document.getElementById("answers");

const gravity = 0.5;

// === Player ===
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 50;
    this.height = 50;
    this.color = "blue";
    this.vx = 0;
    this.vy = 0;
    this.speed = 5;
    this.jumpPower = -13;
    this.onGround = false;
    this.currentPlatform = null;
  }
  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
  update() {
    this.vy += gravity;
    this.y += this.vy;
    this.x += this.vx;

    // Plattformkollision
    this.onGround = false;
    for (let p of platforms) {
      if (this.y + this.height >= p.y &&
          this.y + this.height <= p.y + p.height &&
          this.x + this.width > p.x &&
          this.x < p.x + p.width &&
          this.vy >= 0) {
        this.y = p.y - this.height;
        this.vy = 0;
        this.onGround = true;
        if (this.currentPlatform !== p) {
          this.currentPlatform = p;
          triggerQuestion();
        }
      }
    }
  }
}

// === Plattformar ===
let platforms = [
  {x: 100, y: 400, width: 150, height: 20},
  {x: 300, y: 300, width: 150, height: 20},
  {x: 500, y: 200, width: 150, height: 20},
  {x: 200, y: 100, width: 150, height: 20}
];

// === Frågor ===
let questions = [
  {
    q: "Vad betyder en röd trafiksignal?",
    a: ["Stanna", "Kör", "Sänk farten", "Fortsätt försiktigt"],
    correct: 0
  },
  {
    q: "Vad gäller vid högerregeln?",
    a: ["Du ska väja för fordon från höger", "Du har alltid företräde", "Du ska köra fortare", "Du ska stanna alltid"],
    correct: 0
  },
  {
    q: "När får du köra om på höger sida?",
    a: ["Aldrig", "När vägen är tom", "På motorväg", "När vänsterfilen står stilla"],
    correct: 3
  },
  // Du kan lägga till 100+ frågor här
];

let currentQuestion = null;
let questionActive = false;

const player = new Player(120, 350);
const keys = {};

document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

function triggerQuestion() {
  if (!questionActive) {
    currentQuestion = questions[Math.floor(Math.random() * questions.length)];
    questionText.textContent = currentQuestion.q;
    answersDiv.innerHTML = "";
    currentQuestion.a.forEach((ans, i) => {
      const btn = document.createElement("button");
      btn.classList.add("answerBtn");
      btn.textContent = ans;
      btn.onclick = () => checkAnswer(i);
      answersDiv.appendChild(btn);
    });
    questionActive = true;
  }
}

function checkAnswer(index) {
  if (index === currentQuestion.correct) {
    // Rätt svar: ta bort knappar
    answersDiv.innerHTML = "";
  } else {
    alert("Fel svar, försök igen!");
  }
}

// === Game Loop ===
function gameLoop() {
  // Input
  if (keys["ArrowLeft"]) player.vx = -player.speed;
  else if (keys["ArrowRight"]) player.vx = player.speed;
  else player.vx = 0;

  if (keys["ArrowUp"] && player.onGround) {
    player.vy = player.jumpPower;
  }

  player.update();
  draw();
  requestAnimationFrame(gameLoop);
}

// === Kamera och ritning ===
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Kameraförskjutning
  let camY = Math.min(0, -player.y + 400);

  // Plattformar
  for (let p of platforms) {
    ctx.fillStyle = "#555";
    ctx.fillRect(p.x, p.y + camY, p.width, p.height);
  }

  player.draw();
}

gameLoop();
