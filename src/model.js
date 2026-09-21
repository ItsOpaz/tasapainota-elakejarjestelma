/**
 * src/model.js - Pension System Model
 * 
 * Core calculation functions for the Finnish pension system simulation
 * All functions are pure and deterministic
 * All values in real 2025 EUR (constant prices)
 * 
 * MODEL_VERSION: 0.2.0
 * Reference: docs/MODEL.md
 */

// ============================================================================
// MODEL CONSTANTS
// ============================================================================

/**
 * Model version. Bump when a change alters the meaning of existing results.
 * See docs/MODEL.md §27 for the version history.
 * @type {string}
 */
const MODEL_VERSION = '0.2.0';

/**
 * Share of the population that is female.
 * The population data is combined for both sexes, so births are estimated by
 * applying age-specific fertility rates to this share of each cohort.
 * Finnish sex ratio at birth is approximately 1.05 males per female, giving a
 * female share of about 0.488 (see docs/MODEL.md §4).
 * @type {number}
 */
const FEMALE_SHARE = 0.488;

/**
 * Minimum legal working age used in the model.
 * @type {number}
 */
const MIN_WORKING_AGE = 15;

// ============================================================================
// PARAMETERS VALIDATION
// ============================================================================

/**
 * Validate all simulation parameters
 * @param {object} params - Parameter object
 * @returns {object} { valid: boolean, errors: array }
 */
function validateParameters(params) {
  const errors = [];

  // Retirement age: 60-75
  if (params.retirementAge < 60 || params.retirementAge > 75) {
    errors.push(`retirementAge must be 60-75, got ${params.retirementAge}`);
  }

  // Contribution rate: 15%-30%
  if (params.contributionRate < 0.15 || params.contributionRate > 0.30) {
    errors.push(`contributionRate must be 0.15-0.30, got ${params.contributionRate}`);
  }

  // Employment rate: 50%-90%
  if (params.employmentRate < 0.50 || params.employmentRate > 0.90) {
    errors.push(`employmentRate must be 0.50-0.90, got ${params.employmentRate}`);
  }

  // Wage growth: -2% to +5%
  if (params.wageGrowth < -0.02 || params.wageGrowth > 0.05) {
    errors.push(`wageGrowth must be -0.02 to 0.05, got ${params.wageGrowth}`);
  }

  // GDP growth: -2% to +5%
  if (params.gdpGrowth < -0.02 || params.gdpGrowth > 0.05) {
    errors.push(`gdpGrowth must be -0.02 to 0.05, got ${params.gdpGrowth}`);
  }

  // Investment return: 0%-10%
  if (params.investmentReturn < 0.00 || params.investmentReturn > 0.10) {
    errors.push(`investmentReturn must be 0.00-0.10, got ${params.investmentReturn}`);
  }

  // Total fertility rate: 0.5 to 2.5 children per woman
  if (params.fertilityRate < 0.5 || params.fertilityRate > 2.5) {
    errors.push(`fertilityRate must be 0.5-2.5, got ${params.fertilityRate}`);
  }

  // Migration level: -10k to +50k per year
  if (params.migrationLevel < -10000 || params.migrationLevel > 50000) {
    errors.push(`migrationLevel must be -10000 to 50000, got ${params.migrationLevel}`);
  }

  // Pension indexation: -2% to +5% per year
  if (params.pensionIndexation < -0.02 || params.pensionIndexation > 0.05) {
    errors.push(`pensionIndexation must be -0.02 to 0.05, got ${params.pensionIndexation}`);
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

// ============================================================================
// POPULATION DYNAMICS
// ============================================================================

/**
 * Age the population by one year, applying mortality and adding births.
 *
 * For each age:
 *   survivors = population[age] * (1 - mortalityRate[age])
 *   population[t+1, age+1] = survivors
 *   population[t+1, 0] = births
 *
 * Ages 100+ are aggregated into index 100 (docs/MODEL.md §3.1).
 *
 * @param {array} population - Population by age [0..100+]
 * @param {object} mortalityRates - Probability of death by age
 * @param {number} births - Number of births to add at age 0
 * @returns {array} Population after one year
 */
function agePopulation(population, mortalityRates, births) {
  const aged = new Array(101).fill(0);

  // Survivors move up one year
  for (let age = 0; age < 100; age++) {
    const rate = (mortalityRates && mortalityRates[age]) || 0;
    const survivors = (population[age] || 0) * (1 - rate);
    aged[age + 1] += survivors;
  }

  // Age 100+ survivors stay in the top group
  const rate100 = (mortalityRates && mortalityRates[100]) || 0;
  aged[100] += (population[100] || 0) * (1 - rate100);

  // Births enter at age 0
  aged[0] = births || 0;

  return aged;
}

/**
 * Calculate number of births from fertility rates
 * @param {array} population - Population by age (both sexes combined)
 * @param {object} fertilityRates - Fertility rates by age (births per woman per year)
 * @param {number} fertilityScale - Scale factor applied to the age profile
 *   (simulation.js converts the absolute TFR parameter to this factor)
 * @returns {number} Number of births
 *
 * The population series is combined for both sexes, so the female population
 * is approximated using FEMALE_SHARE (see docs/MODEL.md §4).
 */
function calculateBirths(population, fertilityRates, fertilityScale) {
  let births = 0;

  for (let age = 15; age <= 49; age++) {
    const rate = (fertilityRates[age] || 0) * fertilityScale;
    const femaleAtAge = (population[age] || 0) * FEMALE_SHARE;
    births += femaleAtAge * rate;
  }

  return Math.round(births);
}

/**
 * Calculate deaths from mortality rates
 * @param {array} population - Population by age
 * @param {object} mortalityRates - Mortality rates (prob death) by age
 * @returns {object} Deaths by age
 */
function calculateDeaths(population, mortalityRates) {
  const deaths = {};

  for (let age = 0; age <= 100; age++) {
    const rate = mortalityRates[age] || 0;
    const atAge = population[age] || 0;
    deaths[age] = Math.round(atAge * rate);
  }

  return deaths;
}

/**
 * Apply net migration to the population.
 *
 * The migration profile gives the age distribution of net migration. It is
 * normalized to sum to 1 and then scaled by migrationLevel (total net
 * migration in persons per year), so that migrationLevel directly controls
 * the overall level while the profile controls the age pattern.
 *
 * @param {array} population - Population by age
 * @param {object} migration - Net migration by age (age distribution)
 * @param {number} migrationLevel - Total net migration in persons per year
 * @returns {array} Population after migration
 */
function applyMigration(population, migration, migrationLevel) {
  const result = [...population];

  // Normalize the profile so it sums to 1
  let profileTotal = 0;
  for (let age = 0; age <= 100; age++) {
    profileTotal += migration[age] || 0;
  }

  if (profileTotal === 0 || !migrationLevel) {
    return result; // No migration
  }

  for (let age = 0; age <= 100; age++) {
    const share = (migration[age] || 0) / profileTotal;
    const flow = share * migrationLevel;
    result[age] = Math.max(0, (result[age] || 0) + flow);
  }

  return result;
}

// ============================================================================
// EMPLOYMENT & WAGES
// ============================================================================

/**
 * Calculate the working-age population.
 * Working age is defined as MIN_WORKING_AGE to retirementAge - 1
 * (see docs/MODEL.md §7).
 * @param {array} population - Population by age
 * @param {number} retirementAge - Effective retirement age (e.g. 63)
 * @returns {number} Working-age population count
 */
function calculateWorkingAge(population, retirementAge) {
  let workingAge = 0;

  for (let age = MIN_WORKING_AGE; age < retirementAge; age++) {
    workingAge += population[age] || 0;
  }

  return workingAge;
}

/**
 * Calculate number of employed people
 * @param {number} workingAgePopulation - Population aged 15+
 * @param {number} employmentRate - Employment rate (0-1)
 * @returns {number} Number employed
 */
function calculateEmployed(workingAgePopulation, employmentRate) {
  return Math.round(workingAgePopulation * employmentRate);
}

/**
 * Calculate total wages paid to employees
 * @param {number} employed - Number of employed people
 * @param {number} avgWage - Average wage (EUR per year, already adjusted for growth)
 * @returns {number} Total wage bill in EUR
 */
function calculateWageBill(employed, avgWage) {
  return Math.round(employed * avgWage);
}

/**
 * Calculate average wage with growth
 * @param {number} baseWage - Base average wage (EUR)
 * @param {number} wageGrowth - Growth rate (can be negative)
 * @returns {number} Adjusted average wage
 */
function adjustWage(baseWage, wageGrowth) {
  return baseWage * (1 + wageGrowth);
}

// ============================================================================
// PENSION SYSTEM
// ============================================================================

/**
 * Calculate number of pensioners
 * @param {array} population - Population by age
 * @param {number} retirementAge - Effective retirement age
 * @returns {number} Number of pensioners
 */
function calculatePensioners(population, retirementAge) {
  let pensioners = 0;

  for (let age = retirementAge; age <= 100; age++) {
    pensioners += population[age] || 0;
  }

  return Math.round(pensioners);
}

/**
 * Calculate total pension expenditure
 * @param {number} pensioners - Number of pensioners
 * @param {number} avgPension - Average pension (EUR per year)
 * @returns {number} Total expenditure in EUR
 */
function calculatePensionExpenditure(pensioners, avgPension) {
  return Math.round(pensioners * avgPension);
}

/**
 * Calculate average pension with indexation
 * @param {number} basePension - Base pension (EUR per year)
 * @param {number} indexationRate - Indexation rate (wage or price)
 * @returns {number} Indexed pension amount
 */
function adjustPension(basePension, indexationRate) {
  return basePension * (1 + indexationRate);
}

/**
 * Calculate pension contribution revenue
 * @param {number} wageBill - Total wages paid (EUR)
 * @param {number} contributionRate - Employer + employee rate (0-1)
 * @returns {number} Contribution revenue in EUR
 */
function calculateContributions(wageBill, contributionRate) {
  return Math.round(wageBill * contributionRate);
}

/**
 * Calculate pension replacement rate (avg pension / avg wage)
 * @param {number} avgPension - Average pension (EUR)
 * @param {number} avgWage - Average wage (EUR)
 * @returns {number} Replacement rate (0-1)
 */
function calculateReplacementRate(avgPension, avgWage) {
  if (avgWage <= 0) return 0;
  return avgPension / avgWage;
}

/**
 * Calculate pensioner-to-worker ratio
 * @param {number} pensioners - Number of pensioners
 * @param {number} employed - Number employed
 * @returns {number} Ratio (e.g., 0.54)
 */
function calculatePensionerWorkerRatio(pensioners, employed) {
  if (employed <= 0) return 0;
  return pensioners / employed;
}

// ============================================================================
// ASSETS & RETURNS
// ============================================================================

/**
 * Update pension fund assets
 * @param {number} assetsStart - Assets at start of year (EUR)
 * @param {number} contributions - Contributions during year (EUR)
 * @param {number} expenditure - Pension expenditure during year (EUR)
 * @param {number} investmentReturn - Investment return rate (0.03 = 3%)
 * @returns {number} Assets at end of year
 *
 * Formula (docs/MODEL.md §15):
 *   assets[t] = assets[t-1] + contributions[t] + investmentIncome[t] - expenditure[t]
 *   investmentIncome[t] = assets[t-1] * investmentReturn[t]
 *
 * Negative assets are preserved rather than clamped, so that an unsustainable
 * funding path is visible (docs/MODEL.md §20.3).
 */
function updatePensionAssets(assetsStart, contributions, expenditure, investmentReturn) {
  const investmentIncome = assetsStart * investmentReturn;
  const assetsEnd = assetsStart + contributions + investmentIncome - expenditure;

  return Math.round(assetsEnd);
}

/**
 * Calculate asset coverage ratio (years of expenditure)
 * @param {number} assets - Pension assets (EUR)
 * @param {number} annualExpenditure - Annual expenditure (EUR)
 * @returns {number} Years of coverage
 */
function calculateAssetCoverage(assets, annualExpenditure) {
  if (annualExpenditure <= 0) return 0;
  return assets / annualExpenditure;
}

// ============================================================================
// MACROECONOMICS
// ============================================================================

/**
 * Calculate GDP with growth
 * @param {number} baseGDP - Base GDP (EUR)
 * @param {number} gdpGrowth - Growth rate
 * @returns {number} GDP after growth
 */
function adjustGDP(baseGDP, gdpGrowth) {
  return baseGDP * (1 + gdpGrowth);
}

/**
 * Calculate pension-to-GDP ratio
 * @param {number} pensionExpenditure - Annual pension expenditure (EUR)
 * @param {number} gdp - Annual GDP (EUR)
 * @returns {number} Ratio (e.g., 0.132 for 13.2%)
 */
function calculatePensionToGDPRatio(pensionExpenditure, gdp) {
  if (gdp <= 0) return 0;
  return pensionExpenditure / gdp;
}

// ============================================================================
// OUTPUT DERIVED METRICS
// ============================================================================

/**
 * Calculate all derived metrics from primary outputs
 * @param {object} yearData - Year's calculated data
 * @returns {object} Derived metrics
 */
function calculateDerivedMetrics(yearData) {
  return {
    replacementRate: calculateReplacementRate(
      yearData.avgPension,
      yearData.avgWage
    ),
    pensionerWorkerRatio: calculatePensionerWorkerRatio(
      yearData.pensioners,
      yearData.employed
    ),
    pensionToGDPRatio: calculatePensionToGDPRatio(
      yearData.pensionExpenditure,
      yearData.gdp
    ),
    assetCoverage: calculateAssetCoverage(
      yearData.pensionAssets,
      yearData.pensionExpenditure
    )
  };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate year's simulation results
 * @param {object} yearData - Calculated data for year
 * @returns {object} { valid: boolean, issues: array }
 */
function validateYearResults(yearData) {
  const issues = [];

  // Check for invalid numbers
  Object.entries(yearData).forEach(([key, value]) => {
    if (typeof value === 'number') {
      if (!isFinite(value)) {
        issues.push(`${key} is not finite: ${value}`);
      }
      if (value < 0 && !key.includes('growth') && !key.includes('return')) {
        // Growth/return rates can be negative, but populations/expenditures should not
        if (!['wageGrowth', 'gdpGrowth', 'investmentReturn', 'migrationLevel'].includes(key)) {
          issues.push(`${key} is negative: ${value}`);
        }
      }
    }
  });

  // Check for reasonable population
  if (yearData.population) {
    if (yearData.population < 4000000) {
      issues.push(`Population seems too low: ${yearData.population}`);
    }
    if (yearData.population > 8000000) {
      issues.push(`Population seems too high: ${yearData.population}`);
    }
  }

  // Check for reasonable employment/pension ratio
  if (yearData.employed && yearData.pensioners && yearData.population) {
    const ratio = (yearData.employed + yearData.pensioners) / yearData.population;
    if (ratio > 0.8) {
      issues.push(`Employment + pensioners ratio suspiciously high: ${ratio}`);
    }
  }

  return {
    valid: issues.length === 0,
    issues: issues
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

const MODEL_EXPORTS = {
  MODEL_VERSION,
  FEMALE_SHARE,
  MIN_WORKING_AGE,
  validateParameters,
  agePopulation,
  calculateBirths,
  calculateDeaths,
  applyMigration,
  calculateWorkingAge,
  calculateEmployed,
  calculateWageBill,
  adjustWage,
  calculatePensioners,
  calculatePensionExpenditure,
  adjustPension,
  calculateContributions,
  calculateReplacementRate,
  calculatePensionerWorkerRatio,
  updatePensionAssets,
  calculateAssetCoverage,
  adjustGDP,
  calculatePensionToGDPRatio,
  calculateDerivedMetrics,
  validateYearResults
};

// Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MODEL_EXPORTS;
}

// Browser
if (typeof window !== 'undefined') {
  window.PensionModel = MODEL_EXPORTS;
}
