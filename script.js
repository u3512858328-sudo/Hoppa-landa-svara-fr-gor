// === Setup ===
let canvas = document.getElementById("gameCanvas");
let ctx = canvas.getContext("2d");

let keys = {};
let running = false;
let currentLevel = 0;
let levels = [];
let S = {}; // state

// === Input ===
window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

// === Car class ===
class Car {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.w = 40;
    this.h = 70;
    this.color = color;
    this.speed = 0;
    this.angle = 0;
    this.maxSpeed = 4;
  }

  update() {
    // styrning
    if (keys["ArrowLeft"]) this.angle -= 0.05;
    if (keys["ArrowRight"]) this.angle += 0.05;

    // gas/broms/back
    if (keys["ArrowUp"]) this.speed = Math.min(this.maxSpeed, this.speed + 0.1);
    else if (keys["ArrowDown"]) {
      if (this.speed > 0) this.speed -= 0.2; // broms
      else this.speed = Math.max(-2, this.speed - 0.05); // back
    } else {
      // friktion
      if (this.speed > 0) this.speed -= 0.05;
      if (this.speed < 0) this.speed += 0.05;
    }

    // rörelse
    this.x += Math.sin(this.angle) * this.speed;
    this.y -= Math.cos(this.angle) * this.speed;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
    ctx.restore();
  }
}

// === Level definitions ===
levels = [
  {
    id: 2, title: "Stopplikt",
    intro: "Stanna vid stopplinjen i 2 sekunder innan korsningen.",
    setup: () => {
      S.player = new Car(400, 550, "blue");
      S.intersection = { x: 200, y: 250, w: 400, h: 100 };
      S.stopLine = { x: 300, y: S.intersection.y + S.intersection.h + 20, w: 200, h: 6 };
      S._stopHoldStart = null;
      S._stopDone = false;
    },
    update: () => {
      if (Math.abs(S.player.speed) < 0.2 && playerOverStopLine()) {
        if (!S._stopHoldStart) S._stopHoldStart = performance.now();
        else if (performance.now() - S._stopHoldStart >= 2000) {
          S._stopDone = true;
        }
      } else if (!S._stopDone) {
        S._stopHoldStart = null;
      }
    },
    check: () => {
      if (S.player.y < S.intersection.y + S.intersection.h/2) {
        if (!S._stopDone) return "fail";
        return "success";
      }
      return null;
    }
  }
  // här kan fler nivåer läggas till (hastighet, högerregel, trafikljus osv.)
];

// === Helpers ===
function playerOverStopLine() {
  return (S.player.x > S.stopLine.x &&
          S.player.x < S.stopLine.x + S.stopLine.w &&
          S.player.y > S.stopLine.y - 10 &&
          S.player.y < S.stopLine.y + 20);
}

// === Main loop ===
function gameLoop() {
  if (!running) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // väg
  ctx.fillStyle = "gray";
  ctx.fillRect(300, 0, 200, canvas.height);
  ctx.strokeStyle = "white";
  ctx.setLineDash([20, 20]);
  ctx.beginPath();
  ctx.moveTo(400, 0);
  ctx.lineTo(400, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);

  // korsning
  if (S.intersection) {
    ctx.fillStyle = "gray";
    ctx.fillRect(S.intersection.x, S.intersection.y, S.intersection.w, S.intersection.h);
  }

  // stopplinje
  if (S.stopLine) {
    ctx.fillStyle = "white";
    ctx.fillRect(S.stopLine.x, S.stopLine.y, S.stopLine.w, S.stopLine.h);
  }

  // spelare
  S.player.update();
  S.player.draw();

  // levels update/check
  let lvl = levels[currentLevel];
  if (lvl.update) lvl.update();
  if (lvl.check) {
    let res = lvl.check();
    if (res === "fail") {
      alert("Du bröt mot reglerna!");
      startGame();
      return;
    }
    if (res === "success") {
      alert("Bra jobbat!");
      startGame();
      return;
    }
  }

  requestAnimationFrame(gameLoop);
}

// === Game start ===
function startGame() {
  running = true;
  currentLevel = 0; // börja på första nivån i listan
  let lvl = levels[currentLevel];
  lvl.setup();
  gameLoop();
}
