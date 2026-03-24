// Socket.IO client wrapper
const SocketManager = (() => {
  let socket = null;
  const handlers = {};

  function connect(lobbyId, playerId) {
    if (socket && socket.connected) return;
    socket = io();

    socket.on('connect', () => {
      socket.emit('join-lobby', { lobbyId, playerId });
    });

    socket.on('player-joined', (data) => emit('player-joined', data));
    socket.on('wine-revealed', (data) => emit('wine-revealed', data));
    socket.on('lobby-updated', (data) => emit('lobby-updated', data));

    socket.on('disconnect', () => {
      // Auto-reconnect handled by Socket.IO
    });
  }

  function on(event, handler) {
    if (!handlers[event]) handlers[event] = [];
    handlers[event].push(handler);
    return () => off(event, handler);
  }

  function off(event, handler) {
    if (!handlers[event]) return;
    handlers[event] = handlers[event].filter(h => h !== handler);
  }

  function emit(event, data) {
    if (handlers[event]) handlers[event].forEach(h => h(data));
  }

  function disconnect() {
    if (socket) { socket.disconnect(); socket = null; }
    Object.keys(handlers).forEach(k => delete handlers[k]);
  }

  return { connect, on, off, disconnect };
})();
