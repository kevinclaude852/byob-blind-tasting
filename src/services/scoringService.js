/**
 * Calculate score for a guess against the actual wine.
 * Returns { varietal, country, region, vintage, total }
 */
function calculateScore(actual, guess) {
  if (!actual || !guess) return { varietal: 0, country: 0, region: 0, vintage: 0, total: 0 };

  const varieScore = scoreVarietal(actual, guess);
  const countryScore = scoreCountry(actual, guess);
  const regionScore = scoreRegion(actual, guess);
  const vintageScore = scoreVintage(actual, guess);

  return {
    varietal: varieScore,
    country: countryScore,
    region: regionScore,
    vintage: vintageScore,
    total: varieScore + countryScore + regionScore + vintageScore
  };
}

function scoreVarietal(actual, guess) {
  if (!guess.varietals || guess.varietals.length === 0) return 0;

  const actualVarietals = actual.varietals || [];
  const guessGrapes = guess.varietals.map(v => v.grape).filter(Boolean);

  if (guessGrapes.length === 0) return 0;

  // Sum percentages of actual varietals that the guesser correctly identified
  let matchedPercentage = 0;
  for (const guessGrape of guessGrapes) {
    const actualVarietal = actualVarietals.find(v => v.grape === guessGrape);
    if (actualVarietal) {
      matchedPercentage += actualVarietal.percentage;
    }
  }

  // Pro-rata: (matched%) / 100 * 10, rounded to nearest integer
  return Math.round((matchedPercentage / 100) * 10);
}

function scoreCountry(actual, guess) {
  if (!guess.country || !actual.country) return 0;
  return guess.country === actual.country ? 5 : 0;
}

function scoreRegion(actual, guess) {
  if (!actual.region || !guess.region) return 0;
  return guess.region === actual.region ? 5 : 0;
}

function scoreVintage(actual, guess) {
  if (!guess.vintage) return 0;

  const actualVintage = actual.vintage;
  const guessVintage = guess.vintage;

  // NV handling
  if (actualVintage === 'NV') {
    return guessVintage === 'NV' ? 5 : 0;
  }
  if (guessVintage === 'NV') return 0;

  const diff = Math.abs(Number(actualVintage) - Number(guessVintage));
  if (diff === 0) return 5;
  if (diff === 1) return 1;
  return 0;
}

module.exports = { calculateScore };
