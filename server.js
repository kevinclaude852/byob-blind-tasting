const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const os = require('os');
const path = require('path');
const QRCode = require('qrcode');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const { router: lobbyRouter } = require('./src/routes/lobby');
const playerRouter = require('./src/routes/player');
const { router: gameRouter, setIo } = require('./src/routes/game');
const { grapes, countries, regions } = require('./src/utils/validation');
const { setupSocketHandlers } = require('./src/socket/handler');

setIo(io);

app.use('/api/lobby', lobbyRouter);
app.use('/api/lobby/:lobbyId/player', playerRouter);
app.use('/api/lobby/:lobbyId', gameRouter);

// Reference data endpoints
app.get('/api/reference/grapes', (req, res) => res.json(grapes));
app.get('/api/reference/countries', (req, res) => res.json(countries));
app.get('/api/reference/regions', (req, res) => res.json(regions));

// QR code generator
app.get('/api/qr', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 1 });
    res.json({ dataUrl });
  } catch { res.status(500).json({ error: 'QR generation failed' }); }
});

// SPA fallback
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

setupSocketHandlers(io);

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
