const { DEFAULT_RULES_PRESET } = require('./ruleConstants');

function getDefaultRules() {
  return JSON.parse(JSON.stringify(DEFAULT_RULES_PRESET));
}

/**
 * Merges stored rules with defaults so legacy games (no rules field) behave correctly.
 */
function normaliseRules(rules) {
  if (!rules) return getDefaultRules();
  const def = getDefaultRules();
  const out = {};
  for (const key of Object.keys(def)) {
    out[key] = Object.assign({}, def[key], rules[key] || {});
  }
  return out;
}

/**
 * Creates a zero-filled score object for players who didn't guess.
 * All keys are always present so legacy consumers don't break.
 */
function buildZeroScore() {
  return { varietal: 0, oldWorld: 0, country: 0, region: 0, vintage: 0, abv: 0, price: 0, total: 0 };
}

/**
 * Server-side validation of a rules object submitted by the client.
 * Returns array of error strings (empty = valid).
 */
function validateRules(rules) {
  if (!rules || typeof rules !== 'object') return ['Rules must be an object.'];
  const errors = [];

  function checkScore(val, label, min = 1, max = 20) {
    if (typeof val !== 'number' || val < min || val > max || !Number.isInteger(val)) {
      errors.push(`${label} must be an integer between ${min} and ${max}.`);
    }
  }

  const { grape, oldWorld, country, region, vintage, abv, price } = rules;

  if (grape)    checkScore(grape.score,    'Grape score');
  if (oldWorld) checkScore(oldWorld.score, 'Old World/New World score');
  if (country)  checkScore(country.score,  'Country score');
  if (region)   checkScore(region.score,   'Region score');

  if (vintage) {
    const validModes = ['exact', 'plusOne', 'plusTwo'];
    if (!validModes.includes(vintage.mode)) {
      errors.push('Vintage mode must be exact, plusOne, or plusTwo.');
    }
    checkScore(vintage.scoreExact, 'Vintage exact score');
    if (vintage.mode === 'plusOne' || vintage.mode === 'plusTwo') {
      checkScore(vintage.scorePlusOne, 'Vintage ±1 score');
      if (typeof vintage.scorePlusOne === 'number' && typeof vintage.scoreExact === 'number') {
        if (vintage.scorePlusOne >= vintage.scoreExact) {
          errors.push('Vintage ±1 score must be less than exact score.');
        }
      }
    }
    if (vintage.mode === 'plusTwo') {
      checkScore(vintage.scorePlusTwo, 'Vintage ±2 score');
      if (typeof vintage.scorePlusTwo === 'number' && typeof vintage.scorePlusOne === 'number') {
        if (vintage.scorePlusTwo >= vintage.scorePlusOne) {
          errors.push('Vintage ±2 score must be less than ±1 score.');
        }
      }
    }
  }

  if (abv) checkScore(abv.score, 'ABV score');

  if (price) {
    checkScore(price.score, 'Price score');
    if (!['HKD', 'USD', 'GBP', 'EUR'].includes(price.currency)) {
      errors.push('Price currency must be HKD, USD, GBP, or EUR.');
    }
    const validWidths = { HKD: [50, 100], USD: [5, 10], GBP: [5, 10], EUR: [5, 10] };
    const allowed = validWidths[price.currency] || [];
    if (!allowed.includes(price.rangeWidth)) {
      errors.push(`Range width must be one of: ${allowed.join(', ')} for ${price.currency}.`);
    }
  }

  return errors;
}

module.exports = { getDefaultRules, normaliseRules, buildZeroScore, validateRules };
