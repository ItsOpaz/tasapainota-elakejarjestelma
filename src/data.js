/**
 * src/data.js - Data Loader
 *
 * Loads processed data from data/processed/*.json files.
 * Works in Node.js (via fs) and in the browser (via fetch).
 *
 * MODEL_VERSION: 0.2.0
 */

// Node.js file system access (not available in the browser)
const fs = (typeof require !== 'undefined') ? require('fs') : null;
const path = (typeof require !== 'undefined') ? require('path') : null;

/**
 * List of processed data files required by the simulation.
 * @type {array}
 */
const REQUIRED_FILES = [
  'population.json',
  'employment.json',
  'earnings.json',
  'fertility.json',
  'deaths.json',
  'migration.json',
  'pension_expenditure.json',
  'pension_assets.json',
  'average_pension.json',
  'premium_income.json',
  'gdp.json',
  'investment_return.json',
  'pension_cash_flows.json'
];

// ============================================================================
// DATA LOADER
// ============================================================================

/**
 * Load all processed data files from data/processed/ (Node.js).
 * @param {string} dataDir - Path to data/processed directory (default: relative to src/)
 * @returns {object} Data object with parsed JSON files
 * @throws {Error} If critical data files cannot be loaded
 */
function loadProcessedData(dataDir) {
  if (!fs) {
    throw new Error('loadProcessedData() is only available in Node.js; use loadProcessedDataBrowser() in the browser');
  }

  // Default to data/processed/ relative to script location
  const defaultDir = path.join(__dirname, '..', 'data', 'processed');
  const dir = dataDir || defaultDir;

  const data = {};
  const errors = [];

  for (const filename of REQUIRED_FILES) {
    const filepath = path.join(dir, filename);
    try {
      const content = fs.readFileSync(filepath, 'utf-8');
      const fileData = JSON.parse(content);

      // Key the data by the series id for easier access
      const key = fileData.id || filename.replace('.json', '');
      data[key] = fileData;
    } catch (err) {
      errors.push(`Failed to load ${filename}: ${err.message}`);
    }
  }

  if (errors.length > 0) {
    console.error('Data loading errors:');
    errors.forEach(e => console.error(`  - ${e}`));
    throw new Error(`Cannot load required data files from ${dir}`);
  }

  return data;
}

/**
 * Load all processed data files from data/processed/ (browser).
 * @param {string} [dataDir='data/processed'] - URL path to the data directory
 * @returns {Promise<object>} Data object with parsed JSON files
 */
async function loadProcessedDataBrowser(dataDir) {
  const dir = dataDir || 'data/processed';

  const results = await Promise.all(
    REQUIRED_FILES.map(async filename => {
      const response = await fetch(`${dir}/${filename}`);
      if (!response.ok) {
        throw new Error(`Failed to load ${filename}: HTTP ${response.status}`);
      }
      const fileData = await response.json();
      const key = fileData.id || filename.replace('.json', '');
      return [key, fileData];
    })
  );

  return Object.fromEntries(results);
}

/**
 * Normalize a year value to an integer.
 * Source data marks provisional years with a trailing "*" (e.g. "2025*").
 * @param {string|number} year - Raw year value
 * @returns {number|null} Integer year, or null if unparseable
 */
function normalizeYear(year) {
  if (year === null || year === undefined) return null;
  const match = String(year).match(/\d{4}/);
  return match ? parseInt(match[0], 10) : null;
}

/**
 * Parse an age or age-group label into a starting age.
 * Handles "30", "30 - 34", "75 -", "100+", and totals ("Yhteensä").
 * @param {string} label - Age label
 * @returns {number|null} Starting age, or null for totals/unparseable
 */
function parseAge(label) {
  if (label === null || label === undefined) return null;
  const str = String(label).trim();
  if (str === 'Yhteensä' || str === 'total' || str === 'combined') return null;
  const match = str.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Expand a 5-year age group label into its member ages.
 * "30 - 34" → [30,31,32,33,34]; "75 -" → [75..100]; "0 - 4" → [0..4].
 * @param {string} label - Age-group label
 * @returns {array} Array of single ages
 */
function expandAgeGroup(label) {
  const str = String(label).trim();
  const parts = str.split('-').map(p => p.trim());
  const start = parseInt(parts[0], 10);
  if (isNaN(start)) return [];
  let end;
  if (parts.length < 2 || parts[1] === '') {
    end = 100; // open-ended group (e.g. "75 -")
  } else {
    end = parseInt(parts[1], 10);
    if (isNaN(end)) end = start;
  }
  const ages = [];
  for (let age = start; age <= Math.min(end, 100); age++) {
    ages.push(age);
  }
  return ages;
}

/**
 * Find a value in a data series by multiple criteria
 * @param {array} values - Array of value objects from JSON-stat series
 * @param {object} criteria - Filter criteria (year, age, sex, etc.)
 * @returns {number|null} The value, or null if not found
 */
function findValue(values, criteria) {
  if (!values || !Array.isArray(values)) {
    return null;
  }

  const match = values.find(v => {
    return Object.keys(criteria).every(key => {
      const criteriaValue = criteria[key];
      const dataValue = v[key];

      // Year comparison ignores provisional "*" markers
      if (key === 'year') {
        return normalizeYear(dataValue) === normalizeYear(criteriaValue);
      }

      // Handle "combined" or "Yhteensä" (total) specially
      if (criteriaValue === 'total' || criteriaValue === 'combined' || criteriaValue === 'Yhteensä') {
        return dataValue === 'Yhteensä' || dataValue === 'combined' || dataValue === 'total';
      }

      return String(dataValue) === String(criteriaValue);
    });
  });

  return match ? match.value : null;
}

/**
 * Get population by age for a specific year
 * @param {object} data - Data object from loadProcessedData()
 * @param {number} year - Year to retrieve
 * @returns {array} Array indexed by age [0..100+], with population counts
 */
function getPopulationByAge(data, year) {
  const popData = data.population;
  if (!popData) return null;

  // Create array indexed by age
  const population = new Array(101).fill(0); // Ages 0-100+

  // Find all population entries for this year
  const yearData = popData.values.filter(v => normalizeYear(v.year) === year);

  yearData.forEach(entry => {
    const age = parseAge(entry.age);
    if (age === null) return; // Skip totals

    if (age >= 0 && age <= 100) {
      population[age] = (population[age] || 0) + (entry.value || 0);
    } else if (age > 100) {
      // Aggregate ages > 100 into index 100
      population[100] = (population[100] || 0) + (entry.value || 0);
    }
  });

  return population;
}

/**
 * Get total population for a specific year
 * @param {object} data - Data object
 * @param {number} year - Year
 * @returns {number} Total population
 */
function getTotalPopulation(data, year) {
  const popData = data.population;
  if (!popData) return null;

  // Try to find total population for this year
  // Look for entries with age='Yhteensä' (total) and sex='combined'
  const value = findValue(popData.values, { year: String(year), age: 'Yhteensä', sex: 'combined' });

  // If not found, try just year and age total
  if (value === null) {
    const value2 = findValue(popData.values, { year: String(year), age: 'Yhteensä' });
    if (value2 !== null) return value2;
  }

  return value || null;
}

/**
 * Get fertility rates for a specific year
 * @param {object} data - Data object
 * @param {number} year - Year
 * @returns {object} Fertility rates by single age (ages 15-49)
 *
 * Source unit is births per 1,000 women per year (e.g. 94.9 at ages 30-34).
 * Values are converted to births per woman per year (0.0949).
 */
function getFertilityRates(data, year) {
  const fertData = data.fertility;
  if (!fertData) return null;

  const rates = {};

  const yearData = fertData.values.filter(v => normalizeYear(v.year) === year);
  yearData.forEach(entry => {
    // Only the total fertility measure is used; skip other measures if present
    if (entry.measure && !entry.measure.includes('Hedelmällisyysluku')) return;

    const ages = expandAgeGroup(entry.ageGroup);
    if (ages.length === 0) return; // Skip "Yhteensä" totals

    // Source is per 1,000 women; convert to per-woman rate
    const ratePerWoman = (entry.value || 0) / 1000;
    ages.forEach(age => {
      if (age >= 15 && age <= 49) {
        rates[age] = ratePerWoman;
      }
    });
  });

  return Object.keys(rates).length > 0 ? rates : null;
}

/**
 * Get mortality rates for a specific year
 * @param {object} data - Data object
 * @param {number} year - Year
 * @returns {object} Mortality rates (probability of death) by age
 *
 * Source unit is death counts. Rates are derived by dividing deaths by the
 * population of the same age and year (see docs/ASSUMPTIONS.md §12).
 */
function getMortalityRates(data, year) {
  const deathData = data.deaths;
  if (!deathData) return null;

  const population = getPopulationByAge(data, year);
  if (!population) return null;

  const rates = {};

  const yearData = deathData.values.filter(v => normalizeYear(v.year) === year);
  yearData.forEach(entry => {
    const age = parseAge(entry.age);
    if (age === null) return; // Skip totals

    const targetAge = Math.min(age, 100);
    const pop = population[targetAge] || 0;
    const deaths = entry.value || 0;

    if (pop > 0) {
      // Probability of death, capped at 1.0
      rates[targetAge] = Math.min(1, deaths / pop);
    }
  });

  return Object.keys(rates).length > 0 ? rates : null;
}

/**
 * Get net migration by age for a specific year
 * @param {object} data - Data object
 * @param {number} year - Year
 * @returns {object} Net migration by single age (persons)
 *
 * Source provides immigration, emigration and net migration by 5-year age
 * group. The net migration measure is expanded across single ages.
 */
function getNetMigrationByAge(data, year) {
  const migData = data.migration;
  if (!migData) return null;

  const migration = {};

  const yearData = migData.values.filter(v => normalizeYear(v.year) === year);
  yearData.forEach(entry => {
    // Use the net migration measure only
    if (entry.measure && !entry.measure.includes('Nettomaahanmuutto')) return;

    const ages = expandAgeGroup(entry.ageGroup);
    if (ages.length === 0) return; // Skip "Yhteensä" totals

    // Spread the group total evenly across its member ages
    const perAge = (entry.value || 0) / ages.length;
    ages.forEach(age => {
      migration[age] = (migration[age] || 0) + perAge;
    });
  });

  return Object.keys(migration).length > 0 ? migration : null;
}

/**
 * Get employment data for a specific year
 * @param {object} data - Data object
 * @param {number} year - Year
 * @returns {object} { total, byAge } with employment counts (persons)
 *
 * Source unit is thousands of persons ("Työlliset, 1000 henkilöä").
 * Values are converted to persons.
 */
function getEmploymentData(data, year) {
  const empData = data.employment;
  if (!empData) return null;

  const yearData = empData.values.filter(v => normalizeYear(v.year) === year);

  // Only the "employed persons" measure is used (not employees)
  const employed = yearData.filter(v =>
    !v.measure || v.measure.includes('Työlliset')
  );

  // Total employed: the 15-74 age group is the standard headline figure
  const totalEntry = employed.find(v => v.ageGroup === '15 - 74');
  const total = totalEntry ? (totalEntry.value || 0) * 1000 : null;

  // Employment by single age, expanded from 5-year groups.
  // The source contains both aggregate bands (15-74, 15-64) and detailed
  // bands (15-24, 25-34, ...). Only the detailed bands are used here to
  // avoid double counting.
  const AGGREGATE_BANDS = ['15 - 74', '15 - 64'];
  const byAge = {};
  employed.forEach(entry => {
    if (AGGREGATE_BANDS.includes(entry.ageGroup)) return;
    const ages = expandAgeGroup(entry.ageGroup);
    if (ages.length === 0) return; // Skip totals
    const perAge = ((entry.value || 0) * 1000) / ages.length;
    ages.forEach(age => {
      byAge[age] = (byAge[age] || 0) + perAge;
    });
  });

  if (total === null && Object.keys(byAge).length === 0) {
    return null;
  }

  return { total, byAge };
}

/**
 * Get average wage for a specific year
 * @param {object} data - Data object
 * @param {number} year - Year
 * @returns {number} Average wage in EUR per year
 */
function getAverageWage(data, year) {
  const earnData = data.earnings;
  if (!earnData) return null;

  const value = findValue(earnData.values, { year: String(year) });
  return value || null;
}

/**
 * Get average pension for a specific year
 * @param {object} data - Data object
 * @param {number} year - Year
 * @returns {number} Average pension per year (EUR)
 *
 * Source unit is euros per month; converted to annual using the unit metadata.
 */
function getAveragePension(data, year) {
  const pensionData = data.average_pension;
  if (!pensionData) return null;

  const value = findValue(pensionData.values, { year: String(year) });
  if (value === null) return null;

  // Convert monthly to annual based on the declared unit
  const unit = (pensionData.unit || '').toLowerCase();
  if (unit.includes('month')) {
    return value * 12;
  }
  return value;
}

/**
 * Get pension expenditure for a specific year
 * @param {object} data - Data object
 * @param {number} year - Year
 * @returns {number} Pension expenditure in millions EUR
 */
function getPensionExpenditure(data, year) {
  const expData = data.pension_expenditure;
  if (!expData) return null;

  const value = findValue(expData.values, { year: String(year) });
  return value || null;
}

/**
 * Get pension contribution revenue for a specific year
 * @param {object} data - Data object
 * @param {number} year - Year
 * @returns {number} Contribution revenue in millions EUR
 */
function getPensionContributions(data, year) {
  const premiumData = data.premium_income;
  if (!premiumData) return null;

  const value = findValue(premiumData.values, { year: String(year) });
  return value || null;
}

/**
 * Get pension assets for a specific year
 * @param {object} data - Data object
 * @param {number} year - Year
 * @returns {number} Pension assets in millions EUR
 */
function getPensionAssets(data, year) {
  const assetData = data.pension_assets;
  if (!assetData) return null;

  const value = findValue(assetData.values, { year: String(year) });
  return value || null;
}

/**
 * Get GDP for a specific year
 * @param {object} data - Data object
 * @param {number} year - Year
 * @returns {number} GDP in millions EUR
 */
function getGDP(data, year) {
  const gdpData = data.gdp;
  if (!gdpData) return null;

  const value = findValue(gdpData.values, { year: String(year) });
  return value || null;
}

/**
 * Get investment return assumption for a specific year
 * @param {object} data - Data object
 * @param {number} year - Year
 * @returns {number} Investment return rate (e.g., 0.03 for 3%)
 *
 * Source unit is percent (e.g. 7.3); converted to a decimal fraction.
 */
function getInvestmentReturn(data, year) {
  const returnData = data.investment_return;
  if (!returnData) return 0.03; // Default to 3%

  const value = findValue(returnData.values, { year: String(year) });
  if (value === null) return 0.03;

  const unit = (returnData.unit || '').toLowerCase();
  if (unit.includes('percent') || unit.includes('%')) {
    return value / 100;
  }
  return value;
}

/**
 * Get metadata for a data series
 * @param {object} data - Data object
 * @param {string} seriesId - Series ID (e.g., 'population', 'employment')
 * @returns {object} Metadata object
 */
function getMetadata(data, seriesId) {
  const series = data[seriesId];
  if (!series) return null;

  return {
    id: series.id || seriesId,
    name: series.name || '',
    unit: series.unit || '',
    source: series.source || '',
    license: series.license || '',
    retrieved: series.retrieved || '',
    sourceUrl: series.sourceUrl || '',
    seriesType: series.seriesType || 'observed'
  };
}

/**
 * Validate data integrity
 * @param {object} data - Data object
 * @returns {array} Array of error messages (empty if valid)
 */
function validateData(data) {
  const errors = [];

  // Check required series
  const requiredSeries = [
    'population',
    'employment',
    'earnings',
    'fertility',
    'deaths',
    'migration',
    'pension_expenditure',
    'pension_assets',
    'average_pension',
    'premium_income',
    'gdp'
  ];

  requiredSeries.forEach(series => {
    if (!data[series]) {
      errors.push(`Missing required series: ${series}`);
    } else if (!Array.isArray(data[series].values)) {
      errors.push(`Series ${series} has no values array`);
    }
  });

  // Check for reasonable data in 2025
  const baseYear = 2025;
  
  if (data.population) {
    const pop2025 = getTotalPopulation(data, baseYear);
    if (!pop2025 || pop2025 < 5000000 || pop2025 > 6000000) {
      errors.push(`Population 2025 out of expected range: ${pop2025}`);
    }
  }

  if (data.employment) {
    const emp2025 = getEmploymentData(data, baseYear);
    if (!emp2025 || !emp2025.total || emp2025.total < 2000000 || emp2025.total > 3000000) {
      errors.push(`Employment 2025 out of expected range: ${emp2025?.total}`);
    }
  }

  return errors;
}

// ============================================================================
// EXPORTS
// ============================================================================

const DATA_EXPORTS = {
  REQUIRED_FILES,
  loadProcessedData,
  loadProcessedDataBrowser,
  normalizeYear,
  parseAge,
  expandAgeGroup,
  findValue,
  getPopulationByAge,
  getTotalPopulation,
  getFertilityRates,
  getMortalityRates,
  getNetMigrationByAge,
  getEmploymentData,
  getAverageWage,
  getAveragePension,
  getPensionExpenditure,
  getPensionContributions,
  getPensionAssets,
  getGDP,
  getInvestmentReturn,
  getMetadata,
  validateData
};

// Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DATA_EXPORTS;
}

// Browser
if (typeof window !== 'undefined') {
  window.PensionData = DATA_EXPORTS;
}
