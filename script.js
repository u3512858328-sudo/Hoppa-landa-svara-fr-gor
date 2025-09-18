const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");

let keys = {};
let game = {
  running: false,
  levelIndex: 0,
  player: null,
  npc: null,
  cyclist: null,
  pedestrian: null,
  trafficLight: null,
  roundabout: null,
  intersection: null,
  stopLine: null,
  crosswalk: null,
  speedLimit: null
};

class Car {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.width = 40;
    this.height = 20;
    this.speed = 0;
    this.angle = 0;
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
    ctx.restore();
  }
}

function checkCollision(a, b) {
  if (!a || !b) return false;
  return (
    a.x - a.width/2 < b.x + b.width &&
    a.x + a.width/2 > b.x &&
    a.y - a.height/2 < b.y + b.height &&
    a.y + a.height/2 > b.y
  );
}

// 🎮 Nivåer
const levels = [
  {
    id: 2, title: "Stopplikt",
    intro: "Stanna vid stopplinjen innan korsningen.",
    setup: () => {
      game.player = new Car(150, 350, "blue");
      game.stopLine = { x: 300, y: 320, w: 5, h: 60 };
      game.intersection = { x: 350, y: 260, w: 100, h: 120 };
    },
    check: () => {
      if (game.player.x > 300 && game.player.speed > 0.5) return "fail";
      if (game.player.x > 600) return "success";
    }
  },
  {
    id: 3, title: "Hastighetsbegränsning",
    intro: "Kör inte över 30 km/h (≈3 pixlar/tick).",
    setup: () => {
      game.player = new Car(150, 350, "blue");
      game.speedLimit = 3;
    },
    check: () => {
      if (game.player.speed > game.speedLimit) return "fail";
      if (game.player.x > 600) return "success";
    }
  },
  {
    id: 4, title: "Övergångsställe",
    intro: "Stanna för gående på övergångsstället.",
    setup: () => {
      game.player = new Car(150, 350, "blue");
      game.crosswalk = { x: 350, y: 300, w: 40, h: 80 };
      game.pedestrian = { x: 360, y: 280, width: 15, height: 30 };
    },
    check: () => {
      if (checkCollision(game.player, game.pedestrian)) return "fail";
      if (game.player.x > 600) return "success";
    }
  },
  {
    id: 5, title: "Cyklist",
    intro: "Lämna företräde åt cyklisten i korsningen.",
    setup: () => {
      game.player = new Car(150, 350, "blue");
      game.intersection = { x: 350, y: 260, w: 100, h: 120 };
      game.cyclist = new Car(400, 200, "green");
      game.cyclist.width = 20;
      game.cyclist.height = 10;
    },
    update: () => {
      if (game.cyclist) game.cyclist.y += 1;
    },
    check: () => {
      if (checkCollision(game.player, game.cyclist)) return "fail";
      if (game.player.x > 600) return "success";
    }
  },
  {
    id: 6, title: "Högerregeln",
    intro: "Lämna företräde åt bilen från höger.",
    setup: () => {
      game.player = new Car(150, 350, "blue");
      game.intersection = { x: 350, y: 260, w: 100, h: 120 };
      game.npc = new Car(400, 200, "red");
    },
    update: () => {
      if (game.npc) game.npc.y += 1;
    },
    check: () => {
      if (checkCollision(game.player, game.npc)) return "fail";
      if (game.player.x > 600) return "success";
    }
  },
  {
    id: 7, title: "Trafikljus",
    intro: "Stanna vid rött ljus.",
    setup: () => {
      game.player = new Car(150, 350, "blue");
      game.trafficLight = { x: 300, y: 250, state: "red", timer: 0 };
    },
    update: () => {
      let t = game.trafficLight;
      t.timer++;
      if (t.timer % 200 === 0) {
        t.state = t.state === "red" ? "green" : "red";
      }
    },
    check: () => {
      if (game.trafficLight.state === "red" && game.player.x > 300) return "fail";
      if (game.player.x > 600) return "success";
    }
  },
  {
    id: 8, title: "Rondell",
    intro: "Lämna företräde åt fordon i rondellen.",
    setup: () => {
      game.player = new Car(150, 350, "blue");
      game.roundabout = { x: 350, y: 350, r: 60 };
      game.npc = new Car(350, 290, "red");
    },
    update: () => {
      if (game.npc) {
        // npc kör runt i rondell
        game.npc.angle += 0.02;
        game.npc.x = 350 + Math.cos(game.npc.angle) * 60;
        game.npc.y = 350 + Math.sin(game.npc.angle) * 60;
      }
    },
    check: () => {
      if (checkCollision(game.player, game.npc)) return "fail";
      if (game.player.x > 600) return "success";
    }
  },
  {
    id: 9, title: "Slutprov",
    intro: "Klarar du alla regler på en gång?",
    setup: () => {
      game.player = new Car(150, 350, "blue");
      game.intersection = { x: 350, y: 260, w: 100, h: 120 };
      game.npc = new Car(400, 200, "red");
      game.pedestrian = { x: 500, y: 320, width: 15, height: 30 };
      game.trafficLight = { x: 600, y: 250, state: "red", timer: 0 };
    },
    update: () => {
      if (game.npc) game.npc.y += 1;
      if (game.trafficLight) {
        game.trafficLight.timer++;
        if (game.trafficLight.timer % 200 === 0) {
          game.trafficLight.state = game.trafficLight.state === "red" ? "green" : "red";
        }
      }
    },
    check: () => {
      if (checkCollision(game.player, game.npc)) return "fail";
      if (checkCollision(game.player, game.pedestrian)) return "fail";
      if (game.trafficLight.state === "red" && game.player.x > 600) return "fail";
      if (game.player.x > 800) return "success";
    }
  }
];

// ⬇ Kontroller
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

function handleControls() {
  if (!game.player) return;
  if (keys["ArrowUp"]) game.player.speed += 0.1;
  if (keys["ArrowDown"]) game.player.speed -= 0.1;
  if (keys["ArrowLeft"]) game.player.x -= 2;
  if (keys["ArrowRight"]) game.player.x += 2;
  if (game.player.speed > 0) game.player.x += game.player.speed;
  if (game.player.speed < 0) game.player.speed = 0; // ingen back
  game.player.speed *= 0.98; // friktion
}

function loadLevel() {
  let level = levels[game.levelIndex];
  if (!level) {
    alert("Grattis! Du klarade alla nivåer!");
    game.running = false;
    return;
  }
  Object.assign(game, {npc:null, cyclist:null, pedestrian:null, trafficLight:null,
    intersection:null, stopLine:null, crosswalk:null, roundabout:null, speedLimit:null});
  level.setup();
  game.level = level;
  alert(`Nivå ${level.id}: ${level.title}\n${level.intro}`);
}

function drawScene() {
  ctx.fillStyle = "#77a377";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Vägbana
  ctx.fillStyle = "#555";
  ctx.fillRect(0, 260, canvas.width, 120);

  // Mittlinje (vit streckad)
  ctx.strokeStyle = "white";
  ctx.lineWidth = 3;
  ctx.setLineDash([20, 20]);
  ctx.beginPath();
  ctx.moveTo(0, 320);
  ctx.lineTo(canvas.width, 320);
  ctx.stroke();
  ctx.setLineDash([]);

  // Specialelement
  if (game.stopLine) { ctx.fillStyle = "white"; ctx.fillRect(game.stopLine.x, game.stopLine.y, game.stopLine.w, game.stopLine.h); }
  if (game.crosswalk) {
    ctx.fillStyle = "white";
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(game.crosswalk.x + i*10, game.crosswalk.y, 5, game.crosswalk.h);
    }
  }
  if (game.roundabout) {
    ctx.fillStyle = "#777";
    ctx.beginPath();
    ctx.arc(game.roundabout.x, game.roundabout.y, game.roundabout.r, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = "#77a377";
    ctx.beginPath();
    ctx.arc(game.roundabout.x, game.roundabout.y, game.roundabout.r-25, 0, Math.PI*2);
    ctx.fill();
  }
  if (game.trafficLight) {
    ctx.fillStyle = game.trafficLight.state === "red" ? "red" : "green";
    ctx.fillRect(game.trafficLight.x, game.trafficLight.y, 20, 50);
  }
  if (game.pedestrian) {
    ctx.fillStyle = "yellow";
    ctx.fillRect(game.pedestrian.x, game.pedestrian.y, game.pedestrian.width, game.pedestrian.height);
  }

  // Fordon
  if (game.player) game.player.draw();
  if (game.npc) game.npc.draw();
  if (game.cyclist) game.cyclist.draw();

  ctx.fillStyle = "black";
  ctx.font = "16px Arial";
  ctx.fillText(`Nivå: ${game.level.id} – ${game.level.title}`, 20, 20);
}

function update() {
  handleControls();
  if (game.level.update) game.level.update();
  let result = game.level.check();
  if (result === "fail") {
    alert("Du missade regeln! Försök igen.");
    loadLevel();
  } else if (result === "success") {
    alert("Bra jobbat! Du klarade nivån.");
    game.levelIndex++;
    loadLevel();
  }
}

function gameLoop() {
  if (!game.running) return;
  drawScene();
  update();
  requestAnimationFrame(gameLoop);
}

function startGame() {
  game.running = true;
  game.levelIndex = 0;
  loadLevel();
  requestAnimationFrame(gameLoop);
}

startBtn.addEventListener("click", startGame);
