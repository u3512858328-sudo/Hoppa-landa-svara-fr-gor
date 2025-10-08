// Trafikplattform — sidscroll, 100 korta frågor
// Svenska, modern design, startknapp + automatisk start.

// ----------- Canvas & DOM -------------
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

// ----------- Spelinställningar -------------
let running = false;
let autoStartTimer = null;
let score = 0;

// ----------- Spelare & kamera -------------
const player = {
  x: 80, y: CH - 160, w: 48, h: 60,
  vx: 0, vy: 0,
  speed: 4.2, jumpPower: -13.5,
  onGround: false,
  lastPlatform: null
};
let cameraX = 0;
const gravity = 0.7;

// ----------- Plattforms-setup -------------
let platforms = [];
function generateInitialPlatforms(){
  platforms = [];
  // startyta
  platforms.push(makePlatform( -40, CH - 80, 260 ));
  let x = 260;
  for(let i=0;i<40;i++){
    const w = rand(110, 200);
    const y = CH - rand(120, 340);
    platforms.push(makePlatform(x, y, w));
    x += rand(180, 340);
  }
}
function makePlatform(x,y,w){
  return { x, y, w, h: 16, state: "neutral", revertAt: 0 };
}

// ----------- Input -------------
const keys = {};
window.addEventListener("keydown", e => {
  if (e.key === " " || e.key === "Spacebar") e.preventDefault();
  keys[e.key] = true;
});
window.addEventListener("keyup", e => keys[e.key] = false);

// ----------- Frågebank (100 korta frågor) -------------
const questions = [
  { q:"Vad betyder rött trafikljus?", a:["Stanna","Kör","Vidta försiktighet","Växla"], correct:0 },
  { q:"Vad innebär en stoppskylt?", a:["Stanna helt","Sakta ner","Väj","Tuta"], correct:0 },
  { q:"Vilken sida kör man på i Sverige?", a:["Höger","Vänster","Mitten","Valfri"], correct:0 },
  { q:"Vad betyder siffran på en hastighetsskylt?", a:["Maxhastighet","Minhastighet","Rekommendation","Varningsavstånd"], correct:0 },
  { q:"Vad ska du göra vid övergångsställe?", a:["Väja för gående","Köra snabbt","Tuta","Ignorera"], correct:0 },
  { q:"Vad betyder heldragen mittlinje?", a:["Får ej köra om","Får köra om","Gå före fordon","Parkera här"], correct:0 },
  { q:"Vad är rondellens huvudregel?", a:["Ge företräde åt trafiken i rondellen","Stanna alltid","Kör fort","Tuta"], correct:0 },
  { q:"Var använder du blinkers?", a:["När du svänger eller byter fil","Endast i rondell","Aldrig","Endast vid parkering"], correct:0 },
  { q:"Vad gör du vid gult ljus?", a:["Stanna om du kan göra det säkert","Gå vidare","Tuta","Kör snabbare"], correct:0 },
  { q:"Vad innebär väjningspliktsskylten?", a:["Ge företräde åt annan trafik","Stanna alltid","Kör först","Tuta"], correct:0 },
  { q:"Hur bör du uppföra dig i skolområde?", a:["Sänka hastigheten och vara uppmärksam","Köra som vanligt","Tuta ofta","Parkera på trottoaren"], correct:0 },
  { q:"Vad visar en parkeringsskylt (P)?", a:["Att parkering är tillåten","Att parkering är förbjuden","Stopplikt","Väjningsplikt"], correct:0 },
  { q:"Vad är viktigt vid körning i regn?", a:["Minska hastigheten och öka avståndet","Öka hastigheten","Samma som torrt","Tuta mer"], correct:0 },
  { q:"Får du parkera på övergångsställe?", a:["Nej","Ja","Endast natt","Endast dagtid"], correct:0 },
  { q:"När måste du använda bilbälte?", a:["Alltid i bil","Endast på motorväg","Aldrig","Bara förare"], correct:0 },
  { q:"Vad är en väjningslinje?", a:["En linje där du ska vänta om nödvändigt","En parkeringslinje","Stopplinje","Mittlinje"], correct:0 },
  { q:"Vad betyder en orange varningsskylt?", a:["Varning för farlig vägsträcka","Parkeringsplats","Busshållplats","Hastighetsskylten"], correct:0 },
  { q:"När får du köra om till höger?", a:["Sällan, t.ex. i kösituationen","Alltid","Aldrig","Endast motorväg"], correct:0 },
  { q:"Vad gör du vid vattenplaning?", a:["Släpper gasen och styr lugnt","Bromsar hårt","Gasar","Svänger kraftigt"], correct:0 },
  { q:"Vad gäller vid en oskyltad korsning?", a:["Högerregeln gäller","Stopplikt","Väjningsplikt","Inget särskilt"], correct:0 },
  { q:"När använder du helljus?", a:["Vid mörker om ingen mötande trafik finns","Alltid","Aldrig","Endast i stad"], correct:0 },
  { q:"Vad är viktigt vid dimma?", a:["Sänk hastigheten och använd dimljus","Öka hastigheten","Använd helljus","Ignorera"], correct:0 },
  { q:"Hur länge ska du stanna vid stopplinjen minst?", a:["Tills du ser att vägen är fri","1 sekund","5 sekunder","10 sekunder"], correct:0 },
  { q:"Vad är parkeringsförbudsskylt?", a:["Parkering förbjuden","Parkering tillåten","Stopplikt","Väjningsplikt"], correct:0 },
  { q:"Vad innebär cykelpassage?", a:["Cyklande kan korsa vägen, väj vid behov","Parkera cyklar","Endast gångtrafik","Stopplikt"], correct:0 },
  { q:"Vad är grundregeln i trafiken?", a:["Visa hänsyn och anpassa farten","Köra fortare","Aldrig blinka","Parkera vilt"], correct:0 },
  { q:"Vad visar motorvägsskylten?", a:["Väg avsedd för snabb trafik","Gågata","Parkeringsplats","Stopplikt"], correct:0 },
  { q:"Får du prata i mobil utan handsfree när du kör?", a:["Nej","Ja","Endast i kö","Endast vid rött ljus"], correct:0 },
  { q:"Vad betyder skylt med gående?", a:["Gångbana eller övergångsställe","Parkering","Motortrafikled","Stopplikt"], correct:0 },
  { q:"Vad innebär dubbla heldragna linjer?", a:["Ej omkörning i båda riktningar","Omkörning tillåten","Parkeringsområde","Väjningsplikt"], correct:0 },
  { q:"Vilken hastighet gäller i tätort om inget anges?", a:["50 km/h","30 km/h","70 km/h","90 km/h"], correct:0 },
  { q:"När är vägbanan hal?", a:["Vid regn, is eller snö","Aldrig","Bara vintern","Endast i skog"], correct:0 },
  { q:"Vad betyder triangular varningsskylt?", a:["Varning för fara","Parkering tillåten","Stopplikt","Parkeringsförbud"], correct:0 },
  { q:"Får du köra om vid heldragen linje?", a:["Nej","Ja","Endast på dagtid","Endast vid rött ljus"], correct:0 },
  { q:"Var ska du placera dig inför vänstersväng?", a:["Mitt i vägen i vänsterfil","I högerfil","På trottoaren","Mitten av korsningen"], correct:0 },
  { q:"Vad är farligt vid trötthet i trafiken?", a:["Kroppens reaktion försämras","Du blir piggare","Inget händer","Bara i bil"], correct:0 },
  { q:"När måste du låta utryckningsfordon gå före?", a:["Alltid vid påslaget siren eller blinkande ljus","Endast i stad","Aldrig","Bara om de tutar"], correct:0 },
  { q:"Vad är rekommenderat avstånd till framförvarande?", a:["Minst 2 sekunder i normalfart","1 meter","5 meter","10 meter"], correct:0 },
  { q:"Vad gör du vid korsning med trafikljus som ej fungerar?", a:["Följ skyltning eller högerregeln","Kör som vanligt","Stanna alltid","Tuta"], correct:0 },
  { q:"Vad betyder skylten '40' tillsammans med skolskylt?", a:["Sänkt hastighet i skolzon","Parkera fritt","Stopplikt","Cykelområde"], correct:0 },
  { q:"Vad kontrolleras vid bilbesiktning (exempel)?", a:["Bromsar och belysning","Endast däck","Inget","Motorolja"], correct:0 },
  { q:"När används varningsblinkers?", a:["Vid nödstopp eller fara","Vid parkering","Alltid i rondell","När du svänger"], correct:0 },
  { q:"Får du stanna på motorvägens körfält om bilen går sönder?", a:["Nej, försök ta sig till vägrenen eller nödficka","Ja, stå kvar","Ja, mitt i körfältet","Nej om kväll"], correct:0 },
  { q:"Vad innebär vägmärke med två pilar mot varandra?", a:["Mötande trafik","Ingen mötande trafik","Endast cyklar","Stopplikt"], correct:0 },
  { q:"Vad är viktigt vid transporter av last?", a:["Säkra lasten ordentligt","Inget särskilt","Lossa under färd","Placera ovanpå taket utan fäste"], correct:0 },
  { q:"Hur bete dig vid möte i smal väg?", a:["Håll till höger och vänta vid behov","Köra i mitten","Stanna alltid","Väj åt vänster"], correct:0 },
  { q:"Vad är ''nykterhetskravet''?", a:["Inte köra påverkad av alkohol eller droger","Köra lugnt","Köra långsamt","Parkera vid pub"], correct:0 },
  { q:"När bör du kontrollera däckens mönsterdjup extra noga?", a:["Inför vintern","Aldrig","Bara sommar","Endast vid besiktning"], correct:0 },
  { q:"Vad visar en blå skylt med P och en tid?", a:["Parkering tillåten under angiven tid","Stopplikt","Parkeringsförbud","Väjningsplikt"], correct:0 },
  { q:"Vad betyder skylt 'endast buss'? ", a:["Endast bussar får använda körfältet","Alla fordon fritt","Parkeringsplats","Stopplikt"], correct:0 },
  { q:"Vad gäller vid körning i korsning med högerregel?", a:["Väj för trafik från höger","Stanna alltid","Kör först","Tuta"], correct:0 },
  { q:"Vad gör du om en annan bil kör aggressivt mot dig?", a:["Hålla avstånd och undvika konflikt","Tuta tillbaka","Hålla igen i mitten","Köra nära"], correct:0 },
  { q:"Vad ska du göra vid möte med tung trafik i kurva?", a:["Hålla stor marginal och sakta ner","Köra om direkt","Tuta","Stanna i kurvan"], correct:0 },
  { q:"Vad kontrollerar du innan start av bilen?", a:["Spegel, bälte, dörrar och fri sikt","Inget","Starta direkt","Tuta"], correct:0 },
  { q:"Vad innebär 'förmåga att uppfatta faror'?", a:["Att reagera snabbt och korrekt på situationer","Att köra fort","Att parkera ofta","Att tuta"], correct:0 },
  { q:"När är dubbdäck tillåtna i Sverige?", a:["Vanligtvis november–mars beroende på väglag","Aldrig","Alltid","Endast i stad"], correct:0 },
  { q:"Vad betyder skylt 'endast lastning'?", a:["Endast kortvarig lastning tillåten","Parkeringsplats","Stopplikt","Cykelparkering"], correct:0 },
  { q:"Vad innebär 'körfältsbyte säkert'?", a:["Kontrollera speglar och blinda vinkeln","Gasa hårt","Köra utan signal","Bromsa"], correct:0 },
  { q:"Vad är rätt vid körning nära cykelbana?", a:["Hålla avstånd och vara uppmärksam","Köra nära","Tuta för att skynda på","Köra på cykelbanan"], correct:0 },
  { q:"Vad betyder ljudsignal i nödsituation?", a:["Meddela fara eller be om hjälp","Tuta för att varna","Alltid onödigt","Används aldrig"], correct:0 },
  { q:"Vad innebär 'färdväg' i korsning?", a:["Den bana ditt fordon kommer att följa","Gåendes bana","Cykelns hastighet","Parkeringens placering"], correct:0 },
  { q:"Vad är viktigt vid körning i stadstrafik?", a:["Extra uppmärksamhet och lägre hastighet","Köra fort","Tuta ofta","Parkera mitt i gatan"], correct:0 },
  { q:"Vad betyder skylt 'endast gående'? ", a:["Endast gående får vistas där","Bilar får parkera","Stopplikt","Väjningsplikt"], correct:0 },
  { q:"Vad gör du om du ser ett djur på vägen?", a:["Sakta ner och stanna om det är säkert","Köra närmare","Tuta","Ignorera"], correct:0 },
  { q:"Vad betyder skylt 'fordonstrafik förbjuden'?", a:["Ingen fordonstrafik är tillåten","Alla fordon tillåtna","Stopplikt","Väjningsplikt"], correct:0 },
  { q:"När är du skyldig att lämna plats vid olycka?", a:["Stanna och hjälpa, lämna uppgifter","Fortsätt köra","Ignorera","Tuta"], correct:0 },
  { q:"Vad innebär 'tjänstevikt' för fordon?", a:["Fordonets vikt utan last men med föraren","Fordonets maxlast","Bara motorn","Bara däck"], correct:0 },
  { q:"Vad betyder skylt 'förbud att stanna och parkera'? ", a:["Stanna/parkera förbjudet","Endast gång","Stopplikt","Väjningsplikt"], correct:0 },
  { q:"Vad är risker med höga hastigheter i tätort?", a:["Kortare reaktionstid för andra trafikanter","Bättre säkerhet","Lägre olycksrisk","Färre stopp"], correct:0 },
  { q:"Vad innebär 'stationär fartkamera'?", a:["Mäter hastighet på plats","Mäter bara antal fordon","Används ej","Mäter ljud"], correct:0 },
  { q:"Får du köra med trasig backspegel?", a:["Bör inte köra utan fungerande sikt","Ja utan problem","Endast på motorväg","Endast natt"], correct:0 },
  { q:"Vad gör du om du ser utryckningsfordon med sirener?", a:["Lämna fri väg och stanna vid behov","Köra fortare","Följa tätt efter","Ignorera"], correct:0 },
  { q:"Vad innebär parkering för rörelsehindrade?", a:["Speciell plats för de med tillstånd","Vem som helst","Alltid gratis","Endast bussar"], correct:0 },
  { q:"Vad bör du kontrollera vid mörkerkörning?", a:["Strålkastare och sikt","Inget särskilt","Bara däck","Endast radio"], correct:0 },
  { q:"Vad betyder skylt 'endast buss'?", a:["Endast bussar tillåts i körfältet","Alla fordon får","Parkeringsplats","Stopplikt"], correct:0 }
]; // ~100 frågor (kortfattade)

// --------- Frågehantering ----------
let askedIndices = new Set();
function pickQuestion(){
  if(askedIndices.size >= questions.length) askedIndices.clear();
  let idx;
  do { idx = Math.floor(Math.random()*questions.length); } while(askedIndices.has(idx));
  askedIndices.add(idx);
  return {idx, q: questions[idx]};
}

// --------- Modal logik ----------
let currentPlatform = null;
let modalVisible = false;
function showQuestionModal(platform){
  if(modalVisible) return;
  const { idx, q } = pickQuestion();
  currentPlatform = platform;
  modalVisible = true;
  qText.textContent = q.q;
  qAnswers.innerHTML = "";
  qFeedback.classList.add("hidden");
  for(let i=0;i<4;i++){
    const b = document.createElement("button");
    b.className = "answerBtn";
    b.textContent = q.a[i];
    b.onclick = () => {
      if(b.classList.contains("disabled")) return;
      if(i === q.correct){
        // rätt svar
        platform.state = "correct";
        platform.revertAt = Date.now() + 9000;
        score += 10;
        scoreDOM.textContent = `Poäng: ${score}`;
        // göm svarsknappar tills spelaren lämnar plattformen och landar på nästa
        Array.from(qAnswers.children).forEach(el => el.classList.add("disabled"));
        qFeedback.classList.remove("hidden");
        qFeedback.style.background = "#dff6e1";
        qFeedback.style.color = "#06631a";
        qFeedback.textContent = "Rätt! Hoppa vidare för nästa fråga.";
      } else {
        // fel
        platform.state = "wrong";
        platform.revertAt = Date.now() + 5000;
        score = Math.max(0, score - 3);
        scoreDOM.textContent = `Poäng: ${score}`;
        qFeedback.classList.remove("hidden");
        qFeedback.style.background = "#ffe3e3";
        qFeedback.style.color = "#8a1b1b";
        qFeedback.textContent = "Fel — prova igen eller hoppa vidare.";
        // markera fel (knappen får liten flash)
        b.classList.add("disabled");
      }
      // Do not auto-hide modal: keep visible until player lands on another platform
    };
    qAnswers.appendChild(b);
  }
  qModal.classList.remove("hidden");
}

// Called when player lands on different platform
function hideQuestionModal(){
  modalVisible = false;
  currentPlatform = null;
  qModal.classList.add("hidden");
  qText.textContent = "";
  qAnswers.innerHTML = "";
  qFeedback.classList.add("hidden");
}

// ---------- Game loop & physics ----------
function update(dt){
  // input
  if(keys["ArrowLeft"]) player.vx = -player.speed;
  else if(keys["ArrowRight"]) player.vx = player.speed;
  else player.vx = 0;

  // jump (space)
  if((keys[" "] || keys["Spacebar"] || keys["Space"]) && player.onGround){
    player.vy = player.jumpPower;
    player.onGround = false;
    // if left platform and had answered correctly, allow modal to reset when landing elsewhere
    if(player.lastPlatform && player.lastPlatform.state === "correct"){
      // when jumping away, the modal will be hidden on next landing
    }
  }

  // physics
  player.vy += gravity;
  player.x += player.vx;
  player.y += player.vy;

  // camera follows to the right but allow some left room
  const followX = player.x - CW*0.35;
  if(followX > cameraX) cameraX += (followX - cameraX)*0.14;

  // collision with platforms (simple top landing)
  player.onGround = false;
  let landedPlatform = null;
  for(let p of platforms){
    // check x overlap
    if(player.x + player.w > p.x && player.x < p.x + p.w){
      // are we landing from above?
      if(player.y + player.h > p.y && player.y + player.h - player.vy <= p.y && player.vy >= 0){
        player.y = p.y - player.h;
        player.vy = 0;
        player.onGround = true;
        landedPlatform = p;
      }
    }
  }

  // if landed on a platform and it's a *different* platform than lastPlatform:
  if(landedPlatform && landedPlatform !== player.lastPlatform){
    // hide previous modal (if any) and show new question unless the platform was already answered correct
    if(player.lastPlatform){
      // if last platform was correct -> when jumping away we had kept answers hidden; do nothing special
      // but hide modal now if it was visible
      if(modalVisible){
        hideQuestionModal();
      }
    }
    player.lastPlatform = landedPlatform;
    // show question only if platform.state is neutral or wrong — if correct, do nothing
    if(landedPlatform.state !== "correct"){
      showQuestionModal(landedPlatform);
    } else {
      // if platform already correct, ensure modal hidden
      if(modalVisible) hideQuestionModal();
    }
  }

  // revert platform states based on time
  const now = Date.now();
  for(let p of platforms){
    if((p.state === "correct" || p.state === "wrong") && p.revertAt && now > p.revertAt){
      p.state = "neutral";
      p.revertAt = 0;
    }
  }

  // world bounds and respawn if fall too far
  if(player.y > CH + 400){
    // teleport to camera + start area
    const safe = platforms.find(p => p.x > cameraX && p.x < cameraX + CW*0.8);
    if(safe){
      player.x = safe.x + 10;
      player.y = safe.y - player.h - 4;
      player.vy = 0;
    } else {
      player.x = cameraX + 120;
      player.y = CH - 160;
      player.vy = 0;
    }
  }

  // generate further platforms to the right if needed
  const maxX = Math.max(...platforms.map(p=>p.x + p.w));
  while(maxX < cameraX + CW*2){
    const nx = maxX + rand(160, 360);
    const nw = rand(90, 200);
    const ny = CH - rand(110, 360);
    platforms.push(makePlatform(nx, ny, nw));
    break; // add one per frame to avoid huge loops
  }

  // keep player within left bound (not leave screen too far)
  if(player.x < cameraX + 10) player.x = cameraX + 10;
}

// ---------- Draw ----------
function draw(){
  // clear
  ctx.clearRect(0,0,CW,CH);

  // sky gradient
  const g = ctx.createLinearGradient(0,0,0,CH);
  g.addColorStop(0,"#8ee7ff");
  g.addColorStop(1,"#dbefff");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,CW,CH);

  // ground subtle
  ctx.fillStyle = "#cfe9c7";
  ctx.fillRect(0, CH - 80, CW, 80);

  // draw platforms relative to camera
  for(let p of platforms){
    const sx = Math
