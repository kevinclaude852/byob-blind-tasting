const express = require('express');
const router = express.Router();
const { saveGame } = require('../services/persistenceService');
const { generatePlayerId, generateSessionToken, generateWineId } = require('../utils/idGenerator');

const DUMMY_LOBBY_ID = 'aaaaaa';

const NUMBER_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

const TEST_PLAYERS = [
  { name: 'Alice',   emoji: '🦊', wines: [
    { name: 'Château Margaux', vintage: 2018, type: 'single', varietals: [{ grape: 'Cabernet Sauvignon', percentage: 100 }], country: 'France', region: 'Bordeaux' },
  ]},
  { name: 'Bob',     emoji: '🐻', wines: [
    { name: 'Opus One', vintage: 2015, type: 'blend', varietals: [{ grape: 'Cabernet Sauvignon', percentage: 80 }, { grape: 'Merlot', percentage: 20 }], country: 'USA', region: 'Napa Valley' },
    { name: 'Caymus Cabernet', vintage: 2019, type: 'single', varietals: [{ grape: 'Cabernet Sauvignon', percentage: 100 }], country: 'USA', region: 'Napa Valley' },
  ]},
  { name: 'Carol',   emoji: '🐼', wines: [
    { name: 'Penfolds Grange', vintage: 2016, type: 'blend', varietals: [{ grape: 'Shiraz', percentage: 97 }, { grape: 'Cabernet Sauvignon', percentage: 3 }], country: 'Australia', region: 'South Australia' },
  ]},
  { name: 'David',   emoji: '🦁', wines: [
    { name: 'Screaming Eagle', vintage: 2017, type: 'single', varietals: [{ grape: 'Cabernet Sauvignon', percentage: 100 }], country: 'USA', region: 'Napa Valley' },
    { name: 'Harlan Estate', vintage: 2014, type: 'blend', varietals: [{ grape: 'Cabernet Sauvignon', percentage: 70 }, { grape: 'Merlot', percentage: 30 }], country: 'USA', region: 'Napa Valley' },
  ]},
  { name: 'Eve',     emoji: '🐯', wines: [
    { name: 'Romanée-Conti', vintage: 2012, type: 'single', varietals: [{ grape: 'Pinot Noir', percentage: 100 }], country: 'France', region: 'Burgundy' },
  ]},
  { name: 'Frank',   emoji: '🐸', wines: [
    { name: 'Sassicaia', vintage: 2017, type: 'blend', varietals: [{ grape: 'Cabernet Sauvignon', percentage: 85 }, { grape: 'Cabernet Franc', percentage: 15 }], country: 'Italy', region: 'Tuscany' },
    { name: 'Tignanello', vintage: 2016, type: 'blend', varietals: [{ grape: 'Sangiovese', percentage: 80 }, { grape: 'Cabernet Sauvignon', percentage: 20 }], country: 'Italy', region: 'Tuscany' },
  ]},
  { name: 'Grace',   emoji: '🐧', wines: [
    { name: 'Vega Sicilia Único', vintage: 2011, type: 'blend', varietals: [{ grape: 'Tempranillo', percentage: 70 }, { grape: 'Cabernet Sauvignon', percentage: 30 }], country: 'Spain', region: 'Ribera del Duero' },
  ]},
  { name: 'Henry',   emoji: '🦋', wines: [
    { name: 'Château Pétrus', vintage: 2005, type: 'single', varietals: [{ grape: 'Merlot', percentage: 100 }], country: 'France', region: 'Pomerol' },
    { name: 'Le Pin', vintage: 2008, type: 'single', varietals: [{ grape: 'Merlot', percentage: 100 }], country: 'France', region: 'Pomerol' },
  ]},
  { name: 'Iris',    emoji: '🦄', wines: [
    { name: 'Leeuwin Art Series Chardonnay', vintage: 2018, type: 'single', varietals: [{ grape: 'Chardonnay', percentage: 100 }], country: 'Australia', region: 'Margaret River' },
  ]},
  { name: 'Jack',    emoji: '🐺', wines: [
    { name: 'Pingus', vintage: 2015, type: 'single', varietals: [{ grape: 'Tempranillo', percentage: 100 }], country: 'Spain', region: 'Ribera del Duero' },
    { name: 'L\'Ermita', vintage: 2013, type: 'single', varietals: [{ grape: 'Grenache', percentage: 100 }], country: 'Spain', region: 'Priorat' },
  ]},
  { name: 'Kate',    emoji: '🦅', wines: [
    { name: 'Château Haut-Brion', vintage: 2010, type: 'blend', varietals: [{ grape: 'Cabernet Sauvignon', percentage: 55 }, { grape: 'Merlot', percentage: 45 }], country: 'France', region: 'Pessac-Léognan' },
  ]},
];

// POST /api/dummy — reset and initialise the UAT test lobby, return a host session
router.post('/', (req, res) => {
  const players = {};

  TEST_PLAYERS.forEach(p => {
    const id = generatePlayerId();
    players[id] = {
      id,
      name: p.name,
      emoji: p.emoji,
      participating: true,
      joinedAt: new Date().toISOString(),
      sessionToken: generateSessionToken(),
      wines: p.wines.map((w, j) => ({
        id: generateWineId(),
        emoji: NUMBER_EMOJIS[j] || `${j + 1}`,
        revealed: false,
        revealAt: null,
        name: w.name,
        vintage: w.vintage,
        type: w.type,
        varietals: w.varietals,
        country: w.country,
        region: w.region || null,
      })),
    };
  });

  // Visitor becomes the host
  const hostId = generatePlayerId();
  const hostToken = generateSessionToken();
  players[hostId] = {
    id: hostId,
    name: 'You (Host)',
    emoji: '🎯',
    participating: true,
    joinedAt: new Date().toISOString(),
    sessionToken: hostToken,
    wines: [],
  };

  const game = {
    lobbyId: DUMMY_LOBBY_ID,
    lobbyName: 'UAT Test Lobby 🧪',
    hostPlayerId: hostId,
    hostParticipating: true,
    createdAt: new Date().toISOString(),
    players,
    guesses: {},
    scores: {},
    revealOrder: [],
  };

  saveGame(DUMMY_LOBBY_ID, game, true);
  res.json({ lobbyId: DUMMY_LOBBY_ID, playerId: hostId, sessionToken: hostToken });
});

module.exports = { router, DUMMY_LOBBY_ID };
