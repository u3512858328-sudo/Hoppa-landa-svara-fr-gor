/* script.js
   Vertikal väg (uppåt), kontroller, och nivåer (2..9)
   - Startknapp: #startBtn
   - Canvas: #gameCanvas
*/

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

// Game state
let state = {
  running: false,
  levelIndex: 0,      // starts at 0 => corresponds to levels[0] which is id 2
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
  introShown: false
};

// Basic car class (player + others)
class Car {
  constructor(x, y, color='blue', w=36, h=18) {
    this.x = x; // center x
    this.y = y; // center y
    this.color = color;
    this.w = w;
    this.h = h;
    this.speed = 0; // pixels per frame
    this.maxSpeed = 4.2; // tunable
    this.acc = 0.12;
    this.friction = 0.96;
    this.angle = 0; // for drawing orientation
  }
  update() {
    // Apply friction
    this.speed *= this.friction;
    if (Math.abs(this.speed) < 0.01) this.speed = 0;
    // Move vertically upwards (y decreases)
    this.y -= this.speed;
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
    // windows
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillRect(-this.w/2 + 6, -this.h/4, this.w/3, this.h/2);
    ctx.restore();
  }
  bbox() {
    return { x: this.x - this.w/2, y: this.y - this.h/2, w: this.w, h: this.h };
  }
}

// Collision simple AABB
function collides(a, b) {
  if (!a || !b) return false;
  return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
}

// --- Levels (2..9). All use vertical road (player moves up = y decreases).
const levels = [
  // LEVEL 2: Stopplikt vid korsning
  {
    id: 2, title: "Stopplikt",
    intro: "Stanna vid stopplinjen innan du kör in i korsningen.",
    setup: () => {
      // road center x = 400; lanes: right-lane x ~380
      state.player = new Car(380, 610, 'blue');
      state.stopLine = { x: 360, y: 360, w: 40, h: 6 }; // horizontal stop line across lane
      state.intersection = { x: 300, y: 300, w: 200, h: 120 }; // cross road is horizontal
      state.sign = { x: 320, y: 420, type: 'stop' }; // sign before stopline
      // require stop: player must reduce speed to near 0 while overlapping stopLine for at least 1s
      state._stopHoldStart = null;
    },
    update: () => {
      // nothing else moves
      // manage stopHold timer
      if (state.player && Math.abs(state.player.speed) < 0.2) {
        // is player overlapping stopLine?
        if (playerOverStopLine()) {
          if (!state._stopHoldStart) state._stopHoldStart = performance.now();
        } else {
          state._stopHoldStart = null;
        }
      } else {
        state._stopHoldStart = null;
      }
    },
    check: () => {
      // if player crosses into intersection with speed > small threshold -> fail
      if (state.player.y < state.intersection.y + state.intersection.h/2) {
        // entered intersection
        if (!(state._stopHoldStart && (performance.now() - state._stopHoldStart) >= 900)) {
          return 'fail';
        } else {
          return 'success';
        }
      }
      return null;
    }
  },

  // LEVEL 3: Hastighetsbegränsning (t.ex. 30 km/h ~ threshold)
  {
    id: 3, title: "Hastighetsbegränsning",
    intro: "Håll hastigheten under 30 km/h (ungefär 4 px/frame).",
    setup: () => {
      state.player = new Car(380, 610, 'blue');
      state.sign = { x: 320, y: 420, type: 'speed30' };
      state.speedLimit = 4.5; // px/frame threshold (tweak)
    },
    update: () => {},
    check: () => {
      if (state.player.speed > state.speedLimit) return 'fail';
      if (state.player.y < 100) return 'success';
      return null;
    }
  },

  // LEVEL 4: Övergångsställe (gående)
  {
    id: 4, title: "Övergångsställe",
    intro: "Stanna för gående som korsar på övergångsstället.",
    setup: () => {
      state.player = new Car(380, 610, 'blue');
      state.crosswalk = { x: 360, y: 360, w: 40, h: 8 };
      state.pedestrian = { x: 360, y: 340, w: 14, h: 28, walking: true, speed: 0.6 };
      state._pedWalkStarted = false;
    },
    update: () => {
      // pedestrian crosses horizontally (left-to-right)
      if (state.pedestrian && state.pedestrian.walking) {
        state.pedestrian.x += state.pedestrian.speed;
      }
    },
    check: () => {
      // if pedestrian collides with player -> fail
      if (rectCollidePlayer(state.pedestrian)) return 'fail';
      if (state.player.y < 100) return 'success';
      return null;
    }
  },

  // LEVEL 5: Cyklist i korsning
  {
    id: 5, title: "Cyklist",
    intro: "Lämna företräde åt cyklisten i korsningen.",
    setup: () => {
      state.player = new Car(380, 610, 'blue');
      state.intersection = { x: 300, y: 300, w: 200, h: 120 };
      state.cyclist = new Car(460, 320, 'green', 22, 12); // cyclist coming from right to left
      state.cyclist.speed = 1.6;
    },
    update: () => {
      if (state.cyclist) state.cyclist.x -= state.cyclist.speed;
    },
    check: () => {
      if (rectCollidePlayer(state.cyclist)) return 'fail';
      if (state.player.y < 100) return 'success';
      return null;
    }
  },

  // LEVEL 6: Högerregeln
  {
    id: 6, title: "Högerregeln",
    intro: "Lämna företräde åt fordon som kommer från höger i korsningen.",
    setup: () => {
      state.player = new Car(380, 610, 'blue');
      state.intersection = { x: 300, y: 300, w: 200, h: 120 };
      state.npc = new Car(460, 320, 'red'); // comes from right to left - has priority
      state.npc.speed = 1.8;
    },
    update: () => {
      if (state.npc) state.npc.x -= state.npc.speed;
    },
    check: () => {
      if (rectCollidePlayer(state.npc)) return 'fail';
      if (state.player.y < 100) return 'success';
      return null;
    }
  },

  // LEVEL 7: Trafikljus
  {
    id: 7, title: "Trafikljus",
    intro: "Stanna på rött. Kör på grönt.",
    setup: () => {
      state.player = new Car(380, 610, 'blue');
      state.trafficLight = { x: 380, y: 360, state: 'red', timer: 0 };
    },
    update: () => {
      if (state.trafficLight) {
        state.trafficLight.timer++;
        if (state.trafficLight.timer > 240) { // ~4 seconds at 60fps
          state.trafficLight.state = state.trafficLight.state === 'red' ? 'green' : 'red';
          state.trafficLight.timer = 0;
        }
      }
    },
    check: () => {
      // if player goes past the light while red -> fail
      if (state.trafficLight && state.trafficLight.state === 'red' && state.player.y < state.trafficLight.y + 10) return 'fail';
      if (state.player.y < 100) return 'success';
      return null;
    }
  },

  // LEVEL 8: Rondell
  {
    id: 8, title: "Rondell",
    intro: "Lämna företräde åt fordon som redan är i rondellen.",
    setup: () => {
      state.player = new Car(380, 610, 'blue');
      state.roundabout = { x: 380, y: 340, r: 70 };
      // npc will circle around
      state.npc = { angle: -Math.PI/2, speed: 0.02, color: 'red' };
    },
    update: () => {
      if (state.npc) {
        state.npc.angle += state.npc.speed;
        state.npc.x = state.roundabout.x + Math.cos(state.npc.angle) * state.roundabout.r;
        state.npc.y = state.roundabout.y + Math.sin(state.npc.angle) * state.roundabout.r;
      }
    },
    check: () => {
      let npcRect = state.npc ? { x: state.npc.x-16, y: state.npc.y-8, w:32, h:16 } : null;
      if (npcRect && rectCollidePlayer(npcRect)) return 'fail';
      if (state.player.y < 120) return 'success';
      return null;
    }
  },

  // LEVEL 9: Slutprov (kombination)
  {
    id: 9, title: "Slutprov",
    intro: "Kombination: stopplinje, gående, trafikljus och korsning.",
    setup: () => {
      state.player = new Car(380, 610, 'blue');
      state.stopLine = { x: 360, y: 430, w: 40, h: 6 };
      state.intersection = { x: 300, y: 320, w: 200, h: 120 };
      state.pedestrian = { x: 320, y: 300, w:14, h:28, speed:0.6 };
      state.trafficLight = { x: 380, y: 360, state: 'red', timer:0 };
      state._stopHoldStart = null;
    },
    update: () => {
      // traffic light
      if (state.trafficLight) {
        state.trafficLight.timer++;
        if (state.trafficLight.timer > 200) {
          state.trafficLight.state = state.trafficLight.state === 'red' ? 'green' : 'red';
          state.trafficLight.timer = 0;
        }
      }
      // pedestrian
      if (state.pedestrian) state.pedestrian.x += state.pedestrian.speed;
      // stop hold
      if (state.player && Math.abs(state.player.speed) < 0.2 && playerOverStopLine()) {
        if (!state._stopHoldStart) state._stopHoldStart = performance.now();
      } else state._stopHoldStart = null;
    },
    check: () => {
      if (rectCollidePlayer(state.pedestrian)) return 'fail';
      if (state.trafficLight && state.trafficLight.state === 'red' && state.player.y < state.trafficLight.y + 10) return 'fail';
      // entering intersection requires previous stop hold
      if (state.player.y < state.intersection.y + state.intersection.h/2) {
        if (!(state._stopHoldStart && (performance.now() - state._stopHoldStart) >= 900)) return 'fail';
        return 'success';
      }
      return null;
    }
  }
];

// Utility: is player overlapping stop line (simple check)
function playerOverStopLine() {
  if (!state.stopLine || !state.player) return false;
  let p = state.player, s = state.stopLine;
  let bbox = p.bbox ? p.bbox() : { x: p.x - p.w/2, y: p.y - p.h/2, w: p.w, h: p.h };
  return !(bbox.x + bbox.w < s.x || bbox.x > s.x + s.w || bbox.y + bbox.h < s.y || bbox.y > s.y + s.h);
}
function rectCollidePlayer(rectLike) {
  if (!rectLike || !state.player) return false;
  let pbox = { x: state.player.x - state.player.w/2, y: state.player.y - state.player.h/2, w: state.player.w, h: state.player.h };
  return !(pbox.x + pbox.w < rectLike.x || pbox.x > rectLike.x + rectLike.w || pbox.y + pbox.h < rectLike.y || pbox.y > rectLike.y + rectLike.h);
}

// Controls
function handleInput() {
  if (!state.player) return;
  // Gas / broms
  if (keys['ArrowUp']) {
    state.player.speed += state.player.acc;
    if (state.player.speed > state.player.maxSpeed) state.player.speed = state.player.maxSpeed;
  }
  if (keys['ArrowDown']) {
    state.player.speed -= state.player.acc * 1.5;
    if (state.player.speed < 0) state.player.speed = 0;
  }
  // Sidostyrning (flytta i x)
  if (keys['ArrowLeft']) state.player.x -= 3;
  if (keys['ArrowRight']) state.player.x += 3;
  // keep player inside right-lane roughly
  state.player.x = Math.max(320, Math.min(440, state.player.x));
  // update movement
  state.player.update();
}

// Draw scene (vertical road up)
function draw() {
  // background
  ctx.fillStyle = '#77a377'; ctx.fillRect(0,0,canvas.width,canvas.height);
  // vertical road centered at x=380..420 (width 160)
  const roadLeft = 320, roadWidth = 160;
  ctx.fillStyle = '#555'; ctx.fillRect(roadLeft, 0, roadWidth, canvas.height);

  // lane separators: two lanes - draw white side lines and middle dashed
  ctx.strokeStyle = 'white'; ctx.lineWidth = 3;
  // left side
  ctx.beginPath(); ctx.moveTo(roadLeft,0); ctx.lineTo(roadLeft,canvas.height); ctx.stroke();
  // right side
  ctx.beginPath(); ctx.moveTo(roadLeft+roadWidth,0); ctx.lineTo(roadLeft+roadWidth,canvas.height); ctx.stroke();

  // middle dashed (vertical)
  ctx.strokeStyle = 'white'; ctx.lineWidth = 2;
  ctx.setLineDash([18,14]);
  ctx.beginPath(); ctx.moveTo(roadLeft+roadWidth/2,0); ctx.lineTo(roadLeft+roadWidth/2,canvas.height); ctx.stroke();
  ctx.setLineDash([]);

  // draw intersection if present (horizontal rectangle)
  if (state.intersection) {
    ctx.fillStyle = '#666';
    ctx.fillRect(state.intersection.x, state.intersection.y, state.intersection.w, state.intersection.h);
  }

  // draw stopline (horizontal white) if set
  if (state.stopLine) {
    ctx.fillStyle = 'white';
    ctx.fillRect(state.stopLine.x, state.stopLine.y, state.stopLine.w, state.stopLine.h);
  }

  // draw crosswalk
  if (state.crosswalk) {
    ctx.fillStyle = 'white';
    for (let i=0;i<6;i++){
      ctx.fillRect(state.crosswalk.x + i*8, state.crosswalk.y, 6, state.crosswalk.h);
    }
  }

  // roundabout
  if (state.roundabout) {
    ctx.fillStyle = '#777';
    ctx.beginPath();
    ctx.arc(state.roundabout.x, state.roundabout.y, state.roundabout.r, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#77a377';
    ctx.beginPath();
    ctx.arc(state.roundabout.x, state.roundabout.y, state.roundabout.r-30, 0, Math.PI*2);
    ctx.fill();
  }

  // traffic light
  if (state.trafficLight) {
    ctx.fillStyle = 'black';
    ctx.fillRect(state.trafficLight.x - 12, state.trafficLight.y - 6, 28, 56);
    ctx.fillStyle = state.trafficLight.state === 'red' ? 'red' : 'gray';
    ctx.beginPath(); ctx.arc(state.trafficLight.x, state.trafficLight.y, 6,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = state.trafficLight.state === 'green' ? 'green' : 'gray';
    ctx.beginPath(); ctx.arc(state.trafficLight.x, state.trafficLight.y + 20, 6,0,Math.PI*2); ctx.fill();
  }

  // signs: stop, speed
  if (state.sign) {
    if (state.sign.type === 'stop') {
      ctx.fillStyle = 'red'; ctx.fillRect(state.sign.x, state.sign.y, 18, 18);
      ctx.fillStyle='white'; ctx.font='10px sans-serif'; ctx.fillText('STOP', state.sign.x-4, state.sign.y+12);
    }
    if (state.sign.type === 'speed30') {
      ctx.fillStyle='white'; ctx.beginPath(); ctx.arc(state.sign.x+8, state.sign.y+8, 10,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='black'; ctx.font='10px sans-serif'; ctx.fillText('30', state.sign.x+3, state.sign.y+12);
    }
  }

  // pedestrians
  if (state.pedestrian) {
    ctx.fillStyle='yellow'; ctx.fillRect(state.pedestrian.x, state.pedestrian.y, state.pedestrian.w, state.pedestrian.h);
  }

  // cyclists: draw as small rectangles
  if (state.cyclist) state.cyclist.draw();

  // npc car (if object with x,y) draw accordingly
  if (state.npc && state.npc instanceof Car) state.npc.draw();
  if (state.npc && typeof state.npc.x === 'number' && state.npc.color) {
    // for roundabout npc stored differently
    ctx.fillStyle = state.npc.color; ctx.fillRect(state.npc.x-16, state.npc.y-8, 32, 16);
  }

  // player
  if (state.player) state.player.draw();

  // HUD
  hud.innerHTML = `<strong>Nivå:</strong> ${state.levelIndex+2} — ${state.level ? state.level.title : ''} &nbsp; | &nbsp;
    <strong>Liv:</strong> ${state.lives} &nbsp; | &nbsp; <strong>Poäng:</strong> ${state.score}`;
}

// Load level
function loadLevel(index) {
  state.levelIndex = index;
  if (index < 0 || index >= levels.length) {
    // finished all
    endGame(true);
    return;
  }
  // clear dynamic state
  state.player = null; state.npc = null; state.cyclist = null; state.pedestrian = null;
  state.trafficLight = null; state.intersection = null; state.stopLine = null;
  state.crosswalk = null; state.roundabout = null; state.sign = null; state.speedLimit = null;
  state._stopHoldStart = null;

  state.level = levels[index];
  state.level.setup();
  state.introShown = false;
  // show intro once
  setTimeout(()=> {
    if (!state.introShown) {
      alert(`Nivå ${state.level.id}: ${state.level.title}\n\n${state.level.intro}`);
      state.introShown = true;
    }
  }, 80);
}

// Update logic
function updateFrame() {
  if (!state.running) return;
  handleInput();
  // per-level updates
  if (state.level && state.level.update) state.level.update();
  // check result
  let res = state.level && state.level.check ? state.level.check() : null;
  if (res === 'fail') {
    state.lives--;
    if (state.lives <= 0) {
      endGame(false);
      return;
    } else {
      alert('Fel — du bröt regeln. Försök igen.');
      loadLevel(state.levelIndex);
      return;
    }
  } else if (res === 'success') {
    state.score += 100;
    alert('Bra! Nivån klar.');
    loadLevel(state.levelIndex + 1);
    return;
  }
}

// Input & physics
function handleInput() {
  if (!state.player) return;
  // accelerate / brake
  if (keys['ArrowUp']) {
    state.player.speed += state.player.acc;
    if (state.player.speed > state.player.maxSpeed) state.player.speed = state.player.maxSpeed;
  }
  if (keys['ArrowDown']) {
    state.player.speed -= state.player.acc * 1.6;
    if (state.player.speed < 0) state.player.speed = 0;
  }
  // lateral movement
  if (keys['ArrowLeft']) state.player.x -= 3;
  if (keys['ArrowRight']) state.player.x += 3;
  // clamp to road lanes
  state.player.x = Math.max(320 + state.player.w/2, Math.min(480 - state.player.w/2, state.player.x));
  // update player physics
  state.player.update();
}

// Main loop
function loop() {
  if (!state.running) return;
  draw();
  updateFrame();
  requestAnimationFrame(loop);
}

// Start / restart
function startGame() {
  menu.classList.add('hidden');
  gameDiv.classList.remove('hidden');
  gameOverDiv.classList.add('hidden');
  state.running = true;
  state.levelIndex = 0; state.lives = 3; state.score = 0;
  loadLevel(0); // levels[0] corresponds to id 2
  requestAnimationFrame(loop);
}
function endGame(won) {
  state.running = false;
  gameDiv.classList.add('hidden');
  gameOverDiv.classList.remove('hidden');
  finalText.textContent = won ? `Grattis! Du klarade spelet. Poäng: ${state.score}` : `Game over. Poäng: ${state.score}`;
}
startBtn.addEventListener('click', startGame);
if (restartBtn) restartBtn.addEventListener('click', () => {
  menu.classList.remove('hidden');
  gameOverDiv.classList.add('hidden');
});
