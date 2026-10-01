const express = require('express');
const { listGames } = require('../services/persistenceService');

const router = express.Router();

const ADMIN_PASSWORD = 'BYOB@dmin';

function checkAuth(req, res) {
  const auth = req.headers['authorization'];
  if (auth && auth.startsWith('Basic ')) {
    const decoded = Buffer.from(auth.slice(6), 'base64').toString('utf8');
    const password = decoded.includes(':') ? decoded.split(':').slice(1).join(':') : decoded;
    if (password === ADMIN_PASSWORD) return true;
  }
  res.set('WWW-Authenticate', 'Basic realm="BYOB Admin"');
  res.status(401).send('Unauthorised');
  return false;
}

router.get('/', (req, res) => {
  if (!checkAuth(req, res)) return;

  const games = listGames().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const rows = games.map(g => {
    const date = new Date(g.createdAt);
    const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return `
      <tr>
        <td><a href="/#/lobby/${g.lobbyId}/scores">${escHtml(g.lobbyName)}</a></td>
        <td>${g.hostName ? `${escHtml(g.hostEmoji || '')} ${escHtml(g.hostName)}` : '—'}</td>
        <td class="num">${g.playerCount}</td>
        <td>${dateStr} ${timeStr}</td>
        <td><code>${g.lobbyId}</code></td>
      </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>BYOB Admin</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f0; color: #1a1a1a; padding: 40px 24px; }
    h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 4px; }
    .subtitle { color: #666; font-size: 0.9rem; margin-bottom: 32px; }
    table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
    thead { background: #1a1a1a; color: #fff; }
    th { padding: 12px 16px; text-align: left; font-size: 0.8rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
    td { padding: 12px 16px; border-bottom: 1px solid #eee; font-size: 0.9rem; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #faf9f7; }
    a { color: #8b0000; text-decoration: none; font-weight: 500; }
    a:hover { text-decoration: underline; }
    code { font-size: 0.8rem; background: #f0f0f0; padding: 2px 6px; border-radius: 4px; color: #555; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .empty { text-align: center; padding: 48px; color: #999; font-style: italic; }
  </style>
</head>
<body>
  <h1>🍷 BYOB Admin</h1>
  <p class="subtitle">${games.length} game${games.length !== 1 ? 's' : ''} — sorted by most recent</p>
  <table>
    <thead>
      <tr>
        <th>Lobby Name</th>
        <th>Host</th>
        <th class="num">Total Players</th>
        <th>Created</th>
        <th>Lobby ID</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="5" class="empty">No games yet.</td></tr>'}
    </tbody>
  </table>
</body>
</html>`;

  res.send(html);
});

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = router;
