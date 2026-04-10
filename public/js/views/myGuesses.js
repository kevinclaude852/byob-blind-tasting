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

  const rules = normaliseRulesClient(lobby.rules);
  const currentPlayerId = lobby.currentPlayerId;
  const myGuesses = lobby.myGuesses || {};
  const scores = lobby.scores || {};
  const revealedSet = new Set(lobby.revealOrder || []);

  let totalScore = 0;
  for (const wineId of Object.keys(scores)) {
    if (scores[wineId]?.[currentPlayerId]) {
      totalScore += scores[wineId][currentPlayerId].total;
    }
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

    const compareRows = buildCompareRows(wine, guess, rules);

    let attributeSection;
    if (guess) {
      if (isRevealed) {
        const attrRows = compareRows.map(({ label, guessVal, wineVal }) => `
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
        // Not revealed yet: show only my guess
        const r = normaliseRulesClient(rules);
        const guessFields = [];
        if (r.grape.enabled) guessFields.push({ label: t('mg.grapeVariety'), val: formatVarietalClient(guess) });
        if (r.country.enabled) guessFields.push({ label: t('mg.country'), val: guess.country || '—' });
        if (r.region.enabled) guessFields.push({ label: t('mg.region'), val: guess.region || '—' });
        if (r.vintage.enabled) guessFields.push({ label: t('mg.vintage'), val: guess.vintage ? String(guess.vintage) : '—' });
        if (r.abv.enabled) guessFields.push({ label: t('mg.abv'), val: guess.abv != null ? `${guess.abv}%` : '—' });
        if (r.price.enabled) guessFields.push({ label: t('mg.price'), val: guess.priceRange ? formatPriceBucket(guess.priceRange, r.price.currency) : '—' });

        const attrRows = guessFields.map(({ label, val }) => `
          <div class="wine-detail-row">
            <span class="wine-detail-label" style="font-size:0.82rem">${label}</span>
            <span class="wine-detail-value" style="font-size:0.82rem">${escHtml(val)}</span>
          </div>`).join('');
        attributeSection = `<div class="wine-detail">${attrRows}</div>`;
      }
    } else {
      attributeSection = `<div style="color:var(--text-muted);font-style:italic;font-size:0.85rem">${t('lb.noGuesses')}</div>`;
    }

    const scoreBadge = isRevealed && score !== null
      ? `<span class="score-pill" style="flex-shrink:0">${score.total} ${t('mg.pts')}</span>`
      : `<span style="font-size:0.72rem;color:var(--text-muted);flex-shrink:0;white-space:nowrap">${getLocale() === 'hk' ? '仲未開估' : 'Not revealed'}</span>`;

    const scoreBreakdown = isRevealed && score
      ? (() => {
          const chips = buildScoreChips(score, rules).filter(c => c.label !== (getLocale() === 'hk' ? '總分' : 'Total'));
          return `<div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-top:12px;padding-top:12px;border-top:1px solid var(--border);font-size:0.78rem;color:var(--text-muted)">
            ${chips.map(c => `<span>${c.label} <strong style="color:var(--text)">${c.val}</strong></span>`).join('')}
          </div>`;
        })()
      : '';

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
        ${isRevealed && guess ? `<div style="margin-top:12px;text-align:center">
          <a href="#/lobby/${lobbyId}/guess-share/${wineId}" class="btn btn-secondary btn-sm" style="width:auto;text-decoration:none">📸 ${getLocale() === 'hk' ? '分享我嘅答案' : 'Share My Guess'}</a>
        </div>` : ''}
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
}
