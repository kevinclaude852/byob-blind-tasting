const express = require('express');
const router = express.Router();
const { generateLobbyId, generatePlayerId, generateSessionToken } = require('../utils/idGenerator');
const { loadGame, saveGame, lobbyExists } = require('../services/persistenceService');
const { normaliseRules, validateRules } = require('../utils/rulesNormaliser');
const { DEFAULT_RULES_PRESET } = require('../utils/ruleConstants');

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

// Derive gameMode / revealPolicy from stored game (backward compat with old hostParticipating flag)
function getGameMode(game) {
  return game.gameMode ?? (game.hostParticipating === false ? 'hostPrepares' : 'byob');
}
function getRevealPolicy(game) {
  return game.revealPolicy ?? 'hostOnly';
}

// POST /api/lobby — create lobby
router.post('/', (req, res) => {
  const { hostName, hostEmoji, lobbyName, gameMode: rawGameMode, revealPolicy: rawRevealPolicy, hostParticipating, rules } = req.body;

  // Derive gameMode with legacy compat (old clients may send hostParticipating: false)
  let gameMode = rawGameMode || (hostParticipating === false ? 'hostPrepares' : 'byob');
  if (!['byob', 'hostPrepares'].includes(gameMode)) gameMode = 'byob';

  let revealPolicy = rawRevealPolicy || 'hostOnly';
  if (gameMode === 'hostPrepares') revealPolicy = 'hostOnly'; // not applicable in this mode
  if (!['hostOnly', 'ownerOrHost'].includes(revealPolicy)) revealPolicy = 'hostOnly';

  // Both modes require a named host
  if (!hostName || !hostName.trim()) return res.status(400).json({ error: 'Host name required.' });
  if (!hostEmoji) return res.status(400).json({ error: 'Host emoji required.' });

  // Validate and normalise rules
  let normalisedRules;
  if (rules) {
    const ruleErrors = validateRules(rules);
    if (ruleErrors.length) return res.status(400).json({ errors: ruleErrors });
    normalisedRules = normaliseRules(rules);
  } else {
    normalisedRules = JSON.parse(JSON.stringify(DEFAULT_RULES_PRESET));
  }

  let lobbyId;
  do { lobbyId = generateLobbyId(); } while (lobbyExists(lobbyId));

  const hostPlayerId = generatePlayerId();
  const sessionToken = generateSessionToken();

  const game = {
    lobbyId,
    lobbyName: lobbyName || 'Blind Tasting',
    hostPlayerId,
    gameMode,
    revealPolicy,
    rules: normalisedRules,
    createdAt: new Date().toISOString(),
    players: {
      [hostPlayerId]: {
        id: hostPlayerId,
        name: hostName.trim(),
        emoji: hostEmoji,
        // In hostPrepares the host is the wine provider, not a guesser — excluded from leaderboard
        participating: gameMode !== 'hostPrepares',
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
  const gameMode = getGameMode(game);
  const revealPolicy = getRevealPolicy(game);

  // Build filtered player list.
  // In hostPrepares mode, the host (participating=false) is included for all players so guests
  // can see and guess the host's wines. In BYOB mode, non-participating players are excluded.
  const players = {};
  for (const [pid, p] of Object.entries(game.players)) {
    const isSelf = pid === currentPlayerId;
    if (!p.participating && p.participating !== undefined && !isSelf && gameMode !== 'hostPrepares') continue;
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
        revealAt: w.revealAt || null,
        name:     (w.revealed || isSelf) ? w.name     : null,
        vintage:  (w.revealed || isSelf) ? w.vintage  : null,
        type:     (w.revealed || isSelf) ? w.type     : null,
        varietals:(w.revealed || isSelf) ? w.varietals: null,
        country:  (w.revealed || isSelf) ? w.country  : null,
        region:   (w.revealed || isSelf) ? w.region   : null,
        abv:      (w.revealed || isSelf) ? w.abv      : null,
        price:    (w.revealed || isSelf) ? w.price     : null,
      }))
    };
  }

  // Build a flat wine map for easy frontend lookup
  const wineMap = {};
  for (const [pid, p] of Object.entries(game.players)) {
    for (const w of (p.wines || [])) {
      wineMap[w.id] = {
        playerId: pid,
        playerName: p.name,
        playerEmoji: p.emoji,
        wineEmoji: w.emoji,
        revealed: w.revealed,
        wine: players[pid]?.wines.find(pw => pw.id === w.id)
      };
    }
  }

  const myGuesses = game.guesses[currentPlayerId] || {};

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
    gameMode,
    revealPolicy,
    // Keep hostParticipating for backward compat with old cached clients
    hostParticipating: gameMode !== 'hostPrepares',
    rules: normaliseRules(game.rules),
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

module.exports = { router, authPlayer, authHost, getToken, findWine, getGameMode, getRevealPolicy };
