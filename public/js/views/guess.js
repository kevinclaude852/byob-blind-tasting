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

      ${isRevealed ? renderRevealedView(wineInfo, existingGuess, lobby, wineId) : renderGuessForm(grapes, countries, regions, existingGuess)}
    </div>
  `;

  document.getElementById('backBtn').addEventListener('click', () => {
    window.location.hash = `#/lobby/${lobbyId}`;
  });

  if (!isRevealed) {
    attachWineFormListeners(regions, grapes);

    document.getElementById('guessSubmitBtn').addEventListener('click', async () => {
      const data = collectWineFormData(true);
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

function renderGuessForm(grapes, countries, regions, prefill) {
  return `
    <div class="card">
      ${buildWineFormHTML({ isGuess: true, prefill, grapes, countries, regions })}
      <div id="guessError"></div>
      <button class="btn btn-primary" id="guessSubmitBtn">${t('guess.saveBtn')}</button>
    </div>
  `;
}

function renderRevealedView(wineInfo, myGuess, lobby, wineId) {
  const wine = wineInfo.wine;
  const currentPlayerId = lobby.currentPlayerId;
  const myScore = (lobby.scores && lobby.scores[wineId] && lobby.scores[wineId][currentPlayerId]) || null;

  const varietalStr = wine.type === 'blend'
    ? wine.varietals.map(v => `${v.grape} (${v.percentage}%)`).join(', ')
    : wine.varietals?.[0]?.grape || '—';

  const guessVarietalStr = myGuess && myGuess.varietals && myGuess.varietals.length
    ? myGuess.varietals.map(v => v.grape).join(', ')
    : '—';

  return `
    <div class="revealed-wine">
      <h3>${escHtml(wine.name || '—')}</h3>
      <div class="wine-detail">
        <div class="wine-detail-row"><span class="wine-detail-label">${t('lb.vintage')}</span><span class="wine-detail-value">${wine.vintage || '—'}</span></div>
        <div class="wine-detail-row"><span class="wine-detail-label">${t('lb.varietal')}</span><span class="wine-detail-value">${escHtml(varietalStr)}</span></div>
        <div class="wine-detail-row"><span class="wine-detail-label">${t('lb.country')}</span><span class="wine-detail-value">${escHtml(wine.country || '—')}</span></div>
        <div class="wine-detail-row"><span class="wine-detail-label">${t('lb.region')}</span><span class="wine-detail-value">${escHtml(wine.region || '—')}</span></div>
      </div>
    </div>

    ${myGuess ? `
    <div class="card">
      <h3 style="margin-bottom:12px;font-size:0.95rem;color:var(--text-muted)">Your Guess</h3>
      <div class="wine-detail">
        <div class="wine-detail-row"><span class="wine-detail-label">${t('lb.vintage')}</span><span class="wine-detail-value">${myGuess.vintage || '—'}</span></div>
        <div class="wine-detail-row"><span class="wine-detail-label">${t('lb.varietal')}</span><span class="wine-detail-value">${escHtml(guessVarietalStr)}</span></div>
        <div class="wine-detail-row"><span class="wine-detail-label">${t('lb.country')}</span><span class="wine-detail-value">${escHtml(myGuess.country || '—')}</span></div>
        <div class="wine-detail-row"><span class="wine-detail-label">${t('lb.region')}</span><span class="wine-detail-value">${escHtml(myGuess.region || '—')}</span></div>
      </div>
      ${myScore ? `
      <div class="score-breakdown">
        <h4>Your Score</h4>
        <div class="score-items">
          <div class="score-item"><div class="si-label">${t('lb.varietal')}</div><div class="si-value">${myScore.varietal}</div><div class="si-max">/ 10</div></div>
          <div class="score-item"><div class="si-label">${t('lb.country')}</div><div class="si-value">${myScore.country}</div><div class="si-max">/ 5</div></div>
          <div class="score-item"><div class="si-label">${t('lb.region')}</div><div class="si-value">${myScore.region}</div><div class="si-max">/ 5</div></div>
          <div class="score-item"><div class="si-label">${t('lb.vintage')}</div><div class="si-value">${myScore.vintage}</div><div class="si-max">/ 5</div></div>
        </div>
        <div style="text-align:center;margin-top:16px;font-size:2rem;font-weight:700;color:var(--wine)">${myScore.total} ${t('lb.pts')}</div>
      </div>` : ''}
    </div>` : `<div class="alert alert-warning">You didn't submit a guess for this wine.</div>`}
  `;
}
