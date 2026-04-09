async function renderShareScore(lobbyId) {
  const app = document.getElementById('app');
  app.innerHTML = `<div class="page"><div class="loading-screen"><div class="wine-glass">🍷</div><p>${t('app.loading')}</p></div></div>`;

  let data, lobbyData;
  try {
    [data, lobbyData] = await Promise.all([
      API.getScores(lobbyId),
      API.getLobby(lobbyId).catch(() => null),
    ]);
  } catch (err) {
    app.innerHTML = `<div class="page"><div class="alert alert-error">${escHtml(err.error || t('app.failedLoad'))}</div></div>`;
    return;
  }

  const { scores, revealOrder } = data;
  const lobbyName = lobbyData?.lobbyName || '';
  const session = API.getSession(lobbyId);
  const currentPlayerId = session?.playerId;
  const sorted = Object.entries(scores).sort((a, b) => b[1].total - a[1].total);
  const isHK = getLocale() === 'hk';

  const takePhotoLabel = isHK ? t('share.takePhoto') : 'Take Photo as<br>Background';

  app.innerHTML = `
    <div class="page">
      <button class="btn btn-secondary btn-sm" id="shareBackBtn" style="width:auto;margin-bottom:16px">← ${isHK ? '返排行榜' : 'Back to Leaderboard'}</button>

      <div class="page-header">
        <h1>${t('share.title')}</h1>
      </div>

      <div class="story-photo-btns">
        <label class="btn btn-secondary" style="line-height:1.3;text-align:center">
          ${takePhotoLabel}
          <input type="file" accept="image/*" id="bgInput" style="display:none">
        </label>
        ${navigator.share ? `<button class="btn" id="shareApiBtn" style="background:#000;color:#fff;font-weight:700;border:none">${t('share.shareBtn')}</button>` : ''}
      </div>

      <div class="story-card-wrap">
        <canvas id="storyCanvas" style="cursor:grab"></canvas>
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

  // Scroll state — shared between drawCard and event handlers
  let playerScrollPx = 0;
  let listAreaH = 0;
  let listTotalH = 0;
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
      ctx.fillStyle = 'rgba(6, 9, 13, 0.45)';
      ctx.fillRect(0, 0, W, H);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#112133');
      grad.addColorStop(1, '#050a0f');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    const GOLD  = '#d4af37';
    const WHITE = '#ffffff';
    const MUTED = 'rgba(255,255,255,0.52)';
    const PAD   = 80;

    // ── Title ────────────────────────────────────────────────────────────────
    ctx.fillStyle = WHITE;
    ctx.font = `bold 68px Georgia,"Times New Roman",serif`;
    ctx.textAlign = 'center';

    let captionBottom;
    if (isHK) {
      ctx.fillText('盲品挑戰', W / 2, 210);
      captionBottom = 210;
    } else {
      ctx.fillText('BLIND TASTING', W / 2, 210);
      ctx.fillText('CHALLENGE', W / 2, 296);
      captionBottom = 296;
    }

    // Sub-caption: lobby name
    if (lobbyName) {
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = `bold 46px Georgia,"Times New Roman",serif`;
      ctx.fillText(lobbyName, W / 2, captionBottom + 72);
      captionBottom = captionBottom + 72;
    }

    // Divider
    const dividerY = captionBottom + 52;
    ctx.strokeStyle = 'rgba(212,175,55,0.38)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PAD, dividerY);
    ctx.lineTo(W - PAD, dividerY);
    ctx.stroke();

    // Section label — centred
    ctx.fillStyle = 'rgba(212,175,55,0.72)';
    ctx.font = `bold 28px -apple-system,"Helvetica Neue",sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(isHK ? 'LEADERBOARD 龍虎榜' : 'LEADERBOARD', W / 2, dividerY + 44);

    // ── Scrollable player list ────────────────────────────────────────────────
    const ROWS_VISIBLE  = 9;
    const LIST_TOP      = dividerY + 76;
    const LIST_BOTTOM   = H - 285;
    const AREA_H        = LIST_BOTTOM - LIST_TOP;
    const ROW_H         = Math.min(130, Math.floor(AREA_H / ROWS_VISIBLE));

    // Update shared scroll state
    listAreaH  = AREA_H;
    listTotalH = sorted.length * ROW_H;
    const maxScroll = Math.max(0, listTotalH - listAreaH);
    playerScrollPx = Math.max(0, Math.min(playerScrollPx, maxScroll));

    // Clip to list area, draw all rows (only visible ones render)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, LIST_TOP, W, AREA_H);
    ctx.clip();

    const medals    = ['🥇', '🥈', '🥉'];
    const youTagStr = isHK ? ' ← 你' : ' ← YOU';
    const youFontStr = `bold 34px -apple-system,sans-serif`;

    for (let i = 0; i < sorted.length; i++) {
      const [pid, s] = sorted[i];
      const isMe = pid === currentPlayerId;
      const y    = LIST_TOP + i * ROW_H - playerScrollPx;

      // Skip rows fully outside the clip (tiny optimisation)
      if (y + ROW_H <= LIST_TOP) continue;
      if (y >= LIST_BOTTOM) break;

      const rowW   = W - PAD * 2;
      const textY  = y + Math.round(ROW_H * 0.56);

      // Row background
      ctx.fillStyle = isMe
        ? 'rgba(212,175,55,0.18)'
        : (i % 2 === 0 ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.03)');
      ssRoundRect(ctx, PAD, y + 2, rowW, ROW_H - 8, 10);
      ctx.fill();

      if (isMe) {
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 2.5;
        ssRoundRect(ctx, PAD, y + 2, rowW, ROW_H - 8, 10);
        ctx.stroke();
      }

      // Medal / rank number
      if (medals[i]) {
        ctx.font = `56px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = WHITE;
        ctx.fillText(medals[i], PAD + 52, textY);
      } else {
        ctx.fillStyle = MUTED;
        ctx.font = `bold 38px -apple-system,sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(`${i + 1}`, PAD + 52, textY);
      }

      // Player emoji
      ctx.font = `56px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = WHITE;
      ctx.fillText(s.emoji, PAD + 124, textY);

      // Pre-measure points and YOU tag to determine name max width
      const ptsStr    = `${s.total} ${isHK ? '分' : 'pts'}`;
      const ptsFontStr = isMe ? `bold 52px Georgia,serif` : `52px Georgia,serif`;
      ctx.font = ptsFontStr;
      const ptsWidth = ctx.measureText(ptsStr).width;

      let youTagWidth = 0;
      if (isMe) {
        ctx.font = youFontStr;
        youTagWidth = ctx.measureText(youTagStr).width;
      }

      const nameX    = PAD + 170;
      const ptsX     = W - PAD - 14;
      const nameMaxW = ptsX - nameX - ptsWidth - youTagWidth - 40;

      // Name
      const nameFontStr = isMe ? `bold 50px Georgia,serif` : `50px Georgia,serif`;
      ctx.font = nameFontStr;
      ctx.textAlign = 'left';
      ctx.fillStyle = isMe ? GOLD : WHITE;
      const displayName = ssTruncate(ctx, s.name, nameMaxW);
      ctx.fillText(displayName, nameX, textY);

      // YOU tag immediately after name, same line
      if (isMe) {
        const nameActualW = ctx.measureText(displayName).width;
        ctx.fillStyle = GOLD;
        ctx.font = youFontStr;
        ctx.fillText(youTagStr, nameX + nameActualW, textY);
      }

      // Points
      ctx.fillStyle = isMe ? GOLD : MUTED;
      ctx.font = ptsFontStr;
      ctx.textAlign = 'right';
      ctx.fillText(ptsStr, ptsX, textY);
    }

    ctx.restore();

    // Fade edges of list area (top & bottom) to hint scrollability
    if (listTotalH > listAreaH) {
      const fadeH = ROW_H * 0.6;
      if (playerScrollPx > 0) {
        const topFade = ctx.createLinearGradient(0, LIST_TOP, 0, LIST_TOP + fadeH);
        topFade.addColorStop(0, bgImage ? 'rgba(6,9,13,0.55)' : 'rgba(8,16,30,0.85)');
        topFade.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = topFade;
        ctx.fillRect(0, LIST_TOP, W, fadeH);
      }
      if (playerScrollPx < maxScroll) {
        const botFade = ctx.createLinearGradient(0, LIST_BOTTOM - fadeH, 0, LIST_BOTTOM);
        botFade.addColorStop(0, 'rgba(0,0,0,0)');
        botFade.addColorStop(1, bgImage ? 'rgba(6,9,13,0.55)' : 'rgba(8,16,30,0.85)');
        ctx.fillStyle = botFade;
        ctx.fillRect(0, LIST_BOTTOM - fadeH, W, fadeH);
      }
    }

    // ── Bottom: challenger / wine count ──────────────────────────────────────
    const wineCount       = revealOrder.length;
    const challengerCount = sorted.length;

    ctx.strokeStyle = 'rgba(212,175,55,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD, H - 196);
    ctx.lineTo(W - PAD, H - 196);
    ctx.stroke();

    ctx.fillStyle = MUTED;
    ctx.font = `36px Georgia,serif`;
    ctx.textAlign = 'center';
    ctx.fillText(
      isHK
        ? `${challengerCount}位挑戰者 · ${wineCount}支酒`
        : `${challengerCount} challenger${challengerCount !== 1 ? 's' : ''} · ${wineCount} wine${wineCount !== 1 ? 's' : ''}`,
      W / 2, H - 148
    );

    // ── Footer ───────────────────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = `28px -apple-system,sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('App developed by oenophilia.hk', W / 2, H - 100);
  }

  // Initial render then auto-scroll to put current player near centre
  drawCard();

  const myIndex = sorted.findIndex(([pid]) => pid === currentPlayerId);
  if (myIndex > 0 && listTotalH > listAreaH) {
    const rowH = listTotalH / sorted.length;
    const targetScroll = myIndex * rowH - listAreaH / 2 + rowH / 2;
    playerScrollPx = Math.max(0, Math.min(Math.max(0, listTotalH - listAreaH), targetScroll));
    drawCard();
  }

  // ── Background photo input ────────────────────────────────────────────────
  function handleFileInput(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => { bgImage = img; drawCard(); };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
  document.getElementById('bgInput').addEventListener('change', e => handleFileInput(e.target.files[0]));

  // ── Touch scrolling ───────────────────────────────────────────────────────
  let lastPointerY = null;

  function canvasPixelDelta(clientDelta) {
    return clientDelta * (H / canvas.getBoundingClientRect().height);
  }

  function applyScroll(canvasDy) {
    const maxScroll = Math.max(0, listTotalH - listAreaH);
    playerScrollPx = Math.max(0, Math.min(maxScroll, playerScrollPx + canvasDy));
    drawCard();
  }

  canvas.addEventListener('touchstart', e => {
    lastPointerY = e.touches[0].clientY;
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('touchmove', e => {
    if (lastPointerY === null) return;
    applyScroll(canvasPixelDelta(lastPointerY - e.touches[0].clientY));
    lastPointerY = e.touches[0].clientY;
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('touchend', () => {
    lastPointerY = null;
    canvas.style.cursor = 'grab';
  });

  // ── Mouse scrolling (desktop) ─────────────────────────────────────────────
  canvas.addEventListener('mousedown', e => {
    lastPointerY = e.clientY;
    canvas.style.cursor = 'grabbing';
  });

  canvas.addEventListener('mousemove', e => {
    if (lastPointerY === null) return;
    applyScroll(canvasPixelDelta(lastPointerY - e.clientY));
    lastPointerY = e.clientY;
  });

  canvas.addEventListener('mouseup',    () => { lastPointerY = null; canvas.style.cursor = 'grab'; });
  canvas.addEventListener('mouseleave', () => { lastPointerY = null; canvas.style.cursor = 'grab'; });

  // ── Share via Web Share API ───────────────────────────────────────────────
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
