const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");

// Speldata
let game = {
  running: false,
  player: null
};

// Enkel bilklass
class Car {
  constructor(x, y, angle, color) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.color = color;
    this.width = 40;
    this.height = 20;
  }
  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

// Startknappen
startBtn.addEventListener("click", startGame);

function startGame() {
  game.running = true;
  game.player = new Car(150, 320, 0, "blue");
  requestAnimationFrame(gameLoop);
}

function gameLoop() {
  if (!game.running) return;

  drawScene();
  update();

  requestAnimationFrame(gameLoop);
}

function drawScene() {
  ctx.fillStyle = "#77a377";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Vägen
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

  // Rita bilen
  if (game.player) game.player.draw();
}

function update() {
  // Exempel: rör bilen framåt lite
  if (game.player) {
    game.player.x += 1;
  }
}
