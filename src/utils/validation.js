const fs = require('fs');
const path = require('path');

const grapes = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/reference/grapes.json'), 'utf8'));
const countries = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/reference/countries.json'), 'utf8'));
const regions = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/reference/regions.json'), 'utf8'));

const currentYear = new Date().getFullYear();

function validateWine(wine) {
  const errors = [];

  if (!wine.name || !wine.name.trim()) errors.push('Wine name is required.');

  if (!wine.vintage) {
    errors.push('Vintage is required.');
  } else if (wine.vintage !== 'NV') {
    const yr = Number(wine.vintage);
    if (isNaN(yr) || yr < currentYear - 50 || yr > currentYear) {
      errors.push(`Vintage must be between ${currentYear - 50} and ${currentYear}, or NV.`);
    }
  }

  if (!wine.varietals || wine.varietals.length === 0) {
    errors.push('At least one grape variety is required.');
  } else {
    const filled = wine.varietals.filter(v => v.grape);
    if (filled.length === 0) errors.push('At least one grape variety is required.');

    // Check that all filled grapes are valid
    for (const v of filled) {
      if (!grapes.includes(v.grape)) errors.push(`Unknown grape: ${v.grape}`);
    }

    // Blend validation
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
      // Check duplicates
      const grapeNames = filled.map(v => v.grape);
      if (new Set(grapeNames).size !== grapeNames.length) errors.push('Duplicate grape varieties in blend.');
    } else {
      // Single: exactly one varietal, percentage 100
      if (filled.length > 1) errors.push('Single varietal must have only one grape selected.');
    }
  }

  if (!wine.country) {
    errors.push('Country is required.');
  } else if (!countries.includes(wine.country)) {
    errors.push(`Unknown country: ${wine.country}`);
  }

  if (wine.region && wine.country) {
    const validRegions = regions[wine.country] || [];
    if (validRegions.length > 0 && !validRegions.includes(wine.region)) {
      errors.push(`Unknown region "${wine.region}" for ${wine.country}.`);
    }
  }

  return errors;
}

function validateGuess(guess, targetPlayerId, playerId) {
  if (targetPlayerId === playerId) return ['You cannot guess your own wine.'];
  // All fields optional for a guess
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

  return errors;
}

module.exports = { validateWine, validateGuess, grapes, countries, regions };
