const OLD_WORLD_COUNTRIES = new Set([
  'France', 'Italy', 'Spain', 'Portugal', 'Germany', 'Austria', 'Hungary',
  'Greece', 'Croatia', 'Slovenia', 'Romania', 'Bulgaria', 'Georgia',
  'Switzerland', 'Luxembourg', 'England'
]);

const CURRENCY_PRESETS = {
  HKD: { widths: [50, 100], cap: 1200 },
  USD: { widths: [5, 10],   cap: 150  },
  GBP: { widths: [5, 10],   cap: 120  },
  EUR: { widths: [5, 10],   cap: 130  }
};

// Mirrors existing hardcoded behaviour exactly
const DEFAULT_RULES_PRESET = {
  grape:    { enabled: true,  score: 10 },
  oldWorld: { enabled: false, score: 5  },
  country:  { enabled: true,  score: 5  },
  region:   { enabled: true,  score: 5  },
  vintage:  { enabled: true,  mode: 'exact', scoreExact: 3, scorePlusOne: 2, scorePlusTwo: 1 },
  abv:      { enabled: false, score: 3  },
  price:    { enabled: false, score: 3, currency: 'HKD', rangeWidth: 100 }
};

// Defaults shown in the Customise panel (different from default preset)
const CUSTOMISE_DEFAULTS = {
  grape:    { enabled: true,  score: 10 },
  oldWorld: { enabled: false, score: 5  },
  country:  { enabled: true,  score: 5  },
  region:   { enabled: true,  score: 5  },
  vintage:  { enabled: true,  mode: 'exact', scoreExact: 3, scorePlusOne: 2, scorePlusTwo: 1 },
  abv:      { enabled: false, score: 3  },
  price:    { enabled: false, score: 3, currency: 'HKD', rangeWidth: 100 }
};

function getPriceBuckets(currency, rangeWidth) {
  const preset = CURRENCY_PRESETS[currency];
  if (!preset) return [];
  const buckets = [];
  for (let min = 0; min < preset.cap; min += rangeWidth) {
    buckets.push({ min, max: min + rangeWidth });
  }
  buckets.push({ min: preset.cap, max: null });
  return buckets;
}

module.exports = { OLD_WORLD_COUNTRIES, CURRENCY_PRESETS, DEFAULT_RULES_PRESET, CUSTOMISE_DEFAULTS, getPriceBuckets };
