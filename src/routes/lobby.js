const express = require('express');
const router = express.Router();
const { generateLobbyId, generatePlayerId, generateSessionToken } = require('../utils/idGenerator');
const { loadGame, saveGame, lobbyExists } = require('../services/persistenceService');

function authPlayer(game, playerId, token) {
  const player = game.players[playerId];
  return player && player.sessionToken === token;
}

function authHost(game, token) {
  const host = game.players[game.hostPlayerId];
  return host && host.sessionToken === token;
}

function getToken(req) {
  return req.headers['x-session-token'] || '';
}

// Find a wine across all players. Returns { playerId, wine } or null.
function findWine(game, wineId) {
  for (const [pid, p] of Object.entries(game.players)) {
    if (p.wines) {
      const wine = p.wines.find(w => w.id === wineId);
      if (wine) return { playerId: pid, player: p, wine };
    }
  }
  return null;
}

// POST /api/lobby — create lobby
router.post('/', (req, res) => {
  const { hostName, hostEmoji, lobbyName, hostParticipating = true } = req.body;
  if (hostParticipating) {
    if (!hostName || !hostName.trim()) return res.status(400).json({ error: 'Host name required.' });
    if (!hostEmoji) return res.status(400).json({ error: 'Host emoji required.' });
  }

  let lobbyId;
  do { lobbyId = generateLobbyId(); } while (lobbyExists(lobbyId));

  const hostPlayerId = generatePlayerId();
  const sessionToken = generateSessionToken();

  const game = {
    lobbyId,
    lobbyName: lobbyName || 'Blind Tasting',
    hostPlayerId,
    hostParticipating: !!hostParticipating,
    createdAt: new Date().toISOString(),
    players: {
      [hostPlayerId]: {
        id: hostPlayerId,
        name: hostParticipating ? hostName.trim() : '',
        emoji: hostParticipating ? hostEmoji : '🎩',
        participating: !!hostParticipating,
        joinedAt: new Date().toISOString(),
        sessionToken,
        wines: []
      }
    },
    guesses: {},
    scores: {},
    revealOrder: []
  };

  saveGame(lobbyId, game, true);
  res.json({ lobbyId, hostPlayerId, sessionToken });
});

// GET /api/lobby/:lobbyId — get lobby state
router.get('/:lobbyId', (req, res) => {
  const game = loadGame(req.params.lobbyId);
  if (!game) return res.status(404).json({ error: 'Lobby not found.' });

  const token = getToken(req);
  let currentPlayerId = null;
  for (const [pid, p] of Object.entries(game.players)) {
    if (p.sessionToken === token) { currentPlayerId = pid; break; }
  }

  const isHost = currentPlayerId && currentPlayerId === game.hostPlayerId;

  // Build filtered player list — exclude non-participating host from everyone else's view
  const players = {};
  for (const [pid, p] of Object.entries(game.players)) {
    const isSelf = pid === currentPlayerId;
    // Skip non-participating host unless they are looking at themselves
    if (!p.participating && p.participating !== undefined && !isSelf) continue;
    players[pid] = {
      id: p.id,
      name: p.name,
      emoji: p.emoji,
      participating: p.participating,
      joinedAt: p.joinedAt,
      wines: (p.wines || []).map(w => ({
        id: w.id,
        emoji: w.emoji,
        revealed: w.revealed,
        // Hide wine details (except name/emoji) for unrevealed wines not owned by current player
        name: (w.revealed || isSelf) ? w.name : null,
        vintage: (w.revealed || isSelf) ? w.vintage : null,
        type: (w.revealed || isSelf) ? w.type : null,
        varietals: (w.revealed || isSelf) ? w.varietals : null,
        country: (w.revealed || isSelf) ? w.country : null,
        region: (w.revealed || isSelf) ? w.region : null,
      }))
    };
  }

  // Build a flat wine map for easy frontend lookup: wineId -> { playerId, playerName, playerEmoji, wine }
  const wineMap = {};
  for (const [pid, p] of Object.entries(game.players)) {
    for (const w of (p.wines || [])) {
      wineMap[w.id] = {
        playerId: pid,
        playerName: p.name,
        playerEmoji: p.emoji,
        wineEmoji: w.emoji,
        revealed: w.revealed,
        wine: players[pid].wines.find(pw => pw.id === w.id)
      };
    }
  }

  // Current player's guesses (only their own)
  const myGuesses = game.guesses[currentPlayerId] || {};

  // guessStatus: wineId → array of playerIds who have submitted a guess
  // (reveals who has guessed but not what they guessed)
  const guessStatus = {};
  for (const [guessingPlayerId, guesses] of Object.entries(game.guesses || {})) {
    for (const wineId of Object.keys(guesses)) {
      if (!guessStatus[wineId]) guessStatus[wineId] = [];
      guessStatus[wineId].push(guessingPlayerId);
    }
  }

  res.json({
    lobbyId: game.lobbyId,
    lobbyName: game.lobbyName,
    hostPlayerId: game.hostPlayerId,
    hostParticipating: game.hostParticipating !== false,
    createdAt: game.createdAt,
    players,
    wineMap,
    scores: game.scores,
    revealOrder: game.revealOrder,
    currentPlayerId,
    isHost,
    myGuesses,
    guessStatus
  });
});

// PATCH /api/lobby/:lobbyId — rename lobby (host only)
router.patch('/:lobbyId', (req, res) => {
  const game = loadGame(req.params.lobbyId);
  if (!game) return res.status(404).json({ error: 'Lobby not found.' });
  if (!authHost(game, getToken(req))) return res.status(403).json({ error: 'Host only.' });

  const { lobbyName } = req.body;
  if (!lobbyName || !lobbyName.trim()) return res.status(400).json({ error: 'Lobby name required.' });

  game.lobbyName = lobbyName.trim();
  saveGame(game.lobbyId, game);
  res.json({ lobbyName: game.lobbyName });
});

// POST /api/lobby/:lobbyId/join — join lobby
router.post('/:lobbyId/join', (req, res) => {
  const game = loadGame(req.params.lobbyId);
  if (!game) return res.status(404).json({ error: 'Lobby not found.' });

  const { name, emoji } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name required.' });
  if (!emoji) return res.status(400).json({ error: 'Emoji required.' });

  const playerId = generatePlayerId();
  const sessionToken = generateSessionToken();

  game.players[playerId] = {
    id: playerId,
    name: name.trim(),
    emoji,
    joinedAt: new Date().toISOString(),
    sessionToken,
    wines: []
  };

  saveGame(game.lobbyId, game);
  res.json({ playerId, sessionToken });
});

module.exports = { router, authPlayer, authHost, getToken, findWine };
