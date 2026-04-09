async function renderScoreboard(lobbyId) {
  const app = document.getElementById('app');
  app.innerHTML = `<div class="page"><div class="loading-screen"><div class="wine-glass">🍷</div><p>Loading...</p></div></div>`;

  let data;
  try {
    data = await API.getScores(lobbyId);
  } catch (err) {
    app.innerHTML = `<div class="page"><div class="alert alert-error">${escHtml(err.error || 'Failed to load scores.')}</div></div>`;
    return;
  }

  const { scores, revealOrder, wineMap, guesses = {} } = data;
  const session = API.getSession(lobbyId);
  const currentPlayerId = session?.playerId;

  const sorted = Object.entries(scores).sort((a, b) => b[1].total - a[1].total);

  // Dense ranking: tied scores share the same rank, next rank is +1 (not +n)
  const denseRanks = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) denseRanks.push(1);
    else if (sorted[i][1].total === sorted[i - 1][1].total) denseRanks.push(denseRanks[i - 1]);
    else denseRanks.push(denseRanks[i - 1] + 1);
  }
  const rankMedals = { 1: '🥇', 2: '🥈', 3: '🥉' };

  // Helper: format varietals from a wine or guess object
  function formatVarietal(obj) {
    if (!obj) return '—';
    if (obj.type === 'blend') {
      return (obj.varietals || []).filter(v => v.grape).map(v => `${v.grape}${v.percentage ? ` ${v.percentage}%` : ''}`).join(', ') || '—';
    }
    return obj.varietals?.[0]?.grape || '—';
  }

  // ── Overall Rankings ──────────────────────────────────────────────────────
  const rankingRows = sorted.map(([pid, s], i) => {
    const rank = denseRanks[i];
    const wineRows = revealOrder
      .filter(wineId => wineMap[wineId] && wineMap[wineId].playerId !== pid && s.breakdown?.[wineId])
      .map(wineId => {
        const info = wineMap[wineId];
        const score = s.breakdown[wineId];
        const guess = (guesses[pid] || {})[wineId] || null;
        const wine = info.wine;
        const accId = `swine-${pid}-${wineId}`;

        // Guess vs Wine attribute rows
        const attrs = [
          { label: t('lb.varietal'), guessVal: formatVarietal(guess),        wineVal: formatVarietal(wine) },
          { label: t('lb.country'), guessVal: guess?.country  || '—',       wineVal: wine?.country  || '—' },
          { label: t('lb.region'),  guessVal: guess?.region   || '—',       wineVal: wine?.region   || '—' },
          { label: t('lb.vintage'), guessVal: guess?.vintage  ? String(guess.vintage) : '—', wineVal: wine?.vintage ? String(wine.vintage) : '—' },
        ];
        const attrRows = attrs.map(({ label, guessVal, wineVal }) => `
          <div class="gvw-attr-row">
            <span class="gvw-label">${label}</span>
            <span class="gvw-guess-val">${escHtml(guessVal)}</span>
            <span class="gvw-wine-val">${escHtml(wineVal)}</span>
          </div>`).join('');

        return `
          <div class="score-accordion-row score-wine-expandable" data-acc="${accId}">
            <span style="font-size:1.2rem;flex-shrink:0">${info.playerEmoji}</span>
            <span class="score-acc-wine-name">${escHtml(info.wine?.name || info.playerName)}</span>
            <span class="score-acc-pts">${score.total} ${t('lb.pts')}</span>
            <span class="score-wine-chevron">›</span>
          </div>
          <div class="score-wine-accordion" id="${accId}">
            <div class="gvw-header-row">
              <span class="gvw-label"></span>
              <span class="gvw-col-title">${t('lb.theGuess')}</span>
              <span class="gvw-col-title">${t('lb.theWine')}</span>
            </div>
            ${attrRows}
          </div>`;
      }).join('');

    return `
      <div class="score-row score-row-expandable" data-pid="${pid}">
        <div class="score-rank ${rank===1?'gold':rank===2?'silver':rank===3?'bronze':''}">${rankMedals[rank] || `${rank}.`}</div>
        <div class="score-emoji">${s.emoji}</div>
        <div class="score-name">${escHtml(s.name)}</div>
        <div class="score-total">${s.total} ${t('lb.pts')}</div>
        <div class="score-chevron">›</div>
      </div>
      <div class="score-accordion" id="accordion-${pid}">
        ${wineRows || `<div style="padding:10px 20px;font-size:0.82rem;color:var(--text-muted);font-style:italic">${t('lb.noGuesses')}</div>`}
      </div>`;
  }).join('');

  // ── Wine Breakdown cards ──────────────────────────────────────────────────
  const sortedRevealOrder = [...revealOrder].sort((a, b) => {
    const aOwn = wineMap[a]?.playerId === currentPlayerId;
    const bOwn = wineMap[b]?.playerId === currentPlayerId;
    if (aOwn && !bOwn) return -1;
    if (!aOwn && bOwn) return 1;
    return 0;
  });

  const wineCards = sortedRevealOrder.map(wineId => {
    const info = wineMap[wineId];
    if (!info || !info.wine) return '';
    const wine = info.wine;
    const varietalStr = formatVarietal(wine);

    const wineScores = sorted
      .filter(([pid]) => pid !== info.playerId && scores[pid]?.breakdown?.[wineId])
      .map(([pid, s]) => ({ pid, name: s.name, emoji: s.emoji, score: s.breakdown[wineId] }));

    return `
      <div class="wine-swipe-card card">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
          <span style="font-size:1.6rem">${wine.emoji}</span>
          <div style="min-width:0">
            <div style="font-weight:700;font-size:0.9rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(wine.name)}</div>
            <div style="font-size:0.8rem;color:var(--text-muted)">${info.playerEmoji} ${escHtml(info.playerName)}${info.playerId === currentPlayerId ? ' <span class="badge badge-you" style="font-size:0.6rem">You</span>' : ''}</div>
          </div>
        </div>
        <div style="font-size:0.8rem;display:flex;flex-direction:column;gap:4px;margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">${t('lb.vintage')}</span><span style="font-weight:600">${wine.vintage}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">${t('lb.varietal')}</span><span style="font-weight:600;text-align:right;max-width:65%">${escHtml(varietalStr)}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">${t('lb.country')}</span><span style="font-weight:600">${escHtml(wine.country || '—')}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">${t('lb.region')}</span><span style="font-weight:600">${escHtml(wine.region || '—')}</span></div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:0.78rem">
          <thead>
            <tr style="border-bottom:1px solid var(--border);color:var(--text-muted)">
              <th style="text-align:left;padding:4px 0;font-weight:600">${t('lb.player')}</th>
              <th style="text-align:center;padding:4px 2px;font-weight:600">${t('lb.varietal')}</th>
              <th style="text-align:center;padding:4px 2px;font-weight:600">${t('lb.country')}</th>
              <th style="text-align:center;padding:4px 2px;font-weight:600">${t('lb.region')}</th>
              <th style="text-align:center;padding:4px 2px;font-weight:600">${t('lb.vintage')}</th>
              <th style="text-align:right;padding:4px 0;font-weight:600">${t('lb.points')}</th>
            </tr>
          </thead>
          <tbody>
            ${wineScores.map(({ name, emoji, score }) => `
              <tr style="border-bottom:1px solid var(--border)">
                <td style="padding:5px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:80px">${emoji} ${escHtml(name)}</td>
                <td style="text-align:center;padding:5px 2px">${score.varietal}</td>
                <td style="text-align:center;padding:5px 2px">${score.country}</td>
                <td style="text-align:center;padding:5px 2px">${score.region}</td>
                <td style="text-align:center;padding:5px 2px">${score.vintage}</td>
                <td style="text-align:right;padding:5px 0;font-weight:700;color:var(--wine)">${score.total}</td>
              </tr>`).join('')}
          </tbody>
        </table>
        ${wineScores.length === 0 ? `<div style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:8px 0">${t('lb.noGuesses')}</div>` : ''}
      </div>`;
  }).join('');

  const showDots = sortedRevealOrder.length > 1;

  // ── Render ────────────────────────────────────────────────────────────────
  app.innerHTML = `
    <div class="page wide">
      <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
        <button class="btn btn-secondary btn-sm" id="backBtn" style="width:auto">${t('nav.backToLobby')}</button>
        <button class="btn btn-primary btn-sm" id="shareScoreBtn" style="width:auto;margin-left:auto">${t('share.btn')}</button>
      </div>

      <div class="page-header">
        <h1>${t('lb.title')}</h1>
        <p>${getLocale() === 'hk'
          ? `${Object.keys(wineMap).length}支酒開估咗${revealOrder.length}支`
          : `${revealOrder.length} out of ${Object.keys(wineMap).length} wine${Object.keys(wineMap).length !== 1 ? 's' : ''} revealed`}</p>
      </div>

      <div class="scoreboard" style="margin-bottom:24px">
        <div class="scoreboard-title">${t('lb.overallRankings')}</div>
        ${rankingRows}
      </div>

      ${sortedRevealOrder.length > 0 ? `
      <div class="section-header"><h3>${t('lb.wineBreakdown')}</h3></div>
      <div class="wine-swipe-container" id="wineSwipe">${wineCards}</div>
      ${showDots ? `<div class="swipe-dots" id="swipeDots">
        ${sortedRevealOrder.map((_, i) => `<span class="swipe-dot${i===0?' active':''}" data-index="${i}"></span>`).join('')}
      </div>` : ''}
      ` : ''}
    </div>
  `;

  document.getElementById('backBtn').addEventListener('click', () => {
    window.location.hash = `#/lobby/${lobbyId}`;
  });

  document.getElementById('shareScoreBtn').addEventListener('click', () => {
    window.location.hash = `#/lobby/${lobbyId}/share-score`;
  });

  // Player row accordion toggle
  document.querySelectorAll('.score-row-expandable').forEach(row => {
    row.addEventListener('click', () => {
      const pid = row.dataset.pid;
      const accordion = document.getElementById(`accordion-${pid}`);
      const chevron = row.querySelector('.score-chevron');
      const isOpen = accordion.classList.toggle('open');
      chevron.style.transform = isOpen ? 'rotate(90deg)' : '';
    });
  });

  // Wine sub-accordion toggle (inside player accordion)
  document.querySelectorAll('.score-wine-expandable').forEach(row => {
    row.addEventListener('click', e => {
      e.stopPropagation(); // don't bubble to player row
      const accId = row.dataset.acc;
      const accordion = document.getElementById(accId);
      const chevron = row.querySelector('.score-wine-chevron');
      const isOpen = accordion.classList.toggle('open');
      chevron.style.transform = isOpen ? 'rotate(90deg)' : '';
    });
  });

  // Dot navigation
  const swipeEl = document.getElementById('wineSwipe');
  if (swipeEl && showDots) {
    const dots = document.querySelectorAll('.swipe-dot');
    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => {
        const cards = swipeEl.querySelectorAll('.wine-swipe-card');
        if (cards[i]) {
          swipeEl.scrollTo({ left: cards[i].offsetLeft - swipeEl.offsetLeft, behavior: 'smooth' });
        }
      });
    });
    swipeEl.addEventListener('scroll', () => {
      const cards = Array.from(swipeEl.querySelectorAll('.wine-swipe-card'));
      const scrollMid = swipeEl.scrollLeft + swipeEl.clientWidth / 2;
      let closest = 0, minDist = Infinity;
      cards.forEach((card, i) => {
        const cardMid = card.offsetLeft - swipeEl.offsetLeft + card.offsetWidth / 2;
        const dist = Math.abs(scrollMid - cardMid);
        if (dist < minDist) { minDist = dist; closest = i; }
      });
      dots.forEach((dot, i) => dot.classList.toggle('active', i === closest));
    });
  }
}
