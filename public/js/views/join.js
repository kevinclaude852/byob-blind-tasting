function renderJoin(lobbyId, lobbyName, gameMode = 'byob') {
  const app = document.getElementById('app');
  const AVATARS = ['⛰️','🌞','🎃','🐦','🏝️','🐔','🎸','👻','🤡','🌸','😼','😈','🐵','🐨','🌻','🍄','🍪','🎩','🍭','💀','🚀','💥','🐑','🌶️','⭐️','🌀','🌈','🌊','🍙','🐳'];

  app.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h1>${t('app.title')} — ${escHtml(lobbyName)}</h1>
        <p>${t('join.subtitle')}</p>
      </div>

      <div class="card">
        <div class="form-group">
          <label for="playerName">${t('join.yourName')}</label>
          <input type="text" id="playerName" placeholder="${t('join.namePlaceholder')}" autofocus>
        </div>
        <div class="form-group">
          <label>${t('join.yourAvatar')}</label>
          <div class="emoji-picker" id="emojiPicker">
            ${AVATARS.map(e => `<button class="emoji-btn" data-emoji="${e}"><span>${e}</span></button>`).join('')}
          </div>
        </div>
        <div id="joinError"></div>
        <button class="btn btn-primary" id="joinBtn">${t('join.joinBtn')}</button>
      </div>
    </div>
  `;

  let selectedEmoji = '';

  document.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedEmoji = btn.dataset.emoji;
    });
  });

  document.getElementById('joinBtn').addEventListener('click', async () => {
    const name = document.getElementById('playerName').value.trim();
    const errorEl = document.getElementById('joinError');

    if (!name) { errorEl.innerHTML = `<div class="alert alert-error">${t('error.enterName')}</div>`; return; }
    if (!selectedEmoji) { errorEl.innerHTML = `<div class="alert alert-error">${t('error.chooseAvatar')}</div>`; return; }

    const btn = document.getElementById('joinBtn');
    btn.disabled = true;
    btn.innerHTML = `<span class="spin">⏳</span> ${t('join.joining')}`;

    try {
      const data = await API.joinLobby(lobbyId, { name, emoji: selectedEmoji });
      API.saveSession(lobbyId, { playerId: data.playerId, sessionToken: data.sessionToken });
      if (gameMode === 'hostPrepares') {
        // Hash is already #/lobby/:id (the join page URL), so hashchange won't fire.
        // Call route() directly to re-render as the now-authenticated player.
        route();
      } else {
        window.location.hash = `#/lobby/${lobbyId}/wine`;
      }
    } catch (err) {
      errorEl.innerHTML = `<div class="alert alert-error">${escHtml(err.error || 'Failed to join.')}</div>`;
      btn.disabled = false;
      btn.innerHTML = t('join.joinBtn');
    }
  });
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
