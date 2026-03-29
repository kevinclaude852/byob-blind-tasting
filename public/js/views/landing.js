const AVATARS = ['⛰️','🌞','🎃','🐦','🏝️','🐔','🎸','👻','🤡','🌸','😼','😈','🐵','🐨','🌻','🍄','🍪','🎩','🍭','💀','🚀','💥','🐑','🌶️','⭐️','🌀','🌈','🌊','🍙','🐳'];

function renderLanding() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h1>${t('app.title')}</h1>
        <p>${t('app.subtitle')}</p>
      </div>

      <div class="card">
        <div class="form-group">
          <label for="lobbyName">${t('landing.lobbyName')}</label>
          <input type="text" id="lobbyName" placeholder="${t('landing.lobbyNamePlaceholder')}" value="" required>
        </div>
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" id="hostNotParticipating">
            ${t('landing.hostNotParticipating')}
          </label>
        </div>
        <div id="hostFields">
          <div class="form-group">
            <label for="hostName">${t('landing.yourName')}</label>
            <input type="text" id="hostName" placeholder="${t('landing.yourNamePlaceholder')}">
          </div>
          <div class="form-group">
            <label>${t('landing.yourAvatar')}</label>
            <div class="emoji-picker" id="emojiPicker">
              ${AVATARS.map(e => `<button class="emoji-btn" data-emoji="${e}"><span>${e}</span></button>`).join('')}
            </div>
            <input type="hidden" id="selectedEmoji" value="">
          </div>
        </div>
        <div id="landingError"></div>
        <button class="btn btn-primary" id="createBtn">
          ${t('landing.createLobby')}
        </button>
      </div>
    </div>
  `;

  let selectedEmoji = '';

  document.getElementById('hostNotParticipating').addEventListener('change', (e) => {
    document.getElementById('hostFields').style.display = e.target.checked ? 'none' : '';
  });

  document.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedEmoji = btn.dataset.emoji;
    });
  });

  document.getElementById('createBtn').addEventListener('click', async () => {
    const lobbyName = document.getElementById('lobbyName').value.trim();
    const hostNotParticipating = document.getElementById('hostNotParticipating').checked;
    const errorEl = document.getElementById('landingError');

    if (!lobbyName) { showError(errorEl, 'Please enter a lobby name.'); return; }
    if (!hostNotParticipating) {
      const hostName = document.getElementById('hostName').value.trim();
      if (!hostName) { showError(errorEl, 'Please enter your name.'); return; }
      if (!selectedEmoji) { showError(errorEl, 'Please choose an avatar.'); return; }
    }

    const btn = document.getElementById('createBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spin">⏳</span> Creating...';
    errorEl.innerHTML = '';

    try {
      const hostName = hostNotParticipating ? '' : document.getElementById('hostName').value.trim();
      const hostEmoji = hostNotParticipating ? '🎩' : selectedEmoji;
      const data = await API.createLobby({ hostName, hostEmoji, lobbyName, hostParticipating: !hostNotParticipating });
      API.saveSession(data.lobbyId, { playerId: data.hostPlayerId, sessionToken: data.sessionToken });
      window.location.hash = `#/lobby/${data.lobbyId}`;
    } catch (err) {
      showError(errorEl, err.error || 'Failed to create lobby.');
      btn.disabled = false;
      btn.innerHTML = 'Create Lobby';
    }
  });
}

function showError(el, msg) {
  el.innerHTML = `<div class="alert alert-error">${msg}</div>`;
}
