/**
 * src/simulation.js - Pension System Simulation Engine
 * 
 * Main orchestrator that runs the annual simulation loop
 * Returns structured results for visualization and analysis
 * 
 * MODEL_VERSION: 0.2.0
 * Reference: docs/MODEL.md, docs/PARAMETERS.md, docs/CALIBRATION_TARGETS.md
 */

// Module resolution: Node.js uses require(), the browser uses globals.
const model = (typeof require !== 'undefined')
  ? require('./model')
  : window.PensionModel;
const dataLoader = (typeof require !== 'undefined')
  ? require('./data')
  : window.PensionData;

// ============================================================================
// SIMULATION CONFIGURATION
// ============================================================================

/**
 * Default simulation parameters (2025 baseline)
 * See docs/PARAMETERS.md
 */
const DEFAULT_PARAMETERS = {
  retirementAge: 63,
  contributionRate: 0.244,
  employmentRate: 0.713,
  wageGrowth: 0.02,
  gdpGrowth: 0.02,
  investmentReturn: 0.03,
  fertilityRate: 1.31, // observed 2025 total fertility rate (children/woman)
  migrationLevel: 31233, // observed 2025 net migration (persons/year)
  pensionIndexation: 0.02 // annual pension indexation rate (wage-indexed)
};

/**
 * Simulation horizon in years
 * Base year 2025, horizon 70 years to 2095
 * @type {number}
 */
const SIMULATION_HORIZON = 70;

/**
 * Base year for all calculations
 * @type {number}
 */
const BASE_YEAR = 2025;

/**
 * Conversion factor from millions of euros (data unit) to euros (model unit).
 * @type {number}
 */
const MILLION = 1e6;

// ============================================================================
// SIMULATION ENGINE
// ============================================================================

/**
 * Run a complete pension system simulation
 *
 * @param {object} params - User-adjustable parameters (see PARAMETERS.md)
 * @param {object} [options] - Simulation options
 * @param {number} [options.baseYear=2025] - Base year for data loading
 * @param {number} [options.horizon=70] - Number of years to simulate
 * @param {object} [options.data] - Pre-loaded data object (if not, loads from data/processed/)
 * @returns {object} Simulation result with yearly data arrays
 *
 * All monetary values are in EUR (not millions). Rates are decimal fractions.
 */
function simulateScenario(params, options) {
  // Merge parameters with defaults
  const simulationParams = { ...DEFAULT_PARAMETERS, ...params };

  // Validate parameters
  const validation = model.validateParameters(simulationParams);
  if (!validation.valid) {
    throw new Error(`Invalid simulation parameters: ${validation.errors.join(', ')}`);
  }

  // Determine horizon and base year
  const horizon = options && options.horizon
    ? Math.max(1, Math.min(SIMULATION_HORIZON, options.horizon))
    : SIMULATION_HORIZON;
  const baseYear = options && options.baseYear ? options.baseYear : BASE_YEAR;
  const endYear = baseYear + horizon;

  // Load data if not provided
  let simulationData;
  if (options && options.data) {
    simulationData = options.data;
  } else {
    simulationData = dataLoader.loadProcessedData();
  }

  // --------------------------------------------------------------------------
  // INITIAL STATE (loaded from data, never hardcoded)
  // --------------------------------------------------------------------------

  const basePopulation = dataLoader.getPopulationByAge(simulationData, baseYear);
  if (!basePopulation) {
    throw new Error(`Could not load population data for base year ${baseYear}`);
  }

  const baseWage = dataLoader.getAverageWage(simulationData, baseYear);
  const basePension = dataLoader.getAveragePension(simulationData, baseYear);
  const baseAssets = dataLoader.getPensionAssets(simulationData, baseYear);
  const baseGDP = dataLoader.getGDP(simulationData, baseYear);

  if (baseWage === null || basePension === null || baseAssets === null || baseGDP === null) {
    throw new Error(`Missing required base-year (${baseYear}) data`);
  }

  let population = [...basePopulation];
  let avgWage = baseWage;
  let avgPension = basePension;
  let pensionAssets = baseAssets * MILLION;
  let gdp = baseGDP * MILLION;

  // Demographic rates are observed only for the base year. Per
  // docs/ASSUMPTIONS.md §5-6 they are held constant across the horizon.
  const baseMortalityRates = dataLoader.getMortalityRates(simulationData, baseYear) || {};
  const baseFertilityRates = dataLoader.getFertilityRates(simulationData, baseYear) || {};
  const baseMigrationProfile = dataLoader.getNetMigrationByAge(simulationData, baseYear) || {};

  // Observed total fertility rate = sum of age-specific rates (ages 15-49).
  // The user parameter is a TFR in children per woman; it is converted to a
  // scale factor on the observed age profile.
  let observedTFR = 0;
  for (let age = 15; age <= 49; age++) {
    observedTFR += baseFertilityRates[age] || 0;
  }
  const fertilityScale = observedTFR > 0
    ? simulationParams.fertilityRate / observedTFR
    : 1;

  // --------------------------------------------------------------------------
  // RESULT ARRAYS
  // --------------------------------------------------------------------------

  const years = [];
  const populationResults = [];
  const employedResults = [];
  const wageBillResults = [];
  const contributionResults = [];
  const expenditureResults = [];
  const assetResults = [];
  const avgPensionResults = [];
  const pensionerResults = [];
  const replacementRateResults = [];
  const pensionerWorkerRatioResults = [];
  const gdpResults = [];
  const pensionToGDPResults = [];

  // ==========================================================================
  // ANNUAL SIMULATION LOOP
  // ==========================================================================

  for (let year = baseYear; year <= endYear; year++) {
    // --- Compute flows for the current year from the current state ---

    const workingAge = model.calculateWorkingAge(population, simulationParams.retirementAge);
    const employed = model.calculateEmployed(workingAge, simulationParams.employmentRate);
    const wageBill = model.calculateWageBill(employed, avgWage);
    const contributions = model.calculateContributions(wageBill, simulationParams.contributionRate);
    const pensioners = model.calculatePensioners(population, simulationParams.retirementAge);
    const pensionExpenditure = model.calculatePensionExpenditure(pensioners, avgPension);

    // --- Record the current year ---

    years.push(year);
    populationResults.push([...population]);
    employedResults.push(employed);
    wageBillResults.push(wageBill);
    contributionResults.push(contributions);
    expenditureResults.push(pensionExpenditure);
    assetResults.push(pensionAssets);
    avgPensionResults.push(avgPension);
    pensionerResults.push(pensioners);
    replacementRateResults.push(model.calculateReplacementRate(avgPension, avgWage));
    pensionerWorkerRatioResults.push(model.calculatePensionerWorkerRatio(pensioners, employed));
    gdpResults.push(gdp);
    pensionToGDPResults.push(model.calculatePensionToGDPRatio(pensionExpenditure, gdp));

    // --- Advance state to the next year (skip after the final year) ---

    if (year === endYear) break;

    // Demography: births, deaths, ageing, migration
    // Rates are held constant at base-year values (docs/ASSUMPTIONS.md §5-6).
    const births = model.calculateBirths(population, baseFertilityRates, fertilityScale);
    population = model.agePopulation(population, baseMortalityRates, births);

    population = model.applyMigration(population, baseMigrationProfile, simulationParams.migrationLevel);

    // Economics and pension system
    avgWage = model.adjustWage(avgWage, simulationParams.wageGrowth);
    avgPension = model.adjustPension(avgPension, simulationParams.pensionIndexation);
    pensionAssets = model.updatePensionAssets(
      pensionAssets,
      contributions,
      pensionExpenditure,
      simulationParams.investmentReturn
    );
    gdp = model.adjustGDP(gdp, simulationParams.gdpGrowth);
  }

  // ==========================================================================
  // RETURN RESULTS
  // ==========================================================================

  return {
    metadata: {
      baseYear,
      endYear,
      horizon,
      parameters: simulationParams,
      modelVersion: model.MODEL_VERSION
    },

    years: years,

    // Population dynamics
    population: populationResults, // Array of arrays: [age0, age1, ..., age100+] per year
    employed: employedResults,
    wageBill: wageBillResults,

    // Pension system
    contributions: contributionResults,
    pensionExpenditure: expenditureResults,
    pensionAssets: assetResults,
    avgPension: avgPensionResults,
    pensioners: pensionerResults,

    // Derived metrics
    replacementRate: replacementRateResults,
    pensionerWorkerRatio: pensionerWorkerRatioResults,

    // Macroeconomics
    gdp: gdpResults,
    pensionToGDP: pensionToGDPResults,

    // Raw data used
    data: {
      basePopulation,
      parameters: simulationParams
    }
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

const SIMULATION_EXPORTS = {
  simulateScenario,
  DEFAULT_PARAMETERS,
  SIMULATION_HORIZON,
  BASE_YEAR
};

// Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SIMULATION_EXPORTS;
}

// Browser
if (typeof window !== 'undefined') {
  window.PensionSimulation = SIMULATION_EXPORTS;
}