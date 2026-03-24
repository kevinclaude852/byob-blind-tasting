function renderJoin(lobbyId, lobbyName) {
  const app = document.getElementById('app');
  const AVATARS = ['⛰️','🌞','🎃','🐦','🏝️','🐔','🎸','👻','🤡','🌸','😼','😈','🐵','🐨','🌻','🍄','🍪','🎩','🍭','💀','🚀','💥','🐑','🌶️','⭐️','🌀','🌈','🌊','🍙','🐳'];

  app.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h1>${escHtml(lobbyName)}</h1>
        <p>You've been invited to a blind tasting!</p>
      </div>

      <div class="card">
        <div class="form-group">
          <label for="playerName">Your Name</label>
          <input type="text" id="playerName" placeholder="Enter your name" autofocus>
        </div>
        <div class="form-group">
          <label>Your Avatar</label>
          <div class="emoji-picker" id="emojiPicker">
            ${AVATARS.map(e => `<button class="emoji-btn" data-emoji="${e}"><span>${e}</span></button>`).join('')}
          </div>
        </div>
        <div id="joinError"></div>
        <button class="btn btn-primary" id="joinBtn">Join Tasting</button>
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

    if (!name) { errorEl.innerHTML = '<div class="alert alert-error">Please enter your name.</div>'; return; }
    if (!selectedEmoji) { errorEl.innerHTML = '<div class="alert alert-error">Please choose an avatar.</div>'; return; }

    const btn = document.getElementById('joinBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spin">⏳</span> Joining...';

    try {
      const data = await API.joinLobby(lobbyId, { name, emoji: selectedEmoji });
      API.saveSession(lobbyId, { playerId: data.playerId, sessionToken: data.sessionToken });
      window.location.hash = `#/lobby/${lobbyId}/wine`;
    } catch (err) {
      errorEl.innerHTML = `<div class="alert alert-error">${escHtml(err.error || 'Failed to join.')}</div>`;
      btn.disabled = false;
      btn.innerHTML = 'Join Tasting';
    }
  });
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
