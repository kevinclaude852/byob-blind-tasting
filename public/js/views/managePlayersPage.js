async function renderManagePlayers(lobbyId) {
  const app = document.getElementById('app');
  app.innerHTML = `<div class="page"><p class="loading-text">${t('app.loading')}</p></div>`;

  const backBtnHtml = `<button class="btn btn-secondary btn-sm" id="backBtn" style="width:auto;margin-bottom:16px">${t('nav.backToLobby')}</button>`;
  const bindBack = () => document.getElementById('backBtn')?.addEventListener('click', () => {
    window.location.hash = `#/lobby/${lobbyId}`;
  });

  let data;
  try {
    data = await API.getRecoveryLinks(lobbyId);
  } catch (e) {
    const msg = e.status === 403 ? 'Host only.' : t('app.failedLoad');
    app.innerHTML = `<div class="page">${backBtnHtml}<div class="alert alert-error">${msg}</div></div>`;
    bindBack();
    return;
  }

  const session = API.getSession(lobbyId);
  const baseUrl = window.location.origin + window.location.pathname;
  const buildRecoveryUrl = (player) => `${baseUrl}#/lobby/${lobbyId}/recover/${player.id}/${player.sessionToken}`;

  const hostPlayer = data.players.find(p => p.id === session?.playerId);
  const otherPlayers = data.players.filter(p => p.id !== session?.playerId);
  const playerById = Object.fromEntries(data.players.map(p => [p.id, p]));

  function renderPlayerCard(player, isHost) {
    const recoveryUrl = buildRecoveryUrl(player);
    const wineLabel = `${player.wineCount} ${t('mp.wineCount')}`;
    const helpText = isHost ? t('mp.yourRecovery') : t('mp.recoveryHelp').replace('{name}', escHtml(player.name));
    const removeBtn = isHost ? '' : `<button class="btn btn-danger btn-sm mp-remove-btn" data-player-id="${escHtml(player.id)}"
        ${player.hasRevealedWines ? `disabled title="${escHtml(t('mp.cannotRemove'))}"` : ''}>${t('mp.removeBtn')}</button>`;

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
          <div class="mp-recovery-label">${helpText}</div>
          <div class="mp-recovery-actions">
            <button class="btn btn-secondary btn-sm mp-copy-btn" data-url="${escHtml(recoveryUrl)}">${t('mp.copyLink')}</button>
            <button class="btn btn-secondary btn-sm mp-qr-btn" data-url="${escHtml(recoveryUrl)}" data-player-id="${escHtml(player.id)}">${t('mp.showQr')}</button>
            ${removeBtn}
          </div>
        </div>
        <div class="mp-qr-container" id="qr-${escHtml(player.id)}" style="display:none"></div>
      </div>`;
  }

  app.innerHTML = `
    <div class="page" id="mpPage">
      ${backBtnHtml}
      <div class="page-header">
        <h2>${t('mp.title')}</h2>
        <p class="page-subtitle">${t('mp.subtitle')}</p>
      </div>
      <div class="mp-players-list">
        ${hostPlayer ? renderPlayerCard(hostPlayer, true) : ''}
        ${otherPlayers.map(p => renderPlayerCard(p, false)).join('') || `<p class="mp-empty">${t('lobby.noOtherPlayers')}</p>`}
      </div>
    </div>`;

  bindBack();

  function confirmRemove(player) {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'reveal-modal-overlay';
      overlay.innerHTML = `
        <div class="reveal-modal" role="dialog" aria-modal="true">
          <h3 class="reveal-modal-title">${t('mp.removeTitle')}</h3>
          <p class="reveal-modal-sub">${t('mp.removeQuestion').replace('{name}', `<strong>${escHtml(player.name)}</strong>`)}</p>
          <div class="mp-confirm-actions">
            <button class="btn btn-danger" data-answer="yes">${t('mp.yes')}</button>
            <button class="btn btn-secondary" data-answer="no">${t('mp.no')}</button>
          </div>
        </div>`;
      const close = (answer) => { overlay.remove(); resolve(answer); };
      overlay.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-answer]');
        if (btn) close(btn.dataset.answer === 'yes');
        else if (e.target === overlay) close(false);
      });
      document.body.appendChild(overlay);
    });
  }

  document.getElementById('mpPage').addEventListener('click', async (e) => {
    const copyBtn = e.target.closest('.mp-copy-btn');
    if (copyBtn) {
      const ok = await API.copyToClipboard(copyBtn.dataset.url);
      showToast(ok ? t('mp.linkCopied') : t('lobby.copyFailed'));
      return;
    }

    const qrBtn = e.target.closest('.mp-qr-btn');
    if (qrBtn) {
      const qrContainer = document.getElementById(`qr-${qrBtn.dataset.playerId}`);
      if (!qrContainer) return;
      if (qrContainer.style.display !== 'none') {
        qrContainer.style.display = 'none';
        return;
      }
      if (!qrContainer.dataset.loaded) {
        try {
          const res = await fetch(`/api/qr?url=${encodeURIComponent(qrBtn.dataset.url)}`);
          const { dataUrl } = await res.json();
          if (!dataUrl) throw new Error();
          qrContainer.innerHTML = `<img src="${dataUrl}" class="mp-qr-img" alt="QR">`;
          qrContainer.dataset.loaded = '1';
        } catch {
          qrContainer.innerHTML = `<p class="mp-qr-error">QR failed</p>`;
        }
      }
      qrContainer.style.display = 'block';
      return;
    }

    const removeBtn = e.target.closest('.mp-remove-btn');
    if (removeBtn && !removeBtn.disabled) {
      const playerId = removeBtn.dataset.playerId;
      if (!(await confirmRemove(playerById[playerId]))) return;
      removeBtn.disabled = true;
      removeBtn.textContent = t('mp.removing');
      try {
        await API.removePlayer(lobbyId, playerId);
        document.querySelector(`.mp-player-card[data-player-id="${playerId}"]`)?.remove();
        showToast(t('mp.removed'));
      } catch (err) {
        removeBtn.disabled = false;
        removeBtn.textContent = t('mp.removeBtn');
        showToast(err?.error || t('mp.removeFailed'));
      }
    }
  });
}
