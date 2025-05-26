// main.js

let songsData = [];
let gameSongs = [];
let currentSongIdx = 0;
let playerName = '';
let modeCount = 50;
let score = 0;
let guesses = [];
let usedYears = new Set();
let highscores = [];

const screens = {
  start: document.getElementById('start-screen'),
  game: document.getElementById('game-screen'),
  end: document.getElementById('end-screen'),
};

const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const playerNameInput = document.getElementById('player-name');
const gameModeInput = document.getElementById('game-mode');
const historyTableSection = document.getElementById('history-table-section');
const showHistoryBtn = document.getElementById('show-history-btn');
const highscoresList = document.getElementById('highscores-list');
const finalHighscoresList = document.getElementById('final-highscores-list');

// טען את השירים
fetch('songs_data.json')
  .then(res => res.json())
  .then(data => {
    songsData = data;
    loadHighscores();
    showHighscores();
  });

// פונקציה לאתחול משחק
function startGame() {
  playerName = playerNameInput.value.trim() || "שחקן אלמוני";
  modeCount = parseInt(gameModeInput.value, 10);

  // איפוס ערכים
  score = 0;
  guesses = [];
  usedYears = new Set();
  currentSongIdx = 0;
  historyTableSection.style.display = 'none';

  // בחר שירים רנדומליים עם שנים שונות
  gameSongs = [];
  let available = [...songsData];
  shuffleArray(available);

  for (let song of available) {
    if (!usedYears.has(song.year) && gameSongs.length < modeCount) {
      gameSongs.push(song);
      usedYears.add(song.year);
    }
    if (gameSongs.length === modeCount) break;
  }

  // עדכון תצוגה
  document.getElementById('score').textContent = 'ניקוד: 0';
  document.getElementById('progress').textContent = `שיר 1 מתוך ${modeCount}`;
  screens.start.style.display = 'none';
  screens.end.style.display = 'none';
  screens.game.style.display = '';
  document.getElementById('answer-result').textContent = '';
  showSong();
}

// הצג שיר למשחק
function showSong() {
  const song = gameSongs[currentSongIdx];
  document.getElementById('progress').textContent = `שיר ${currentSongIdx + 1} מתוך ${modeCount}`;
  document.getElementById('score').textContent = `ניקוד: ${score}`;
  document.getElementById('year-input').value = '';
  document.getElementById('answer-result').textContent = '';
  document.getElementById('next-song-btn').style.display = 'none';

  // הצג ברקוד
  const qr = new QRious({
    element: document.getElementById('qr-code'),
    value: song.apple_music,
    size: 110,
    background: 'white'
  });

  // לחצן האזנה
  document.getElementById('listen-btn').onclick = () => {
    window.open(song.apple_music, '_blank');
  };

  // הצג רמז (רק שם השיר, ללא אמן/שנה)
  document.getElementById('song-placeholder').textContent = `"${song.title}"`;

  // לחצן ניחוש
  document.getElementById('guess-btn').style.display = '';
  document.getElementById('guess-btn').onclick = handleGuess;
}

// קליטת ניחוש
function handleGuess() {
  const yearInput = document.getElementById('year-input');
  const yearGuess = parseInt(yearInput.value, 10);
  const song = gameSongs[currentSongIdx];
  if (!yearGuess || yearGuess < 1900 || yearGuess > 2025) {
    document.getElementById('answer-result').textContent = 'יש להכניס שנה תקינה';
    return;
  }

  // חישוב ניקוד
  const diff = Math.abs(song.year - yearGuess);
  let pts = 0;
  if (diff === 0) pts = 10;
  else if (diff <= 2) pts = 5;
  else if (diff === 3) pts = 2;

  score += pts;

  // שמירת ניחוש
  guesses.push({
    title: song.title,
    artist: song.artist,
    year: song.year,
    guess: yearGuess,
    diff,
    pts
  });

  // הצגת פידבק לשחקן
  document.getElementById('answer-result').innerHTML =
    `<span>התשובה הנכונה: <b>${song.artist} - ${song.title} (${song.year})</b> | קיבלת <b>${pts}</b> נק' (הפרש: ${diff})</span>`;
  document.getElementById('guess-btn').style.display = 'none';
  document.getElementById('next-song-btn').style.display = '';

  document.getElementById('next-song-btn').onclick = nextSong;
}

// שיר הבא או סיום
function nextSong() {
  currentSongIdx++;
  if (currentSongIdx >= gameSongs.length) {
    endGame();
  } else {
    showSong();
  }
}

// סיום משחק והצגת סטטיסטיקות
function endGame() {
  screens.game.style.display = 'none';
  screens.end.style.display = '';

  // ניקוד סופי
  document.getElementById('final-score').innerHTML = `<h2>צברת ${score} נקודות!</h2>`;
  // סטטיסטיקות
  let correct = guesses.filter(g => g.diff === 0).length;
  let near = guesses.filter(g => g.diff <= 2 && g.diff > 0).length;
  let far = guesses.filter(g => g.diff === 3).length;
  let tableRows = guesses
    .slice()
    .sort((a, b) => a.year - b.year)
    .map(g =>
      `<tr>
        <td>${g.title}</td>
        <td>${g.artist}</td>
        <td>${g.year}</td>
        <td>${g.guess}</td>
        <td>${g.diff}</td>
        <td>${g.pts}</td>
      </tr>`
    ).join('');
  document.getElementById('stats').innerHTML = `
    <div>תשובות מדויקות: <b>${correct}</b>, קרובות (עד 2 שנים): <b>${near}</b>, פיספוסים של 3 שנים: <b>${far}</b></div>
    <div style="margin-top:1em;">
      <table id="final-history-table">
        <thead>
          <tr>
            <th>שיר</th><th>אמן</th><th>שנה נכונה</th><th>ניחוש</th><th>הפרש</th><th>ניקוד</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>
  `;

  // עדכון שיאים
  saveHighscore(playerName, score, modeCount);
  loadHighscores();
  showHighscores(true);
}

// הצג/הסתר טבלת היסטוריה
showHistoryBtn.onclick = function() {
  if (historyTableSection.style.display === 'none') {
    renderHistoryTable();
    historyTableSection.style.display = '';
  } else {
    historyTableSection.style.display = 'none';
  }
};

// רינדור טבלת ניחושים
function renderHistoryTable() {
  let rows = guesses
    .slice()
    .sort((a, b) => a.year - b.year)
    .map(g =>
      `<tr>
        <td>${g.title}</td>
        <td>${g.artist}</td>
        <td>${g.year}</td>
        <td>${g.guess}</td>
        <td>${g.diff}</td>
        <td>${g.pts}</td>
      </tr>`
    ).join('');
  document.querySelector('#history-table tbody').innerHTML = rows;
}

// אתחול לחצן התחלה
startBtn.onclick = startGame;
restartBtn.onclick = function() {
  screens.end.style.display = 'none';
  screens.start.style.display = '';
  playerNameInput.value = '';
  document.getElementById('answer-result').textContent = '';
  document.getElementById('year-input').value = '';
};

// ערבוב מערך
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// שמירה וטעינה של שיאים מהדפדפן
function saveHighscore(name, score, mode) {
  let localScores = JSON.parse(localStorage.getItem('songgame_highscores') || '[]');
  localScores.push({ name, score, mode, date: new Date().toISOString() });
  // שמור 10 שיאים מובילים לכל מצב
  localScores = localScores.filter(x => x.mode == mode)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  localStorage.setItem('songgame_highscores', JSON.stringify(localScores));
}

function loadHighscores() {
  highscores = JSON.parse(localStorage.getItem('songgame_highscores') || '[]');
}

function showHighscores(finalScreen = false) {
  const renderList = arr => arr.map(
    (s, i) => `<li>${i+1}. ${s.name} - ${s.score} נק' [${s.mode} שירים]</li>`
  ).join('');
  if (finalScreen) {
    finalHighscoresList.innerHTML = renderList(highscores);
  } else {
    highscoresList.innerHTML = renderList(highscores);
  }
}

// אפשר גם עם אנטר בשדה שנה
document.getElementById('year-input').addEventListener('keydown', function(e){
  if (e.key === 'Enter') document.getElementById('guess-btn').click();
});
