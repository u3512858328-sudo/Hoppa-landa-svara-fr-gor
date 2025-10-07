// === Globala variabler ===
let canvas = document.getElementById("gameCanvas");
let ctx = canvas.getContext("2d");
let hud = document.getElementById("hud");

let keys = {};
let running = false;

let S = {
  player: null,
  levelIndex: 0,
  lives: 3,
  score: 0,
  level: null,
  stopTimer: 0,
  speedLimit: null,
  npcs: [],
  sign: null
};

// === Händelser ===
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

// === Bilklass ===
class Car {
  constructor(x, y, color, npc = false, speed = 0) {
    this.x = x;
    this.y = y;
    this.width = 40;
    this.height = 70;
    this.color = color;
    this.speed = speed;
    this.maxSpeed = 8;
    this.acc = 0.2;
    this.friction = 0.05;
    this.backTimer = 0;
    this.npc = npc;
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }

  update() {
    if (this.npc) {
      this.y += this.speed; // NPC rör sig nedåt
    }
  }
}

// === Starta spel ===
function startGame() {
  S.levelIndex = 0;
  S.lives = 3;
  S.score = 0;
  loadLevel(levels[S.levelIndex]);
  running = true;
  requestAnimationFrame(gameLoop);
}

// === Ladda nivå ===
function loadLevel(level) {
  S.level = level;
  S.stopTimer = 0;
  S.speedLimit = null;
  S.npcs = [];
  S.sign = null;
  level.setup();
  if (S.player) S.player.speed = 0;
  alert(level.intro);
}

// === Spelets loop ===
function gameLoop() {
  if (!running) return;
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// === Uppdatera ===
function update() {
  handleInputAndPhysics();
  if (S.level.update) S.level.update();

  let result = S.level.check();
  if (result === "success") {
    S.score += 100;
    S.levelIndex++;
    if (S.levelIndex < levels.length) {
      loadLevel(levels[S.levelIndex]);
    } else {
      alert("Grattis! Du klarade alla nivåer!");
      running = false;
    }
  } else if (result && result.startsWith("fail")) {
    alert(result);
    S.lives--;
    if (S.lives > 0) {
      loadLevel(levels[S.levelIndex]);
    } else {
      alert("Spelet är slut!");
      running = false;
    }
  }
}

// === Input & fysik ===
function handleInputAndPhysics() {
  if (!S.player) return;
  let p = S.player;

  // Framåt/bakåt
  if (keys["ArrowUp"]) {
    p.speed += p.acc;
    if (p.speed > p.maxSpeed) p.speed = p.maxSpeed;
  }
  if (keys["ArrowDown"]) {
    if (p.speed > 0) {
      p.speed -= p.acc * 2;
    } else {
      p.backTimer++;
      if (p.backTimer > 20) {
        p.speed -= p.acc;
        if (p.speed < -p.maxSpeed / 2) p.speed = -p.maxSpeed / 2;
      }
    }
  } else {
    p.backTimer = 0;
  }

  // Friktion
  if (!keys["ArrowUp"] && !keys["ArrowDown"]) {
    if (p.speed > 0) p.speed -= p.friction;
    if (p.speed < 0) p.speed += p.friction;
    if (Math.abs(p.speed) < 0.05) p.speed = 0;
  }

  p.y -= p.speed; // spelaren rör sig uppåt
  S.npcs.forEach(npc => npc.update());
}

// === Rita ===
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Vägen
  ctx.fillStyle = "gray";
  ctx.fillRect(300, 0, 200, canvas.height);

  // Mittlinje
  ctx.strokeStyle = "white";
  ctx.setLineDash([20, 20]);
  ctx.beginPath();
  ctx.moveTo(400, 0);
  ctx.lineTo(400, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);

  // Skyltar
  if (S.sign) {
    ctx.fillStyle = "black";
    if (S.sign.type === "yield") ctx.fillText("VÄJNINGSPLIKT", S.sign.x, S.sign.y);
    if (S.sign.type === "stop") {
      ctx.fillStyle = "red";
      ctx.fillText("STOPP", S.sign.x, S.sign.y);
      ctx.strokeStyle = "white";
      ctx.beginPath();
      ctx.moveTo(300, S.sign.lineY);
      ctx.lineTo(500, S.sign.lineY);
      ctx.stroke();
    }
    if (S.sign.type === "speed30") ctx.fillText("30", S.sign.x, S.sign.y);
    if (S.sign.type === "speed50") ctx.fillText("50", S.sign.x, S.sign.y);
    if (S.sign.type === "redlight") {
      ctx.fillStyle = "red";
      ctx.fillText("RÖTT", S.sign.x, S.sign.y);
    }
    if (S.sign.type === "greenlight") {
      ctx.fillStyle = "green";
      ctx.fillText("GRÖNT", S.sign.x, S.sign.y);
    }
  }

  // NPCs
  S.npcs.forEach(npc => npc.draw());

  // Spelarens bil
  if (S.player) S.player.draw();

  // HUD
  let kmh = S.player ? Math.round(S.player.speed * 10) : 0;
  hud.innerHTML = `<strong>Nivå:</strong> ${levels[S.levelIndex].id} — ${levels[S.levelIndex].title}
    &nbsp; | <strong>Liv:</strong> ${S.lives}
    &nbsp; | <strong>Poäng:</strong> ${S.score}
    &nbsp; | <strong>Fart:</strong> ${kmh} km/h`;
}

// === Nivåer ===
let levels = [
  {
    id: 1,
    title: "Oskylad korsning",
    intro: "Väj för bil som kommer från höger.",
    setup: () => {
      S.player = new Car(380, 540, "blue");
      S.sign = { type: "yield", x: 350, y: 200 };
      S.npcs.push(new Car(420, -100, "red", true, 3)); // NPC-bil kommer nerifrån
    },
    update: () => {},
    check: () => {
      for (let npc of S.npcs) {
        if (S.player.x < npc.x + npc.width &&
            S.player.x + S.player.width > npc.x &&
            S.player.y < npc.y + npc.height &&
            S.player.y + S.player.height > npc.y) {
          return "fail: Du väjde inte för bilen!";
        }
      }
      if (S.player.y < 50) return "success";
      return null;
    }
  },
  {
    id: 2,
    title: "Stopplikt",
    intro: "Stanna vid stopplinjen i minst 2 sekunder.",
    setup: () => {
      S.player = new Car(380, 540, "blue");
      S.sign = { type: "stop", x: 350, y: 200, lineY: 250 };
    },
    update: () => {},
    check: () => {
      if (S.player.y < S.sign.lineY && S.stopTimer < 120) {
        return "fail: Du stannade inte vid stopplinjen!";
      }
      if (Math.abs(S.player.speed) < 0.1 &&
          S.player.y <= S.sign.lineY + 5 &&
          S.player.y >= S.sign.lineY - 5) {
        S.stopTimer++;
      }
      if (S.player.y < 50) return "success";
      return null;
    }
  },
  {
    id: 3,
    title: "Hastighetsbegränsning 30",
    intro: "Kör inte över 30 km/h.",
    setup: () => {
      S.player = new Car(380, 540, "blue");
      S.sign = { type: "speed30", x: 350, y: 250 };
      S.speedLimit = 3;
    },
    update: () => {},
    check: () => {
      if (S.player.speed > S.speedLimit) {
        return "fail: Du körde för fort!";
      }
      if (S.player.y < 50) return "success";
      return null;
    }
  },
  // Du kan lägga till fler nivåer (fotgängare, trafikljus, fyrvägskorsning, slutprov) på samma sätt
];
