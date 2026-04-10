async function renderMyGuesses(lobbyId) {
  const app = document.getElementById('app');
  app.innerHTML = `<div class="page"><div class="loading-screen"><div class="wine-glass">🍷</div><p>Loading...</p></div></div>`;

  let lobby;
  try {
    lobby = await API.getLobby(lobbyId);
  } catch (err) {
    app.innerHTML = `<div class="page"><div class="alert alert-error">${escHtml(err.error || 'Failed to load.')}</div></div>`;
    return;
  }

  const currentPlayerId = lobby.currentPlayerId;
  const myGuesses = lobby.myGuesses || {};
  const scores = lobby.scores || {};
  const revealedSet = new Set(lobby.revealOrder || []);

  // Calculate my total score across all wines
  let totalScore = 0;
  for (const wineId of Object.keys(scores)) {
    if (scores[wineId]?.[currentPlayerId]) {
      totalScore += scores[wineId][currentPlayerId].total;
    }
  }

  function formatVarietal(obj) {
    if (!obj) return '—';
    if (obj.type === 'blend') {
      return (obj.varietals || []).filter(v => v.grape).map(v => `${v.grape}${v.percentage ? ` ${v.percentage}%` : ''}`).join(', ') || '—';
    }
    return obj.varietals?.[0]?.grape || '—';
  }

  // Build ordered list of wines to show: all wines I didn't bring
  const wineItems = [];
  for (const player of Object.values(lobby.players)) {
    if (player.id === currentPlayerId) continue;
    (player.wines || []).forEach((wine, i) => {
      const info = lobby.wineMap[wine.id];
      if (info) wineItems.push({ wineId: wine.id, info, wineIndex: i + 1 });
    });
  }

  // Sort: revealed first
  wineItems.sort((a, b) => {
    const aRev = revealedSet.has(a.wineId);
    const bRev = revealedSet.has(b.wineId);
    if (aRev && !bRev) return -1;
    if (!aRev && bRev) return 1;
    return 0;
  });

  const guessedCount = wineItems.filter(({ wineId }) => myGuesses[wineId]).length;

  const wineCards = wineItems.map(({ wineId, info, wineIndex }) => {
    const isRevealed = revealedSet.has(wineId);
    const guess = myGuesses[wineId] || null;
    const score = isRevealed ? (scores[wineId]?.[currentPlayerId] || null) : null;
    const wine = isRevealed ? info.wine : null;

    const wineName = isRevealed && wine?.name
      ? wine.name
      : `${info.playerName}'s Wine ${info.wineEmoji}`;

    const attrs = [
      { label: t('mg.grapeVariety'), guessVal: guess ? formatVarietal(guess) : '—',                     wineVal: wine ? formatVarietal(wine) : '—' },
      { label: t('mg.country'),       guessVal: guess?.country  || '—',                                   wineVal: wine?.country  || '—' },
      { label: t('mg.region'),        guessVal: guess?.region   || '—',                                   wineVal: wine?.region   || '—' },
      { label: t('mg.vintage'),       guessVal: guess?.vintage  ? String(guess.vintage) : '—',            wineVal: wine?.vintage  ? String(wine.vintage) : '—' },
    ];

    let attributeSection;
    if (guess) {
      if (isRevealed) {
        const attrRows = attrs.map(({ label, guessVal, wineVal }) => `
          <div class="gvw-attr-row">
            <span class="gvw-label">${label}</span>
            <span class="gvw-guess-val">${escHtml(guessVal)}</span>
            <span class="gvw-wine-val">${escHtml(wineVal)}</span>
          </div>`).join('');
        attributeSection = `
          <div class="gvw-header-row">
            <span class="gvw-label"></span>
            <span class="gvw-col-title">${t('mg.myGuess')}</span>
            <span class="gvw-col-title">${t('mg.theWine')}</span>
          </div>
          ${attrRows}`;
      } else {
        const attrRows = attrs.map(({ label, guessVal }) => `
          <div class="wine-detail-row">
            <span class="wine-detail-label" style="font-size:0.82rem">${label}</span>
            <span class="wine-detail-value" style="font-size:0.82rem">${escHtml(guessVal)}</span>
          </div>`).join('');
        attributeSection = `<div class="wine-detail">${attrRows}</div>`;
      }
    } else {
      attributeSection = `<div style="color:var(--text-muted);font-style:italic;font-size:0.85rem">${t('lb.noGuesses')}</div>`;
    }

    const scoreBadge = isRevealed && score !== null
      ? `<div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex-shrink:0">
           <span class="score-pill">${score.total} ${t('mg.pts')}</span>
           <button class="share-guess-btn" data-wine-id="${wineId}" style="font-size:0.68rem;padding:2px 8px;border-radius:8px;background:transparent;border:1px solid var(--border);color:var(--text-muted);cursor:pointer;white-space:nowrap">↗ ${getLocale() === 'hk' ? '分享' : 'Share'}</button>
         </div>`
      : `<span style="font-size:0.72rem;color:var(--text-muted);flex-shrink:0;white-space:nowrap">${getLocale() === 'hk' ? '仲未開估' : 'Not revealed'}</span>`;

    const scoreBreakdown = isRevealed && score ? `
      <div style="display:flex;justify-content:center;gap:16px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border);font-size:0.78rem;color:var(--text-muted)">
        <span>${t('mg.variety')} <strong style="color:var(--text)">${score.varietal}</strong></span>
        <span>${t('mg.country')} <strong style="color:var(--text)">${score.country}</strong></span>
        <span>${t('mg.region')} <strong style="color:var(--text)">${score.region}</strong></span>
        <span>${t('mg.vintage')} <strong style="color:var(--text)">${score.vintage}</strong></span>
      </div>` : '';

    return `
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
          <span style="font-size:1.4rem;flex-shrink:0">${info.wineEmoji}</span>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:0.9rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(wineName)}</div>
            <div style="font-size:0.78rem;color:var(--text-muted)">${info.playerEmoji} ${escHtml(info.playerName)}</div>
          </div>
          ${scoreBadge}
        </div>
        ${attributeSection}
        ${scoreBreakdown}
      </div>`;
  }).join('');

  app.innerHTML = `
    <div class="page">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <button class="btn btn-secondary btn-sm" id="backBtn" style="width:auto">${t('nav.backToLobby')}</button>
        <div style="text-align:right">
          <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:2px">${t('mg.totalScore')}</div>
          <div style="font-size:1.4rem;font-weight:700;color:var(--wine)">${totalScore} ${t('mg.pts')}</div>
        </div>
      </div>

      <div class="page-header" style="margin-bottom:20px">
        <h1>${t('mg.title')}</h1>
        <p>${getLocale() === 'hk'
          ? `總共${wineItems.length}支我估咗${guessedCount}支`
          : `${guessedCount} of ${wineItems.length} wine${wineItems.length !== 1 ? 's' : ''} guessed`}</p>
      </div>

      ${wineItems.length === 0
        ? `<div class="alert alert-warning">${getLocale() === 'hk' ? '未有酒可以估' : 'No wines to guess yet.'}</div>`
        : wineCards}
    </div>
  `;

  document.getElementById('backBtn').addEventListener('click', () => {
    window.location.hash = `#/lobby/${lobbyId}`;
  });

  document.querySelectorAll('.share-guess-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.hash = `#/lobby/${lobbyId}/share-guess/${btn.dataset.wineId}`;
    });
  });
}
