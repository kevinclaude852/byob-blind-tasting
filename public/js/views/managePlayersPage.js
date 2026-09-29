async function renderManagePlayers(lobbyId) {
  const app = document.getElementById('app');
  app.innerHTML = `<div class="page"><p class="loading-text">${t('app.loading')}</p></div>`;

  let data;
  try {
    data = await API.getRecoveryLinks(lobbyId);
  } catch (e) {
    if (e.status === 403) {
      app.innerHTML = `<div class="page"><div class="alert alert-error">Host only.</div><a href="#/lobby/${lobbyId}" class="btn" style="margin-top:12px">${t('nav.backToLobby')}</a></div>`;
    } else {
      app.innerHTML = `<div class="page"><div class="alert alert-error">${t('app.failedLoad')}</div><a href="#/lobby/${lobbyId}" class="btn" style="margin-top:12px">${t('nav.backToLobby')}</a></div>`;
    }
    return;
  }

  const session = API.getSession(lobbyId);
  const hostPlayerId = data.players.find(p => p.id === session?.playerId)?.id;
  const baseUrl = window.location.origin + window.location.pathname;

  function buildRecoveryUrl(player) {
    return `${baseUrl}#/lobby/${lobbyId}/recover/${player.id}/${player.sessionToken}`;
  }

  // Separate host from other players
  const hostPlayer = data.players.find(p => p.id === session?.playerId);
  const otherPlayers = data.players.filter(p => p.id !== session?.playerId);

  function renderPlayerCard(player, isHost) {
    const recoveryUrl = buildRecoveryUrl(player);
    const wineLabel = player.wineCount === 1 ? `1 ${t('mp.wineCount')}` : `${player.wineCount} ${t('mp.wineCount')}`;
    const canRemove = !isHost && !player.hasRevealedWines;

    return `
      <div class="mp-player-card" data-player-id="${escHtml(player.id)}">
        <div class="mp-player-header">
          <span class="mp-player-emoji">${escHtml(player.emoji)}</span>
          <div class="mp-player-info">
            <span class="mp-player-name">${escHtml(player.name)}${isHost ? ` <span class="mp-host-badge">${t('mp.hostLabel')}</span>` : ''}</span>
            <span class="mp-player-meta">${wineLabel}</span>
          </div>
        </div>
        <div class="mp-recovery-row">
          <div class="mp-recovery-label">${isHost ? t('mp.yourRecovery') : ''}</div>
          <div class="mp-recovery-actions">
            <button class="btn btn-secondary btn-sm mp-copy-btn" data-url="${escHtml(recoveryUrl)}">${t('mp.copyLink')}</button>
            <button class="btn btn-secondary btn-sm mp-qr-btn" data-url="${escHtml(recoveryUrl)}" data-player-id="${escHtml(player.id)}">${t('mp.showQr')}</button>
            ${!isHost ? (player.hasRevealedWines
              ? `<button class="btn btn-sm mp-remove-btn" data-player-id="${escHtml(player.id)}" disabled title="${escHtml(t('mp.cannotRemove'))}" style="opacity:0.4">${t('mp.removeBtn')}</button>`
              : `<button class="btn btn-sm mp-remove-btn" data-player-id="${escHtml(player.id)}">${t('mp.removeBtn')}</button>`
            ) : ''}
          </div>
        </div>
        <div class="mp-qr-container" id="qr-${escHtml(player.id)}" style="display:none"></div>
      </div>`;
  }

  const hostCard = hostPlayer ? renderPlayerCard(hostPlayer, true) : '';
  const otherCards = otherPlayers.map(p => renderPlayerCard(p, false)).join('');

  app.innerHTML = `
    <div class="page">
      <div class="page-header">
        <a href="#/lobby/${lobbyId}" class="back-btn">${t('nav.backToLobby')}</a>
        <h2>${t('mp.title')}</h2>
        <p class="page-subtitle">${t('mp.subtitle')}</p>
      </div>
      <div class="mp-players-list">
        ${hostCard}
        ${otherCards || `<p class="mp-empty">No other players yet.</p>`}
      </div>
    </div>`;

  // Remove confirm state per player
  const removePending = {};

  app.addEventListener('click', async (e) => {
    // Copy link
    const copyBtn = e.target.closest('.mp-copy-btn');
    if (copyBtn) {
      const url = copyBtn.dataset.url;
      const ok = await API.copyToClipboard(url);
      if (ok) {
        const orig = copyBtn.textContent;
        copyBtn.textContent = t('mp.linkCopied');
        setTimeout(() => { copyBtn.textContent = orig; }, 2000);
      }
      return;
    }

    // Show QR
    const qrBtn = e.target.closest('.mp-qr-btn');
    if (qrBtn) {
      const playerId = qrBtn.dataset.playerId;
      const qrContainer = document.getElementById(`qr-${playerId}`);
      if (!qrContainer) return;
      if (qrContainer.style.display !== 'none') {
        qrContainer.style.display = 'none';
        return;
      }
      if (!qrContainer.dataset.loaded) {
        const url = qrBtn.dataset.url;
        try {
          const res = await fetch(`/api/qr?url=${encodeURIComponent(url)}`);
          const blob = await res.blob();
          const imgUrl = URL.createObjectURL(blob);
          qrContainer.innerHTML = `<img src="${imgUrl}" class="mp-qr-img" alt="QR">`;
          qrContainer.dataset.loaded = '1';
        } catch {
          qrContainer.innerHTML = `<p class="mp-qr-error">QR failed</p>`;
        }
      }
      qrContainer.style.display = 'block';
      return;
    }

    // Remove player (two-tap)
    const removeBtn = e.target.closest('.mp-remove-btn');
    if (removeBtn && !removeBtn.disabled) {
      const playerId = removeBtn.dataset.playerId;
      if (!removePending[playerId]) {
        removePending[playerId] = true;
        const orig = removeBtn.textContent;
        removeBtn.textContent = t('mp.removeConfirm');
        removeBtn.classList.add('btn-confirm-pending');
        setTimeout(() => {
          if (removePending[playerId]) {
            removePending[playerId] = false;
            removeBtn.textContent = orig;
            removeBtn.classList.remove('btn-confirm-pending');
          }
        }, 3000);
      } else {
        removePending[playerId] = false;
        removeBtn.disabled = true;
        removeBtn.textContent = t('mp.removing');
        try {
          await API.removePlayer(lobbyId, playerId);
          const card = app.querySelector(`.mp-player-card[data-player-id="${playerId}"]`);
          if (card) card.remove();
          showToast(t('mp.removed'));
        } catch {
          removeBtn.disabled = false;
          removeBtn.textContent = t('mp.removeBtn');
          removeBtn.classList.remove('btn-confirm-pending');
          showToast(t('mp.removeFailed'));
        }
      }
      return;
    }
  });
}
