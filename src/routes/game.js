const express = require('express');
const router = express.Router({ mergeParams: true });
const { loadGame, saveGame } = require('../services/persistenceService');
const { calculateScore } = require('../services/scoringService');
const { validateGuess } = require('../utils/validation');
const { authHost, getToken, findWine } = require('./lobby');

let ioInstance = null;
function setIo(io) { ioInstance = io; }

function getCurrentPlayer(game, token) {
  for (const [pid, p] of Object.entries(game.players)) {
    if (p.sessionToken === token) return pid;
  }
  return null;
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

// POST /api/lobby/:lobbyId/reveal/:wineId — host reveals a wine
router.post('/reveal/:wineId', (req, res) => {
  const { lobbyId, wineId } = req.params;
  const game = loadGame(lobbyId);
  if (!game) return res.status(404).json({ error: 'Lobby not found.' });
  if (!authHost(game, getToken(req))) return res.status(403).json({ error: 'Host only.' });

  const found = findWine(game, wineId);
  if (!found) return res.status(404).json({ error: 'Wine not found.' });
  if (found.wine.revealed) return res.status(400).json({ error: 'Already revealed.' });

  // Mark wine as revealed in the actual player data
  const ownerPlayer = game.players[found.playerId];
  const wineInData = ownerPlayer.wines.find(w => w.id === wineId);
  wineInData.revealed = true;
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

  if (ioInstance) {
    ioInstance.to(lobbyId).emit('wine-revealed', {
      wineId,
      playerId: found.playerId,
      playerName: found.player.name,
      wine: wineInData,
      scores: game.scores[wineId]
    });
  }

  res.json({ success: true, scores: game.scores[wineId] });
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

  res.json({
    scores: totals,
    revealOrder: game.revealOrder,
    wineMap,
    players: Object.fromEntries(
      Object.entries(game.players).map(([id, p]) => [id, { name: p.name, emoji: p.emoji, wines: p.wines }])
    )
  });
});

module.exports = { router, setIo };
