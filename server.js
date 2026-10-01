const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const os = require('os');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');

const app = express();

// Set REDIRECT_TO (e.g. https://byob.up.railway.app) on a deployment that should only send
// visitors to the new address. Leave it unset everywhere else. Browsers keep the #/lobby/... part.
const REDIRECT_TO = (process.env.REDIRECT_TO || '').trim().replace(/\/+$/, '');
const COMMIT = (process.env.RAILWAY_GIT_COMMIT_SHA || 'unknown').slice(0, 7);
const ENVIRONMENT = process.env.RAILWAY_ENVIRONMENT_NAME || 'unknown';
console.log(`Redirect: ${REDIRECT_TO || 'off'} (commit ${COMMIT}, environment ${ENVIRONMENT})`);

// Railway's health check needs a 200, so it gets its own path that is never redirected.
// It also reports the redirect setting, commit and Railway environment, to check which
// deployment a domain reaches and what it is running.
app.get('/healthz', (req, res) => res.type('text').send(`ok\nredirect: ${REDIRECT_TO || 'off'}\ncommit: ${COMMIT}\nenvironment: ${ENVIRONMENT}\n`));

if (REDIRECT_TO) {
  const targetHost = new URL(REDIRECT_TO).host;
  app.use((req, res, next) => {
    if (req.get('host') === targetHost) return next();
    res.redirect(301, REDIRECT_TO + req.originalUrl);
  });
}
const server = http.createServer(app);
const io = new Server(server);

// Redirect old domain to new domain (configure via env vars)
const OLD_HOST = process.env.OLD_HOST;
const NEW_HOST = process.env.NEW_HOST;
if (OLD_HOST && NEW_HOST) {
  app.use((req, res, next) => {
    if (req.hostname === OLD_HOST) {
      return res.redirect(301, `https://${NEW_HOST}${req.originalUrl}`);
    }
    next();
  });
}

// Middleware
app.use(express.json());
// index.html links its scripts and styles with a per-deploy version so phones never run a
// cached mix of old and new files; the page itself is always re-checked.
const BUILD_ID = (process.env.RAILWAY_GIT_COMMIT_SHA || String(Date.now())).slice(0, 12);
const indexHtml = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8')
  .replace(/(src|href)="(\/(?:js|css)\/[^"?]+)"/g, `$1="$2?v=${BUILD_ID}"`);
function sendIndex(req, res) {
  res.set('Cache-Control', 'no-cache');
  res.type('html').send(indexHtml);
}
app.get(['/', '/index.html'], sendIndex);
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const { router: lobbyRouter } = require('./src/routes/lobby');
const playerRouter = require('./src/routes/player');
const { router: gameRouter, setIo, rescheduleTimers } = require('./src/routes/game');
const { router: dummyRouter } = require('./src/routes/dummy');
const { grapes, countries, regions, subregions } = require('./src/utils/validation');
const { setupSocketHandlers } = require('./src/socket/handler');

setIo(io);

app.use('/api/lobby', lobbyRouter);
app.use('/api/lobby/:lobbyId/player', playerRouter);
app.use('/api/lobby/:lobbyId', gameRouter);
app.use('/api/dummy', dummyRouter);

// Reference data endpoints
app.get('/api/reference/grapes', (req, res) => res.json(grapes));
app.get('/api/reference/countries', (req, res) => res.json(countries));
app.get('/api/reference/regions', (req, res) => res.json(regions));
app.get('/api/reference/subregions', (req, res) => res.json(subregions));

// QR code generator
app.get('/api/qr', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 1 });
    res.json({ dataUrl });
  } catch { res.status(500).json({ error: 'QR generation failed' }); }
});

// Admin
const adminRouter = require('./src/routes/admin');
app.use('/admin', adminRouter);

// SPA fallback
app.get('/{*path}', (req, res) => {
  sendIndex(req, res);
});

setupSocketHandlers(io);

// Re-schedule any countdown timers that were active before a server restart
rescheduleTimers();

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n🍷 Blind Tasting Game Server\n');
  console.log(`Local:   http://localhost:${PORT}`);

  // Get all network interface IPs for sharing
  const interfaces = os.networkInterfaces();
  for (const [name, addrs] of Object.entries(interfaces)) {
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        console.log(`Network: http://${addr.address}:${PORT}  ← share this with players`);
      }
    }
  }
  console.log('\nPlayers on the same WiFi can join using the Network URL above.\n');
});
