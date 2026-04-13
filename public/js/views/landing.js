const AVATARS = ['⛰️','🌞','🎃','🐦','🏝️','🐔','🎸','👻','🤡','🌸','😼','😈','🐵','🐨','🌻','🍄','🍪','🎩','🍭','💀','🚀','💥','🐑','🌶️','⭐️','🌀','🌈','🌊','🍙','🐳'];

// ── Score select helper ───────────────────────────────────────────────────────
function scoreSelectHtml(id, current, min = 1, max = 20) {
  let opts = '';
  for (let v = min; v <= max; v++) {
    opts += `<option value="${v}"${v === current ? ' selected' : ''}>${v}</option>`;
  }
  return `<select id="${id}" class="rule-score-sel">${opts}</select>`;
}

// ── Build landing page rules panel HTML ──────────────────────────────────────
function buildRulesPanel() {
  const isHK = typeof getLocale === 'function' && getLocale() === 'hk';
  const d = { // CUSTOMISE_DEFAULTS (matches server-side CUSTOMISE_DEFAULTS)
    grape:    { score: 10 },
    oldWorld: { score: 5  },
    country:  { score: 5  },
    region:   { score: 5  },
    vintage:  { mode: 'exact', scoreExact: 3, scorePlusOne: 2, scorePlusTwo: 1 },
    abv:      { score: 3  },
    price:    { score: 3, currency: 'HKD', rangeWidth: 100 }
  };

  const vintageRangeWidths = {
    HKD: [50, 100],
    USD: [5, 10],
    GBP: [5, 10],
    EUR: [5, 10]
  };

  function ruleCard({ id, label, desc, scoreId, scoreVal, checked = false, extra = '' }) {
    return `
      <div class="rule-card">
        <label class="rule-card-header">
          <input type="checkbox" id="${id}Check" class="rule-check"${checked ? ' checked' : ''}>
          <span class="rule-name">${label}</span>
          <span class="rule-score-wrap">${scoreSelectHtml(scoreId, scoreVal)} ${t('rules.pts')}</span>
        </label>
        ${desc ? `<div class="rule-desc">${desc}</div>` : ''}
        ${extra}
      </div>`;
  }

  // Vintage card is special — has mode selector + conditional score inputs
  const vintageCard = `
    <div class="rule-card">
      <label class="rule-card-header">
        <input type="checkbox" id="vintageCheck" class="rule-check" checked>
        <span class="rule-name">${t('rules.vintage')}</span>
      </label>
      <div class="rule-vintage-opts" id="vintageOpts">
        <div class="rule-vintage-modes">
          <label class="rule-vm-opt">
            <input type="radio" name="vintageMode" value="exact" checked>
            <span>${t('rules.vintageExact')}</span>
          </label>
          <label class="rule-vm-opt">
            <input type="radio" name="vintageMode" value="plusOne">
            <span>${t('rules.vintagePlusOne')}</span>
          </label>
          <label class="rule-vm-opt">
            <input type="radio" name="vintageMode" value="plusTwo">
            <span>${t('rules.vintagePlusTwo')}</span>
          </label>
        </div>
        <div class="rule-vintage-scores">
          <span class="rule-vs-item">
            <label>${t('rules.exactLabel')}</label>
            ${scoreSelectHtml('vintageExactScore', d.vintage.scoreExact)}
          </span>
          <span class="rule-vs-item" id="vintagePlusOneWrap" style="display:none">
            <label>${t('rules.plusOneLabel')}</label>
            ${scoreSelectHtml('vintagePlusOneScore', d.vintage.scorePlusOne)}
          </span>
          <span class="rule-vs-item" id="vintagePlusTwoWrap" style="display:none">
            <label>${t('rules.plusTwoLabel')}</label>
            ${scoreSelectHtml('vintagePlusTwoScore', d.vintage.scorePlusTwo)}
          </span>
        </div>
      </div>
    </div>`;

  // Price card has currency + range width sub-options
  const priceRangeWidthOpts = (currency) => {
    const widths = vintageRangeWidths[currency] || [50, 100];
    return widths.map(w => `<option value="${w}">${w} ${currency}</option>`).join('');
  };

  const priceCard = `
    <div class="rule-card">
      <label class="rule-card-header">
        <input type="checkbox" id="priceCheck" class="rule-check">
        <span class="rule-name">${t('rules.price')}</span>
        <span class="rule-score-wrap">${scoreSelectHtml('priceScore', d.price.score)} ${t('rules.pts')}</span>
      </label>
      <div class="rule-price-opts" id="priceOpts" style="display:none">
        <div class="rule-price-row">
          <label>${t('rules.priceCurrency')}</label>
          <select id="priceCurrency" class="rule-score-sel">
            <option value="HKD">HKD</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
        <div class="rule-price-row">
          <label>${t('rules.priceRange')}</label>
          <select id="priceRangeWidth" class="rule-score-sel">${priceRangeWidthOpts('HKD')}</select>
        </div>
      </div>
    </div>`;

  return `
    <div id="rulesPanel" class="rules-panel" style="display:none">
      ${ruleCard({ id: 'grape', label: t('rules.grape'), desc: t('rules.grapeDesc'), scoreId: 'grapeScore', scoreVal: d.grape.score, checked: true })}
      ${ruleCard({ id: 'oldWorld', label: t('rules.oldWorld'), desc: '', scoreId: 'oldWorldScore', scoreVal: d.oldWorld.score, checked: false })}
      <div class="rule-card">
        <label class="rule-card-header">
          <input type="checkbox" id="countryCheck" class="rule-check" checked>
          <span class="rule-name">${t('rules.country')}</span>
          <span class="rule-score-wrap">${scoreSelectHtml('countryScore', d.country.score)} ${t('rules.pts')}</span>
        </label>
        <div class="rule-country-sub" id="countrySubPanel">
          <label class="rule-card-header" style="padding:6px 0 0">
            <input type="checkbox" id="regionCheck" class="rule-check" checked>
            <span class="rule-name">${t('rules.region')}</span>
            <span class="rule-score-wrap">${scoreSelectHtml('regionScore', d.region.score)} ${t('rules.pts')}</span>
          </label>
        </div>
      </div>
      ${vintageCard}
      ${ruleCard({ id: 'abv', label: t('rules.abv'), desc: t('rules.abvDesc'), scoreId: 'abvScore', scoreVal: d.abv.score, checked: false })}
      ${priceCard}
    </div>`;
}

// ── Collect rules from landing form ─────────────────────────────────────────
function collectLandingRules() {
  const modeEl = document.querySelector('input[name="rulesMode"]:checked');
  if (!modeEl || modeEl.value !== 'customise') return null; // null = use server default

  const vintageMode = document.querySelector('input[name="vintageMode"]:checked')?.value || 'exact';

  return {
    grape:    { enabled: !!document.getElementById('grapeCheck')?.checked,    score: parseInt(document.getElementById('grapeScore')?.value, 10)    || 10 },
    oldWorld: { enabled: !!document.getElementById('oldWorldCheck')?.checked,  score: parseInt(document.getElementById('oldWorldScore')?.value, 10)  || 5  },
    country:  { enabled: !!document.getElementById('countryCheck')?.checked,   score: parseInt(document.getElementById('countryScore')?.value, 10)   || 5  },
    region:   { enabled: !!document.getElementById('regionCheck')?.checked,    score: parseInt(document.getElementById('regionScore')?.value, 10)    || 5  },
    vintage:  {
      enabled:       !!document.getElementById('vintageCheck')?.checked,
      mode:          vintageMode,
      scoreExact:    parseInt(document.getElementById('vintageExactScore')?.value,    10) || 3,
      scorePlusOne:  parseInt(document.getElementById('vintagePlusOneScore')?.value,  10) || 1,
      scorePlusTwo:  parseInt(document.getElementById('vintagePlusTwoScore')?.value,  10) || 1,
    },
    abv:      { enabled: !!document.getElementById('abvCheck')?.checked,      score: parseInt(document.getElementById('abvScore')?.value, 10)      || 3  },
    price:    {
      enabled:    !!document.getElementById('priceCheck')?.checked,
      score:      parseInt(document.getElementById('priceScore')?.value, 10)      || 3,
      currency:   document.getElementById('priceCurrency')?.value  || 'HKD',
      rangeWidth: parseInt(document.getElementById('priceRangeWidth')?.value, 10) || 100,
    }
  };
}

// ── Landing page ─────────────────────────────────────────────────────────────
function renderLanding() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h1>${t('app.title')}</h1>
        <p>${t('app.subtitle')}</p>
      </div>

      <div class="card">
        <div class="form-group">
          <label for="lobbyName">${t('landing.lobbyName')}</label>
          <input type="text" id="lobbyName" placeholder="${t('landing.lobbyNamePlaceholder')}" value="" required>
        </div>
        <div class="form-group">
          <label for="hostName">${t('landing.yourName')}</label>
          <input type="text" id="hostName" placeholder="${t('landing.yourNamePlaceholder')}">
        </div>
        <div class="form-group">
          <label>${t('landing.yourAvatar')}</label>
          <div class="emoji-picker" id="emojiPicker">
            ${AVATARS.map(e => `<button class="emoji-btn" data-emoji="${e}"><span>${e}</span></button>`).join('')}
          </div>
          <input type="hidden" id="selectedEmoji" value="">
        </div>
        <div class="form-group">
          <label>${t('landing.gameMode')}</label>
          <div class="rules-mode-group">
            <label class="rules-mode-opt">
              <input type="radio" name="gameMode" value="byob" checked>
              <span>${t('landing.modeByob')}</span>
            </label>
            <label class="rules-mode-opt">
              <input type="radio" name="gameMode" value="hostPrepares">
              <span>${t('landing.modeHostPrepares')}</span>
            </label>
          </div>
          <div id="revealPolicyPanel" style="margin-top:10px;padding:10px 12px;background:var(--bg,#f9f5f0);border-radius:8px;border:1px solid var(--border,#e8e0d5)">
            <div style="font-size:0.78rem;font-weight:600;color:var(--text-muted,#888);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">${t('landing.revealPolicy')}</div>
            <label class="rule-vm-opt" style="display:flex;align-items:center;gap:8px;margin-bottom:6px;cursor:pointer">
              <input type="radio" name="revealPolicy" value="hostOnly" checked>
              <span style="font-size:0.85rem">${t('landing.revealHostOnly')}</span>
            </label>
            <label class="rule-vm-opt" style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="radio" name="revealPolicy" value="ownerOrHost">
              <span style="font-size:0.85rem">${t('landing.revealOwnerOrHost')}</span>
            </label>
          </div>
          <div id="hostPreparesDesc" style="display:none;margin-top:8px;font-size:0.82rem;color:var(--text-muted,#888);padding:8px 12px;background:var(--bg,#f9f5f0);border-radius:8px;border:1px solid var(--border,#e8e0d5)">${t('landing.modeHostPreparesDesc')}</div>
        </div>

        <div class="form-group">
          <label>${t('rules.label')}</label>
          <div class="rules-mode-group">
            <label class="rules-mode-opt">
              <input type="radio" name="rulesMode" value="default" checked>
              <span>${t('rules.default')}</span>
            </label>
            <label class="rules-mode-opt">
              <input type="radio" name="rulesMode" value="customise">
              <span>${t('rules.customise')}</span>
            </label>
          </div>
        </div>

        ${buildRulesPanel()}

        <div id="landingError"></div>
        <button class="btn btn-primary" id="createBtn">
          ${t('landing.createLobby')}
        </button>
      </div>
    </div>
  `;

  let selectedEmoji = '';

  // Game mode toggle — show/hide reveal policy panel and host-prepares description
  document.querySelectorAll('input[name="gameMode"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const isByob = radio.value === 'byob';
      document.getElementById('revealPolicyPanel').style.display = isByob ? '' : 'none';
      document.getElementById('hostPreparesDesc').style.display = isByob ? 'none' : '';
    });
  });

  document.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedEmoji = btn.dataset.emoji;
    });
  });

  // Rules mode toggle
  document.querySelectorAll('input[name="rulesMode"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.getElementById('rulesPanel').style.display = radio.value === 'customise' ? '' : 'none';
    });
  });

  // Vintage mode → show/hide ±1 and ±2 score fields
  document.querySelectorAll('input[name="vintageMode"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const mode = radio.value;
      const p1 = document.getElementById('vintagePlusOneWrap');
      const p2 = document.getElementById('vintagePlusTwoWrap');
      if (p1) p1.style.display = (mode === 'plusOne' || mode === 'plusTwo') ? '' : 'none';
      if (p2) p2.style.display = mode === 'plusTwo' ? '' : 'none';
    });
  });

  // Vintage checkbox → show/hide opts
  document.getElementById('vintageCheck')?.addEventListener('change', (e) => {
    const opts = document.getElementById('vintageOpts');
    if (opts) opts.style.display = e.target.checked ? '' : 'none';
  });

  // Price checkbox → show/hide price opts
  document.getElementById('priceCheck')?.addEventListener('change', (e) => {
    const opts = document.getElementById('priceOpts');
    if (opts) opts.style.display = e.target.checked ? '' : 'none';
  });

  // Country ↔ Region dependency
  document.getElementById('countryCheck')?.addEventListener('change', (e) => {
    const subPanel = document.getElementById('countrySubPanel');
    if (!e.target.checked) {
      const regionCheck = document.getElementById('regionCheck');
      if (regionCheck) regionCheck.checked = false;
      if (subPanel) subPanel.style.display = 'none';
    } else {
      if (subPanel) subPanel.style.display = '';
    }
  });
  document.getElementById('regionCheck')?.addEventListener('change', (e) => {
    if (e.target.checked) {
      const countryCheck = document.getElementById('countryCheck');
      if (countryCheck) countryCheck.checked = true;
      const subPanel = document.getElementById('countrySubPanel');
      if (subPanel) subPanel.style.display = '';
    }
  });

  // Currency change → update range width options
  document.getElementById('priceCurrency')?.addEventListener('change', (e) => {
    const currency = e.target.value;
    const widths = { HKD: [50, 100], USD: [5, 10], GBP: [5, 10], EUR: [5, 10] }[currency] || [50, 100];
    const sel = document.getElementById('priceRangeWidth');
    if (sel) {
      sel.innerHTML = widths.map(w => `<option value="${w}">${w} ${currency}</option>`).join('');
    }
  });

  document.getElementById('createBtn').addEventListener('click', async () => {
    const lobbyName = document.getElementById('lobbyName').value.trim();
    const hostName = document.getElementById('hostName').value.trim();
    const gameMode = document.querySelector('input[name="gameMode"]:checked')?.value || 'byob';
    const revealPolicy = gameMode === 'byob'
      ? (document.querySelector('input[name="revealPolicy"]:checked')?.value || 'hostOnly')
      : 'hostOnly';
    const errorEl = document.getElementById('landingError');

    if (!lobbyName) { showError(errorEl, t('error.enterLobbyName')); return; }
    if (!hostName) { showError(errorEl, t('error.enterName')); return; }
    if (!selectedEmoji) { showError(errorEl, t('error.chooseAvatar')); return; }

    const rules = collectLandingRules();

    // Client-side vintage score validation
    if (rules?.vintage?.enabled && rules.vintage.mode !== 'exact') {
      if (rules.vintage.scorePlusOne >= rules.vintage.scoreExact) {
        showError(errorEl, '±1 year score must be less than exact score.');
        return;
      }
      if (rules.vintage.mode === 'plusTwo' && rules.vintage.scorePlusTwo > rules.vintage.scorePlusOne) {
        showError(errorEl, '±2 year score must not exceed ±1 year score.');
        return;
      }
    }

    const btn = document.getElementById('createBtn');
    btn.disabled = true;
    btn.innerHTML = `<span class="spin">⏳</span> ${t('landing.creating')}`;
    errorEl.innerHTML = '';

    try {
      const data = await API.createLobby({ hostName, hostEmoji: selectedEmoji, lobbyName, gameMode, revealPolicy, rules });
      API.saveSession(data.lobbyId, { playerId: data.hostPlayerId, sessionToken: data.sessionToken });
      window.location.hash = `#/lobby/${data.lobbyId}`;
    } catch (err) {
      showError(errorEl, err.error || (err.errors ? err.errors.join('; ') : 'Failed to create lobby.'));
      btn.disabled = false;
      btn.innerHTML = t('landing.createLobby');
    }
  });
}

function showError(el, msg) {
  el.innerHTML = `<div class="alert alert-error">${msg}</div>`;
}
