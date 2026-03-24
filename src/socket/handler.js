const { loadGame, saveGame } = require('../services/persistenceService');

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.on('join-lobby', ({ lobbyId, playerId }) => {
      if (!lobbyId) return;
      socket.join(lobbyId);
      socket.data.lobbyId = lobbyId;
      socket.data.playerId = playerId;

      const game = loadGame(lobbyId);
      if (game && game.players[playerId]) {
        // Notify others that someone joined/reconnected
        socket.to(lobbyId).emit('player-joined', {
          playerId,
          name: game.players[playerId].name,
          emoji: game.players[playerId].emoji
        });
      }
    });

    socket.on('disconnect', () => {
      // Nothing special needed — Socket.IO auto-removes from rooms
    });
  });
}

module.exports = { setupSocketHandlers };
