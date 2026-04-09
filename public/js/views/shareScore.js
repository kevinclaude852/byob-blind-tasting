async function renderShareScore(lobbyId) {
  const app = document.getElementById('app');
  app.innerHTML = `<div class="page"><div class="loading-screen"><div class="wine-glass">🍷</div><p>${t('app.loading')}</p></div></div>`;

  let data;
  try {
    data = await API.getScores(lobbyId);
  } catch (err) {
    app.innerHTML = `<div class="page"><div class="alert alert-error">${escHtml(err.error || t('app.failedLoad'))}</div></div>`;
    return;
  }

  const { scores, revealOrder, wineMap } = data;
  const session = API.getSession(lobbyId);
  const currentPlayerId = session?.playerId;
  const sorted = Object.entries(scores).sort((a, b) => b[1].total - a[1].total);
  const isHK = getLocale() === 'hk';

  app.innerHTML = `
    <div class="page">
      <button class="btn btn-secondary btn-sm" id="shareBackBtn" style="width:auto;margin-bottom:16px">← ${isHK ? '返排行榜' : 'Back to Leaderboard'}</button>

      <div class="page-header">
        <h1>${t('share.title')}</h1>
        <p>${t('share.subtitle')}</p>
      </div>

      <div class="story-card-wrap">
        <canvas id="storyCanvas"></canvas>
      </div>
      <p class="story-hint" id="storyHint">${t('share.addBg')}</p>

      <div class="story-photo-btns">
        <label class="btn btn-secondary">
          ${t('share.takePhoto')}
          <input type="file" accept="image/*" capture="environment" id="cameraInput" style="display:none">
        </label>
        <label class="btn btn-secondary">
          ${t('share.cameraRoll')}
          <input type="file" accept="image/*" id="rollInput" style="display:none">
        </label>
      </div>

      <div class="story-export-btns" id="exportBtns" style="display:none">
        <button class="btn btn-primary" id="downloadBtn">${t('share.download')}</button>
        ${navigator.share ? `<button class="btn btn-secondary" id="shareApiBtn">${t('share.shareBtn')}</button>` : ''}
      </div>
    </div>
  `;

  document.getElementById('shareBackBtn').addEventListener('click', () => {
    window.location.hash = `#/lobby/${lobbyId}/scores`;
  });

  const canvas = document.getElementById('storyCanvas');
  const W = 1080, H = 1920;
  canvas.width = W;
  canvas.height = H;

  let bgImage = null;

  function drawCard() {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    // ── Background ──────────────────────────────────────────────────────────
    if (bgImage) {
      const scale = Math.max(W / bgImage.naturalWidth, H / bgImage.naturalHeight);
      const sw = bgImage.naturalWidth * scale;
      const sh = bgImage.naturalHeight * scale;
      ctx.drawImage(bgImage, (W - sw) / 2, (H - sh) / 2, sw, sh);
      // Dark semi-transparent overlay so text stays readable
      ctx.fillStyle = 'rgba(8, 3, 15, 0.68)';
      ctx.fillRect(0, 0, W, H);
    } else {
      const grad = ctx.createLinearGradient(0, 0, W * 0.4, H);
      grad.addColorStop(0, '#1c0a14');
      grad.addColorStop(0.55, '#0f0610');
      grad.addColorStop(1, '#07040a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    const GOLD  = '#d4af37';
    const WHITE = '#ffffff';
    const MUTED = 'rgba(255,255,255,0.52)';
    const PAD   = 80;

    // ── Header ───────────────────────────────────────────────────────────────
    ctx.font = `100px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = WHITE;
    ctx.fillText('🍷', W / 2, 188);

    ctx.fillStyle = GOLD;
    ctx.font = `bold 64px Georgia,"Times New Roman",serif`;
    ctx.textAlign = 'center';
    ctx.fillText(isHK ? 'BLIND TASTING' : 'BLIND WINE TASTING', W / 2, 298);

    const wineCount   = revealOrder.length;
    const playerCount = sorted.length;
    ctx.fillStyle = MUTED;
    ctx.font = `36px Georgia,serif`;
    ctx.fillText(
      isHK
        ? `${playerCount}人 · ${wineCount}支酒`
        : `${playerCount} player${playerCount !== 1 ? 's' : ''} · ${wineCount} wine${wineCount !== 1 ? 's' : ''}`,
      W / 2, 358
    );

    // Divider
    ctx.strokeStyle = 'rgba(212,175,55,0.38)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PAD, 394);
    ctx.lineTo(W - PAD, 394);
    ctx.stroke();

    // Section label
    ctx.fillStyle = 'rgba(212,175,55,0.72)';
    ctx.font = `bold 28px -apple-system,"Helvetica Neue",sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(isHK ? 'LEADERBOARD 龍虎榜' : 'LEADERBOARD', PAD, 436);

    // ── Player rows ──────────────────────────────────────────────────────────
    const ROW_H    = 118;
    const ROW_START = 464;
    const MAX_ROWS = Math.min(sorted.length, Math.floor((H - ROW_START - 200) / ROW_H));
    const medals   = ['🥇', '🥈', '🥉'];

    for (let i = 0; i < MAX_ROWS; i++) {
      const [pid, s] = sorted[i];
      const isMe = pid === currentPlayerId;
      const y    = ROW_START + i * ROW_H;
      const rowW = W - PAD * 2;

      // Row background
      ctx.fillStyle = isMe
        ? 'rgba(212,175,55,0.18)'
        : (i % 2 === 0 ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.03)');
      ssRoundRect(ctx, PAD, y, rowW, ROW_H - 10, 10);
      ctx.fill();

      if (isMe) {
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 2.5;
        ssRoundRect(ctx, PAD, y, rowW, ROW_H - 10, 10);
        ctx.stroke();
      }

      // Medal / rank number
      if (medals[i]) {
        ctx.font = `50px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = WHITE;
        ctx.fillText(medals[i], PAD + 48, y + 63);
      } else {
        ctx.fillStyle = MUTED;
        ctx.font = `bold 34px -apple-system,sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(`${i + 1}`, PAD + 48, y + 65);
      }

      // Player emoji
      ctx.font = `50px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = WHITE;
      ctx.fillText(s.emoji, PAD + 118, y + 63);

      // Name (truncated to fit)
      const nameMaxW = rowW - 270;
      ctx.font = isMe ? `bold 42px Georgia,serif` : `42px Georgia,serif`;
      ctx.textAlign = 'left';
      ctx.fillStyle = isMe ? GOLD : WHITE;
      const displayName = ssTruncate(ctx, s.name, nameMaxW);
      ctx.fillText(displayName, PAD + 162, y + 63);

      // "YOU" sub-label for highlighted row
      if (isMe) {
        ctx.fillStyle = 'rgba(212,175,55,0.72)';
        ctx.font = `bold 24px -apple-system,sans-serif`;
        ctx.fillText(isHK ? '← 你' : '← YOU', PAD + 162, y + 94);
      }

      // Points (right-aligned)
      ctx.fillStyle = isMe ? GOLD : MUTED;
      ctx.font = isMe ? `bold 44px Georgia,serif` : `44px Georgia,serif`;
      ctx.textAlign = 'right';
      ctx.fillText(`${s.total}`, W - PAD - 14, y + 63);

      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = `26px -apple-system,sans-serif`;
      ctx.fillText(isHK ? '分' : 'pts', W - PAD - 14, y + 92);
    }

    // "+N more players" if list was capped
    if (sorted.length > MAX_ROWS) {
      const y = ROW_START + MAX_ROWS * ROW_H + 14;
      ctx.fillStyle = MUTED;
      ctx.font = `30px Georgia,serif`;
      ctx.textAlign = 'center';
      ctx.fillText(
        isHK
          ? `+${sorted.length - MAX_ROWS} 人未顯示`
          : `+${sorted.length - MAX_ROWS} more player${sorted.length - MAX_ROWS !== 1 ? 's' : ''}`,
        W / 2, y
      );
    }

    // ── Footer ───────────────────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = `28px -apple-system,sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Blind Wine Tasting Game', W / 2, H - 88);
  }

  // Initial render (no background photo yet)
  drawCard();

  function handleFileInput(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        bgImage = img;
        document.getElementById('storyHint').style.display = 'none';
        document.getElementById('exportBtns').style.display = 'flex';
        drawCard();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  document.getElementById('cameraInput').addEventListener('change', e => handleFileInput(e.target.files[0]));
  document.getElementById('rollInput').addEventListener('change', e => handleFileInput(e.target.files[0]));

  document.getElementById('downloadBtn').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'blind-tasting-score.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  });

  const shareApiBtn = document.getElementById('shareApiBtn');
  if (shareApiBtn) {
    shareApiBtn.addEventListener('click', () => {
      canvas.toBlob(async blob => {
        const file = new File([blob], 'blind-tasting-score.png', { type: 'image/png' });
        try {
          await navigator.share({
            files: [file],
            title: isHK ? 'Blind Tasting 成績' : 'Blind Wine Tasting Score',
          });
        } catch (err) {
          if (err.name !== 'AbortError') showToast(isHK ? '分享失敗' : 'Sharing failed');
        }
      }, 'image/png');
    });
  }
}

// ── Canvas helpers ────────────────────────────────────────────────────────────

function ssRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x,     y + h, x,     y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x,     y,     x + r, y,         r);
  ctx.closePath();
}

function ssTruncate(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let s = text;
  while (s.length > 0 && ctx.measureText(s + '…').width > maxWidth) {
    s = s.slice(0, -1);
  }
  return s + '…';
}
