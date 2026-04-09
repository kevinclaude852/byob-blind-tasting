async function renderShareGuess(lobbyId, wineId) {
  const app = document.getElementById('app');
  app.innerHTML = `<div class="page"><div class="loading-screen"><div class="wine-glass">🍷</div><p>${t('app.loading')}</p></div></div>`;

  let lobbyData;
  try {
    lobbyData = await API.getLobby(lobbyId);
  } catch (err) {
    app.innerHTML = `<div class="page"><div class="alert alert-error">${escHtml(err.error || t('app.failedLoad'))}</div></div>`;
    return;
  }

  const isHK = getLocale() === 'hk';
  const lobbyName = lobbyData?.lobbyName || '';
  const currentPlayerId = lobbyData.currentPlayerId;

  const wineInfo = lobbyData.wineMap?.[wineId];
  if (!wineInfo || !wineInfo.wine) {
    app.innerHTML = `<div class="page"><div class="alert alert-error">${isHK ? '搵唔到支酒' : 'Wine not found.'}</div></div>`;
    return;
  }

  const wine = wineInfo.wine;
  const wineName = wine.name || '';
  const score = (lobbyData.scores || {})[wineId]?.[currentPlayerId] || null;
  const guess = (lobbyData.myGuesses || {})[wineId] || null;

  function formatVarietal(obj) {
    if (!obj) return '—';
    if (obj.type === 'blend') {
      return (obj.varietals || []).filter(v => v.grape).map(v => `${v.grape}${v.percentage ? ` ${v.percentage}%` : ''}`).join(', ') || '—';
    }
    return obj.varietals?.[0]?.grape || '—';
  }

  const compareRows = [
    { label: isHK ? '提子' : 'Varietal', guessVal: guess ? formatVarietal(guess) : '—', wineVal: formatVarietal(wine), scoreKey: 'varietal' },
    { label: isHK ? '國家' : 'Country',  guessVal: guess?.country || '—',               wineVal: wine?.country || '—',  scoreKey: 'country'  },
    { label: isHK ? '產區' : 'Region',   guessVal: guess?.region  || '—',               wineVal: wine?.region  || '—',  scoreKey: 'region'   },
    { label: isHK ? '年份' : 'Vintage',  guessVal: guess?.vintage ? String(guess.vintage) : '—', wineVal: wine?.vintage ? String(wine.vintage) : '—', scoreKey: 'vintage' },
  ];

  const takePhotoLabel = isHK ? t('share.takePhoto') : 'Take Photo as<br>Background';

  app.innerHTML = `
    <div class="page">
      <button class="btn btn-secondary btn-sm" id="sgBackBtn" style="width:auto;margin-bottom:16px">← ${isHK ? '返我嘅答案' : 'Back to My Guesses'}</button>

      <div class="page-header">
        <h1>${isHK ? '分享我嘅答案' : 'Share My Guess'}</h1>
      </div>

      <div class="story-photo-btns">
        <label class="btn btn-secondary" style="line-height:1.3;text-align:center">
          ${takePhotoLabel}
          <input type="file" accept="image/*" id="sgBgInput" style="display:none">
        </label>
        ${navigator.share ? `<button class="btn" id="sgShareApiBtn" style="background:#000;color:#fff;font-weight:700;border:none">${t('share.shareBtn')}</button>` : ''}
      </div>

      <div class="story-card-wrap">
        <canvas id="sgCanvas"></canvas>
      </div>
    </div>
  `;

  document.getElementById('sgBackBtn').addEventListener('click', () => {
    window.location.hash = `#/lobby/${lobbyId}/myguesses`;
  });

  const canvas = document.getElementById('sgCanvas');
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
    ctx.textAlign = 'center';
    ctx.fillStyle = WHITE;
    ctx.font = `bold 68px Georgia,"Times New Roman",serif`;

    let captionBottom;
    if (isHK) {
      ctx.fillText('盲品挑戰', W / 2, 450);
      captionBottom = 450;
    } else {
      ctx.fillText('BLIND TASTING', W / 2, 450);
      ctx.fillText('CHALLENGE', W / 2, 536);
      captionBottom = 536;
    }

    // Sub-caption: wine name
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = `bold 44px Georgia,"Times New Roman",serif`;
    ctx.fillText(ssTruncate(ctx, wineName, W - PAD * 2 - 40), W / 2, captionBottom + 70);
    captionBottom += 70;

    // Divider
    const dividerY = captionBottom + 52;
    ctx.strokeStyle = 'rgba(212,175,55,0.38)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PAD, dividerY);
    ctx.lineTo(W - PAD, dividerY);
    ctx.stroke();

    // ── Comparison table ──────────────────────────────────────────────────────
    const LABEL_W   = 160;
    const valArea   = W - PAD * 2 - LABEL_W;
    const col1Center = PAD + LABEL_W + Math.round(valArea / 4);
    const col2Center = PAD + LABEL_W + Math.round(valArea * 3 / 4);
    const colValMaxW = Math.round(valArea / 2) - 30;

    // Column headers
    const hdrY = dividerY + 50;
    ctx.fillStyle = 'rgba(212,175,55,0.72)';
    ctx.font = `bold 28px -apple-system,"Helvetica Neue",sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(isHK ? '我估' : 'MY GUESS',  col1Center, hdrY);
    ctx.fillText(isHK ? '答案' : 'THE WINE', col2Center, hdrY);

    const ROW_H    = 122;
    const TABLE_TOP = hdrY + 28;

    for (let i = 0; i < compareRows.length; i++) {
      const { label, guessVal, wineVal, scoreKey } = compareRows[i];
      const rowY  = TABLE_TOP + i * ROW_H;
      const textY = rowY + Math.round(ROW_H * 0.58);

      // Row background
      ctx.fillStyle = 'rgba(0,0,0,0.055)';
      ssRoundRect(ctx, PAD, rowY + 2, W - PAD * 2, ROW_H - 8, 10);
      ctx.fill();

      // Label
      ctx.fillStyle = MUTED;
      ctx.font = `bold 30px -apple-system,sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(label, PAD + 18, textY);

      // Guess value — gold if points earned, muted if 0 or no guess submitted; wraps if long
      const pts = score?.[scoreKey];
      const guessColor = pts != null && pts > 0 ? GOLD : MUTED;
      ctx.fillStyle = guessColor;
      ctx.font = `bold 34px Georgia,serif`;
      ctx.textAlign = 'center';
      const guessLines = sgWrapText(ctx, guessVal, colValMaxW);
      const guessLineH = 42;
      const guessStartY = textY - ((guessLines.length - 1) * guessLineH) / 2;
      guessLines.forEach((line, li) => {
        ctx.fillText(line, col1Center, guessStartY + li * guessLineH);
      });

      // Wine value
      ctx.fillStyle = WHITE;
      ctx.font = `bold 34px Georgia,serif`;
      ctx.textAlign = 'center';
      ctx.fillText(ssTruncate(ctx, wineVal, colValMaxW), col2Center, textY);
    }

    const tableBottom = TABLE_TOP + compareRows.length * ROW_H;

    // ── Score section ─────────────────────────────────────────────────────────
    if (score) {
      // Divider
      ctx.strokeStyle = 'rgba(212,175,55,0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, tableBottom + 28);
      ctx.lineTo(W - PAD, tableBottom + 28);
      ctx.stroke();

      // 5 chips: 4 categories + total (evenly distributed, total on right)
      const CHIP_GAP = 16;
      const CHIP_W   = Math.floor((W - PAD * 2 - CHIP_GAP * 4) / 5);
      const CHIP_H   = 100;
      const CHIP_TOP = tableBottom + 68;

      const chips = [
        { label: isHK ? '提子' : 'Varietal', val: score.varietal },
        { label: isHK ? '國家' : 'Country',  val: score.country  },
        { label: isHK ? '產區' : 'Region',   val: score.region   },
        { label: isHK ? '年份' : 'Vintage',  val: score.vintage  },
        { label: isHK ? '總分' : 'Total',    val: score.total    },
      ];

      chips.forEach(({ label, val }, ci) => {
        const cx  = PAD + ci * (CHIP_W + CHIP_GAP);
        const cxc = cx + CHIP_W / 2;

        ctx.fillStyle = 'rgba(0,0,0,0.055)';
        ssRoundRect(ctx, cx, CHIP_TOP, CHIP_W, CHIP_H, 10);
        ctx.fill();

        ctx.fillStyle = MUTED;
        ctx.font = `24px -apple-system,sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(label, cxc, CHIP_TOP + 34);

        ctx.fillStyle = val > 0 ? GOLD : MUTED;
        ctx.font = `bold 40px Georgia,serif`;
        ctx.fillText(String(val), cxc, CHIP_TOP + 80);
      });
    }

    // ── Bottom divider & footer ───────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(212,175,55,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD, H - 196);
    ctx.lineTo(W - PAD, H - 196);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = `28px -apple-system,sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('App developed by oenophilia.hk', W / 2, H - 100);
  }

  drawCard();

  // ── Background photo ──────────────────────────────────────────────────────
  document.getElementById('sgBgInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => { bgImage = img; drawCard(); };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  // ── Share via Web Share API ───────────────────────────────────────────────
  const sgShareApiBtn = document.getElementById('sgShareApiBtn');
  if (sgShareApiBtn) {
    sgShareApiBtn.addEventListener('click', () => {
      canvas.toBlob(async blob => {
        const file = new File([blob], 'blind-tasting-guess.png', { type: 'image/png' });
        try {
          await navigator.share({
            files: [file],
            title: isHK ? 'Blind Tasting 答案' : 'Blind Wine Tasting Guess',
          });
        } catch (err) {
          if (err.name !== 'AbortError') showToast(isHK ? '分享失敗' : 'Sharing failed');
        }
      }, 'image/png');
    });
  }
}

// Wrap text into lines fitting maxWidth (used by renderShareGuess)
function sgWrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [text];
}
