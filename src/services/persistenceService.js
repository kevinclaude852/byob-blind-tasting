const fs = require('fs');
const path = require('path');

const GAMES_DIR = path.join(__dirname, '../../data/games');

// Ensure the games directory exists (e.g. on first deploy where data/games/ is gitignored)
if (!fs.existsSync(GAMES_DIR)) {
  fs.mkdirSync(GAMES_DIR, { recursive: true });
}

const cache = new Map();
const writeTimers = new Map();

function getGamePath(lobbyId) {
  return path.join(GAMES_DIR, `${lobbyId}.json`);
}

function loadGame(lobbyId) {
  if (cache.has(lobbyId)) return cache.get(lobbyId);
  const filePath = getGamePath(lobbyId);
  if (!fs.existsSync(filePath)) return null;
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  cache.set(lobbyId, data);
  return data;
}

function saveGame(lobbyId, data, immediate = false) {
  cache.set(lobbyId, data);
  if (immediate) {
    fs.writeFileSync(getGamePath(lobbyId), JSON.stringify(data, null, 2), 'utf8');
    return;
  }
  if (writeTimers.has(lobbyId)) clearTimeout(writeTimers.get(lobbyId));
  writeTimers.set(lobbyId, setTimeout(() => {
    fs.writeFileSync(getGamePath(lobbyId), JSON.stringify(data, null, 2), 'utf8');
    writeTimers.delete(lobbyId);
  }, 500));
}

function lobbyExists(lobbyId) {
  return cache.has(lobbyId) || fs.existsSync(getGamePath(lobbyId));
}

function listGames() {
  if (!fs.existsSync(GAMES_DIR)) return [];
  return fs.readdirSync(GAMES_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(GAMES_DIR, f), 'utf8'));
      return { lobbyId: data.lobbyId, lobbyName: data.lobbyName, createdAt: data.createdAt };
    });
}

module.exports = { loadGame, saveGame, lobbyExists, listGames };
