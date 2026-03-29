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
  },
  hk: {
    // Landing
    'app.title':                    '段鳩估冇痛苦',
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
    'lobby.grapeDesc':        'Pro-rated by % of correct varietals identified',
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
