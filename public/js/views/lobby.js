async function renderLobby(lobbyId) {
  const app = document.getElementById('app');
  app.innerHTML = `<div class="page"><div class="loading-screen"><div class="wine-glass">🍷</div><p>Loading...</p></div></div>`;

  let lobby, qrDataUrl = null;
  let countdownInterval = null; // ticks every 500ms to refresh mm:ss displays

  async function loadData() {
    lobby = await API.getLobby(lobbyId);
  }

  async function loadQR() {
    try {
      const url = `${location.protocol}//${location.host}/#/lobby/${lobbyId}`;
      const res = await fetch(`/api/qr?url=${encodeURIComponent(url)}`);
      if (res.ok) { const d = await res.json(); qrDataUrl = d.dataUrl; }
    } catch {}
  }

  try {
    await Promise.all([loadData(), loadQR()]);
  } catch (err) {
    app.innerHTML = `<div class="page"><div class="alert alert-error">Failed to load lobby. ${escHtml(err.error || '')}</div></div>`;
    return;
  }

  // ── Countdown tick ──────────────────────────────────────────────────────────
  function startCountdownTick() {
    if (countdownInterval) clearInterval(countdownInterval);
    const displays = document.querySelectorAll('.wine-countdown');
    if (!displays.length) return;

    countdownInterval = setInterval(() => {
      const now = Date.now();
      document.querySelectorAll('.wine-countdown').forEach(el => {
        const revealAt = Number(el.dataset.revealAt);
        const remaining = Math.max(0, revealAt - now);
        const timerEl = el.querySelector('.countdown-timer');
        if (!timerEl) return;
        const totalSec = Math.ceil(remaining / 1000);
        const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
        const ss = String(totalSec % 60).padStart(2, '0');
        timerEl.textContent = `${mm}:${ss}`;
      });
    }, 500);
  }

  // ── Reveal modal ────────────────────────────────────────────────────────────
  function showRevealModal(wineId, wineLabel) {
    // Remove any existing modal
    document.getElementById('revealModalOverlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'revealModalOverlay';
    overlay.className = 'reveal-modal-overlay';
    overlay.innerHTML = `
      <div class="reveal-modal" role="dialog" aria-modal="true">
        <h3 class="reveal-modal-title">Reveal Wine</h3>
        <p class="reveal-modal-sub">Choose when to reveal <strong>${escHtml(wineLabel)}</strong></p>
        <div class="reveal-option-grid">
          <button class="btn reveal-option-btn reveal-option-now" data-minutes="0">Reveal Now</button>
        </div>
        <div class="reveal-modal-divider">
          <span class="reveal-modal-divider-text">Or reveal after counting down from</span>
        </div>
        <div class="reveal-option-grid">
          <button class="btn reveal-option-btn" data-minutes="3">3 min</button>
          <button class="btn reveal-option-btn" data-minutes="5">5 min</button>
          <button class="btn reveal-option-btn" data-minutes="10">10 min</button>
          <button class="btn reveal-option-btn" data-minutes="15">15 min</button>
          <button class="btn reveal-option-btn" data-minutes="30">30 min</button>
        </div>
        <button class="btn btn-ghost reveal-modal-cancel" id="revealModalCancel">Cancel</button>
      </div>`;
    document.body.appendChild(overlay);

    // Cancel
    overlay.querySelector('#revealModalCancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    // Option selected
    overlay.querySelectorAll('.reveal-option-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const minutes = Number(btn.dataset.minutes);
        btn.disabled = true;
        btn.textContent = '...';
        overlay.remove();
        try {
          await API.revealWine(lobbyId, wineId, minutes);
          // Always re-render so the host sees the countdown (or the reveal) immediately
          await loadData(); render();
          if (lobby.revealOrder.length > 0) loadMiniScoreboard();
        } catch (err) {
          showToast(err.error || 'Failed to reveal.');
        }
      });
    });
  }

  // ── Wine row builder ────────────────────────────────────────────────────────
  function buildWineRows(player) {
    const wines = player.wines || [];
    const currentPlayerId = lobby.currentPlayerId;
    const isHost = lobby.isHost;
    const isNonParticipatingHost = isHost && lobby.hostParticipating === false;
    const isSelf = player.id === currentPlayerId;

    if (wines.length === 0) {
      return `<div class="player-status">⏳ No wines yet</div>`;
    }

    return wines.map((wine, wineIndex) => {
      const isRevealed = wine.revealed;
      const isPending = !isRevealed && !!wine.revealAt; // countdown active
      const myGuess = !isSelf ? lobby.myGuesses[wine.id] : null;
      const hasGuessed = !!myGuess;
      const myScore = isRevealed && !isSelf
        ? (lobby.scores && lobby.scores[wine.id] && lobby.scores[wine.id][currentPlayerId]) || null
        : null;

      // Status indicators
      let statusHtml = '';
      if (isRevealed) {
        if (wine.name) {
          statusHtml += `<span class="wine-name-pill" title="${escHtml(wine.name)}">${escHtml(wine.name)}</span>`;
        }
      } else {
        statusHtml += `<span style="font-size:0.75rem;color:var(--text-muted)">${escHtml(player.name)}'s wine ${wineIndex + 1}</span>`;
      }
      const scorePillHtml = myScore !== null
        ? `<span class="score-pill" style="flex-shrink:0;margin-left:auto">${myScore.total}pts</span>`
        : '';

      // Countdown display (shown to everyone when a timed reveal is pending)
      const countdownHtml = isPending
        ? `<div class="wine-countdown" data-reveal-at="${wine.revealAt}">
             <span class="countdown-label">Reveals in</span>
             <span class="countdown-timer">--:--</span>
           </div>`
        : '';

      // Action buttons
      let actionsHtml = '';
      if (isSelf) {
        if (!isRevealed && !isPending) {
          if (isHost) {
            actionsHtml += `<button class="btn btn-xs btn-gold reveal-btn" data-wine-id="${wine.id}">Reveal</button>`;
          }
          actionsHtml += `<a href="#/lobby/${lobbyId}/wine/${wine.id}" class="btn btn-xs btn-secondary" style="text-decoration:none">Edit</a>`;
        }
      } else {
        if (!isRevealed) {
          if (!isNonParticipatingHost) {
            actionsHtml += `<button class="btn btn-xs btn-danger guess-btn" data-wine-id="${wine.id}">${hasGuessed ? 'Change My Guess' : 'Guess'}</button>`;
          }
          // Only show Reveal button if no countdown is already running
          if (isHost && !isPending) {
            actionsHtml += `<button class="btn btn-xs btn-gold reveal-btn" data-wine-id="${wine.id}">Reveal</button>`;
          }
        }
      }

      if (isRevealed) {
        const varietalStr = wine.type === 'blend'
          ? (wine.varietals || []).filter(v => v.grape).map(v => `${v.grape} ${v.percentage}%`).join(' — ')
          : wine.varietals?.[0]?.grape || null;
        const detailRows = [
          wine.country ? `<div class="wine-reveal-row"><span>Country</span><span>${escHtml(wine.country)}</span></div>` : '',
          wine.region  ? `<div class="wine-reveal-row"><span>Region</span><span>${escHtml(wine.region)}</span></div>`  : '',
          varietalStr  ? `<div class="wine-reveal-row"><span>Variety</span><span>${escHtml(varietalStr)}</span></div>`  : '',
          wine.vintage ? `<div class="wine-reveal-row"><span>Vintage</span><span>${wine.vintage}</span></div>`          : '',
        ].filter(Boolean).join('');
        return `
          <div class="wine-row-wrap">
            <div class="wine-row wine-row--revealed wine-row--expandable" data-wine-accord="${wine.id}">
              <span class="wine-emoji-badge">${wine.emoji}</span>
              <div class="wine-row-status">${statusHtml}</div>
              ${scorePillHtml}
              <span class="wine-row-chevron">›</span>
            </div>
            <div class="wine-reveal-accordion" id="wine-accord-${wine.id}">
              ${detailRows || '<div style="color:var(--text-muted);font-size:0.8rem;font-style:italic">No details available</div>'}
            </div>
          </div>`;
      }

      // Unrevealed wine — accordion shows who has/hasn't guessed
      const guessedSet = new Set(lobby.guessStatus?.[wine.id] || []);
      const guesserRows = Object.values(lobby.players)
        .filter(p => p.participating !== false && p.id !== player.id)
        .map(p => {
          const checked = guessedSet.has(p.id);
          return `<div class="wine-guess-row">
            <span class="wine-guess-avatar">${p.emoji}</span>
            <span class="wine-guess-name">${escHtml(p.name)}</span>
            <span class="wine-guess-check">${checked ? '✅' : ''}</span>
          </div>`;
        }).join('');

      return `
        <div class="wine-row-wrap">
          <div class="wine-row wine-row--unrev-expandable" data-wine-guess-accord="${wine.id}">
            <span class="wine-emoji-badge">${wine.emoji}</span>
            <div class="wine-row-status">${statusHtml}</div>
            ${scorePillHtml}
            ${countdownHtml}
            ${actionsHtml ? `<div class="wine-row-actions">${actionsHtml}</div>` : ''}
            <span class="wine-guess-chevron">›</span>
          </div>
          <div class="wine-guess-accordion" id="wine-guess-accord-${wine.id}">
            ${guesserRows || '<div style="font-size:0.78rem;color:var(--text-muted);font-style:italic;padding:4px 0">No other players yet</div>'}
          </div>
        </div>`;
    }).join('');
  }

  // ── Main render ─────────────────────────────────────────────────────────────
  function render() {
    // Stop any existing countdown tick before rebuilding DOM
    if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }

    const currentPlayerId = lobby.currentPlayerId;
    const isHost = lobby.isHost;
    const joinUrl = `${location.protocol}//${location.host}/#/lobby/${lobbyId}`;
    const hasReveals = lobby.revealOrder && lobby.revealOrder.length > 0;
    const playerCount = Object.values(lobby.players).filter(p => p.participating !== false).length;
    const totalWines = Object.values(lobby.players).reduce((sum, p) => sum + (p.wines || []).length, 0);
    const revealedWines = lobby.revealOrder ? lobby.revealOrder.length : 0;

    // Own card always first; hide non-participating host from their own view too
    const isNonParticipatingHost = isHost && lobby.hostParticipating === false;
    const sortedPlayers = Object.values(lobby.players)
      .filter(p => !(p.id === currentPlayerId && isNonParticipatingHost))
      .sort((a, b) => {
        if (a.id === currentPlayerId) return -1;
        if (b.id === currentPlayerId) return 1;
        return 0;
      });

    const playerCards = sortedPlayers.map(player => {
      const isSelf = player.id === currentPlayerId;
      return `
        <div class="player-card${isSelf ? ' self' : ''}" data-player-id="${player.id}">
          <div class="player-card-header">
            <div class="player-emoji">${player.emoji}</div>
            <div class="player-card-info">
              <div class="player-name">${escHtml(player.name)}</div>
              ${isSelf ? `<span class="badge badge-you">You</span>` : ''}
            </div>
          </div>
          <div class="player-wines-section">
            ${buildWineRows(player)}
          </div>
          ${isSelf && !(isHost && lobby.hostParticipating === false) ? `<div style="margin-top:8px"><a href="#/lobby/${lobbyId}/wine" class="btn btn-sm btn-primary" style="width:100%;text-decoration:none;text-align:center;display:block">+ Add Wine</a></div>` : ''}
        </div>`;
    }).join('');

    app.innerHTML = `
      <div class="page wide">
        <div class="lobby-header">
          ${isHost ? `
            <div class="editable-name">
              <input type="text" id="lobbyNameInput" value="${escHtml(lobby.lobbyName)}" placeholder="Lobby name">
              <button class="edit-save-btn" id="saveLobbyName">Save</button>
            </div>` : `<h2>${escHtml(lobby.lobbyName)}</h2>`}
        </div>

        ${isHost ? `
        <div class="share-box">
          <h3>Share Link</h3>
          <div class="share-link-row">
            <div class="share-url">${escHtml(joinUrl)}</div>
            <div class="share-actions">
              <button class="btn" id="copyUrlBtn">📋 Copy Link</button>
              ${qrDataUrl ? `<button class="btn" id="toggleQrBtn">QR Code</button>` : ''}
            </div>
          </div>
          ${qrDataUrl ? `<div class="qr-container" id="qrContainer" style="display:none"><img src="${qrDataUrl}" alt="QR Code"></div>` : ''}
        </div>` : ''}

        <div class="section-header">
          <div>
            <h3>Players (${playerCount})</h3>
            <h3 style="margin-top:3px">Wines (${revealedWines} / ${totalWines})</h3>
          </div>
          ${hasReveals ? `<a href="#/lobby/${lobbyId}/scores" class="btn btn-secondary btn-sm" style="width:auto">🏆 Scoreboard</a>` : ''}
        </div>

        <div class="players-grid" id="playersGrid">${playerCards}</div>

        ${hasReveals ? `<div id="miniScoreboard" style="margin-top:16px"></div>` : ''}
      </div>
    `;

    // Host: rename lobby
    if (isHost) {
      document.getElementById('saveLobbyName')?.addEventListener('click', async () => {
        const name = document.getElementById('lobbyNameInput').value.trim();
        if (!name) return;
        try { await API.renameLobby(lobbyId, name); lobby.lobbyName = name; showToast('Lobby renamed!'); } catch {}
      });

      document.getElementById('copyUrlBtn')?.addEventListener('click', async () => {
        const ok = await API.copyToClipboard(joinUrl);
        showToast(ok ? 'Link copied! 📋' : 'Copy failed — please copy the link manually.');
      });

      document.getElementById('toggleQrBtn')?.addEventListener('click', () => {
        const qr = document.getElementById('qrContainer');
        qr.style.display = qr.style.display === 'none' ? '' : 'none';
      });
    }

    // Revealed wine accordion
    document.querySelectorAll('.wine-row--expandable').forEach(row => {
      row.addEventListener('click', () => {
        const accordion = document.getElementById(`wine-accord-${row.dataset.wineAccord}`);
        const chevron = row.querySelector('.wine-row-chevron');
        const isOpen = accordion.classList.toggle('open');
        chevron.style.transform = isOpen ? 'rotate(90deg)' : '';
      });
    });

    // Unrevealed wine guess-status accordion
    document.querySelectorAll('.wine-row--unrev-expandable').forEach(row => {
      row.addEventListener('click', () => {
        const accordion = document.getElementById(`wine-guess-accord-${row.dataset.wineGuessAccord}`);
        const chevron = row.querySelector('.wine-guess-chevron');
        const isOpen = accordion.classList.toggle('open');
        if (chevron) chevron.style.transform = isOpen ? 'rotate(90deg)' : '';
      });
    });

    // Guess buttons
    document.querySelectorAll('.guess-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.location.hash = `#/lobby/${lobbyId}/guess/${btn.dataset.wineId}`;
      });
    });

    // Reveal buttons — open timed reveal modal
    document.querySelectorAll('.reveal-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const wineId = btn.dataset.wineId;
        const wineInfo = lobby.wineMap[wineId];
        const label = wineInfo ? `${wineInfo.playerName}'s wine ${wineInfo.wineEmoji}` : 'this wine';
        showRevealModal(wineId, label);
      });
    });

    // Start countdown tickers if any are active
    startCountdownTick();

    if (hasReveals) loadMiniScoreboard();
  }

  async function loadMiniScoreboard() {
    try {
      const data = await API.getScores(lobbyId);
      const el = document.getElementById('miniScoreboard');
      if (!el) return;
      const sorted = Object.entries(data.scores).sort((a, b) => b[1].total - a[1].total).slice(0, 5);
      const medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];
      el.innerHTML = `<div class="scoreboard">
        ${sorted.map(([pid, s], i) => `
          <div class="score-row">
            <div class="score-rank ${i===0?'gold':i===1?'silver':i===2?'bronze':''}">${medals[i]}</div>
            <div class="score-emoji">${s.emoji}</div>
            <div class="score-name">${escHtml(s.name)}</div>
            <div class="score-total">${s.total}</div>
          </div>`).join('')}
      </div>`;
    } catch {}
  }

  render();

  const session = API.getSession(lobbyId);
  SocketManager.connect(lobbyId, session?.playerId);

  // Only re-render if currently on the lobby page — prevents overwriting other pages
  function onLobbyPage() {
    return !!window.location.hash.match(new RegExp(`^#/lobby/${lobbyId}$`));
  }

  SocketManager.on('player-joined', async () => {
    if (!onLobbyPage()) return;
    await loadData(); render();
  });
  SocketManager.on('wine-revealed', async () => {
    if (!onLobbyPage()) return;
    await loadData(); render(); showToast('A wine has been revealed! 🔓');
  });
  SocketManager.on('wine-countdown-started', async ({ wineId, revealAt }) => {
    if (!onLobbyPage()) return;
    await loadData(); render();
    const minutes = Math.round((revealAt - Date.now()) / 60000);
    showToast(`Countdown started — wine reveals in ${minutes} min ⏱️`);
  });
  SocketManager.on('guess-submitted', async () => {
    if (!onLobbyPage()) return;
    await loadData(); render();
  });
}
