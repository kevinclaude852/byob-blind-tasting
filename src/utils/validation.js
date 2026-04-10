const fs = require('fs');
const path = require('path');
const { normaliseRules } = require('./rulesNormaliser');

const grapes = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/reference/grapes.json'), 'utf8'));
const countries = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/reference/countries.json'), 'utf8'));
const regions = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/reference/regions.json'), 'utf8'));

const currentYear = new Date().getFullYear();

function validateWine(wine, rules) {
  const r = normaliseRules(rules);
  const errors = [];

  if (!wine.name || !wine.name.trim()) errors.push('Wine name is required.');

  // Vintage required when that rule is enabled
  if (r.vintage.enabled) {
    if (!wine.vintage) {
      errors.push('Vintage is required.');
    } else if (wine.vintage !== 'NV') {
      const yr = Number(wine.vintage);
      if (isNaN(yr) || yr < currentYear - 50 || yr > currentYear) {
        errors.push(`Vintage must be between ${currentYear - 50} and ${currentYear}, or NV.`);
      }
    }
  }

  // Grape required when that rule is enabled
  if (r.grape.enabled) {
    if (!wine.varietals || wine.varietals.length === 0) {
      errors.push('At least one grape variety is required.');
    } else {
      const filled = wine.varietals.filter(v => v.grape);
      if (filled.length === 0) errors.push('At least one grape variety is required.');

      for (const v of filled) {
        if (!grapes.includes(v.grape)) errors.push(`Unknown grape: ${v.grape}`);
      }

      if (wine.type === 'blend') {
        if (filled.length < 2) errors.push('A blend must have at least 2 grape varieties.');
        const totalPct = filled.reduce((sum, v) => sum + (Number(v.percentage) || 0), 0);
        if (totalPct !== 100) errors.push(`Percentages must add up to 100 (currently ${totalPct}).`);
        for (const v of filled) {
          const pct = Number(v.percentage);
          if (!Number.isInteger(pct) || pct < 1 || pct > 99) {
            errors.push('Each varietal percentage must be an integer between 1 and 99.');
            break;
          }
        }
        const grapeNames = filled.map(v => v.grape);
        if (new Set(grapeNames).size !== grapeNames.length) errors.push('Duplicate grape varieties in blend.');
      } else {
        if (filled.length > 1) errors.push('Single varietal must have only one grape selected.');
      }
    }
  }

  // Country required when country or oldWorld rule is enabled
  const needsCountry = r.country.enabled || r.oldWorld.enabled;
  if (needsCountry) {
    if (!wine.country) {
      errors.push('Country is required.');
    } else if (!countries.includes(wine.country)) {
      errors.push(`Unknown country: ${wine.country}`);
    }
  } else if (wine.country && !countries.includes(wine.country)) {
    errors.push(`Unknown country: ${wine.country}`);
  }

  if (wine.region && wine.country) {
    const validRegions = regions[wine.country] || [];
    if (validRegions.length > 0 && !validRegions.includes(wine.region)) {
      errors.push(`Unknown region "${wine.region}" for ${wine.country}.`);
    }
  }

  // ABV required when that rule is enabled
  if (r.abv.enabled) {
    if (wine.abv == null || wine.abv === '') {
      errors.push('ABV is required.');
    } else {
      const abvVal = Number(wine.abv);
      if (isNaN(abvVal) || abvVal < 5 || abvVal > 20) {
        errors.push('ABV must be between 5 and 20.');
      }
    }
  }

  // Price required when that rule is enabled
  if (r.price.enabled) {
    if (wine.price == null || wine.price === '') {
      errors.push('Price is required.');
    } else {
      const priceVal = Number(wine.price);
      if (isNaN(priceVal) || priceVal < 0) {
        errors.push('Price must be a non-negative number.');
      }
    }
  }

  return errors;
}

function validateGuess(guess, targetPlayerId, playerId, rules) {
  if (targetPlayerId === playerId) return ['You cannot guess your own wine.'];
  const r = normaliseRules(rules);
  const errors = [];

  if (guess.country && !countries.includes(guess.country)) {
    errors.push(`Unknown country: ${guess.country}`);
  }

  if (guess.region && guess.country) {
    const validRegions = regions[guess.country] || [];
    if (validRegions.length > 0 && !validRegions.includes(guess.region)) {
      errors.push(`Unknown region "${guess.region}" for ${guess.country}.`);
    }
  }

  if (guess.vintage && guess.vintage !== 'NV') {
    const yr = Number(guess.vintage);
    if (isNaN(yr) || yr < currentYear - 50 || yr > currentYear) {
      errors.push(`Vintage must be between ${currentYear - 50} and ${currentYear}, or NV.`);
    }
  }

  if (r.abv.enabled && guess.abv != null) {
    const abvVal = Number(guess.abv);
    if (isNaN(abvVal) || abvVal < 5 || abvVal > 20) {
      errors.push('ABV must be between 5 and 20.');
    }
  }

  if (r.price.enabled && guess.priceRange != null) {
    if (typeof guess.priceRange !== 'object' || typeof guess.priceRange.min !== 'number') {
      errors.push('Invalid price range.');
    }
  }

  return errors;
}

module.exports = { validateWine, validateGuess, grapes, countries, regions };
