const { OLD_WORLD_COUNTRIES } = require('../utils/ruleConstants');
const { normaliseRules } = require('../utils/rulesNormaliser');

/**
 * Calculate score for a guess against the actual wine, respecting the lobby rules.
 * Always returns the full score object with all keys (disabled rules score 0).
 */
function calculateScore(actual, guess, rules) {
  const r = normaliseRules(rules);

  if (!actual || !guess) {
    return { varietal: 0, oldWorld: 0, country: 0, region: 0, vintage: 0, abv: 0, price: 0, total: 0 };
  }

  const varietal = r.grape.enabled    ? scoreVarietal(actual, guess, r)  : 0;
  const oldWorld = r.oldWorld.enabled ? scoreOldWorld(actual, guess, r)  : 0;
  const country  = r.country.enabled  ? scoreCountry(actual, guess, r)   : 0;
  const region   = r.region.enabled   ? scoreRegion(actual, guess, r)    : 0;
  const vintage  = r.vintage.enabled  ? scoreVintage(actual, guess, r)   : 0;
  const abv      = r.abv.enabled      ? scoreAbv(actual, guess, r)       : 0;
  const price    = r.price.enabled    ? scorePrice(actual, guess, r)     : 0;

  return {
    varietal,
    oldWorld,
    country,
    region,
    vintage,
    abv,
    price,
    total: varietal + oldWorld + country + region + vintage + abv + price
  };
}

function scoreVarietal(actual, guess, r) {
  if (!guess.varietals || guess.varietals.length === 0) return 0;

  const actualVarietals = actual.varietals || [];
  const guessGrapes = guess.varietals.map(v => v.grape).filter(Boolean);
  if (guessGrapes.length === 0) return 0;

  let matchedPercentage = 0;
  for (const guessGrape of guessGrapes) {
    const found = actualVarietals.find(v => v.grape === guessGrape);
    if (found) matchedPercentage += found.percentage;
  }

  // Pro-rata: (matched%) / 100 * grapeScore, rounded to nearest integer
  return Math.round((matchedPercentage / 100) * r.grape.score);
}

function scoreOldWorld(actual, guess, r) {
  if (guess.oldWorld == null) return 0;
  if (!actual.country) return 0;
  const wineOld = OLD_WORLD_COUNTRIES.has(actual.country);
  return guess.oldWorld === wineOld ? r.oldWorld.score : 0;
}

function scoreCountry(actual, guess, r) {
  if (!guess.country || !actual.country) return 0;
  return guess.country === actual.country ? r.country.score : 0;
}

function scoreRegion(actual, guess, r) {
  if (!actual.region || !guess.region) return 0;
  return guess.region === actual.region ? r.region.score : 0;
}

function scoreVintage(actual, guess, r) {
  if (!guess.vintage) return 0;

  const actualVintage = actual.vintage;
  const guessVintage  = guess.vintage;

  // NV handling: NV must match NV
  if (actualVintage === 'NV') return guessVintage === 'NV' ? r.vintage.scoreExact : 0;
  if (guessVintage  === 'NV') return 0;

  const diff = Math.abs(Number(actualVintage) - Number(guessVintage));
  if (diff === 0) return r.vintage.scoreExact;
  if (diff === 1 && (r.vintage.mode === 'plusOne' || r.vintage.mode === 'plusTwo')) {
    return r.vintage.scorePlusOne;
  }
  if (diff === 2 && r.vintage.mode === 'plusTwo') {
    return r.vintage.scorePlusTwo;
  }
  return 0;
}

function scoreAbv(actual, guess, r) {
  if (actual.abv == null || guess.abv == null) return 0;
  return Number(actual.abv) === Number(guess.abv) ? r.abv.score : 0;
}

function scorePrice(actual, guess, r) {
  if (actual.price == null || !guess.priceRange) return 0;
  const price = Number(actual.price);
  const { min, max } = guess.priceRange;
  if (max === null) return price >= min ? r.price.score : 0;
  return price >= min && price < max ? r.price.score : 0;
}

module.exports = { calculateScore };
