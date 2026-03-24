const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

function generateLobbyId() {
  const hash = crypto.createHash('sha256').update(uuidv4()).digest('hex');
  return hash.substring(0, 6);
}

function generatePlayerId() {
  return 'p_' + crypto.randomBytes(4).toString('hex');
}

function generateSessionToken() {
  return crypto.randomBytes(24).toString('hex');
}

function generateWineId() {
  return 'w_' + crypto.randomBytes(4).toString('hex');
}

module.exports = { generateLobbyId, generatePlayerId, generateSessionToken, generateWineId };
