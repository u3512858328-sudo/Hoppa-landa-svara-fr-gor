const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");

let game = {
  running: false,
  levelIndex: 0,
  player: null,
  npc: null,
  cyclist: null,
  pedestrian: null,
  trafficLight: null,
  intersection: null,
  stopLine: null,
  crosswalk: null,
  roundabout: null,
  signPos: null
};

class Car {
  constructor(x, y, angle, color) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.color = color;
    this.width = 40;
    this.height = 20;
    this.speed = 0;
    this.stopped = false;
  }
  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

function checkCollision(a, b) {
  if (!a || !b) return false;
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// 🎮 Nivåer (nivå 1 borttagen)
const levels = [
  { id: 2, title: "Stopplikt", intro: "Stanna vid stopplinjen innan du kör vidare.",
    setup: () => {
      game.player = new Car(150, 320, 0, "blue");
      game.signPos = { x: 200, y: 250, type: "stop" };
      game.stopLine = { x: 240, y: 300, w: 5, h: 40 };
      game.intersection = { x: 350, y: 260, w: 100, h: 120 };
    },
    check: () => {
      if (game.player.x > 240 && !game.player.stopped) return "fail";
      if (game.player.x > 600) return "success";
    }
  },
  { id: 3, title: "Hastighetsbegränsning", intro: "Anpassa farten efter skylten.",
    setup: () => {
      game.player = new Car(150, 320, 0, "blue");
      game.speedLimit = { x: 220, y: 250, value: 30 };
    },
    check: () => {
      if (game.player.speed > 3) return "fail"; 
      if (game.player.x > 600) return "success";
    }
  },
  { id: 4, title: "Övergångsställe", intro: "Stanna för gående vid övergångsstället.",
    setup: () => {
      game.player = new Car(150, 320, 0, "blue");
      game.pedestrian = { x: 350, y: 280, width: 15, height: 30 };
      game.crosswalk = { x: 340, y: 260, w: 40, h: 80 };
    },
    check: () => {
      if (checkCollision(game.player, game.pedestrian)) return "fail";
      if (game.player.x > 600) return "success";
    }
  },
  { id: 5, title: "Cyklist", intro: "Lämna företräde åt cyklisten i korsningen.",
    setup: () => {
      game.player = new Car(150, 320, 0, "blue");
      game.cyclist = new Car(400, 200, Math.PI/2, "green");
      game.intersection = { x: 350, y: 260, w: 100, h: 120 };
    },
    check: () => {
      if (checkCollision(game.player, game.cyclist)) return "fail";
      if (game.player.x > 600) return "success";
    }
  },
  { id: 6, title: "Högerregeln", intro: "Lämna företräde åt bilen från höger.",
    setup: () => {
      game.player = new Car(150, 320, 0, "blue");
      game.npc = new Car(400, 200, Math.PI/2, "red");
      game.intersection = { x: 350, y: 260, w: 100, h: 120 };
    },
    check: () => {
      if (checkCollision(game.player, game.npc)) return "fail";
      if (game.player.x > 600) return "success";
    }
  },
  { id: 7, title: "Trafikljus", intro: "Stanna vid rött ljus.",
    setup: () => {
      game.player = new Car(150, 320, 0, "blue");
      game.trafficLight = { x: 300, y: 250, state: "red" };
    },
    check: () => {
      if (game.trafficLight.state === "red" && game.player.x > 300) return "fail";
      if (game.player.x > 600) return "success";
    }
  },
  { id: 8, title: "Rondell", intro: "Lämna företräde åt fordon i rondellen.",
    setup: () => {
      game.player = new Car(150, 320, 0, "blue");
      game.npc = new Car(350, 200, Math.PI/2, "red");
      game.roundabout = { x: 350, y: 320, r: 60 };
    },
    check: () => {
      if (checkCollision(game.player, game.npc)) return "fail";
      if (game.player.x > 600) return "success";
    }
  },
  { id: 9, title: "Slutprov", intro: "Visa att du kan alla reglerna!",
    setup: () => {
      game.player = new Car(150, 320, 0, "blue");
      game.npc = new Car(400, 200, Math.PI/2, "red");
      game.pedestrian = { x: 500, y: 280, width: 15, height: 30 };
      game.trafficLight = { x: 600, y: 250, state: "red" };
      game.intersection = { x: 350, y: 260, w: 100, h: 120 };
    },
    check: () => {
      if (checkCollision(game.player, game.npc)) return "fail";
      if (checkCollision(game.player, game.pedestrian)) return "fail";
      if (game.trafficLight.state === "red" && game.player.x > 600) return "fail";
      if (game.player.x > 800) return "success";
    }
  }
];

function loadLevel() {
  let level = levels[game.levelIndex];
  if (!level) {
    alert("Grattis! Du klarade alla nivåer!");
    game.running = false;
    return;
  }
  Object.assign(game, {npc:null, cyclist:null, pedestrian:null, trafficLight:null,
    intersection:null, stopLine:null, crosswalk:null, roundabout:null, signPos:null});
  level.setup();
  game.level = level;
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

  // Extra element
  if (game.intersection) ctx.fillRect(game.intersection.x, game.intersection.y, game.intersection.w, game.intersection.h);
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

  // Nivåtext
  ctx.fillStyle = "black";
  ctx.font = "16px Arial";
  ctx.fillText(`Nivå: ${game.level.id} – ${game.level.title}`, 20, 20);
}

function update() {
  if (game.player) game.player.x += 1; // enkel rörelse framåt
  if (game.npc) game.npc.y += 1;
  if (game.cyclist) game.cyclist.y += 1;

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
