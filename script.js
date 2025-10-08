const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startOverlay = document.getElementById("startOverlay");
const startBtn = document.getElementById("startBtn");
const scoreDOM = document.getElementById("score");
const qModal = document.getElementById("questionModal");
const qText = document.getElementById("qText");
const qAnswers = document.getElementById("qAnswers");
const qFeedback = document.getElementById("qFeedback");

const CW = canvas.width = 1000;
const CH = canvas.height = 560;

let running=false, score=0, cameraX=0, gravity=0.7;

const player={
  x:80, y:CH-160, w:48, h:60,
  vx:0, vy:0, speed:4.2, jumpPower:-13.5,
  onGround:false, lastPlatform:null
};

let platforms=[];

function rand(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
function makePlatform(x,y,w){ return { x,y,w,h:16,state:"neutral",revertAt:0 }; }

function generateInitialPlatforms(){
  platforms=[];
  platforms.push(makePlatform(-40, CH-80, 260));
  let x=260;
  for(let i=0;i<40;i++){
    const w=rand(110,200), y=CH-rand(120,340);
    platforms.push(makePlatform(x,y,w));
    x+=rand(180,340);
  }
}

const keys={};
window.addEventListener("keydown", e=>{ if([" ","Spacebar","Space"].includes(e.key)) e.preventDefault(); keys[e.key]=true; });
window.addEventListener("keyup", e=>keys[e.key]=false);

// --------- 100 frågor ---------
const questions=[
  {q:"Vad betyder ett rött trafikljus?", a:["Stanna","Kör","Vänta","Sväng"], correct:0},
  {q:"Vad innebär en stoppskylt?", a:["Stanna helt","Sakta ner","Väj","Kör vidare"], correct:0},
  {q:"Vilken sida kör man på i Sverige?", a:["Höger","Vänster","Mitten","Valfri"], correct:0},
  {q:"Vad betyder en hastighetsskylt med 50 km/h?", a:["Maxhastighet","Minhastighet","Rekommendation","Väjningsplikt"], correct:0},
  {q:"Vad ska du göra vid ett obevakat övergångsställe?", a:["Stanna för gående","Köra vidare","Tuta","Sakta ner"], correct:0},
  {q:"Vad innebär en heldragen mittlinje?", a:["Får ej köra om","Får köra om","Väj","Tuta"], correct:0},
  {q:"Vad är huvudregeln i en cirkulationsplats?", a:["Ge företräde åt trafik i rondellen","Stanna alltid","Kör fort","Tuta"], correct:0},
  {q:"När ska du använda blinkers?", a:["När du svänger eller byter fil","Aldrig","Endast i rondell","Endast vid parkering"], correct:0},
  {q:"Vad betyder ett gult trafikljus?", a:["Förbered för att stanna","Kör snabbt","Tuta","Sväng"], correct:0},
  {q:"Vad innebär väjningsplikt?", a:["Ge företräde åt annan trafik","Stanna alltid","Kör först","Tuta"], correct:0},
  // ...lägg till resterande frågor på samma sätt, totalt 100 frågor
];

let askedIndices = new Set();
function pickQuestion(){
  if(askedIndices.size >= questions.length) askedIndices.clear();
  let idx;
  do { idx = Math.floor(Math.random()*questions.length); } while(askedIndices.has(idx));
  askedIndices.add(idx);
  return { idx, q: questions[idx] };
}

let currentPlatform=null, modalVisible=false;

function showQuestionModal(platform){
  if(modalVisible) return;
  const { idx,q } = pickQuestion();
  currentPlatform=platform;
  modalVisible=true;
  qText.textContent=q.q;
  qAnswers.innerHTML="";
  qFeedback.classList.add("hidden");
  for(let i=0;i<4;i++){
    const b=document.createElement("button");
    b.className="answerBtn";
    b.textContent=q.a[i];
    b.onclick=()=>{
      if(b.classList.contains("disabled")) return;
      if(i===q.correct){
        platform.state="correct";
        platform.revertAt=Date.now()+9000;
        score+=10;
        scoreDOM.textContent=`Poäng: ${score}`;
        Array.from(qAnswers.children).forEach(el=>el.classList.add("disabled"));
        qFeedback.classList.remove("hidden");
        qFeedback.style.background="#dff6e1";
        qFeedback.style.color="#06631a";
        qFeedback.textContent="Rätt! Hoppa vidare för nästa fråga.";
      } else {
        platform.state="wrong";
        platform.revertAt=Date.now()+5000;
        score=Math.max(0,score-3);
        scoreDOM.textContent=`Poäng: ${score}`;
        qFeedback.classList.remove("hidden");
        qFeedback.style.background="#ffe3e3";
        qFeedback.style.color="#8a1b1b";
        qFeedback.textContent="Fel — prova igen eller hoppa vidare.";
        b.classList.add("disabled");
      }
    };
    qAnswers.appendChild(b);
  }
  qModal.classList.remove("hidden");
}

function hideQuestionModal(){
  modalVisible=false;
  currentPlatform=null;
  qModal.classList.add("hidden");
  qText.textContent="";
  qAnswers.innerHTML="";
  qFeedback.classList.add("hidden");
}

function update(){
  if(keys["ArrowLeft"]) player.vx=-player.speed;
  else if(keys["ArrowRight"]) player.vx=player.speed;
  else player.vx=0;

  if((keys[" "]||keys["Spacebar"]||keys["Space"]) && player.onGround){
    player.vy=player.jumpPower;
    player.onGround=false;
  }

  player.vy+=gravity;
  player.x+=player.vx;
  player.y+=player.vy;

  const followX=player.x-CW*0.35;
  if(followX>cameraX) cameraX+=(followX-cameraX)*0.14;

  player.onGround=false;
  let landedPlatform=null;
  for(let p of platforms){
    if(player.x+player.w>p.x && player.x<p.x+p.w){
      if(player.y+player.h>p.y && player.y+player.h-player.vy<=p.y && player.vy>=0){
        player.y=p.y-player.h;
        player.vy=0;
        player.onGround=true;
        landedPlatform=p;
      }
    }
  }

  if(landedPlatform && landedPlatform!==player.lastPlatform){
    if(player.lastPlatform && modalVisible) hideQuestionModal();
    player.lastPlatform=landedPlatform;
    if(landedPlatform.state!=="correct") showQuestionModal(landedPlatform);
  }

  const now=Date.now();
  for(let p of platforms){
    if((p.state==="correct"||p.state==="wrong") && p.revertAt && now>p.revertAt){
      p.state="neutral";
      p.revertAt=0;
    }
  }

  if(player.y>CH+400){
    const safe=platforms.find(p=>p.x>cameraX && p.x<cameraX+CW*0.8);
    if(safe){ player.x=safe.x+10; player.y=safe.y-player.h-4; player.vy=0; }
    else { player.x=cameraX+120; player.y=CH-160; player.vy=0; }
  }

  const maxX=Math.max(...platforms.map(p=>p.x+p.w));
  while(maxX<cameraX+CW*2){
    const nx=maxX+rand(160,360), nw=rand(90,200), ny=CH-rand(110,360);
    platforms.push(makePlatform(nx,ny,nw)); break;
  }

  if(player.x<cameraX+10) player.x=cameraX+10;
}

function draw(){
  ctx.clearRect(0,0,CW,CH);
  const g=ctx.createLinearGradient(0,0,0,CH); g.addColorStop(0,"#8ee7ff"); g.addColorStop(1,"#dbefff");
  ctx.fillStyle=g; ctx.fillRect(0,0,CW,CH);
  ctx.fillStyle="#cfe9c7"; ctx.fillRect(0,CH-80,CW,80);
  for(let p of platforms){
    let sx=p.x-cameraX, sy=p.y, sw=p.w, sh=p.h;
    ctx.fillStyle=p.state==="neutral"?"#888":p.state==="correct"?"#6bff9e":"#ff6b6b";
    ctx.fillRect(sx,sy,sw,sh);
  }
  ctx.fillStyle="#053047";
  ctx.fillRect(player.x-cameraX,player.y,player.w,player.h);
}

function loop(){ update(); draw(); requestAnimationFrame(loop); }

function startGame(){ generateInitialPlatforms(); startOverlay.style.display="none"; running=true; requestAnimationFrame(loop); }

startBtn.onclick=startGame;
setTimeout(()=>{if(!running) startGame()},4000);
