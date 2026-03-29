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
    // Lobby
    'lobby.shareLink':  'Share Link',
    'lobby.copyLink':   '📋 Copy Link',
    'lobby.qrCode':     'QR Code',
    'lobby.players':    'Players',
    'lobby.wines':      'Wines',
    'lobby.you':        'You',
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
    // Lobby
    'lobby.shareLink':  '分享連結',
    'lobby.copyLink':   '📋 複製連結',
    'lobby.qrCode':     'QR曲',
    'lobby.players':    '參加者',
    'lobby.wines':      '酒',
    'lobby.you':        '自己',
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
