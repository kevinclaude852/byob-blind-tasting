// API client — attaches session token automatically
const API = (() => {
  function getSession(lobbyId) {
    try { return JSON.parse(localStorage.getItem(`session_${lobbyId}`) || 'null'); } catch { return null; }
  }
  function saveSession(lobbyId, data) {
    localStorage.setItem(`session_${lobbyId}`, JSON.stringify(data));
  }
  function clearSession(lobbyId) {
    localStorage.removeItem(`session_${lobbyId}`);
  }

  async function request(method, url, body, lobbyId) {
    const headers = { 'Content-Type': 'application/json' };
    const session = lobbyId ? getSession(lobbyId) : null;
    if (session && session.sessionToken) headers['x-session-token'] = session.sessionToken;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    const data = await res.json();
    if (!res.ok) throw { status: res.status, ...data };
    return data;
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for non-HTTPS (local network IP)
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      ta.style.top = '0';
      ta.style.left = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch {}
      document.body.removeChild(ta);
      return ok;
    }
  }

  return {
    getSession,
    saveSession,
    clearSession,
    copyToClipboard,

    // Lobby
    createLobby: (body) => request('POST', '/api/lobby', body),
    getLobby: (lobbyId) => request('GET', `/api/lobby/${lobbyId}`, null, lobbyId),
    renameLobby: (lobbyId, lobbyName) => request('PATCH', `/api/lobby/${lobbyId}`, { lobbyName }, lobbyId),
    joinLobby: (lobbyId, body) => request('POST', `/api/lobby/${lobbyId}/join`, body, lobbyId),

    // Wines (per wine)
    addWine: (lobbyId, playerId, wine) => request('POST', `/api/lobby/${lobbyId}/player/${playerId}/wines`, wine, lobbyId),
    updateWine: (lobbyId, playerId, wineId, wine) => request('PUT', `/api/lobby/${lobbyId}/player/${playerId}/wines/${wineId}`, wine, lobbyId),
    removeWine: (lobbyId, playerId, wineId) => request('DELETE', `/api/lobby/${lobbyId}/player/${playerId}/wines/${wineId}`, null, lobbyId),

    // Guesses (keyed by wineId)
    submitGuess: (lobbyId, wineId, guess) => request('PUT', `/api/lobby/${lobbyId}/guess/${wineId}`, guess, lobbyId),
    getGuess: (lobbyId, wineId) => request('GET', `/api/lobby/${lobbyId}/guess/${wineId}`, null, lobbyId),

    // Game
    revealWine: (lobbyId, wineId, delayMinutes = 0) => request('POST', `/api/lobby/${lobbyId}/reveal/${wineId}`, { delayMinutes }, lobbyId),
    cancelCountdown: (lobbyId, wineId) => request('DELETE', `/api/lobby/${lobbyId}/reveal/${wineId}`, null, lobbyId),
    getScores: (lobbyId) => request('GET', `/api/lobby/${lobbyId}/scores`, null, lobbyId),

    // Reference
    getGrapes: () => request('GET', '/api/reference/grapes'),
    getCountries: () => request('GET', '/api/reference/countries'),
    getRegions: () => request('GET', '/api/reference/regions'),
  };
})();
