const express = require('express');
const router = express.Router({ mergeParams: true });
const path = require('path');
const fs = require('fs');
const { loadGame, saveGame } = require('../services/persistenceService');
const { calculateScore } = require('../services/scoringService');
const { validateGuess } = require('../utils/validation');
const { authHost, getToken, findWine } = require('./lobby');

let ioInstance = null;
function setIo(io) { ioInstance = io; }

// Active countdown timers: key = "lobbyId:wineId" -> NodeJS Timeout
const pendingTimers = new Map();

function getCurrentPlayer(game, token) {
  for (const [pid, p] of Object.entries(game.players)) {
    if (p.sessionToken === token) return pid;
  }
  return null;
}

// Core reveal logic — called both immediately and when a countdown fires
function doReveal(lobbyId, wineId) {
  const game = loadGame(lobbyId);
  if (!game) return;

  const found = findWine(game, wineId);
  if (!found || found.wine.revealed) return;

  const ownerPlayer = game.players[found.playerId];
  const wineInData = ownerPlayer.wines.find(w => w.id === wineId);
  wineInData.revealed = true;
  wineInData.revealAt = null; // clear countdown marker
  game.revealOrder.push(wineId);

  // Calculate scores for all guessers
  if (!game.scores[wineId]) game.scores[wineId] = {};
  for (const [guesserId, theirGuesses] of Object.entries(game.guesses)) {
    if (guesserId === found.playerId) continue;
    const guess = (theirGuesses || {})[wineId] || null;
    game.scores[wineId][guesserId] = calculateScore(wineInData, guess);
  }

  // Zero score for players who didn't guess (skip non-participating host)
  for (const [playerId, player] of Object.entries(game.players)) {
    if (playerId === found.playerId) continue;
    if (player.participating === false) continue;
    if (!game.scores[wineId][playerId]) {
      game.scores[wineId][playerId] = { varietal: 0, country: 0, region: 0, vintage: 0, total: 0 };
    }
  }

  saveGame(lobbyId, game, true);
  pendingTimers.delete(`${lobbyId}:${wineId}`);

  if (ioInstance) {
    ioInstance.to(lobbyId).emit('wine-revealed', {
      wineId,
      playerId: found.playerId,
      playerName: found.player.name,
      wine: wineInData,
      scores: game.scores[wineId]
    });
  }
}

// On server startup: re-schedule any countdowns that survived a restart
function rescheduleTimers() {
  const GAMES_DIR = path.join(__dirname, '../../data/games');
  if (!fs.existsSync(GAMES_DIR)) return;
  const files = fs.readdirSync(GAMES_DIR).filter(f => f.endsWith('.json'));
  for (const file of files) {
    try {
      const lobbyId = file.replace('.json', '');
      const game = loadGame(lobbyId);
      if (!game) continue;
      for (const player of Object.values(game.players)) {
        for (const wine of (player.wines || [])) {
          if (!wine.revealed && wine.revealAt) {
            const ms = wine.revealAt - Date.now();
            const key = `${lobbyId}:${wine.id}`;
            if (ms <= 0) {
              // Countdown already expired — reveal immediately
              doReveal(lobbyId, wine.id);
            } else if (!pendingTimers.has(key)) {
              pendingTimers.set(key, setTimeout(() => doReveal(lobbyId, wine.id), ms));
            }
          }
        }
      }
    } catch { /* skip corrupt game files */ }
  }
}

// PUT /api/lobby/:lobbyId/guess/:wineId — submit/update guess
router.put('/guess/:wineId', (req, res) => {
  const { lobbyId, wineId } = req.params;
  const game = loadGame(lobbyId);
  if (!game) return res.status(404).json({ error: 'Lobby not found.' });

  const currentPlayerId = getCurrentPlayer(game, getToken(req));
  if (!currentPlayerId) return res.status(403).json({ error: 'Forbidden.' });

  const currentPlayer = game.players[currentPlayerId];
  if (currentPlayer && currentPlayer.participating === false) {
    return res.status(403).json({ error: 'Non-participating host cannot submit guesses.' });
  }

  const found = findWine(game, wineId);
  if (!found) return res.status(404).json({ error: 'Wine not found.' });
  if (found.playerId === currentPlayerId) return res.status(400).json({ error: 'Cannot guess your own wine.' });
  if (found.wine.revealed) return res.status(400).json({ error: 'This wine has already been revealed.' });

  const guessData = req.body;
  const errors = validateGuess(guessData, found.playerId, currentPlayerId);
  if (errors.length) return res.status(400).json({ errors });

  if (!game.guesses[currentPlayerId]) game.guesses[currentPlayerId] = {};
  game.guesses[currentPlayerId][wineId] = {
    vintage: guessData.vintage || null,
    type: guessData.type || null,
    varietals: (guessData.varietals || []).filter(v => v.grape).map(v => ({ grape: v.grape })),
    country: guessData.country || null,
    region: guessData.region || null,
    submittedAt: new Date().toISOString()
  };

  saveGame(lobbyId, game);

  if (ioInstance) {
    ioInstance.to(lobbyId).emit('guess-submitted', { wineId, playerId: currentPlayerId });
  }

  res.json({ success: true });
});

// GET /api/lobby/:lobbyId/guess/:wineId — get my guess
router.get('/guess/:wineId', (req, res) => {
  const { lobbyId, wineId } = req.params;
  const game = loadGame(lobbyId);
  if (!game) return res.status(404).json({ error: 'Lobby not found.' });

  const currentPlayerId = getCurrentPlayer(game, getToken(req));
  if (!currentPlayerId) return res.status(403).json({ error: 'Forbidden.' });

  const guess = (game.guesses[currentPlayerId] || {})[wineId] || null;
  res.json({ guess });
});

// POST /api/lobby/:lobbyId/reveal/:wineId — host reveals a wine (immediately or after a countdown)
router.post('/reveal/:wineId', (req, res) => {
  const { lobbyId, wineId } = req.params;
  const game = loadGame(lobbyId);
  if (!game) return res.status(404).json({ error: 'Lobby not found.' });
  if (!authHost(game, getToken(req))) return res.status(403).json({ error: 'Host only.' });

  const found = findWine(game, wineId);
  if (!found) return res.status(404).json({ error: 'Wine not found.' });
  if (found.wine.revealed) return res.status(400).json({ error: 'Already revealed.' });

  const delayMinutes = Number(req.body?.delayMinutes) || 0;

  if (delayMinutes > 0) {
    // Countdown mode — store revealAt on wine and schedule server-side timer
    const ownerPlayer = game.players[found.playerId];
    const wineInData = ownerPlayer.wines.find(w => w.id === wineId);
    const revealAt = Date.now() + delayMinutes * 60 * 1000;
    wineInData.revealAt = revealAt;
    saveGame(lobbyId, game);

    // Cancel any existing timer for this wine before setting a new one
    const key = `${lobbyId}:${wineId}`;
    if (pendingTimers.has(key)) clearTimeout(pendingTimers.get(key));
    pendingTimers.set(key, setTimeout(() => doReveal(lobbyId, wineId), delayMinutes * 60 * 1000));

    if (ioInstance) {
      ioInstance.to(lobbyId).emit('wine-countdown-started', { wineId, revealAt });
    }

    return res.json({ success: true, revealAt });
  }

  // Immediate reveal
  doReveal(lobbyId, wineId);
  res.json({ success: true });
});

// DELETE /api/lobby/:lobbyId/reveal/:wineId — host cancels an active countdown
router.delete('/reveal/:wineId', (req, res) => {
  const { lobbyId, wineId } = req.params;
  const game = loadGame(lobbyId);
  if (!game) return res.status(404).json({ error: 'Lobby not found.' });
  if (!authHost(game, getToken(req))) return res.status(403).json({ error: 'Host only.' });

  const found = findWine(game, wineId);
  if (!found) return res.status(404).json({ error: 'Wine not found.' });
  if (found.wine.revealed) return res.status(400).json({ error: 'Wine already revealed.' });
  if (!found.wine.revealAt) return res.status(400).json({ error: 'No countdown active.' });

  // Cancel the scheduled timer
  const key = `${lobbyId}:${wineId}`;
  if (pendingTimers.has(key)) {
    clearTimeout(pendingTimers.get(key));
    pendingTimers.delete(key);
  }

  const ownerPlayer = game.players[found.playerId];
  const wineInData = ownerPlayer.wines.find(w => w.id === wineId);
  wineInData.revealAt = null;
  saveGame(lobbyId, game);

  if (ioInstance) {
    ioInstance.to(lobbyId).emit('wine-countdown-stopped', { wineId });
  }

  res.json({ success: true });
});

// GET /api/lobby/:lobbyId/scores
router.get('/scores', (req, res) => {
  const game = loadGame(req.params.lobbyId);
  if (!game) return res.status(404).json({ error: 'Lobby not found.' });
  if (game.revealOrder.length === 0) return res.json({ scores: {}, revealOrder: [], wineMap: {}, players: {} });

  const totals = {};
  for (const [pid, player] of Object.entries(game.players)) {
    if (player.participating === false) continue;
    totals[pid] = { name: player.name, emoji: player.emoji, total: 0, breakdown: {} };
  }

  for (const [wineId, scoreMap] of Object.entries(game.scores)) {
    for (const [guesserId, score] of Object.entries(scoreMap)) {
      if (totals[guesserId] && game.players[guesserId]?.participating !== false) {
        totals[guesserId].total += score.total;
        totals[guesserId].breakdown[wineId] = score;
      }
    }
  }

  // Build wineMap for display
  const wineMap = {};
  for (const [pid, p] of Object.entries(game.players)) {
    for (const w of (p.wines || [])) {
      wineMap[w.id] = { playerId: pid, playerName: p.name, playerEmoji: p.emoji, wine: w };
    }
  }

  // Include actual guess content for revealed wines (shown on leaderboard)
  const revealedGuesses = {};
  for (const [guesserId, wineGuesses] of Object.entries(game.guesses)) {
    for (const [wineId, guess] of Object.entries(wineGuesses)) {
      if (game.revealOrder.includes(wineId)) {
        if (!revealedGuesses[guesserId]) revealedGuesses[guesserId] = {};
        revealedGuesses[guesserId][wineId] = guess;
      }
    }
  }

  res.json({
    scores: totals,
    revealOrder: game.revealOrder,
    wineMap,
    guesses: revealedGuesses,
    players: Object.fromEntries(
      Object.entries(game.players).map(([id, p]) => [id, { name: p.name, emoji: p.emoji, wines: p.wines }])
    )
  });
});

module.exports = { router, setIo, rescheduleTimers };
