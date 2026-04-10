async function renderGuess(lobbyId, wineId) {
  const app = document.getElementById('app');
  app.innerHTML = `<div class="page"><div class="loading-screen"><div class="wine-glass">🍷</div><p>Loading...</p></div></div>`;

  let grapes, countries, regions, lobby, existingGuess;
  try {
    [grapes, countries, regions, lobby, { guess: existingGuess }] = await Promise.all([
      API.getGrapes(), API.getCountries(), API.getRegions(),
      API.getLobby(lobbyId),
      API.getGuess(lobbyId, wineId)
    ]);
  } catch (err) {
    app.innerHTML = `<div class="page"><div class="alert alert-error">${escHtml(err.error || 'Failed to load.')}</div></div>`;
    return;
  }

  const rules = normaliseRulesClient(lobby.rules);
  const wineInfo = lobby.wineMap[wineId];
  if (!wineInfo) {
    app.innerHTML = `<div class="page"><div class="alert alert-error">Wine not found.</div></div>`;
    return;
  }

  const isRevealed = wineInfo.revealed;
  const wine = wineInfo.wine;

  app.innerHTML = `
    <div class="page">
      <button class="btn btn-secondary btn-sm" id="backBtn" style="width:auto;margin-bottom:16px">${t('nav.backToLobby')}</button>

      <div class="wine-owner-header">
        <div class="owner-emoji">${wineInfo.playerEmoji}</div>
        <div>
          <h2>${escHtml(wineInfo.playerName)}'s Wine ${wineInfo.wineEmoji}</h2>
          <p>${isRevealed ? 'Revealed — see the results below' : t('guess.subtitle')}</p>
        </div>
      </div>

      ${isRevealed ? renderRevealedView(wineInfo, existingGuess, lobby, wineId, rules) : renderGuessForm(grapes, countries, regions, existingGuess, rules)}
    </div>
  `;

  document.getElementById('backBtn').addEventListener('click', () => {
    window.location.hash = `#/lobby/${lobbyId}`;
  });

  if (!isRevealed) {
    attachWineFormListeners(regions, grapes);

    document.getElementById('guessSubmitBtn').addEventListener('click', async () => {
      const data = collectWineFormData(true, rules);
      const errorEl = document.getElementById('guessError');
      const btn = document.getElementById('guessSubmitBtn');
      btn.disabled = true;
      btn.innerHTML = '<span class="spin">⏳</span> Saving...';
      errorEl.innerHTML = '';

      try {
        await API.submitGuess(lobbyId, wineId, data);
        showToast('Guess saved! ✓');
        window.location.hash = `#/lobby/${lobbyId}`;
      } catch (err) {
        const msgs = err.errors ? err.errors : [err.error || 'Failed to save guess.'];
        errorEl.innerHTML = `<div class="alert alert-error"><ul>${msgs.map(m => `<li>${escHtml(m)}</li>`).join('')}</ul></div>`;
        btn.disabled = false;
        btn.innerHTML = t('guess.saveBtn');
      }
    });
  }
}

function renderGuessForm(grapes, countries, regions, prefill, rules) {
  return `
    <div class="card">
      ${buildWineFormHTML({ isGuess: true, prefill, grapes, countries, regions, rules })}
      <div id="guessError"></div>
      <button class="btn btn-primary" id="guessSubmitBtn">${t('guess.saveBtn')}</button>
    </div>
  `;
}

function renderRevealedView(wineInfo, myGuess, lobby, wineId, rules) {
  const wine = wineInfo.wine;
  const r = normaliseRulesClient(rules);
  const currentPlayerId = lobby.currentPlayerId;
  const myScore = (lobby.scores && lobby.scores[wineId] && lobby.scores[wineId][currentPlayerId]) || null;

  const compareRows = buildCompareRows(wine, myGuess, rules);

  const wineDetailRows = [
    wine.vintage ? `<div class="wine-detail-row"><span class="wine-detail-label">${t('lb.vintage')}</span><span class="wine-detail-value">${wine.vintage}</span></div>` : '',
    r.grape.enabled ? `<div class="wine-detail-row"><span class="wine-detail-label">${t('lb.varietal')}</span><span class="wine-detail-value">${escHtml(formatVarietalClient(wine))}</span></div>` : '',
    wine.country ? `<div class="wine-detail-row"><span class="wine-detail-label">${t('lb.country')}</span><span class="wine-detail-value">${escHtml(wine.country)}</span></div>` : '',
    wine.region  ? `<div class="wine-detail-row"><span class="wine-detail-label">${t('lb.region')}</span><span class="wine-detail-value">${escHtml(wine.region)}</span></div>`  : '',
    r.abv.enabled && wine.abv != null ? `<div class="wine-detail-row"><span class="wine-detail-label">ABV</span><span class="wine-detail-value">${wine.abv}%</span></div>` : '',
    r.price.enabled && wine.price != null ? `<div class="wine-detail-row"><span class="wine-detail-label">${t('form.price')}</span><span class="wine-detail-value">${formatWinePrice(wine.price, r.price.currency)}</span></div>` : '',
  ].filter(Boolean).join('');

  const maxScore = getMaxScore(rules);
  const scoreChips = myScore ? buildScoreChips(myScore, rules) : null;

  return `
    <div class="revealed-wine">
      <h3>${escHtml(wine.name || '—')}</h3>
      <div class="wine-detail">${wineDetailRows}</div>
    </div>

    ${myGuess ? `
    <div class="card">
      <h3 style="margin-bottom:12px;font-size:0.95rem;color:var(--text-muted)">Your Guess</h3>
      <div class="wine-detail">
        ${compareRows.map(row => `
          <div class="wine-detail-row">
            <span class="wine-detail-label">${row.label}</span>
            <span class="wine-detail-value">${escHtml(row.guessVal)}</span>
          </div>`).join('')}
      </div>
      ${myScore ? `
      <div class="score-breakdown">
        <h4>Your Score</h4>
        <div class="score-items">
          ${scoreChips.filter(c => c.label !== (getLocale() === 'hk' ? '總分' : 'Total')).map(c => `
            <div class="score-item">
              <div class="si-label">${c.label}</div>
              <div class="si-value">${c.val}</div>
              <div class="si-max">/ ${maxScore > 0 ? '' : '?'}</div>
            </div>`).join('')}
        </div>
        <div style="text-align:center;margin-top:16px;font-size:2rem;font-weight:700;color:var(--wine)">${myScore.total} ${t('lb.pts')}</div>
      </div>` : ''}
    </div>` : `<div class="alert alert-warning">You didn't submit a guess for this wine.</div>`}
  `;
}
