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
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, 8);
    ctx.fill();
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

// === Spel-loop ===
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

  if (!keys["ArrowUp"] && !keys["ArrowDown"]) {
    if (p.speed > 0) p.speed -= p.friction;
    if (p.speed < 0) p.speed += p.friction;
    if (Math.abs(p.speed) < 0.05) p.speed = 0;
  }

  p.y -= p.speed;
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
    ctx.font = "18px Arial";
    if (S.sign.type === "yield") ctx.fillText("Väj för höger", S.sign.x, S.sign.y);
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
    if (S.sign.type === "redlight") ctx.fillText("RÖTT", S.sign.x, S.sign.y);
  }

  // NPCs
  S.npcs.forEach(npc => npc.draw());

  // Spelare
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
    title: "Fyrvägskorsning – Högerregel",
    intro: "Vänta för bilar som kommer från höger vid en korsning.",
    setup: () => {
      S.player = new Car(380, 500, "blue");
      S.npcs.push(new Car(300, 100, "red", true, 2));
      S.sign = { type: "yield", x: 350, y: 250 };
    },
    update: () => {},
    check: () => {
      let npc = S.npcs[0];
      if (S.player.x < npc.x + npc.width &&
          S.player.x + S.player.width > npc.x &&
          S.player.y < npc.y + npc.height &&
          S.player.y + S.player.height > npc.y) {
        return "fail: Du bröt mot högerregeln!";
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
      S.player = new Car(380, 500, "blue");
      S.sign = { x: 350, y: 200, type: "stop", lineY: 250 };
    },
    update: () => {},
    check: () => {
      if (S.player.y < S.sign.lineY && S.stopTimer < 120) {
        return "fail: Du stannade inte vid stopplinjen!";
      }
      if (S.player.y < 50) return "success";
      if (Math.abs(S.player.speed) < 0.1 &&
          S.player.y <= S.sign.lineY + 5 &&
          S.player.y >= S.sign.lineY - 5) {
        S.stopTimer++;
      }
      return null;
    }
  },
  {
    id: 3,
    title: "Hastighetsbegränsning 30",
    intro: "Kör inte över 30 km/h.",
    setup: () => {
      S.player = new Car(380, 500, "blue");
      S.sign = { x: 350, y: 250, type: "speed30" };
      S.speedLimit = 3;
    },
    update: () => {},
    check: () => {
      if (S.player.speed > S.speedLimit) {
        return `fail: Du körde för fort! (${Math.round(S.player.speed*10)} km/h)`;
      }
      if (S.player.y < 50) return "success";
      return null;
    }
  },
  {
    id: 4,
    title: "Hastighetsbegränsning 50",
    intro: "Kör inte över 50 km/h.",
    setup: () => {
      S.player = new Car(380, 500, "blue");
      S.sign = { x: 350, y: 250, type: "speed50" };
      S.speedLimit = 5;
    },
    update: () => {},
    check: () => {
      if (S.player.speed > S.speedLimit) {
        return `fail: Du körde för fort! (${Math.round(S.player.speed*10)} km/h)`;
      }
      if (S.player.y < 50) return "success";
      return null;
    }
  },
  {
    id: 5,
    title: "Fotgängare",
    intro: "Stanna för fotgängare vid övergångsställe.",
    setup: () => {
      S.player = new Car(380, 500, "blue");
      S.npcs.push(new Car(360, 200, "green", true, 0));
    },
    update: () => {},
    check: () => {
      let ped = S.npcs[0];
      if (S.player.y < ped.y + ped.height && S.player.speed > 0) {
        return "fail: Du körde över fotgängaren!";
      }
      if (S.player.y < 50) return "success";
      return null;
    }
  },
  {
    id: 6,
    title: "Trafiksignal röd",
    intro: "Stanna vid rödljus.",
    setup: () => {
      S.player = new Car(380, 500, "blue");
      S.sign = { x: 350, y: 250, type: "redlight", lineY: 300 };
    },
    update: () => {},
    check: () => {
      if (S.player.y < S.sign.lineY) return "fail: Du körde mot rött!";
      if (S.player.y < 50) return "success";
      return null;
    }
  },
  {
    id: 7,
    title: "Trafiksignal grön",
    intro: "Kör när det är grönt.",
    setup: () => {
      S.player = new Car(380, 500, "blue");
    },
    update: () => {},
    check: () => {
      if (S.player.y < 50) return "success";
      return null;
    }
  },
  {
    id: 8,
    title: "Slutprov",
    intro: "Visa att du kan alla regler!",
    setup: () => {
      S.player = new Car(380, 500, "blue");
      S.sign = { x: 350, y: 200, type: "stop", lineY: 250 };
      S.speedLimit = 4;
      S.npcs.push(new Car(420, 100, "red", true, 2));
    },
    update: () => {},
    check: () => {
      if (S.player.speed > S.speedLimit) return "fail: Du körde för fort!";
      for (let npc of S.npcs) {
        if (S.player.x < npc.x + npc.width &&
            S.player.x + S.player.width > npc.x &&
            S.player.y < npc.y + npc.height &&
            S.player.y + S.player.height > npc.y) {
          return "fail: Du väjde inte!";
        }
      }
      if (S.player.y < 50) return "success";
      return null;
    }
  }
];
