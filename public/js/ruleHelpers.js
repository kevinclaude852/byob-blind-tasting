// ── Client-side rule utilities ─────────────────────────────────────────────────

const OLD_WORLD_COUNTRIES_CLIENT = new Set([
  'France', 'Italy', 'Spain', 'Portugal', 'Germany', 'Austria', 'Hungary',
  'Greece', 'Croatia', 'Slovenia', 'Romania', 'Bulgaria', 'Georgia',
  'Switzerland', 'Luxembourg', 'England'
]);

function isOldWorld(country) {
  return OLD_WORLD_COUNTRIES_CLIENT.has(country);
}

function getAbvOptions() {
  const opts = [];
  for (let v = 5.0; v <= 20.01; v = Math.round((v + 0.5) * 10) / 10) {
    opts.push(v);
  }
  return opts;
}

const CURRENCY_CAPS_CLIENT = { HKD: 1200, USD: 150, GBP: 120, EUR: 130 };

function getPriceBuckets(currency, rangeWidth) {
  const cap = CURRENCY_CAPS_CLIENT[currency] || 1000;
  const buckets = [];
  for (let min = 0; min < cap; min += rangeWidth) {
    buckets.push({ min, max: min + rangeWidth });
  }
  buckets.push({ min: cap, max: null });
  return buckets;
}

function formatPriceBucket(bucket, currency) {
  if (!bucket) return '—';
  const sym = { HKD: 'HK$', USD: '$', GBP: '£', EUR: '€' }[currency] || currency + ' ';
  if (bucket.max === null) return `${sym}${bucket.min}+`;
  return `${sym}${bucket.min}–${sym}${bucket.max}`;
}

function formatVarietalClient(obj) {
  if (!obj) return '—';
  if (obj.type === 'blend') {
    return (obj.varietals || []).filter(v => v.grape)
      .map(v => `${v.grape}${v.percentage ? ` ${v.percentage}%` : ''}`).join(', ') || '—';
  }
  return obj.varietals?.[0]?.grape || '—';
}

function getDefaultRulesClient() {
  return {
    grape:    { enabled: true,  score: 10 },
    oldWorld: { enabled: false, score: 5  },
    country:  { enabled: true,  score: 5  },
    region:   { enabled: true,  score: 5  },
    vintage:  { enabled: true,  mode: 'exact', scoreExact: 3, scorePlusOne: 2, scorePlusTwo: 1 },
    abv:      { enabled: false, score: 3  },
    price:    { enabled: false, score: 3, currency: 'HKD', rangeWidth: 100 }
  };
}

function normaliseRulesClient(rules) {
  const def = getDefaultRulesClient();
  if (!rules) return def;
  const out = {};
  for (const key of Object.keys(def)) {
    out[key] = Object.assign({}, def[key], rules[key] || {});
  }
  return out;
}

/**
 * Build comparison row data for wine vs guess display.
 * Returns array of { label, guessVal, wineVal, scoreKey }.
 */
function buildCompareRows(wine, guess, rules) {
  const r = normaliseRulesClient(rules);
  const isHK = typeof getLocale === 'function' && getLocale() === 'hk';
  const rows = [];

  if (r.grape.enabled) {
    rows.push({
      label: isHK ? '提子' : 'Variety',
      guessVal: guess ? formatVarietalClient(guess) : '—',
      wineVal: wine ? formatVarietalClient(wine) : '—',
      scoreKey: 'varietal'
    });
  }
  if (r.oldWorld.enabled) {
    const guessVal = guess?.oldWorld != null
      ? (guess.oldWorld ? t('rules.oldWorldVal') : t('rules.newWorldVal'))
      : '—';
    const wineVal = wine?.country
      ? (isOldWorld(wine.country) ? t('rules.oldWorldVal') : t('rules.newWorldVal'))
      : '—';
    rows.push({ label: isHK ? '新舊世界' : 'Old / New', guessVal, wineVal, scoreKey: 'oldWorld' });
  }
  if (r.country.enabled) {
    rows.push({
      label: isHK ? '國家' : 'Country',
      guessVal: guess?.country || '—',
      wineVal: wine?.country || '—',
      scoreKey: 'country'
    });
  }
  if (r.region.enabled) {
    rows.push({
      label: isHK ? '產區' : 'Region',
      guessVal: guess?.region || '—',
      wineVal: wine?.region || '—',
      scoreKey: 'region'
    });
  }
  if (r.vintage.enabled) {
    rows.push({
      label: isHK ? '年份' : 'Vintage',
      guessVal: guess?.vintage ? String(guess.vintage) : '—',
      wineVal: wine?.vintage ? String(wine.vintage) : '—',
      scoreKey: 'vintage'
    });
  }
  if (r.abv.enabled) {
    rows.push({
      label: isHK ? '酒精度' : 'ABV',
      guessVal: guess?.abv != null ? `${guess.abv}%` : '—',
      wineVal: wine?.abv != null ? `${wine.abv}%` : '—',
      scoreKey: 'abv'
    });
  }
  if (r.price.enabled) {
    const currency = r.price.currency || 'HKD';
    rows.push({
      label: isHK ? '價錢' : 'Price',
      guessVal: guess?.priceRange ? formatPriceBucket(guess.priceRange, currency) : '—',
      wineVal: wine?.price != null ? formatPriceBucket({ min: wine.price, max: wine.price }, currency).replace('–' + formatPriceBucket({ min: wine.price, max: wine.price }, currency).split('–')[1] || '', '') || `${wine.price} ${currency}` : '—',
      scoreKey: 'price'
    });
  }
  return rows;
}

/**
 * Build score chip data for display.
 * Returns array of { label, val }.
 */
function buildScoreChips(score, rules) {
  const r = normaliseRulesClient(rules);
  const isHK = typeof getLocale === 'function' && getLocale() === 'hk';
  const chips = [];
  if (r.grape.enabled)    chips.push({ label: isHK ? '提子' : 'Variety',    val: score?.varietal ?? 0 });
  if (r.oldWorld.enabled) chips.push({ label: isHK ? '新舊世界' : 'O/N World', val: score?.oldWorld  ?? 0 });
  if (r.country.enabled)  chips.push({ label: isHK ? '國家' : 'Country',    val: score?.country   ?? 0 });
  if (r.region.enabled)   chips.push({ label: isHK ? '產區' : 'Region',     val: score?.region    ?? 0 });
  if (r.vintage.enabled)  chips.push({ label: isHK ? '年份' : 'Vintage',    val: score?.vintage   ?? 0 });
  if (r.abv.enabled)      chips.push({ label: isHK ? '酒精度' : 'ABV',        val: score?.abv       ?? 0 });
  if (r.price.enabled)    chips.push({ label: isHK ? '價錢' : 'Price',      val: score?.price     ?? 0 });
  chips.push({ label: isHK ? '總分' : 'Total', val: score?.total ?? 0 });
  return chips;
}

/** Returns the max possible points per wine for a rule set. */
function getMaxScore(rules) {
  const r = normaliseRulesClient(rules);
  let max = 0;
  if (r.grape.enabled)    max += r.grape.score;
  if (r.oldWorld.enabled) max += r.oldWorld.score;
  if (r.country.enabled)  max += r.country.score;
  if (r.region.enabled)   max += r.region.score;
  if (r.vintage.enabled)  max += r.vintage.scoreExact;
  if (r.abv.enabled)      max += r.abv.score;
  if (r.price.enabled)    max += r.price.score;
  return max;
}

/**
 * Build the scoring rules display rows for lobby / export.
 * Returns array of { cat, pts, desc }.
 */
function buildRuleDisplayRows(rules) {
  const r = normaliseRulesClient(rules);
  const isHK = typeof getLocale === 'function' && getLocale() === 'hk';
  const rows = [];

  if (r.grape.enabled) {
    rows.push({
      cat: t('rules.grape'),
      pts: isHK ? `最多 ${r.grape.score} 分` : `Up to ${r.grape.score} pts`,
      desc: t('rules.grapeDesc')
    });
  }
  if (r.oldWorld.enabled) {
    rows.push({
      cat: t('rules.oldWorld'),
      pts: isHK ? `${r.oldWorld.score} 分` : `${r.oldWorld.score} pts`,
      desc: isHK ? '啱晒先計' : 'Exact match'
    });
  }
  if (r.country.enabled) {
    rows.push({
      cat: t('rules.country'),
      pts: isHK ? `${r.country.score} 分` : `${r.country.score} pts`,
      desc: isHK ? '啱晒先計' : 'Exact match'
    });
  }
  if (r.region.enabled) {
    rows.push({
      cat: t('rules.region'),
      pts: isHK ? `${r.region.score} 分` : `${r.region.score} pts`,
      desc: isHK ? '啱晒先計' : 'Exact match'
    });
  }
  if (r.vintage.enabled) {
    let ptsStr, descStr;
    if (r.vintage.mode === 'exact') {
      ptsStr = isHK ? `${r.vintage.scoreExact} 分` : `${r.vintage.scoreExact} pts`;
      descStr = isHK ? '啱晒先計' : 'Exact match';
    } else if (r.vintage.mode === 'plusOne') {
      ptsStr = isHK ? `${r.vintage.scoreExact} / ${r.vintage.scorePlusOne} 分` : `${r.vintage.scoreExact} / ${r.vintage.scorePlusOne} pts`;
      descStr = isHK ? '啱晒 / ±1年' : 'Exact / ±1 year';
    } else {
      ptsStr = isHK ? `${r.vintage.scoreExact} / ${r.vintage.scorePlusOne} / ${r.vintage.scorePlusTwo} 分` : `${r.vintage.scoreExact} / ${r.vintage.scorePlusOne} / ${r.vintage.scorePlusTwo} pts`;
      descStr = isHK ? '啱晒 / ±1年 / ±2年' : 'Exact / ±1 / ±2 years';
    }
    rows.push({ cat: t('rules.vintage'), pts: ptsStr, desc: descStr });
  }
  if (r.abv.enabled) {
    rows.push({
      cat: t('rules.abv'),
      pts: isHK ? `${r.abv.score} 分` : `${r.abv.score} pts`,
      desc: isHK ? '啱晒先計' : 'Exact match'
    });
  }
  if (r.price.enabled) {
    rows.push({
      cat: t('rules.price'),
      pts: isHK ? `${r.price.score} 分` : `${r.price.score} pts`,
      desc: isHK ? `範圍內即計` : `Wine price in guessed range`
    });
  }
  return rows;
}

/** Format a wine's price as "HK$250" etc. */
function formatWinePrice(price, currency) {
  if (price == null) return '—';
  const sym = { HKD: 'HK$', USD: '$', GBP: '£', EUR: '€' }[currency] || currency + ' ';
  return `${sym}${price}`;
}
