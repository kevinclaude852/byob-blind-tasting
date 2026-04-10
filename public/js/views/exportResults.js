function buildExportHtml({ lobbyName, sorted, denseRanks, revealOrder, wineMap, guesses, scores }) {
  const isHK = getLocale() === 'hk';
  const rankMedals = { 1: '🥇', 2: '🥈', 3: '🥉' };
  const now = new Date().toLocaleDateString(isHK ? 'zh-HK' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' });

  function fmtVarietal(obj) {
    if (!obj) return '—';
    if (obj.type === 'blend') {
      return (obj.varietals || []).filter(v => v.grape)
        .map(v => `${v.grape}${v.percentage ? ` ${v.percentage}%` : ''}`).join(', ') || '—';
    }
    return obj.varietals?.[0]?.grape || '—';
  }

  // ── Leaderboard rows ────────────────────────────────────────────────────────
  const leaderboardRows = sorted.map(([pid, s], i) => {
    const rank  = denseRanks[i];
    const medal = rankMedals[rank] || `${rank}.`;
    return `
      <tr>
        <td class="r-rank">${medal}</td>
        <td class="r-emoji">${s.emoji}</td>
        <td class="r-name">${escHtml(s.name)}</td>
        <td class="r-pts">${s.total} ${isHK ? '分' : 'pts'}</td>
      </tr>`;
  }).join('');

  // ── Wine sections ───────────────────────────────────────────────────────────
  const wineSections = revealOrder.map((wineId, wi) => {
    const info = wineMap[wineId];
    if (!info || !info.wine) return '';
    const wine = info.wine;
    const varietalStr = fmtVarietal(wine);

    // Players who guessed this wine, sorted by per-wine score desc
    const guessers = sorted
      .filter(([pid]) => pid !== info.playerId && scores[pid]?.breakdown?.[wineId])
      .sort((a, b) => b[1].breakdown[wineId].total - a[1].breakdown[wineId].total);

    function scoreClass(pts, isVintage) {
      if (pts > 0 && isVintage && pts < 5) return 'near';
      if (pts > 0) return 'correct';
      return 'wrong';
    }

    const guessRows = guessers.map(([pid, s]) => {
      const g  = (guesses[pid] || {})[wineId] || null;
      const sc = s.breakdown[wineId];
      return `
        <tr>
          <td class="g-player">${s.emoji} ${escHtml(s.name)}</td>
          <td class="${scoreClass(sc.varietal, false)}">${escHtml(g ? fmtVarietal(g) : '—')}</td>
          <td class="${scoreClass(sc.country,  false)}">${escHtml(g?.country  || '—')}</td>
          <td class="${scoreClass(sc.region,   false)}">${escHtml(g?.region   || '—')}</td>
          <td class="${scoreClass(sc.vintage,  true )}">${escHtml(g?.vintage  ? String(g.vintage) : '—')}</td>
          <td class="g-score">${sc.total}</td>
        </tr>`;
    }).join('');

    return `
      <div class="wine-card">
        <div class="wine-card-header">
          <span class="w-emoji">${wine.emoji || ''}</span>
          <div class="w-info">
            <div class="w-name">${escHtml(wine.name)}</div>
            <div class="w-meta">${[wine.vintage, varietalStr, wine.country, wine.region].filter(Boolean).join(' · ')}</div>
            <div class="w-owner">${isHK ? '帶酒：' : 'Brought by: '}${info.playerEmoji} ${escHtml(info.playerName)}</div>
          </div>
        </div>
        ${guessers.length > 0 ? `
        <table class="guesses">
          <thead>
            <tr>
              <th>${isHK ? '參加者' : 'Player'}</th>
              <th>${isHK ? '提子' : 'Varietal'}</th>
              <th>${isHK ? '國家' : 'Country'}</th>
              <th>${isHK ? '產區' : 'Region'}</th>
              <th>${isHK ? '年份' : 'Vintage'}</th>
              <th>${isHK ? '分' : 'Pts'}</th>
            </tr>
          </thead>
          <tbody>${guessRows}</tbody>
        </table>` : `<p class="no-guesses">${isHK ? '沒有人估' : 'No guesses submitted'}</p>`}
      </div>`;
  }).join('');

  // ── Full HTML document ──────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="${isHK ? 'zh-HK' : 'en'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escHtml(lobbyName || 'Blind Tasting Results')}</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,"Helvetica Neue",sans-serif;background:#f7f3ee;color:#1a1a1a;font-size:14px;line-height:1.5}
.page{max-width:860px;margin:0 auto;padding:32px 20px}

/* Header */
.exp-header{background:linear-gradient(135deg,#112133 0%,#1a3550 100%);color:#fff;border-radius:12px;padding:28px 32px;margin-bottom:28px}
.exp-header h1{font-family:Georgia,serif;font-size:26px;letter-spacing:.12em;color:#d4af37;margin-bottom:4px}
.exp-header .lobby-name{font-size:19px;font-weight:600;margin-bottom:10px}
.exp-header .meta{font-size:12px;color:rgba(255,255,255,.55);display:flex;gap:18px;flex-wrap:wrap}

/* Section titles */
.sec-title{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#999;margin-bottom:10px}

/* Leaderboard */
.lb-card{background:#fff;border-radius:10px;padding:18px 22px;margin-bottom:24px;box-shadow:0 1px 4px rgba(0,0,0,.07)}
.lb-card table{width:100%;border-collapse:collapse}
.lb-card tr{border-bottom:1px solid #f2ece3}
.lb-card tr:last-child{border-bottom:none}
.lb-card td{padding:8px 6px}
.r-rank{font-size:17px;width:40px;text-align:center}
.r-emoji{font-size:17px;width:34px;text-align:center}
.r-name{font-weight:600;font-size:14px}
.r-pts{text-align:right;font-family:Georgia,serif;font-weight:700;color:#722F37;font-size:14px}

/* Wine cards */
.wine-card{background:#fff;border-radius:10px;padding:18px 22px;margin-bottom:16px;box-shadow:0 1px 4px rgba(0,0,0,.07);page-break-inside:avoid}
.wine-card-header{display:flex;align-items:flex-start;gap:12px;margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #f2ece3}
.w-emoji{font-size:26px;flex-shrink:0;line-height:1.2}
.w-name{font-weight:700;font-size:16px;margin-bottom:2px}
.w-meta{font-size:12px;color:#777;margin-bottom:2px}
.w-owner{font-size:11px;color:#aaa}

/* Guesses table */
.guesses{width:100%;border-collapse:collapse;font-size:12.5px}
.guesses thead tr{border-bottom:2px solid #f2ece3}
.guesses tbody tr{border-bottom:1px solid #f9f5f0}
.guesses tbody tr:last-child{border-bottom:none}
.guesses th{padding:5px 8px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#bbb;font-weight:600}
.guesses td{padding:7px 8px;vertical-align:middle}
.g-player{font-weight:600;white-space:nowrap}
.correct{color:#2e7d32}
.near{color:#b35c00}
.wrong{color:#bbb}
.g-score{text-align:right;font-weight:700;font-family:Georgia,serif;color:#722F37;white-space:nowrap}
.no-guesses{font-size:12px;color:#bbb;font-style:italic}

/* Footer */
.exp-footer{text-align:center;font-size:11px;color:#ccc;margin-top:28px;padding-top:16px;border-top:1px solid #ece6dd}

@media print{
  body{background:#fff}
  .page{padding:12px}
  .wine-card,.lb-card{box-shadow:none;border:1px solid #e0d8cc}
  .exp-header{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
</style>
</head>
<body>
<div class="page">

  <div class="exp-header">
    <h1>BLIND TASTING</h1>
    <div class="lobby-name">${escHtml(lobbyName)}</div>
    <div class="meta">
      <span>📅 ${now}</span>
      <span>🍷 ${revealOrder.length} ${isHK ? '支酒' : revealOrder.length !== 1 ? 'wines' : 'wine'}</span>
      <span>👥 ${sorted.length} ${isHK ? '位挑戰者' : sorted.length !== 1 ? 'challengers' : 'challenger'}</span>
    </div>
  </div>

  <div class="lb-card">
    <div class="sec-title">🏆 ${isHK ? '總體排名' : 'Overall Rankings'}</div>
    <table>${leaderboardRows}</table>
  </div>

  <div class="sec-title" style="margin-bottom:14px">${isHK ? '逐支酒睇' : 'Wine Breakdown'}</div>
  ${wineSections}

  <div class="exp-footer">App developed by oenophilia.hk</div>
</div>
</body>
</html>`;
}

function downloadExportHtml(lobbyId, html) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `blind-tasting-${lobbyId}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
