// ═══════════════════════════════════════════
//  OPEN TYCOON — Game Clock & Cron Tick
// ═══════════════════════════════════════════

const { queryOne, runAndSave } = require('../db/database');
const { pruneCompletedTasks } = require('./memory');

// In-game time state
let gameTime = {
  day: 1,
  hour: 9,
  minute: 0
};

// Start the cron loop (runs every 1 second real-time = 5 minutes game-time)
// 12 real seconds = 1 game hour.
// 288 real seconds = 24 game hours.
function startCron(broadcast) {
  loadSavedTime();

  setInterval(() => {
    tickClock(broadcast);
    
    // Check Manager AI (non-blocking)
    const { checkManagerAI } = require('../agents/manager-loop');
    checkManagerAI(broadcast).catch(e => console.error('Manager loop err:', e));
  }, 1000);
}

function loadSavedTime() {
  const row = queryOne("SELECT value FROM office_state WHERE key = 'game_time'");
  if (row?.value) {
    try {
      gameTime = JSON.parse(row.value);
    } catch(e){}
  }
}

function saveTime() {
  runAndSave("INSERT OR REPLACE INTO office_state (key, value) VALUES ('game_time', ?)", [JSON.stringify(gameTime)]);
}

function tickClock(broadcast) {
  gameTime.minute += 5;

  if (gameTime.minute >= 60) {
    gameTime.minute = 0;
    gameTime.hour += 1;
    onHourTick(broadcast);
  }

  if (gameTime.hour >= 24) {
    gameTime.hour = 0;
    gameTime.day += 1;
    onDayTick(broadcast);
  }

  // Periodic visual broadcast to keep client HUD updated
  if (gameTime.minute % 15 === 0) {
    broadcast({
      type: 'SERVER_TICK',
      payload: {
        time: formatTime(),
        day: gameTime.day
      }
    });
  }
}

// Every game hour (~12 real seconds)
function onHourTick(broadcast) {
  // Prune completed tasks from the UI backlog periodically
  if (gameTime.hour % 2 === 0) {
    pruneCompletedTasks();
  }

  saveTime();
}

// Every game day (~4.8 real minutes)
function onDayTick(broadcast) {
  broadcast({
    type: 'NOVO_DIA',
    payload: { day: gameTime.day }
  });
  saveTime();
}

function formatTime() {
  const hh = Math.floor(gameTime.hour).toString().padStart(2, '0');
  const mm = Math.floor(gameTime.minute).toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

module.exports = { startCron };
