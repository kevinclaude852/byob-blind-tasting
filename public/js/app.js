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

  // #/lobby/:id — main lobby (or join page)
  const lobbyMatch = hash.match(/^#\/lobby\/([a-f0-9]+)$/);
  if (lobbyMatch) {
    const lobbyId = lobbyMatch[1];
    const session = API.getSession(lobbyId);

    if (!session) {
      try {
        const lobby = await API.getLobby(lobbyId);
        return renderJoin(lobbyId, lobby.lobbyName);
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
