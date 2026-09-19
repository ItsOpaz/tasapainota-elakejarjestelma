/**
 * src/model.js - Pension System Model
 * 
 * Core calculation functions for the Finnish pension system simulation
 * All functions are pure and deterministic
 * All values in real 2025 EUR (constant prices)
 * 
 * MODEL_VERSION: 0.1.0
 * Reference: docs/MODEL.md
 */

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

  // Fertility multiplier: 0.5x to 1.5x
  if (params.fertilityRate < 0.5 || params.fertilityRate > 1.5) {
    errors.push(`fertilityRate must be 0.5-1.5, got ${params.fertilityRate}`);
  }

  // Migration level: -10k to +50k per year
  if (params.migrationLevel < -10000 || params.migrationLevel > 50000) {
    errors.push(`migrationLevel must be -10000 to 50000, got ${params.migrationLevel}`);
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
 * Age the population by one year
 * @param {array} population - Population array by age [0..100+]
 * @returns {array} Aged population
 */
function agePopulation(population) {
  const aged = new Array(101).fill(0);

  // Move each age group up by 1
  for (let age = 0; age < 100; age++) {
    aged[age + 1] = population[age];
  }

  // Aggregate ages 100+
  aged[100] = (aged[100] || 0) + (population[100] || 0);

  return aged;
}

/**
 * Calculate number of births from fertility rates
 * @param {array} femalePopulation - Female population aged 15-49
 * @param {object} fertilityRates - Fertility rates by age
 * @param {number} fertilityMultiplier - Fertility adjustment (0.5 to 1.5)
 * @returns {number} Number of births
 */
function calculateBirths(femalePopulation, fertilityRates, fertilityMultiplier) {
  let births = 0;

  for (let age = 15; age <= 49; age++) {
    const rate = (fertilityRates[age] || 0) * fertilityMultiplier;
    // Assume approximately 50% of population is female
    const femaleAtAge = (femalePopulation[age] || 0) / 2;
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
 * Apply net migration to population
 * @param {array} population - Population by age
 * @param {object} migration - Net migration by age
 * @param {number} migrationLevel - Total migration adjustment (-10k to +50k)
 * @returns {array} Population after migration
 */
function applyMigration(population, migration, migrationLevel) {
  const result = [...population];

  // Apply per-age migration patterns, scaled by total level
  for (let age = 0; age <= 100; age++) {
    const ageFlow = migration[age] || 0;
    result[age] = Math.max(0, (result[age] || 0) + Math.round(ageFlow * (migrationLevel / 10000)));
  }

  return result;
}

// ============================================================================
// EMPLOYMENT & WAGES
// ============================================================================

/**
 * Calculate number of people in working age (15-67, or parameterized retirement age)
 * @param {array} population - Population by age
 * @param {number} retirementAge - Effective retirement age (63)
 * @returns {object} { workingAge: count, workable: count }
 */
function calculateWorkingAge(population, retirementAge) {
  let workingAge = 0;
  let workable = 0; // Includes those still potentially employed after retirementAge

  for (let age = 15; age <= 100; age++) {
    workingAge += population[age] || 0;
    if (age <= retirementAge) {
      workable += population[age] || 0;
    }
  }

  return { workingAge, workable };
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
 * @param {number} avgWage - Average wage (EUR per year)
 * @param {number} wageGrowth - Wage growth rate (multiplier)
 * @returns {number} Total wage bill in EUR
 */
function calculateWageBill(employed, avgWage, wageGrowth) {
  const adjustedWage = avgWage * (1 + wageGrowth);
  return Math.round(employed * adjustedWage);
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
 */
function updatePensionAssets(assetsStart, contributions, expenditure, investmentReturn) {
  // Simple annual calculation:
  // Assets_end = (Assets_start + Contributions - Expenditure) * (1 + Return)
  
  const netFlow = assetsStart + contributions - expenditure;
  const assetsEnd = netFlow * (1 + investmentReturn);
  
  return Math.max(0, Math.round(assetsEnd));
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

module.exports = {
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
