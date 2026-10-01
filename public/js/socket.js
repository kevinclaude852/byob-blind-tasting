// Socket.IO client wrapper
const SocketManager = (() => {
  let socket = null;
  const handlers = {};
  let target = { lobbyId: null, playerId: null };
  let joinedLobbyId = null;
  let hasConnected = false;

  function join() {
    socket.emit('join-lobby', target);
    joinedLobbyId = target.lobbyId;
  }

  // One connection per tab. 'resync' tells views to reload after a reconnect, since
  // anything broadcast while the connection was down (e.g. phone asleep) was missed.
  function connect(lobbyId, playerId) {
    target = { lobbyId, playerId };
    if (socket) {
      if (!socket.connected) socket.connect();
      else if (joinedLobbyId !== lobbyId) join();
      return;
    }
    socket = io();

    socket.on('connect', () => {
      join();
      if (hasConnected) emit('resync');
      hasConnected = true;
    });

    socket.on('player-joined', (data) => emit('player-joined', data));
    socket.on('wine-revealed', (data) => emit('wine-revealed', data));
    socket.on('lobby-updated', (data) => emit('lobby-updated', data));
    socket.on('guess-submitted', (data) => emit('guess-submitted', data));
    socket.on('wine-countdown-started', (data) => emit('wine-countdown-started', data));
    socket.on('wine-countdown-stopped', (data) => emit('wine-countdown-stopped', data));

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

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !socket) return;
    if (!socket.connected) socket.connect();
    emit('resync');
  });

  return { connect, on, off, disconnect };
})();
