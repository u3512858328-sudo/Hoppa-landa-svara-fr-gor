const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const questionContainer = document.getElementById("questionContainer");

const player = {
  x: 50,
  y: 300,
  width: 40,
  height: 40,
  color: "blue",
  dx: 0,
  dy: 0,
  speed: 3,
  jumpPower: 12,
  onPlatform: false
};

const gravity = 0.5;
let cameraX = 0;

let platforms = [];
for (let i = 0; i < 20; i++) {
  platforms.push({
    x: i * 150,
    y: 350 - (Math.random() * 100),
    width: 100,
    height: 20,
    answered: false,
    color: "gray"
  });
}

let keys = {};
let currentQuestion = null;
let answeredCorrect = false;
let askedIndices = new Set();

document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

// 100 trafikfrågor
let questions = [
  {
    q: "Vad gäller i en cirkulationsplats?",
    a: ["Kör alltid till höger", "Ge företräde åt höger", "Ge företräde åt vänster", "Väjningsplikt mot alla"],
    correct: 0
  },
  {
    q: "Vad är tillåtet att parkera?",
    a: ["På höger sida av vägen på en huvudled", "5 meter efter ett övergångsställe", "Strax efter en vägkorsning", "På vägrenen på en motortrafikled"],
    correct: 0
  },
  {
    q: "Vilken försäkring måste du minst ha på ditt fordon?",
    a: ["Delkasko försäkring", "Halvförsäkring", "Vagnskadeförsäkring", "Trafikförsäkring"],
    correct: 3
  },
  {
    q: "När får du göra en omkörning till höger?",
    a: ["Om bilen framför ska svänga till höger", "Om du ska köra om en moped", "Om fordonet framför är ett långsamtgående fordon (LGF)", "Precis innan en vägkorsning"],
    correct: 2
  },
  {
    q: "Vilket är det lägsta bötesbeloppet för fortkörning?",
    a: ["1500 kr", "1800 kr", "2000 kr", "2300 kr"],
    correct: 0
  },
  {
    q: "Vilken tidsvinst får du om du ökar hastigheten från 80 km/tim till 100 km/tim?",
    a: ["1,5 min / mil", "3 min / mil", "4,5 min / mil", "6 min / mil"],
    correct: 0
  },
  {
    q: "Vilket av följande påstående beskriver ett ekonomiskt körsätt?",
    a: ["Alltid försöka köra långsamt med låg växel", "Köra med monterad takbox för bättre aerodynamik", "Försöka hålla ett varvtal över 3000 varv/minut vid motorvägskörning", "Sträva efter att 'hoppa över' en växel vid uppväxling"],
    correct: 3
  },
  {
    q: "Vad innebär begreppet bruttovikt?",
    a: ["Fordonets vikt + last vid körtillfället", "Fordonets vikt - fordonets angivna maxlast", "Tjänstevikt + fordonets angivna maxlast", "Skattevikt + last vid körtillfället"],
    correct: 0
  },
  {
    q: "Vad är miljövänliga däck?",
    a: ["Vanliga däck", "Däck med mindre mönsterdjup", "Däck som är tillverkade utan högaromatiska oljor (HA-oljor)", "Däck med högre mönsterdjup"],
    correct: 2
  },
  {
    q: "Du har kört på ett husdjur. Vad ska du göra?",
    a: ["Inget speciellt, det klassas som ett litet djur så du behöver inte göra något", "Ring polisen", "Försök kontakta djurets ägare", "Kör vidare utan att stoppa"],
    correct: 2
  },
  {
    q: "Kan du bli dömd till fängelsestraff om du kör med en promillehalt mellan 0.2 - 1.0 promille?",
    a: ["Ja", "Nej, endast vid grovt rattfylleri", "Nej, oavsett promillehalt", "Ja, men endast om du orsakar en olycka"],
    correct: 0
  },
  {
    q: "Du har varit med och bevittnat en olycka och har nu blivit kallad att vittna i domstol. Måste du gå dit?",
    a: ["Ja", "Nej", "Endast om du känner för det", "Endast om du är säker på vad du såg"],
    correct: 0
  },
  {
    q: "Vad är det allvarligaste som kan hända om du bryter mot stopplikten?",
    a: ["Du kan få indraget körkort", "Du kan få höga böter", "Du kan få två års fängelse", "Inget, det är inte straffbart"],
    correct: 0
  },
  {
    q: "Du kör på en väg där vägarbete pågår. Ska du tänka på något?",
    a: ["Ja, öka farten för att snabbt åka förbi", "Ja, sänk farten och håll ett säkert avstånd till arbetarna", "Ja, kolla så att arbetarna verkligen jobbar och inte tar onödiga kafferaster", "Nej, inget särskilt"],
    correct: 1
  },
  {
    q: "Du måste fylla på spolarvätska. Var gör du det?",
    a: ["A = oljesticka", "B = oljepåfyllning", "C = kylarvätska", "D = spolarvätska"],
    correct: 3
  },
  {
    q: "Är det olagligt för en fotgängare att gå mot rött?",
    a: ["Ja", "Nej", "Ja, men endast om det inte finns trafik", "Ja, om det inte finns trafikljus"],
    correct: 0
  },
  {
    q: "Väg innebär lokaliseringsmärket?",
    a: ["Akutsjukhus", "Telefon", "Olycksdrabbad väg", "Hotell"],
    correct: 0
  },
  {
    q: "Vad är miljövänliga däck?",
    a: ["Vanliga däck", "Däck med mindre mönsterdjup", "Däck som är tillverkade utan högaromatiska oljor (HA-oljor)", "Däck med högre mönsterdjup"],
    correct: 2
  },
  {
    q: "Du har kört på ett husdjur. Vad ska du göra?",
    a: ["Inget speciellt, det klassas som ett litet djur så du behöver inte göra något", "Ring polisen", "Försök kontakta djurets ägare", "Kör vidare utan att stoppa"],
    correct: 2
  },
  {
    q: "Kan du bli dömd till fängelsestraff om du kör med en promillehalt mellan 0.2 - 1.0 promille?",
    a: ["Ja", "Nej, endast vid grovt rattfylleri", "Nej, oavsett promillehalt", "Ja, men endast om du orsakar en olycka"],
    correct: 0
  },
  {
    q: "Du har varit med och bevittnat en olycka och har nu blivit kallad att vittna i domstol. Måste du gå dit?",
    a: ["Ja", "Nej", "Endast om du känner för det", "Endast om du är säker på vad du såg"],
    correct: 0
  },
  {
    q: "Vad är det allvarligaste som kan hända om du bryter mot stopplikten?",
    a: ["Du kan få indraget körkort", "Du kan få höga böter", "Du kan få två års fängelse", "Inget, det är inte straffbart"],
    correct: 0
  },
  {
    q: "Du kör på en väg där vägarbete pågår. Ska du tänka på något?",
    a: ["Ja, öka farten för att snabbt åka förbi", "Ja, sänk farten och håll ett säkert avstånd till arbetarna", "Ja, kolla så att arbetarna verkligen jobbar och inte tar onödiga kafferaster", "Nej, inget särskilt"],
    correct: 1
  }
];

function getRandomQuestion() {
  if (askedIndices.size >= questions.length) askedIndices.clear();
  let index;
  do {
    index = Math.floor(Math.random() * questions.length);
  } while (askedIndices.has(index));
  askedIndices.add(index);
  return questions[index];
}

function showQuestion(qObj) {
  questionContainer.innerHTML = "";
  const qEl = document.createElement("div");
  qEl.textContent = qObj.q;
  questionContainer.appendChild(qEl);

  qObj.a.forEach((ans, i) => {
    const btn = document.createElement("button");
    btn.textContent = ans;
    btn.onclick = () => {
      if (i === qObj.correct) {
        answeredCorrect = true;
      } else {
        answeredCorrect = false;
      }
    };
    questionContainer.appendChild(btn);

::contentReference[oaicite:1]{index=1}
 
