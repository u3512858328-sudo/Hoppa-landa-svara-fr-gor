// script.js - komplett ny version
// Förutsätter: index.html har <canvas id="gameCanvas">, en knapp #startBtn och #restartBtn, #menu, #game, #hud, #gameOver etc.

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const menu = document.getElementById('menu');
const gameDiv = document.getElementById('game');
const hud = document.getElementById('hud');
const gameOverDiv = document.getElementById('gameOver');
const finalText = document.getElementById('finalText');

let keys = {};
window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);

// -- Game state
const S = {
  running: false,
  levelIndex: 0,
  lives: 3,
  score: 0,
  player: null,
  npc: null,
  cyclist: null,
  pedestrian: null,
  trafficLight: null,
  intersection: null,
  stopLine: null,
  crosswalk: null,
  roundabout: null,
  sign: null,
  // input timers
  brakeHoldStart: null,
  isReversing: false,
  introShown: false,
  stopHoldStart: null
};

// -- Car class (player and others)
class Car {
  constructor(x, y, color='blue', w=36, h=18) {
    this.x = x; this.y = y;
    this.color = color;
    this.w = w; this.h = h;
    this.speed = 0;            // px per frame forward (positive => up)
    this.maxSpeed = 4.2;      // tunable
    this.maxReverse = 2.2;
    this.acc = 0.12;
    this.brakePower = 0.24;
    this.friction = 0.96;
    this.angle = 0;
  }
  update() {
    // apply friction
    this.speed *= this.friction;
    if (Math.abs(this.speed) < 0.01) this.speed = 0;
    // move (upwards when positive)
    this.y -= this.speed;
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(-this.w/2 + 6, -this.h/4, this.w/3, this.h/2);
    ctx.restore();
  }
  bbox() {
    return { x: this.x - this.w/2, y: this.y - this.h/2, w: this.w, h: this.h };
  }
}

// simple rect collision
function rectsCollide(a, b) {
  if (!a || !b) return false;
  return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
}

// Helper: is player overlapping stopLine
function playerOverStopLine() {
  if (!S.stopLine || !S.player) return false;
  const p = S.player.bbox();
  const s = S.stopLine;
  return !(p.x + p.w < s.x || p.x > s.x + s.w || p.y + p.h < s.y || p.y > s.y + s.h);
}

// -- Levels 2..9 (levelIndex 0 => level id 2)
const levels = [
  // LEVEL 2 - Stopplikt (T- eller fyrvägskorsning): stopplinje innan korsning
  {
    id: 2, title: "Stopplikt",
    intro: "Stanna vid stopplinjen i korsningen. Stanna helt i minst 2 sekunder innan du kör in.",
    setup: () => {
      S.player = new Car(400, 640, 'blue');
      // intersection is a horizontal road crossing the vertical main road
      S.intersection = { x: 240, y: 360, w: 320, h: 120 };
      // stopline is drawn across the right lane
      S.stopLine = { x: 360, y: 420, w: 80, h: 6 }; // horizontal bar (we will draw it as across the lane)
      S.sign = { x: 440, y: 440, type: 'stop' }; // stand at road edge
      S._stopHoldStart = null;
      // nothing else moves
    },
    update: () => {
      // track stop hold if player stationary and overlapping stopline
      if (Math.abs(S.player.speed) < 0.2 && playerOverStopLine()) {
        if (!S._stopHoldStart) S._stopHoldStart = performance.now();
      } else {
        S._stopHoldStart = null;
      }
    },
    check: () => {
      // if player enters intersection (y less than intersection center) ensure stopHold was >= 1800ms
      if (S.player.y < S.intersection.y + S.intersection.h / 2) {
        if (!(S._stopHoldStart && (performance.now() - S._stopHoldStart) >= 1800)) return 'fail';
        return 'success';
      }
      return null;
    }
  },

  // LEVEL 3 - Hastighetsbegränsning
  {
    id: 3, title: "Hastighetsbegränsning",
    intro: "Håll hastigheten under gränsen (provvis 4.5 px/frame).",
    setup: () => {
      S.player = new Car(400, 640, 'blue');
      S.sign = { x: 440, y: 420, type: 'speed30' };
      S.speedLimit = 4.5;
    },
    update: () => {},
    check: () => {
      if (S.player.speed > S.speedLimit) return 'fail';
      if (S.player.y < 80) return 'success';
      return null;
    }
  },

  // LEVEL 4 - Övergångsställe
  {
    id: 4, title: "Övergångsställe",
    intro: "Stanna för gående som korsar vid övergångsstället.",
    setup: () => {
      S.player = new Car(400, 640, 'blue');
      S.crosswalk = { x: 360, y: 420, w: 80, h: 8 };
      S.pedestrian = { x: 320, y: 420, w: 14, h: 28, speed: 0.6, started: true }; // walks left->right across crosswalk
    },
    update: () => {
      if (S.pedestrian && S.pedestrian.started) S.pedestrian.x += S.pedestrian.speed;
    },
    check: () => {
      if (S.pedestrian && rectsCollide(S.pedestrian, S.player.bbox())) return 'fail';
      if (S.player.y < 80) return 'success';
      return null;
    }
  },

  // LEVEL 5 - Cyklist i korsning
  {
    id: 5, title: "Cyklist",
    intro: "Lämna företräde åt cyklisten i korsningen (den kommer från höger).",
    setup: () => {
      S.player = new Car(400, 640, 'blue');
      S.intersection = { x: 240, y: 360, w: 320, h: 120 };
      S.cyclist = new Car(540, 360, 'green', 22, 12); // coming from right, moving left across intersection
      S.cyclist.speed = 1.6;
    },
    update: () => {
      if (S.cyclist) S.cyclist.x -= S.cyclist.speed;
    },
    check: () => {
      if (S.cyclist && rectsCollide(S.cyclist.bbox(), S.player.bbox())) return 'fail';
      if (S.player.y < 80) return 'success';
      return null;
    }
  },

  // LEVEL 6 - Högerregeln
  {
    id: 6, title: "Högerregeln",
    intro: "Lämna företräde åt fordon som kommer från höger.",
    setup: () => {
      S.player = new Car(400, 640, 'blue');
      S.intersection = { x: 240, y: 360, w: 320, h: 120 };
      S.npc = new Car(540, 360, 'red'); S.npc.speed = 1.9; // from right to left - has priority
    },
    update: () => {
      if (S.npc) S.npc.x -= S.npc.speed;
    },
    check: () => {
      if (S.npc && rectsCollide(S.npc.bbox(), S.player.bbox())) return 'fail';
      if (S.player.y < 80) return 'success';
      return null;
    }
  },

  // LEVEL 7 - Trafikljus
  {
    id: 7, title: "Trafikljus",
    intro: "Stanna vid rött, kör på grönt.",
    setup: () => {
      S.player = new Car(400, 640, 'blue');
      // traffic light sits at intersection entry
      S.trafficLight = { x: 400, y: 420, state: 'red', timer: 0 };
      S.lightCycle = { redDuration: 220, greenDuration: 220 }; // frames (~3.6s at 60fps)
    },
    update: () => {
      if (!S.trafficLight) return;
      S.trafficLight.timer++;
      const period = S.lightCycle.redDuration + S.lightCycle.greenDuration;
      const t = S.trafficLight.timer % period;
      S.trafficLight.state = (t < S.lightCycle.redDuration) ? 'red' : 'green';
    },
    check: () => {
      // if player crosses y < light.y while red => fail
      if (S.trafficLight && S.trafficLight.state === 'red' && S.player.y < S.trafficLight.y + 6) return 'fail';
      if (S.player.y < 80) return 'success';
      return null;
    }
  },

  // LEVEL 8 - Rondell
  {
    id: 8, title: "Rondell",
    intro: "Lämna företräde åt fordon som redan är i rondellen.",
    setup: () => {
      S.player = new Car(400, 640, 'blue');
      S.roundabout = { x: 400, y: 360, r: 70 };
      S.npc = { angle: -Math.PI/2, speed: 0.02, color: 'red', x: null, y: null }; // will circle
    },
    update: () => {
      if (S.npc) {
        S.npc.angle += S.npc.speed;
        S.npc.x = S.roundabout.x + Math.cos(S.npc.angle) * S.roundabout.r;
        S.npc.y = S.roundabout.y + Math.sin(S.npc.angle) * S.roundabout.r;
      }
    },
    check: () => {
      const npcRect = S.npc ? { x: S.npc.x - 16, y: S.npc.y - 8, w: 32, h: 16 } : null;
      if (npcRect && rectsCollide(npcRect, S.player.bbox())) return 'fail';
      if (S.player.y < 120) return 'success';
      return null;
    }
  },

  // LEVEL 9 - Slutprov (kombination)
  {
    id: 9, title: "Slutprov",
    intro: "Kombination: stopplinje, gående och trafikljus i korsning.",
    setup: () => {
      S.player = new Car(400, 640, 'blue');
      S.stopLine = { x: 360, y: 480, w: 80, h: 6 };
      S.intersection = { x: 240, y: 340, w: 320, h: 120 };
      S.pedestrian = { x: 320, y: 340, w: 14, h: 28, speed: 0.6 };
      S.trafficLight = { x: 400, y: 420, state: 'red', timer: 0 };
      S.lightCycle = { redDuration: 200, greenDuration: 200 };
      S._stopHoldStart = null;
    },
    update: () => {
      if (S.pedestrian) S.pedestrian.x += S.pedestrian.speed;
      if (S.trafficLight) {
        S.trafficLight.timer++;
        const period = S.lightCycle.redDuration + S.lightCycle.greenDuration;
        const t = S.trafficLight.timer % period;
        S.trafficLight.state = (t < S.lightCycle.redDuration) ? 'red' : 'green';
      }
      if (Math.abs(S.player.speed) < 0.25 && playerOverStopLine()) {
        if (!S._stopHoldStart) S._stopHoldStart = performance.now();
      } else S._stopHoldStart = null;
    },
    check: () => {
      if (S.pedestrian && rectsCollide(S.pedestrian, S.player.bbox())) return 'fail';
      if (S.trafficLight && S.trafficLight.state === 'red' && S.player.y < S.trafficLight.y + 6) return 'fail';
      if (S.player.y < S.intersection.y + S.intersection.h / 2) {
        if (!(S._stopHoldStart && (performance.now() - S._stopHoldStart) >= 1800)) return 'fail';
        return 'success';
      }
      return null;
    }
  }
];

// -- Input behavior: gas, brake, back
const REVERSE_HOLD_MS = 700; // hold down arrow down this long to engage reverse

function handleInputPerFrame() {
  if (!S.player) return;
  // gas:
  if (keys['ArrowUp']) {
    S.player.speed += S.player.acc;
    if (S.player.speed > S.player.maxSpeed) S.player.speed = S.player.maxSpeed;
  }
  // brake / reverse:
  if (keys['ArrowDown']) {
    if (!S.brakeHoldStart) S.brakeHoldStart = performance.now();
    else {
      const held = performance.now() - S.brakeHoldStart;
      if (held >= REVERSE_HOLD_MS) {
        // engage reverse
        S.isReversing = true;
        // move backwards = negative speed value
        S.player.speed -= S.player.acc * 0.9;
        if (S.player.speed < -S.player.maxReverse) S.player.speed = -S.player.maxReverse;
      } else {
        // normal braking: strong deceleration
        S.player.speed -= S.player.brakePower;
        if (S.player.speed < 0) S.player.speed = 0;
      }
    }
  } else {
    // reset brake hold
    S.brakeHoldStart = null;
    S.isReversing = false;
  }

  // lateral movement
  if (keys['ArrowLeft']) S.player.x -= 3;
  if (keys['ArrowRight']) S.player.x += 3;

  // clamp within right-lane (approx)
  const minX = 320 + S.player.w/2;
  const maxX = 480 - S.player.w/2;
  S.player.x = Math.max(minX, Math.min(maxX, S.player.x));

  // update car physics (friction, movement)
  S.player.update();
}

// -- Drawing
function drawScene() {
  // background
  ctx.fillStyle = '#77a377'; ctx.fillRect(0,0,canvas.width,canvas.height);

  // vertical main road
  const roadLeft = 320, roadWidth = 160;
  ctx.fillStyle = '#555'; ctx.fillRect(roadLeft, 0, roadWidth, canvas.height);

  // side lines
  ctx.strokeStyle = 'white'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(roadLeft,0); ctx.lineTo(roadLeft,canvas.height); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(roadLeft+roadWidth,0); ctx.lineTo(roadLeft+roadWidth,canvas.height); ctx.stroke();

  // middle dashed
  ctx.setLineDash([18,14]); ctx.lineWidth = 2; ctx.beginPath();
  ctx.moveTo(roadLeft + roadWidth/2, 0); ctx.lineTo(roadLeft + roadWidth/2, canvas.height); ctx.stroke();
  ctx.setLineDash([]);

  // intersection (horizontal)
  if (S.intersection) {
    ctx.fillStyle = '#666';
    ctx.fillRect(S.intersection.x, S.intersection.y, S.intersection.w, S.intersection.h);
    // draw side edges of intersection (white)
    ctx.strokeStyle = '#444'; ctx.lineWidth = 2;
    ctx.strokeRect(S.intersection.x, S.intersection.y, S.intersection.w, S.intersection.h);
  }

  // stop line (draw horizontal)
  if (S.stopLine) {
    ctx.fillStyle = 'white';
    // draw across lane center
    ctx.fillRect(S.stopLine.x - 40, S.stopLine.y, S.stopLine.w + 80, S.stopLine.h);
  }

  // crosswalk
  if (S.crosswalk) {
    ctx.fillStyle = 'white';
    for (let i=0;i<6;i++){
      ctx.fillRect(S.crosswalk.x + i*12, S.crosswalk.y, 8, S.crosswalk.h);
    }
  }

  // roundabout
  if (S.roundabout) {
    ctx.fillStyle = '#777';
    ctx.beginPath(); ctx.arc(S.roundabout.x, S.roundabout.y, S.roundabout.r, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#77a377';
    ctx.beginPath(); ctx.arc(S.roundabout.x, S.roundabout.y, S.roundabout.r-30, 0, Math.PI*2); ctx.fill();
  }

  // traffic light
  if (S.trafficLight) {
    ctx.fillStyle = 'black';
    ctx.fillRect(S.trafficLight.x-12, S.trafficLight.y-10, 28, 56);
    ctx.fillStyle = (S.trafficLight.state === 'red') ? 'red' : 'gray';
    ctx.beginPath(); ctx.arc(S.trafficLight.x, S.trafficLight.y+2, 6,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = (S.trafficLight.state === 'green') ? 'green' : 'gray';
    ctx.beginPath(); ctx.arc(S.trafficLight.x, S.trafficLight.y+24, 6,0,Math.PI*2); ctx.fill();
  }

  // sign (stop/speed)
  if (S.sign) {
    if (S.sign.type === 'stop') {
      ctx.fillStyle = 'red'; ctx.fillRect(S.sign.x, S.sign.y, 18, 18);
      ctx.fillStyle = 'white'; ctx.font='10px sans-serif'; ctx.fillText('STOP', S.sign.x-2, S.sign.y+12);
    }
    if (S.sign.type === 'speed30') {
      ctx.fillStyle='white'; ctx.beginPath(); ctx.arc(S.sign.x+8, S.sign.y+8, 12,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='black'; ctx.font='12px sans-serif'; ctx.fillText('30', S.sign.x+2, S.sign.y+12);
    }
  }

  // pedestrians & cyclists
  if (S.pedestrian) { ctx.fillStyle='yellow'; ctx.fillRect(S.pedestrian.x, S.pedestrian.y, S.pedestrian.w, S.pedestrian.h); }
  if (S.cyclist) S.cyclist.draw();

  // npc (if stored as Car)
  if (S.npc && S.npc instanceof Car) S.npc.draw();
  // npc in roundabout stored differently
  if (S.npc && typeof S.npc.x === 'number' && S.npc.color) {
    ctx.fillStyle = S.npc.color; ctx.fillRect(S.npc.x-16, S.npc.y-8, 32, 16);
  }

  // player drawn on top
  if (S.player) S.player.draw();

  // HUD
  hud.innerHTML = `<strong>Nivå:</strong> ${levels[S.levelIndex].id} — ${levels[S.levelIndex].title} &nbsp; | &nbsp;
    <strong>Liv:</strong> ${S.lives} &nbsp; | &nbsp; <strong>Poäng:</strong> ${S.score}`;
}

// -- Game loop & logic
function loadLevel(idx) {
  if (idx < 0 || idx >= levels.length) { endGame(true); return; }
  S.levelIndex = idx;
  // reset dynamic scene items
  S.player = null; S.npc = null; S.cyclist = null; S.pedestrian = null;
  S.trafficLight = null; S.intersection = null; S.stopLine = null; S.crosswalk = null;
  S.roundabout = null; S.sign = null; S.speedLimit = null;
  S.brakeHoldStart = null; S.isReversing = false; S._stopHoldStart = null; S._introShown = false;
  S.level = levels[idx];
  S.level.setup();
  // small delay then show intro
  setTimeout(()=> {
    alert(`Nivå ${S.level.id}: ${S.level.title}\n\n${S.level.intro}`);
  }, 120);
}

function updateFrame() {
  if (!S.running) return;
  handleInputPerFrame();
  // level specific update
  if (S.level.update) S.level.update();
  // check level status
  if (S.level.check) {
    const res = S.level.check();
    if (res === 'fail') {
      S.lives--;
      if (S.lives <= 0) { endGame(false); return; }
      alert('Du bröt mot regeln. Försök igen.');
      loadLevel(S.levelIndex);
      return;
    } else if (res === 'success') {
      S.score += 100;
      alert('Bra! Nivån klar.');
      loadLevel(S.levelIndex + 1);
      return;
    }
  }
}

// adapted input handler wrapper that uses S.player physics
function handleInputPerFrame() {
  // reset brakeHoldStart if ArrowDown not pressed
  if (!keys['ArrowDown']) S.brakeHoldStart = null;

  // handle player inputs & physics
  if (S.player) handleInputPerFrame();
}

// prevent infinite recursion naming clash
function handleInputPerFrame() {
  if (!S.player) return;
  // gas
  if (keys['ArrowUp']) {
    S.player.speed += S.player.acc;
    if (S.player.speed > S.player.maxSpeed) S.player.speed = S.player.maxSpeed;
  }
  // brake & reverse
  if (keys['ArrowDown']) {
    if (!S.brakeHoldStart) S.brakeHoldStart = performance.now();
    const held = performance.now() - S.brakeHoldStart;
    if (held >= REVERSE_HOLD_MS) {
      // reverse engaged
      S.isReversing = true;
      S.player.speed -= S.player.acc * 0.9;
      if (S.player.speed < -S.player.maxReverse) S.player.speed = -S.player.maxReverse;
    } else {
      // normal brake
      S.player.speed -= S.player.brakePower;
      if (S.player.speed < 0) S.player.speed = 0;
    }
  } else {
    S.isReversing = false;
  }

  // lateral movement
  if (keys['ArrowLeft']) S.player.x -= 3;
  if (keys['ArrowRight']) S.player.x += 3;

  // clamp player's lateral position
  const minX = 320 + S.player.w/2;
  const maxX = 480 - S.player.w/2;
  S.player.x = Math.max(minX, Math.min(maxX, S.player.x));

  // update player movement (friction applies in Car.update)
  S.player.update();
}

// main animation loop
function loop() {
  if (!S.running) return;
  drawScene();
  updateFrame();
  requestAnimationFrame(loop);
}

// start / end helpers
function startGame() {
  menu.classList.add('hidden');
  gameDiv.classList.remove('hidden');
  gameOverDiv.classList.add('hidden');
  S.running = true;
  S.levelIndex = 0; S.lives = 3; S.score = 0;
  loadLevel(0);
  requestAnimationFrame(loop);
}
function endGame(won) {
  S.running = false;
  gameDiv.classList.add('hidden');
  gameOverDiv.classList.remove('hidden');
  finalText.textContent = won ? `Grattis! Du klarade spelet. Poäng: ${S.score}` : `Game Over. Poäng: ${S.score}`;
}

// attach buttons
if (startBtn) startBtn.addEventListener('click', startGame);
if (restartBtn) restartBtn.addEventListener('click', () => {
  menu.classList.remove('hidden');
  gameOverDiv.classList.add('hidden');
});

