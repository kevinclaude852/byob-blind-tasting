// Toast utility (global)
function showToast(msg) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// HTML escape (global helper used by all views)
function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// What's New popup (opened from the landing and join pages)
function showWhatsNew() {
  document.querySelector('.wn-overlay')?.remove();
  const items = ['mode', 'subRegion', 'recovery', 'notes'].map(k => `
    <li><span class="wn-bullet" aria-hidden="true">✴</span>
      <span><strong>${t(`wn.${k}Title`)}</strong>${t(`wn.${k}Desc`)}</span></li>`).join('');
  const overlay = document.createElement('div');
  overlay.className = 'reveal-modal-overlay wn-overlay';
  overlay.innerHTML = `
    <div class="reveal-modal wn-modal" role="dialog" aria-modal="true" aria-labelledby="wnTitle">
      <button type="button" class="wn-close" aria-label="Close">✕</button>
      <h3 class="reveal-modal-title" id="wnTitle">${t('wn.title')}</h3>
      <div class="wn-date">${t('wn.date')}</div>
      <ul class="wn-list">${items}</ul>
      <button type="button" class="btn btn-primary wn-ok">${t('wn.close')}</button>
    </div>`;
  const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.closest('.wn-close, .wn-ok')) close();
  });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(overlay);
  overlay.querySelector('.wn-ok').focus();
}
document.addEventListener('click', (e) => {
  if (e.target.closest('.whats-new-link')) showWhatsNew();
});

// Dummy lobby setup (UAT testing)
async function renderDummyLobby() {
  const app = document.getElementById('app');
  app.innerHTML = `<div class="page"><div class="loading-screen"><div class="wine-glass">🍷</div><p>Setting up test lobby…</p></div></div>`;
  try {
    const res = await fetch('/api/dummy', { method: 'POST' });
    if (!res.ok) throw new Error();
    const { lobbyId, playerId, sessionToken } = await res.json();
    API.saveSession(lobbyId, { playerId, sessionToken });
    window.location.hash = `#/lobby/${lobbyId}`;
  } catch {
    document.getElementById('app').innerHTML =
      `<div class="page"><div class="alert alert-error">Failed to set up test lobby.</div></div>`;
  }
}

// Router
async function route() {
  const hash = window.location.hash || '#/';

  // #/ — landing
  if (hash === '#/' || hash === '' || hash === '#') {
    return renderLanding();
  }

  // #/lobby/:id/wine/:wineId — edit existing wine
  const wineEditMatch = hash.match(/^#\/lobby\/([a-f0-9]+)\/wine\/(w_[a-z0-9]+)$/);
  if (wineEditMatch) {
    return renderWineRegistration(wineEditMatch[1], wineEditMatch[2]);
  }

  // #/lobby/:id/wine — add new wine
  // #/lobby/:id/add-wine — add another wine from inside the lobby
  const addWineMatch = hash.match(/^#\/lobby\/([a-f0-9]+)\/add-wine$/);
  if (addWineMatch) {
    return renderWineRegistration(addWineMatch[1], null, { fromLobby: true });
  }

  const wineMatch = hash.match(/^#\/lobby\/([a-f0-9]+)\/wine$/);
  if (wineMatch) {
    return renderWineRegistration(wineMatch[1], null);
  }

  // #/lobby/:id/guess/:wineId
  const guessMatch = hash.match(/^#\/lobby\/([a-f0-9]+)\/guess\/(w_[a-z0-9]+)$/);
  if (guessMatch) {
    return renderGuess(guessMatch[1], guessMatch[2]);
  }

  // #/lobby/:id/share-score
  const shareScoreMatch = hash.match(/^#\/lobby\/([a-f0-9]+)\/share-score$/);
  if (shareScoreMatch) {
    return renderShareScore(shareScoreMatch[1]);
  }

  // #/lobby/:id/share-guess/:wineId
  const shareGuessMatch = hash.match(/^#\/lobby\/([a-f0-9]+)\/share-guess\/(w_[a-z0-9]+)$/);
  if (shareGuessMatch) {
    return renderShareGuess(shareGuessMatch[1], shareGuessMatch[2]);
  }

  // #/lobby/:id/scores
  const scoresMatch = hash.match(/^#\/lobby\/([a-f0-9]+)\/scores$/);
  if (scoresMatch) {
    return renderScoreboard(scoresMatch[1]);
  }

  // #/lobby/:id/myguesses
  const myGuessesMatch = hash.match(/^#\/lobby\/([a-f0-9]+)\/myguesses$/);
  if (myGuessesMatch) {
    return renderMyGuesses(myGuessesMatch[1]);
  }

  // #/lobby/:id/recover/:playerId/:token — restore session and redirect to lobby
  const recoverMatch = hash.match(/^#\/lobby\/([a-f0-9]+)\/recover\/(p_[a-z0-9]+)\/([a-f0-9]+)$/);
  if (recoverMatch) {
    const [, lobbyId, playerId, sessionToken] = recoverMatch;
    API.saveSession(lobbyId, { playerId, sessionToken });
    window.location.hash = `#/lobby/${lobbyId}`;
    return;
  }

  // #/lobby/:id/manage-players — host manage players page
  const managePlayersMatch = hash.match(/^#\/lobby\/([a-f0-9]+)\/manage-players$/);
  if (managePlayersMatch) {
    return renderManagePlayers(managePlayersMatch[1]);
  }

  // #/lobby/dummy — UAT test lobby
  if (hash === '#/lobby/dummy' || hash === '#/lobby/dummy/') {
    return renderDummyLobby();
  }

  // #/lobby/:id — main lobby (or join page)
  const lobbyMatch = hash.match(/^#\/lobby\/([a-f0-9]+)$/);
  if (lobbyMatch) {
    const lobbyId = lobbyMatch[1];
    const session = API.getSession(lobbyId);

    if (!session) {
      try {
        const lobby = await API.getLobby(lobbyId);
        return renderJoin(lobbyId, lobby.lobbyName, lobby.gameMode);
      } catch {
        document.getElementById('app').innerHTML = `<div class="page"><div class="alert alert-error">Lobby not found or expired.</div></div>`;
        return;
      }
    }

    try {
      await API.getLobby(lobbyId);
    } catch {
      API.clearSession(lobbyId);
      window.location.hash = `#/lobby/${lobbyId}`;
      return;
    }

    return renderLobby(lobbyId);
  }

  // Fallback
  renderLanding();
}

window.addEventListener('hashchange', route);
window.addEventListener('load', () => { initLangToggle(); route(); });
