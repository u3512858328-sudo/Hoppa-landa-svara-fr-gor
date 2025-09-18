// ===========================
// Global state & input
// ===========================
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const hud = document.getElementById("hud");

let keys = {};
window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

let game = {
  playing: false,
  crashed: false,
  finished: false,
  level: 1,
  score: 0,
  lives: 3,
  player: null,
  npc: null,
  obstacle: null,
  intersection: null,
  signPos: null,
  startedAt: null
};

// ===========================
// Bilklass
// ===========================
class Car {
  constructor(x, y, angle = 0, color = "#0077cc") {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.color = color;
    this.speed = 0;
    this.w = 36;
    this.h = 18;
    this.maxSpeed = 200 / 3.6;
    this.acc = 60 / 3.6;
    this.friction = 4;
    this.turnSpeed = 2.8;
  }

  update(dt, controls) {
    this.speed += controls.throttle * this.acc * dt;

    if (controls.throttle === 0) {
      if (this.speed > 0) this.speed = Math.max(0, this.speed - this.friction * dt);
      else this.speed = Math.min(0, this.speed + this.friction * dt);
    }

    this.speed = Math.max(-this.maxSpeed * 0.4, Math.min(this.maxSpeed, this.speed));

    const steerEffect = (this.speed / this.maxSpeed);
    this.angle += controls.steer * this.turnSpeed * steerEffect * dt;

    this.x += Math.cos(this.angle) * this.speed * dt * 30;
    this.y += Math.sin(this.angle) * this.speed * dt * 30;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.roundRect(-this.w/2, -this.h/2, this.w, this.h, 4);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(2, -6, 16, 12);
    ctx.restore();
  }

  bbox() {
    return { x: this.x, y: this.y, r: Math.max(this.w, this.h) / 1.6 };
  }
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function checkCollision(a, b) {
  const A = a.bbox();
  const B = b.bbox();
  return dist(A, B) < (A.r + B.r - 2);
}

CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
  if (typeof r === "undefined") r = 4;
  this.beginPath();
  this.moveTo(x + r, y);
  this.arcTo(x + w, y, x + w, y + h, r);
  this.arcTo(x + w, y + h, x, y + h, r);
  this.arcTo(x, y + h, x, y, r);
  this.arcTo(x, y, x + w, y, r);
  this.closePath();
};

// ===========================
// Spelloop
// ===========================
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.04, (now - last) / 1000);
  last = now;
  if (game.playing) update(dt);
  if (game.playing) draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function getControls() {
  const throttle = (keys["ArrowUp"] ? 1 : 0) + (keys["ArrowDown"] ? -1 : 0);
  const steer = (keys["ArrowLeft"] ? -1 : 0) + (keys["ArrowRight"] ? 1 : 0);
  return { throttle, steer };
}

// ===========================
// Nivådata
// ===========================
const levels = [
  { id: 1, title: "Väjningsplikt", intro: "Väj för bilen från höger vid väjningsplikt.",
    setup: () => { game.player = new Car(200, 300, 0, "#0077cc"); game.npc = new Car(500, 300, Math.PI, "#cc0000"); game.signPos = { x: 300, y: 260, type: "yield" }; },
    check: () => { if (checkCollision(game.player, game.npc)) return "crash"; if (game.player.x > 600) return "success"; }
  },
  { id: 2, title: "Stoppskylt", intro: "Stanna helt vid stopplinjen innan du kör vidare.",
    setup: () => { game.player = new Car(100, 300, 0, "#0077cc"); game.signPos = { x: 250, y: 270, type: "stop" }; },
    check: () => { if (game.player.x > 400) return (game.player.speed > 1) ? "fail" : "success"; }
  },
  { id: 3, title: "Hastighetsgräns", intro: "Håll max 50 km/h.",
    setup: () => { game.player = new Car(100, 300, 0, "#0077cc"); game.signPos = { x: 200, y: 260, type: "speed50" }; },
    check: () => { if (game.player.x > 600) return (game.player.speed > 14) ? "fail" : "success"; }
  },
  { id: 4, title: "Högerregeln", intro: "Lämna företräde åt bilen från höger.",
    setup: () => { game.player = new Car(400, 500, -Math.PI/2, "#0077cc"); game.npc = new Car(500, 400, Math.PI, "#cc0000"); game.intersection = { x: 450, y: 450 }; },
    check: () => { if (checkCollision(game.player, game.npc)) return "crash"; if (game.player.y < 200) return "success"; }
  },
  { id: 5, title: "Cyklist på övergångsställe", intro: "Stanna för cyklisten.",
    setup: () => { game.player = new Car(100, 300, 0, "#0077cc"); game.npc = new Car(300, 300, 0, "green"); },
    check: () => { if (checkCollision(game.player, game.npc)) return "crash"; if (game.player.x > 500) return "success"; }
  },
  { id: 6, title: "Trafikljus", intro: "Stanna vid rött, kör vid grönt.",
    setup: () => { game.player = new Car(100, 300, 0, "#0077cc"); game.signPos = { x: 250, y: 260, type: "lightRed" }; },
    check: () => { if (game.player.x > 400) return (game.signPos.type === "lightRed") ? "fail" : "success"; }
  },
  { id: 7, title: "Rondell", intro: "Lämna företräde i rondellen.",
    setup: () => { game.player = new Car(200, 500, -Math.PI/2, "#0077cc"); game.npc = new Car(300, 300, Math.PI/2, "#cc0000"); },
    check: () => { if (checkCollision(game.player, game.npc)) return "crash"; if (game.player.y < 200) return "success"; }
  },
  { id: 8, title: "Övergångsställe", intro: "Stanna för gående.",
    setup: () => { game.player = new Car(100, 300, 0, "#0077cc"); game.npc = new Car(300, 300, 0, "orange"); },
    check: () => { if (checkCollision(game.player, game.npc)) return "crash"; if (game.player.x > 500) return "success"; }
  },
  { id: 9, title: "Parkering", intro: "Parkera i rutan.",
    setup: () => { game.player = new Car(100, 500, 0, "#0077cc"); game.signPos = { x: 600, y: 300, type: "park" }; },
    check: () => { if (Math.abs(game.player.x - 600) < 20 && Math.abs(game.player.y - 300) < 20) return "success"; }
  }
];

function startLevel(lvl) {
  game.level = lvl;
  game.startedAt = performance.now();
  game.crashed = false;
  game.finished = false;
  game.signPos = null;
  game.npc = null;
  game.intersection = null;
  levels[lvl-1].setup();
  game.playing = true;
}

function update(dt) {
  const controls = getControls();
  game.player.update(dt, controls);
  if (game.npc) game.npc.update(dt, { throttle: 0.4, steer: 0 });

  const status = levels[game.level-1].check();
  if (status === "crash" || status === "fail") {
    game.lives--;
    if (game.lives <= 0) gameOver();
    else startLevel(game.level);
  } else if (status === "success") {
    game.score += 100;
    if (game.level < levels.length) startLevel(game.level + 1);
    else gameOver(true);
  }
}

function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = "#666";
  ctx.fillRect(0, 280, canvas.width, 80);
  if (game.signPos) drawSign(game.signPos);
  if (game.intersection) { ctx.fillStyle = "#444"; ctx.fillRect(400, 400, 100, 100); }
  if (game.npc) game.npc.draw(ctx);
  game.player.draw(ctx);
  hud.innerHTML = `<div><b>Nivå:</b> ${game.level} – ${levels[game.level-1].title}</div>
    <div><b>Liv:</b> ${game.lives}</div><div><b>Poäng:</b> ${game.score}</div>`;
}

function drawSign(sign) {
  ctx.save(); ctx.translate(sign.x, sign.y);
  if (sign.type === "yield") { ctx.fillStyle="white"; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-20,40); ctx.lineTo(20,40); ctx.closePath(); ctx.fill(); ctx.strokeStyle="red"; ctx.lineWidth=3; ctx.stroke(); }
  if (sign.type === "stop") { ctx.fillStyle="red"; ctx.fillRect(-20,-20,40,40); ctx.fillStyle="white"; ctx.font="bold 14px sans-serif"; ctx.fillText("STOP",-16,5); }
  if (sign.type === "speed50") { ctx.fillStyle="white"; ctx.beginPath(); ctx.arc(0,0,20,0,Math.PI*2); ctx.fill(); ctx.strokeStyle="red"; ctx.lineWidth=3; ctx.stroke(); ctx.fillStyle="black"; ctx.font="14px sans-serif"; ctx.fillText("50",-10,5); }
  if (sign.type === "lightRed") { ctx.fillStyle="black"; ctx.fillRect(-10,-30,20,60); ctx.fillStyle="red"; ctx.beginPath(); ctx.arc(0,-15,8,0,Math.PI*2); ctx.fill(); ctx.fillStyle="gray"; ctx.beginPath(); ctx.arc(0,0,8,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(0,15,8,0,Math.PI*2); ctx.fill(); }
  if (sign.type === "park") { ctx.fillStyle="blue"; ctx.fillRect(-20,-20,40,40); ctx.fillStyle="white"; ctx.font="bold 20px sans-serif"; ctx.fillText("P",-7,7); }
  ctx.restore();
}

function gameOver(won=false) {
  game.playing = false;
  document.getElementById("gameArea").classList.add("hidden");
  const over = document.getElementById("gameOver");
  over.classList.remove("hidden");
  document.getElementById("finalScore").innerText = won ? `Grattis! Du klarade alla nivåer! Poäng: ${game.score}` : `Spelet över. Poäng: ${game.score}`;
}

document.getElementById("startGame").addEventListener("click", () => {
  document.getElementById("menu").classList.add("hidden");
  document.getElementById("gameArea").classList.remove("hidden");
  startLevel(1);
});
document.getElementById("restartGame").addEventListener("click", () => {
  document.getElementById("gameOver").classList.add("hidden");
  document.getElementById("menu").classList.remove("hidden");
  game.level = 1; game.score = 0; game.lives = 3;
});
