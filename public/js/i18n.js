// ── Translations ─────────────────────────────────────────────────────────────
const TRANSLATIONS = {
  en: {
    // Landing
    'app.title':                    'BYOB Blind Tasting Game',
    'app.subtitle':                 'Create a lobby and invite your friends',
    'landing.lobbyName':            'Lobby Name',
    'landing.lobbyNamePlaceholder': 'e.g. Friday Night Tasting',
    'landing.hostNotParticipating': 'Host is not participating (organizer only)',
    'landing.yourName':             'Your Name',
    'landing.yourNamePlaceholder':  'Enter your name',
    'landing.yourAvatar':           'Your Avatar',
    'landing.createLobby':          'Create Lobby',
    // Lobby — header
    'lobby.shareLink':    'Share Link',
    'lobby.copyLink':     '📋 Copy Link',
    'lobby.qrCode':       'QR Code',
    'lobby.players':      'Players',
    'lobby.wines':        'Wines',
    'lobby.you':          'You',
    'lobby.addWine':      '+ Add Wine',
    'lobby.myGuesses':    '📋 My Guesses',
    'lobby.leaderboard':  '🏆 Leaderboard',
    // Lobby — wine detail labels
    'lobby.variety':      'Variety',
    'lobby.country':      'Country',
    'lobby.region':       'Region',
    'lobby.vintage':      'Vintage',
    'lobby.pts':          'pts',
    // Lobby — scoring rules
    'lobby.scoringRules':     'Scoring Rules',
    'lobby.grapeVariety':     'Grape Variety',
    'lobby.upTo10pts':        'Up to 10 pts',
    'lobby.grapeDesc':        'Pro-rated by % of correct varietals identified',
    'lobby.5pts':             '5 pts',
    'lobby.exactMatch':       'Exact match',
    'lobby.vintageScore':     '5 / 1 pts',
    'lobby.vintageDesc':      'Exact / ±1 year',
    'lobby.maxPts':           'Maximum 25 pts per wine',
    'lobby.noWinesYet':       '⏳ No wines yet',
    // Join page
    'join.subtitle':          "You've been invited to a blind tasting!",
    'join.yourName':          'Your Name',
    'join.namePlaceholder':   'Enter your name',
    'join.yourAvatar':        'Your Avatar',
    'join.joinBtn':           'Join Tasting',
    // Wine registration page
    'wine.pageTitle':         'Register Your Wine',
    'wine.pageSubtitle':      "Tell us about the wine you're bringing",
    'wine.submitNew':         'Add Wine & Enter Lobby',
    'wine.skip':              'I Brought No Wine — Go to Lobby',
    'wine.editTitle':         'Edit Wine',
    'wine.editSubtitle':      'Update your wine details',
    'wine.saveEdit':          'Save My Wine & Return to Lobby',
    'wine.removeBtn':         'Remove This Wine',
    // Shared form fields
    'form.wineEmoji':         'Wine Emoji',
    'form.wineName':          'Wine Name',
    'form.cepage':            'Cépage',
    'form.singleVarietal':    'Single Varietal',
    'form.blend':             'Blend',
    'form.searchGrape':       'Type to search grape...',
    'form.selectGrape':       'Select Grape Variety',
    'form.selectCountry':     '-- Select Country --',
    'form.optional':          '(optional)',
    'form.selectRegion':      '-- Select Region --',
    'form.selectVintage':     '-- Select --',
    'form.blendHint':         '— percentages must total 100',
    'form.pctTotal':          'Total',
    // Validation errors (client-side)
    'error.enterLobbyName':   'Please enter a lobby name.',
    'error.enterName':        'Please enter your name.',
    'error.chooseAvatar':     'Please choose an avatar.',
    // Lobby wine row buttons & countdown
    'lobby.editBtn':          'Edit',
    'lobby.revealBtn':        'Reveal',
    'lobby.revealsIn':        'Reveals in',
    'lobby.stopBtn':          'Stop',
    // Reveal modal
    'modal.revealWine':       'Reveal Wine',
    'modal.revealSubPre':     'Choose when to reveal ',
    'modal.revealSubPost':    '',
    'modal.revealNow':        'Reveal Now',
    'modal.orCountdown':      'Or reveal after counting down from',
    'modal.minUnit':          ' min',
    'modal.cancel':           'Cancel',
    // Server-side wine validation errors
    'serverErr.wineName':     'Wine name is required.',
    'serverErr.blend2':       'A blend must have at least 2 grape varieties.',
    'serverErr.blendPct':     'Each varietal percentage must be an integer between 1 and 99.',
    'serverErr.vintage':      'Vintage is required.',
    'serverErr.grape':        'At least one grape variety is required.',
    'serverErr.country':      'Country is required.',
    // Shared nav
    'nav.backToLobby':        '← Back to Lobby',
    // Lobby guess buttons
    'lobby.guessBtn':         'Guess',
    'lobby.changeGuessBtn':   'Change My Guess',
    // Guess page
    'guess.subtitle':         'Make your guess — all fields are optional',
    'guess.saveBtn':          'Save My Guess',
    // Leaderboard page
    'lb.title':               'Leaderboard',
    'lb.overallRankings':     '🏆 Overall Rankings',
    'lb.pts':                 'pts',
    'lb.noGuesses':           'No guesses submitted',
    'lb.wineBreakdown':       'Wine Breakdown',
    'lb.theGuess':            'The Guess',
    'lb.theWine':             'The Wine',
    'lb.varietal':            'Varietal',
    'lb.country':             'Country',
    'lb.region':              'Region',
    'lb.vintage':             'Vintage',
    'lb.player':              'Player',
    'lb.points':              'Points',
    // My Guesses page
    'mg.title':               'My Guesses',
    'mg.totalScore':          'Total Score',
    'mg.pts':                 'pts',
    'mg.myGuess':             'My Guess',
    'mg.theWine':             'The Wine',
    'mg.grapeVariety':        'Grape Variety',
    'mg.country':             'Country',
    'mg.region':              'Region',
    'mg.vintage':             'Vintage',
    'mg.variety':             'Variety',
  },
  hk: {
    // Landing
    'app.title':                    'Blind Tasting斷鳩估冇痛苦',
    'app.subtitle':                 '開個大廳搵埋啲friend',
    'landing.lobbyName':            '大廳叫咩名',
    'landing.lobbyNamePlaceholder': 'e.g. Yellowtail 垂直品鑑會',
    'landing.hostNotParticipating': '攪手齋攪唔玩',
    'landing.yourName':             '尊姓大名',
    'landing.yourNamePlaceholder':  '你叫咩名',
    'landing.yourAvatar':           '揀個嘜頭',
    'landing.createLobby':          '建立大廳',
    // Lobby — header
    'lobby.shareLink':    '分享連結',
    'lobby.copyLink':     '📋 複製連結',
    'lobby.qrCode':       'QR曲',
    'lobby.players':      '參加者',
    'lobby.wines':        '酒',
    'lobby.you':          '自己',
    'lobby.addWine':      '加多支酒',
    'lobby.myGuesses':    '📋 我嘅答案',
    'lobby.leaderboard':  '🏆 龍虎榜',
    // Lobby — wine detail labels
    'lobby.variety':      '提子品種',
    'lobby.country':      '國家',
    'lobby.region':       '產區',
    'lobby.vintage':      '年份',
    'lobby.pts':          '分',
    // Lobby — scoring rules
    'lobby.scoringRules':     '計分準則',
    'lobby.grapeVariety':     '提子品種',
    'lobby.upTo10pts':        '最多 10 分',
    'lobby.grapeDesc':        '按估中嘅提子所佔比例計分',
    'lobby.5pts':             '5 分',
    'lobby.exactMatch':       '啱晒先計',
    'lobby.vintageScore':     '5 / 1 分',
    'lobby.vintageDesc':      '啱晒 / ±1 年',
    'lobby.maxPts':           '每支酒最多 25 分',
    'lobby.noWinesYet':       '⏳ 未有酒喎',
    // Join page
    'join.subtitle':          '有人水咗你嚟玩Blind Tasting!',
    'join.yourName':          '專姓大名',
    'join.namePlaceholder':   '起返個朵',
    'join.yourAvatar':        '揀個嘜頭',
    'join.joinBtn':           '進入大廳',
    // Wine registration page
    'wine.pageTitle':         '帶咗酒嚟？登記返',
    'wine.pageSubtitle':      '話畀我知你帶咗啲乜嘢',
    'wine.submitNew':         'Save低支酒進入大廳',
    'wine.skip':              '我冇帶酒嚟，直入大廳',
    'wine.editTitle':         '修改支酒',
    'wine.editSubtitle':      '改下支酒嘅資料',
    'wine.saveEdit':          'Save低支酒返大廳',
    'wine.removeBtn':         '移除支酒',
    // Shared form fields
    'form.wineEmoji':         '支酒個icon',
    'form.wineName':          '酒名',
    'form.cepage':            '咩提子',
    'form.singleVarietal':    '單一提子',
    'form.blend':             '溝',
    'form.searchGrape':       '打字就會搵到',
    'form.selectGrape':       '提子品種',
    'form.selectCountry':     '揀國家',
    'form.optional':          '(可以唔填)',
    'form.selectRegion':      '揀產區',
    'form.selectVintage':     '揀年份',
    'form.blendHint':         '- 總共一定要100%',
    'form.pctTotal':          '總共',
    // Validation errors (client-side)
    'error.enterLobbyName':   '唔該入返個大廳名',
    'error.enterName':        '唔起朵，冇人識你喎',
    'error.chooseAvatar':     '揀返個嘜頭',
    // Lobby wine row buttons & countdown
    'lobby.editBtn':          '修改',
    'lobby.revealBtn':        '開估',
    'lobby.revealsIn':        '倒數完開估',
    'lobby.stopBtn':          '停止',
    // Reveal modal
    'modal.revealWine':       '開估支酒',
    'modal.revealSubPre':     '擇個時辰幾時開',
    'modal.revealSubPost':    '支酒',
    'modal.revealNow':        '即刻開估',
    'modal.orCountdown':      '或者揀倒數幾耐再開估',
    'modal.minUnit':          '分鐘',
    'modal.cancel':           '取消',
    // Server-side wine validation errors
    'serverErr.wineName':     '唔該入返支酒嘅名',
    'serverErr.blend2':       '叫得做溝，起碼要兩隻提子',
    'serverErr.blendPct':     '每隻提子最少1%最多99%',
    'serverErr.vintage':      '唔該填番年份',
    'serverErr.grape':        '最少揀一隻提子',
    'serverErr.country':      '唔該揀返國家',
    // Shared nav
    'nav.backToLobby':        '返大廳',
    // Lobby guess buttons
    'lobby.guessBtn':         '估酒',
    'lobby.changeGuessBtn':   '轉軚',
    // Guess page
    'guess.subtitle':         '估下支酒係乜，冇強迫你估晒㗎',
    'guess.saveBtn':          'Save低先',
    // Leaderboard page
    'lb.title':               '龍虎榜',
    'lb.overallRankings':     '🏆 總體排名',
    'lb.pts':                 '分數',
    'lb.noGuesses':           '條友係站長，仲未估',
    'lb.wineBreakdown':       '逐支酒睇',
    'lb.theGuess':            '估',
    'lb.theWine':             '答案',
    'lb.varietal':            '提子',
    'lb.country':             '國家',
    'lb.region':              '產區',
    'lb.vintage':             '年份',
    'lb.player':              '參加者',
    'lb.points':              '分數',
    // My Guesses page
    'mg.title':               '我估咗啲乜',
    'mg.totalScore':          '總分',
    'mg.pts':                 '分',
    'mg.myGuess':             '我估',
    'mg.theWine':             '答案',
    'mg.grapeVariety':        '提子',
    'mg.country':             '國家',
    'mg.region':              '產區',
    'mg.vintage':             '年份',
    'mg.variety':             '提子',
  }
};

// ── State ─────────────────────────────────────────────────────────────────────
let _locale = localStorage.getItem('btg-locale') || 'en';

function t(key) {
  return (TRANSLATIONS[_locale] || TRANSLATIONS.en)[key] ?? key;
}

function setLocale(locale) {
  _locale = locale;
  localStorage.setItem('btg-locale', locale);
}

function getLocale() { return _locale; }

// ── Persistent language toggle (injected once into body) ──────────────────────
function initLangToggle() {
  if (document.getElementById('langToggle')) return;

  const wrap = document.createElement('div');
  wrap.id = 'langToggle';
  wrap.style.cssText = [
    'position:fixed',
    'bottom:16px',
    'right:16px',
    'z-index:9999',
    'display:flex',
    'gap:4px',
    'background:var(--card,#fff)',
    'border:1px solid var(--border,#ddd)',
    'border-radius:20px',
    'padding:3px 6px',
    'box-shadow:0 2px 8px rgba(0,0,0,.12)',
  ].join(';');

  ['en', 'hk'].forEach(loc => {
    const btn = document.createElement('button');
    btn.textContent = loc.toUpperCase();
    btn.dataset.loc = loc;
    btn.style.cssText = [
      'border:none',
      'background:none',
      'cursor:pointer',
      'font-size:0.72rem',
      'font-weight:700',
      'letter-spacing:.04em',
      'padding:3px 8px',
      'border-radius:14px',
      'transition:background .15s,color .15s',
    ].join(';');
    updateBtnStyle(btn, loc === _locale);
    btn.addEventListener('click', () => {
      if (loc === _locale) return;
      setLocale(loc);
      wrap.querySelectorAll('button').forEach(b => updateBtnStyle(b, b.dataset.loc === loc));
      // Re-render current page
      if (typeof route === 'function') route();
    });
    wrap.appendChild(btn);
  });

  document.body.appendChild(wrap);
}

function updateBtnStyle(btn, active) {
  btn.style.background = active ? 'var(--wine,#722F37)' : 'transparent';
  btn.style.color       = active ? '#fff' : 'var(--text-muted,#888)';
}

// Map known server error strings to translation keys
const SERVER_ERROR_MAP = {
  'Wine name is required.':                                              'serverErr.wineName',
  'A blend must have at least 2 grape varieties.':                      'serverErr.blend2',
  'Each varietal percentage must be an integer between 1 and 99.':      'serverErr.blendPct',
  'Vintage is required.':                                               'serverErr.vintage',
  'At least one grape variety is required.':                            'serverErr.grape',
  'Country is required.':                                               'serverErr.country',
};

function translateServerErrors(msgs) {
  return msgs.map(m => t(SERVER_ERROR_MAP[m] || m) || m);
}
