/**
 * src/data.js - Data Loader
 * 
 * Loads processed data from data/processed/*.json files
 * Provides accessor functions for the simulation engine
 * 
 * MODEL_VERSION: 0.1.0
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// DATA LOADER
// ============================================================================

/**
 * Load all processed data files from data/processed/
 * @param {string} dataDir - Path to data/processed directory (default: relative to src/)
 * @returns {object} Data object with parsed JSON files
 * @throws {Error} If critical data files cannot be loaded
 */
function loadProcessedData(dataDir) {
  // Default to data/processed/ relative to script location
  const defaultDir = path.join(__dirname, '..', 'data', 'processed');
  const dir = dataDir || defaultDir;

  const requiredFiles = [
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

  const data = {};
  const errors = [];

  for (const filename of requiredFiles) {
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
      // Handle "combined" or "Yhteensä" (total) specially
      const criteriaValue = criteria[key];
      const dataValue = v[key];
      
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
  const yearData = popData.values.filter(v => Number(v.year) === year);

  yearData.forEach(entry => {
    const ageStr = entry.age;
    
    // Skip total entries (we calculate that separately)
    if (ageStr === 'Yhteensä' || ageStr === 'total' || ageStr === 'combined') {
      return;
    }

    // Parse age
    const age = parseInt(ageStr);
    if (!isNaN(age) && age >= 0 && age <= 100) {
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

  const value = findValue(popData.values, { year: String(year), age: 'Yhteensä', sex: 'combined' });
  return value || null;
}

/**
 * Get fertility rates for a specific year
 * @param {object} data - Data object
 * @param {number} year - Year
 * @returns {array} Array of fertility rates by age (ages 15-49), indexed by age
 */
function getFertilityRates(data, year) {
  const fertData = data.fertility;
  if (!fertData) return null;

  const rates = {};

  const yearData = fertData.values.filter(v => Number(v.year) === year);
  yearData.forEach(entry => {
    const age = parseInt(entry.age);
    if (age >= 15 && age <= 49) {
      rates[age] = entry.value || 0;
    }
  });

  return rates;
}

/**
 * Get mortality rates for a specific year
 * @param {object} data - Data object
 * @param {number} year - Year
 * @returns {array} Array of mortality rates by age, indexed by age
 */
function getMortalityRates(data, year) {
  const deathData = data.deaths;
  if (!deathData) return null;

  const rates = {};

  // Mortality rates might not be explicitly provided; may need to be calculated
  // from death counts and population
  const yearData = deathData.values.filter(v => Number(v.year) === year);
  yearData.forEach(entry => {
    const age = parseInt(entry.age);
    if (age >= 0 && age <= 100) {
      rates[age] = entry.value || 0;
    }
  });

  return rates;
}

/**
 * Get net migration by age for a specific year
 * @param {object} data - Data object
 * @param {number} year - Year
 * @returns {array} Array of net migration by age
 */
function getNetMigrationByAge(data, year) {
  const migData = data.migration;
  if (!migData) return null;

  const migration = {};

  const yearData = migData.values.filter(v => Number(v.year) === year);
  yearData.forEach(entry => {
    const age = parseInt(entry.age);
    if (age >= 0 && age <= 100) {
      migration[age] = entry.value || 0;
    }
  });

  return migration;
}

/**
 * Get employment data for a specific year
 * @param {object} data - Data object
 * @param {number} year - Year
 * @returns {object} { total, byAge } with employment counts
 */
function getEmploymentData(data, year) {
  const empData = data.employment;
  if (!empData) return null;

  const yearData = empData.values.filter(v => Number(v.year) === year);

  // Get total employed
  const totalValue = findValue(yearData, { age: 'Yhteensä' });

  // Get employment by age groups
  const byAge = {};
  yearData.forEach(entry => {
    if (entry.age !== 'Yhteensä') {
      const key = entry.age;
      byAge[key] = entry.value || 0;
    }
  });

  return {
    total: totalValue,
    byAge: byAge
  };
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

  // Look for aggregate yearly average
  const value = findValue(earnData.values, { year: String(year) });
  return value || null;
}

/**
 * Get average pension for a specific year
 * @param {object} data - Data object
 * @param {number} year - Year
 * @returns {number} Average pension per year (EUR)
 */
function getAveragePension(data, year) {
  const pensionData = data.average_pension;
  if (!pensionData) return null;

  // Average pension might be per month or per year; need to standardize
  const value = findValue(pensionData.values, { year: String(year) });
  
  if (value) {
    // If value appears to be monthly (< 5000), convert to yearly
    if (value < 5000) {
      return value * 12;
    }
    return value;
  }
  
  return null;
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
 */
function getInvestmentReturn(data, year) {
  const returnData = data.investment_return;
  if (!returnData) return 0.03; // Default to 3%

  const value = findValue(returnData.values, { year: String(year) });
  return value || 0.03;
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

module.exports = {
  loadProcessedData,
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
