const express = require('express');
const router = express.Router({ mergeParams: true });
const { loadGame, saveGame } = require('../services/persistenceService');
const { validateWine } = require('../utils/validation');
const { authPlayer, getToken } = require('./lobby');
const { generateWineId } = require('../utils/idGenerator');

const NUMBER_EMOJIS = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

function normaliseWine(wine) {
  if (wine.type === 'single' && wine.varietals && wine.varietals.length > 0) {
    const first = wine.varietals.find(v => v.grape);
    wine.varietals = first ? [{ grape: first.grape, percentage: 100 }] : [];
  }
  return wine;
}

// POST /api/lobby/:lobbyId/player/:playerId/wines — add new wine
router.post('/:playerId/wines', (req, res) => {
  const { lobbyId, playerId } = req.params;
  const game = loadGame(lobbyId);
  if (!game) return res.status(404).json({ error: 'Lobby not found.' });
  if (!authPlayer(game, playerId, getToken(req))) return res.status(403).json({ error: 'Forbidden.' });

  const wine = normaliseWine(req.body);
  const errors = validateWine(wine);
  if (errors.length) return res.status(400).json({ errors });

  const player = game.players[playerId];
  const wineCount = (player.wines || []).length;
  const wineId = generateWineId();
  const defaultEmoji = NUMBER_EMOJIS[wineCount] || `${wineCount + 1}`;

  const newWine = {
    id: wineId,
    emoji: wine.emoji || defaultEmoji,
    name: wine.name.trim(),
    vintage: wine.vintage,
    type: wine.type,
    varietals: wine.type === 'blend'
      ? wine.varietals.filter(v => v.grape).map(v => ({ grape: v.grape, percentage: Number(v.percentage) }))
      : [{ grape: wine.varietals[0].grape, percentage: 100 }],
    country: wine.country,
    region: wine.region || null,
    revealed: false
  };

  if (!player.wines) player.wines = [];
  player.wines.push(newWine);

  saveGame(lobbyId, game);
  res.json({ success: true, wineId });
});

// PUT /api/lobby/:lobbyId/player/:playerId/wines/:wineId — update wine
router.put('/:playerId/wines/:wineId', (req, res) => {
  const { lobbyId, playerId, wineId } = req.params;
  const game = loadGame(lobbyId);
  if (!game) return res.status(404).json({ error: 'Lobby not found.' });
  if (!authPlayer(game, playerId, getToken(req))) return res.status(403).json({ error: 'Forbidden.' });

  const player = game.players[playerId];
  const wineIndex = (player.wines || []).findIndex(w => w.id === wineId);
  if (wineIndex === -1) return res.status(404).json({ error: 'Wine not found.' });
  if (player.wines[wineIndex].revealed) return res.status(400).json({ error: 'Cannot edit a revealed wine.' });

  const wine = normaliseWine(req.body);
  const errors = validateWine(wine);
  if (errors.length) return res.status(400).json({ errors });

  // Clear guesses for this wine (fairness)
  for (const guesserId of Object.keys(game.guesses)) {
    if (game.guesses[guesserId][wineId]) delete game.guesses[guesserId][wineId];
  }

  player.wines[wineIndex] = {
    ...player.wines[wineIndex],
    emoji: wine.emoji || player.wines[wineIndex].emoji,
    name: wine.name.trim(),
    vintage: wine.vintage,
    type: wine.type,
    varietals: wine.type === 'blend'
      ? wine.varietals.filter(v => v.grape).map(v => ({ grape: v.grape, percentage: Number(v.percentage) }))
      : [{ grape: wine.varietals[0].grape, percentage: 100 }],
    country: wine.country,
    region: wine.region || null
  };

  saveGame(lobbyId, game);
  res.json({ success: true });
});

// DELETE /api/lobby/:lobbyId/player/:playerId/wines/:wineId — remove wine
router.delete('/:playerId/wines/:wineId', (req, res) => {
  const { lobbyId, playerId, wineId } = req.params;
  const game = loadGame(lobbyId);
  if (!game) return res.status(404).json({ error: 'Lobby not found.' });
  if (!authPlayer(game, playerId, getToken(req))) return res.status(403).json({ error: 'Forbidden.' });

  const player = game.players[playerId];
  const wineIndex = (player.wines || []).findIndex(w => w.id === wineId);
  if (wineIndex === -1) return res.status(404).json({ error: 'Wine not found.' });
  if (player.wines[wineIndex].revealed) return res.status(400).json({ error: 'Cannot remove a revealed wine.' });

  // Clear all guesses for this wine
  for (const guesserId of Object.keys(game.guesses)) {
    if (game.guesses[guesserId][wineId]) delete game.guesses[guesserId][wineId];
  }

  player.wines.splice(wineIndex, 1);
  saveGame(lobbyId, game);
  res.json({ success: true });
});

module.exports = router;
