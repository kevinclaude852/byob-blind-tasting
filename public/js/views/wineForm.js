const WINE_EMOJIS = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟','🍷','🍾','🥂','🟥','🟧','🟨','🟩','🟦','🟪','🟫','⬛','⬜'];
const NUMBER_EMOJIS = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

// Grape combobox — visible dropdown list that narrows as you type
function buildGrapeAutocomplete({ id = '', extraClass = '', prefillValue = '', placeholder = 'Select or type to search...' } = {}) {
  const idAttr = id ? `id="${id}"` : '';
  const cls = `grape-ac-val${extraClass ? ' ' + extraClass : ''}`;
  const safe = prefillValue ? escHtml(prefillValue) : '';
  return `<div class="grape-ac-wrap" role="combobox" aria-expanded="false">
    <div class="grape-ac-field">
      <input type="text" class="grape-ac-text" placeholder="${placeholder}" value="${safe}" autocomplete="off" spellcheck="false">
      <button type="button" class="grape-ac-toggle" tabindex="-1">▾</button>
    </div>
    <input type="hidden" ${idAttr} class="${cls}" value="${safe}">
    <div class="grape-ac-drop" role="listbox"></div>
  </div>`;
}

function attachGrapeAutocomplete(grapes) {
  document.querySelectorAll('.grape-ac-wrap').forEach(wrap => {
    const textEl   = wrap.querySelector('.grape-ac-text');
    const valEl    = wrap.querySelector('.grape-ac-val');
    const drop     = wrap.querySelector('.grape-ac-drop');
    const toggleBtn = wrap.querySelector('.grape-ac-toggle');
    let activeIdx  = -1;
    let isOpen     = false;

    const getItems = () => Array.from(drop.querySelectorAll('.grape-ac-item'));

    function highlight(idx) {
      getItems().forEach((el, i) => el.classList.toggle('active', i === idx));
      activeIdx = idx;
      const active = getItems()[idx];
      if (active) active.scrollIntoView({ block: 'nearest' });
    }

    function norm(s) {
      return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    }

    function buildList(q) {
      if (!q) return grapes;
      const ql = norm(q);
      const starts   = grapes.filter(g =>  norm(g).startsWith(ql));
      const contains = grapes.filter(g => !norm(g).startsWith(ql) && norm(g).includes(ql));
      return [...starts, ...contains];
    }

    function openDrop(filtered) {
      if (!filtered.length) { closeDrop(); return; }
      drop.innerHTML = filtered.map(g =>
        `<div class="grape-ac-item" role="option" data-value="${escHtml(g)}">${escHtml(g)}</div>`
      ).join('');
      drop.style.display = 'block';
      wrap.setAttribute('aria-expanded', 'true');
      toggleBtn.classList.add('open');
      isOpen = true;
      activeIdx = -1;
    }

    function closeDrop() {
      drop.style.display = 'none';
      wrap.setAttribute('aria-expanded', 'false');
      toggleBtn.classList.remove('open');
      isOpen = false;
      activeIdx = -1;
    }

    function commit(value) {
      textEl.value = value;
      valEl.value  = value;
      closeDrop();
    }

    textEl.addEventListener('focus', () => openDrop(buildList(textEl.value.trim())));
    textEl.addEventListener('input', () => {
      const q = textEl.value.trim();
      valEl.value = grapes.includes(q) ? q : '';
      openDrop(buildList(q));
    });
    toggleBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (isOpen) { closeDrop(); textEl.blur(); }
      else { textEl.focus(); openDrop(buildList(textEl.value.trim())); }
    });
    textEl.addEventListener('keydown', (e) => {
      if (!isOpen) { if (e.key === 'ArrowDown' || e.key === 'Enter') { openDrop(buildList(textEl.value.trim())); return; } }
      const items = getItems();
      if (e.key === 'ArrowDown')  { e.preventDefault(); highlight(Math.min(activeIdx + 1, items.length - 1)); }
      else if (e.key === 'ArrowUp')   { e.preventDefault(); highlight(Math.max(activeIdx - 1, 0)); }
      else if (e.key === 'Enter') { e.preventDefault(); const ti = items[activeIdx]; if (ti) commit(ti.dataset.value); }
      else if (e.key === 'Escape') { closeDrop(); }
    });
    drop.addEventListener('mousedown', (e) => {
      const item = e.target.closest('.grape-ac-item');
      if (item) { e.preventDefault(); commit(item.dataset.value); }
    });
    textEl.addEventListener('blur', () => {
      setTimeout(() => {
        closeDrop();
        if (textEl.value !== valEl.value) textEl.value = valEl.value;
      }, 200);
    });
  });
}

// ── ABV select HTML ───────────────────────────────────────────────────────────
function buildAbvSelect(id, prefillVal, isRequired) {
  const opts = getAbvOptions();
  const optHtml = `<option value="">${t('form.selectAbv')}</option>` +
    opts.map(v => `<option value="${v}"${prefillVal != null && Number(prefillVal) === v ? ' selected' : ''}>${v}%</option>`).join('');
  return `<div class="form-group">
    <label for="${id}">${t('form.abv')}${isRequired ? '' : ` <span class="optional">${t('form.optional')}</span>`}</label>
    <select id="${id}">${optHtml}</select>
  </div>`;
}

// ── Price range select HTML (for guessing) ───────────────────────────────────
function buildPriceRangeSelect(id, currency, rangeWidth, prefillRange) {
  const buckets = getPriceBuckets(currency, rangeWidth);
  const optHtml = `<option value="">${t('form.selectPriceRange')}</option>` +
    buckets.map(b => {
      const isSelected = prefillRange &&
        prefillRange.min === b.min &&
        (prefillRange.max === b.max || (prefillRange.max == null && b.max == null));
      return `<option value="${b.min}|${b.max ?? ''}" ${isSelected ? 'selected' : ''}>${formatPriceBucket(b, currency)}</option>`;
    }).join('');
  return `<div class="form-group">
    <label for="${id}">${t('form.priceRange')} <span class="optional">${t('form.optional')}</span></label>
    <select id="${id}">${optHtml}</select>
  </div>`;
}

// ── Price text input (for wine registration) ─────────────────────────────────
function buildPriceInput(id, currency, prefillVal, isRequired) {
  const sym = { HKD: 'HK$', USD: '$', GBP: '£', EUR: '€' }[currency] || currency + ' ';
  return `<div class="form-group">
    <label for="${id}">${t('form.price')} (${sym})${isRequired ? '' : ` <span class="optional">${t('form.optional')}</span>`}</label>
    <input type="number" id="${id}" min="0" step="1" placeholder="0" value="${prefillVal != null ? prefillVal : ''}">
  </div>`;
}

// ── Shared wine form builder ──────────────────────────────────────────────────
function buildWineFormHTML({ isGuess = false, prefill = null, grapes = [], countries = [], regions = {}, wineIndex = 0, rules = null, showFlight = false, existingFlights = [], flightNames = {} } = {}) {
  const r = normaliseRulesClient(rules);
  const currentYear = new Date().getFullYear();
  const opt = `<span class="optional">${t('form.optional')}</span>`;

  const vintageOptions = `<option value="">${t('form.selectVintage')}</option>
    <option value="NV" ${prefill && prefill.vintage === 'NV' ? 'selected' : ''}>NV (Non-Vintage)</option>
    ${Array.from({ length: 51 }, (_, i) => currentYear - i)
      .map(y => `<option value="${y}" ${prefill && String(prefill.vintage) === String(y) ? 'selected' : ''}>${y}</option>`)
      .join('')}`;

  const prefillType = prefill ? (prefill.type || 'single') : 'single';
  const prefillVarietals = prefill && prefill.varietals ? prefill.varietals : [];
  const defaultEmoji = (prefill && prefill.emoji) ? prefill.emoji : (NUMBER_EMOJIS[wineIndex] || '🍷');

  const blendRows = Array.from({ length: 4 }, (_, i) => {
    const v = prefillVarietals[i] || {};
    const pctField = isGuess ? '' : `<input type="number" class="blend-pct" min="1" max="99" placeholder="%" value="${v.percentage || ''}">`;
    return `<div class="blend-row">
      ${buildGrapeAutocomplete({ extraClass: 'blend-grape', prefillValue: v.grape || '', placeholder: t('form.selectGrape') })}
      ${pctField}
    </div>`;
  }).join('');

  const singleGrape = prefillVarietals[0] ? prefillVarietals[0].grape : '';

  const showCountry = isGuess
    ? (r.country.enabled || r.region.enabled)
    : (r.country.enabled || r.oldWorld.enabled || r.region.enabled);
  const countryOptional = isGuess || (!r.country.enabled && !r.oldWorld.enabled);

  const countryField = showCountry ? `
    <div class="form-group">
      <label for="wineCountry">${t('lobby.country')}${countryOptional ? ` ${opt}` : ''}</label>
      <select id="wineCountry">
        <option value="">${t('form.selectCountry')}</option>
        ${countries.map(c => `<option value="${c}" ${prefill && prefill.country === c ? 'selected' : ''}>${c}</option>`).join('')}
      </select>
    </div>` : '';

  const regionField = r.region.enabled ? `
    <div class="form-group" id="regionGroup" style="${prefill && prefill.country ? '' : 'display:none'}">
      <label for="wineRegion">${t('lobby.region')} ${opt}</label>
      <select id="wineRegion">
        <option value="">${t('form.selectRegion')}</option>
        ${prefill && prefill.country && regions[prefill.country]
          ? regions[prefill.country].map(rg => `<option value="${rg}" ${prefill.region === rg ? 'selected' : ''}>${rg}</option>`).join('')
          : ''}
      </select>
    </div>` : '';

  const vintageField = r.vintage.enabled ? `
    <div class="form-group">
      <label for="wineVintage">${t('lobby.vintage')}${isGuess ? ` ${opt}` : ''}</label>
      <select id="wineVintage">${vintageOptions}</select>
    </div>` : '';

  // ── Guess form: simplified (single grape only, no emoji/name)
  if (isGuess) {
    const grapeField = r.grape.enabled ? `
      <div class="form-group">
        <label>${t('lobby.grapeVariety')} ${opt}</label>
        ${buildGrapeAutocomplete({ id: 'singleGrape', prefillValue: singleGrape, placeholder: t('form.searchGrape') })}
      </div>` : '';

    const oldWorldField = r.oldWorld.enabled ? `
      <div class="form-group">
        <label>${t('rules.oldWorld')} ${opt}</label>
        <div class="radio-group">
          <div class="radio-option">
            <input type="radio" name="guessOldWorld" id="guessOldWorldOld" value="old"${prefill?.oldWorld === true ? ' checked' : ''}>
            <label for="guessOldWorldOld" style="font-family:-apple-system,system-ui,sans-serif;font-style:normal">${t('rules.oldWorldVal')}</label>
          </div>
          <div class="radio-option">
            <input type="radio" name="guessOldWorld" id="guessOldWorldNew" value="new"${prefill?.oldWorld === false ? ' checked' : ''}>
            <label for="guessOldWorldNew" style="font-family:-apple-system,system-ui,sans-serif;font-style:normal">${t('rules.newWorldVal')}</label>
          </div>
        </div>
      </div>` : '';

    const abvField = r.abv.enabled ? buildAbvSelect('wineAbv', prefill?.abv, false) : '';
    const priceField = r.price.enabled ? buildPriceRangeSelect('winePriceRange', r.price.currency, r.price.rangeWidth, prefill?.priceRange) : '';

    return `
      ${grapeField}
      ${oldWorldField}
      ${countryField}
      ${regionField}
      ${vintageField}
      ${abvField}
      ${priceField}
    `;
  }

  // ── Wine registration form: full form with emoji / name / cépage
  const grapeSection = r.grape.enabled ? `
    <div class="form-group">
      <label>${t('form.cepage')}</label>
      <div class="radio-group">
        <div class="radio-option">
          <input type="radio" name="wineType" id="typeSingle" value="single" ${prefillType !== 'blend' ? 'checked' : ''}>
          <label for="typeSingle" style="font-family:-apple-system,system-ui,sans-serif;font-style:normal">${t('form.singleVarietal')}</label>
        </div>
        <div class="radio-option">
          <input type="radio" name="wineType" id="typeBlend" value="blend" ${prefillType === 'blend' ? 'checked' : ''}>
          <label for="typeBlend" style="font-family:-apple-system,system-ui,sans-serif;font-style:normal">${t('form.blend')}</label>
        </div>
      </div>
    </div>
    <div id="singleVarietalSection" style="${prefillType === 'blend' ? 'display:none' : ''}">
      <div class="form-group">
        <label>${t('lobby.grapeVariety')}</label>
        ${buildGrapeAutocomplete({ id: 'singleGrape', prefillValue: singleGrape, placeholder: t('form.searchGrape') })}
      </div>
    </div>
    <div id="blendSection" style="${prefillType !== 'blend' ? 'display:none' : ''}">
      <div class="form-group">
        <label>${t('form.grapeBlend')} <span class="optional">${t('form.blendHint')}</span></label>
        ${blendRows}
        <div class="pct-total" id="pctTotal">${t('form.pctTotal')}: 0%</div>
      </div>
    </div>` : '';

  const abvField = r.abv.enabled ? buildAbvSelect('wineAbv', prefill?.abv, true) : '';
  const priceField = r.price.enabled ? buildPriceInput('winePrice', r.price.currency, prefill?.price, true) : '';

  let flightField = '';
  if (showFlight) {
    const prefillFlight = (prefill && prefill.flightNumber != null) ? Number(prefill.flightNumber) : null;
    const nextFlight = existingFlights.length ? Math.max(...existingFlights) + 1 : 1;
    const allFlightOpts = [
      `<option value="">${t('wine.flightNone')}</option>`,
      ...existingFlights.map(n =>
        `<option value="${n}"${prefillFlight === n ? ' selected' : ''}>${t('wine.flight')} ${n}</option>`
      ),
      `<option value="${nextFlight}"${prefillFlight === nextFlight ? ' selected' : ''}>${t('wine.flight')} ${nextFlight}</option>`
    ].join('');
    const prefillName = prefillFlight != null ? (flightNames[String(prefillFlight)] || '') : '';
    flightField = `
      <div class="form-group">
        <label for="wineFlight">${t('wine.flight')}</label>
        <select id="wineFlight">${allFlightOpts}</select>
      </div>
      <div id="flightNameAccordion" style="${prefillFlight != null ? '' : 'display:none'}">
        <div class="form-group">
          <label for="wineFlightName">${t('wine.flightName')} <span class="optional">${t('form.optional')}</span></label>
          <input type="text" id="wineFlightName" placeholder="${t('wine.flightNamePlaceholder')}" value="${escHtml(prefillName)}">
        </div>
      </div>`;
  }

  return `
    <div class="form-group">
      <label>${t('form.wineEmoji')}</label>
      <div class="emoji-picker wine-emoji-picker" id="wineEmojiPicker">
        ${WINE_EMOJIS.map(e => `<button type="button" class="emoji-btn${e === defaultEmoji ? ' selected' : ''}" data-emoji="${e}"><span>${e}</span></button>`).join('')}
      </div>
      <input type="hidden" id="selectedWineEmoji" value="${defaultEmoji}">
    </div>
    <div class="form-group">
      <label for="wineName">${t('form.wineName')}</label>
      <input type="text" id="wineName" placeholder="e.g. Château Margaux" value="${prefill ? escHtml(prefill.name || '') : ''}">
    </div>
    ${grapeSection}
    ${countryField}
    ${regionField}
    ${vintageField}
    ${abvField}
    ${priceField}
    ${flightField}
  `;
}

function attachWineFormListeners(regions, grapes = [], flightNames = {}) {
  attachGrapeAutocomplete(grapes);

  document.querySelectorAll('.wine-emoji-picker .emoji-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.wine-emoji-picker .emoji-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const hiddenInput = document.getElementById('selectedWineEmoji');
      if (hiddenInput) hiddenInput.value = btn.dataset.emoji;
    });
  });

  document.querySelectorAll('input[name="wineType"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const isBlend = radio.value === 'blend';
      document.getElementById('singleVarietalSection').style.display = isBlend ? 'none' : '';
      document.getElementById('blendSection').style.display = isBlend ? '' : 'none';
      updatePctTotal();
    });
  });

  document.querySelectorAll('.blend-pct').forEach(inp => {
    inp.addEventListener('input', updatePctTotal);
  });

  const countrySelect = document.getElementById('wineCountry');
  if (countrySelect) {
    countrySelect.addEventListener('change', () => {
      updateRegionDropdown(countrySelect.value, regions);
    });
    if (countrySelect.value) updateRegionDropdown(countrySelect.value, regions, document.getElementById('wineRegion')?.value);
  }

  // Flight select → show/hide name accordion + pre-fill existing name
  const flightSelect = document.getElementById('wineFlight');
  if (flightSelect) {
    flightSelect.addEventListener('change', () => {
      const accordion = document.getElementById('flightNameAccordion');
      const nameInput = document.getElementById('wineFlightName');
      const v = flightSelect.value;
      if (accordion) accordion.style.display = v ? '' : 'none';
      if (nameInput && v) nameInput.value = flightNames[v] || '';
    });
  }

  updatePctTotal();
}

function updatePctTotal() {
  const totalEl = document.getElementById('pctTotal');
  if (!totalEl) return;
  let sum = 0;
  document.querySelectorAll('.blend-pct').forEach(inp => {
    const v = parseInt(inp.value, 10);
    if (!isNaN(v)) sum += v;
  });
  totalEl.textContent = `${t('form.pctTotal')}: ${sum}%`;
  totalEl.className = `pct-total ${sum === 100 ? 'ok' : 'bad'}`;
}

function updateRegionDropdown(country, regions, selectedRegion = '') {
  const regionGroup = document.getElementById('regionGroup');
  const regionSelect = document.getElementById('wineRegion');
  if (!regionGroup || !regionSelect) return;
  const list = regions[country] || [];
  if (list.length === 0) {
    regionGroup.style.display = 'none';
    regionSelect.value = '';
    return;
  }
  regionGroup.style.display = '';
  regionSelect.innerHTML = `<option value="">${t('form.selectRegion')}</option>` +
    list.map(r => `<option value="${r}" ${r === selectedRegion ? 'selected' : ''}>${r}</option>`).join('');
}

function collectWineFormData(isGuess = false, rules = null) {
  const r = normaliseRulesClient(rules);
  const varietals = [];
  let type;

  if (isGuess) {
    type = 'single';
    const grape = r.grape.enabled ? (document.getElementById('singleGrape')?.value || null) : null;
    if (grape) varietals.push({ grape, percentage: 100 });
  } else {
    if (r.grape.enabled) {
      type = document.querySelector('input[name="wineType"]:checked')?.value || 'single';
      if (type === 'single') {
        const grape = document.getElementById('singleGrape')?.value;
        if (grape) varietals.push({ grape, percentage: 100 });
      } else {
        document.querySelectorAll('.blend-grape').forEach((sel, i) => {
          if (sel.value) {
            const pctEl = document.querySelectorAll('.blend-pct')[i];
            const entry = { grape: sel.value };
            if (pctEl) entry.percentage = parseInt(pctEl.value, 10) || 0;
            varietals.push(entry);
          }
        });
      }
    } else {
      type = 'single';
    }
  }

  const data = {
    vintage: r.vintage.enabled ? (document.getElementById('wineVintage')?.value || null) : null,
    type,
    varietals,
    country: document.getElementById('wineCountry')?.value || null,
    region: document.getElementById('wineRegion')?.value || null
  };

  if (isGuess && r.oldWorld.enabled) {
    const owEl = document.querySelector('input[name="guessOldWorld"]:checked');
    if (owEl) data.oldWorld = owEl.value === 'old';
  }

  // ABV
  if (r.abv.enabled) {
    const abvVal = document.getElementById('wineAbv')?.value;
    data.abv = abvVal ? Number(abvVal) : null;
  }

  // Price (wine = actual price, guess = range bucket)
  if (r.price.enabled) {
    if (isGuess) {
      const rangeVal = document.getElementById('winePriceRange')?.value;
      if (rangeVal) {
        const [minStr, maxStr] = rangeVal.split('|');
        data.priceRange = { min: Number(minStr), max: maxStr === '' ? null : Number(maxStr) };
      }
    } else {
      const priceVal = document.getElementById('winePrice')?.value;
      data.price = priceVal ? Number(priceVal) : null;
    }
  }

  if (!isGuess) {
    data.name = document.getElementById('wineName')?.value || '';
    data.emoji = document.getElementById('selectedWineEmoji')?.value || '1️⃣';
    const flightEl = document.getElementById('wineFlight');
    if (flightEl) {
      data.flightNumber = flightEl.value ? Number(flightEl.value) : null;
      data.flightName = document.getElementById('wineFlightName')?.value || '';
    }
  }
  return data;
}

// ── Wine registration / edit page ─────────────────────────────────────────────
async function renderWineRegistration(lobbyId, wineId = null) {
  const app = document.getElementById('app');
  app.innerHTML = `<div class="page"><div class="loading-screen"><div class="wine-glass">🍷</div><p>Loading...</p></div></div>`;

  const session = API.getSession(lobbyId);
  if (!session) { window.location.hash = `#/lobby/${lobbyId}`; return; }

  let grapes, countries, regions, lobby;
  try {
    [grapes, countries, regions, lobby] = await Promise.all([
      API.getGrapes(), API.getCountries(), API.getRegions(), API.getLobby(lobbyId)
    ]);
  } catch {
    app.innerHTML = `<div class="page"><div class="alert alert-error">Failed to load.</div></div>`;
    return;
  }

  const rules = normaliseRulesClient(lobby.rules);
  const player = lobby.players[session.playerId];
  const isEditing = !!wineId;
  const prefill = isEditing ? (player.wines || []).find(w => w.id === wineId) : null;
  const wineIndex = isEditing ? (player.wines || []).findIndex(w => w.id === wineId) : (player.wines || []).length;

  // Flight feature: only for the host in hostPrepares mode
  const showFlight = (lobby.gameMode === 'hostPrepares') && lobby.isHost;
  const flightNames = lobby.flightNames || {};
  const existingFlights = showFlight
    ? [...new Set(
        Object.values(lobby.players).flatMap(p => (p.wines || []).map(w => w.flightNumber).filter(n => n != null))
      )].sort((a, b) => a - b)
    : [];

  const submitLabel = isEditing ? t('wine.saveEdit') : t('wine.submitNew');

  app.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h1>${isEditing ? t('wine.editTitle') : t('wine.pageTitle')}</h1>
        <p>${isEditing ? t('wine.editSubtitle') : t('wine.pageSubtitle')}</p>
      </div>
      <div class="card">
        ${buildWineFormHTML({ isGuess: false, prefill, grapes, countries, regions, wineIndex, rules, showFlight, existingFlights, flightNames })}
        <div id="wineError"></div>
        <button class="btn btn-primary" id="wineSubmitBtn">${submitLabel}</button>
        ${isEditing ? `
        <div style="margin-top:10px">
          <button class="btn btn-danger" id="removeWineBtn">${t('wine.removeBtn')}</button>
        </div>` : `
        <div style="margin-top:10px">
          <button class="btn btn-skip" id="skipWineBtn">${t('wine.skip')}</button>
        </div>`}
      </div>
    </div>
  `;

  attachWineFormListeners(regions, grapes, flightNames);

  async function submitWine(redirectToLobby = true) {
    const data = collectWineFormData(false, rules);
    const errorEl = document.getElementById('wineError');
    const btn = document.getElementById('wineSubmitBtn');
    btn.disabled = true;
    btn.innerHTML = `<span class="spin">⏳</span> ${t('wine.saving')}`;
    errorEl.innerHTML = '';

    try {
      if (isEditing) {
        await API.updateWine(lobbyId, session.playerId, wineId, data);
      } else {
        await API.addWine(lobbyId, session.playerId, data);
      }
      if (redirectToLobby) {
        window.location.hash = `#/lobby/${lobbyId}`;
      } else {
        showToast(t('wine.added'));
        await renderWineRegistration(lobbyId, null);
      }
    } catch (err) {
      const raw = err.errors ? err.errors : [err.error || 'Failed to save wine.'];
      const msgs = translateServerErrors(raw);
      errorEl.innerHTML = `<div class="alert alert-error"><ul>${msgs.map(m => `<li>${escHtml(m)}</li>`).join('')}</ul></div>`;
      btn.disabled = false;
      btn.innerHTML = submitLabel;
    }
  }

  document.getElementById('wineSubmitBtn').addEventListener('click', () => submitWine(true));

  if (isEditing) {
    let removeConfirmPending = false;
    let removeConfirmTimer = null;
    const removeBtn = document.getElementById('removeWineBtn');
    if (removeBtn) {
      removeBtn.addEventListener('click', async () => {
        if (!removeConfirmPending) {
          // First click: ask for confirmation inline
          removeConfirmPending = true;
          removeBtn.textContent = t('wine.removeConfirm');
          removeBtn.classList.add('btn-confirm-pending');
          removeConfirmTimer = setTimeout(() => {
            removeConfirmPending = false;
            removeBtn.textContent = t('wine.removeBtn');
            removeBtn.classList.remove('btn-confirm-pending');
          }, 3000);
          return;
        }
        // Second click within 3 s: confirmed — proceed with removal
        clearTimeout(removeConfirmTimer);
        removeConfirmPending = false;
        removeBtn.disabled = true;
        removeBtn.textContent = t('wine.removing');
        removeBtn.classList.remove('btn-confirm-pending');
        try {
          await API.removeWine(lobbyId, session.playerId, wineId);
          showToast(t('wine.removed'));
          window.location.hash = `#/lobby/${lobbyId}`;
        } catch (err) {
          showToast(err.error || t('wine.removeFailed'));
          removeBtn.disabled = false;
          removeBtn.textContent = t('wine.removeBtn');
        }
      });
    }
  } else {
    document.getElementById('skipWineBtn')?.addEventListener('click', () => {
      window.location.hash = `#/lobby/${lobbyId}`;
    });
  }
}
