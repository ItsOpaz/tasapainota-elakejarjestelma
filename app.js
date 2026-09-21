/**
 * app.js - Application entry point
 *
 * Wires the parameter controls to the simulation engine and updates the
 * results and chart. Scenarios are encoded in the URL so they can be shared.
 *
 * No frameworks; vanilla JavaScript only.
 */

(function () {
  'use strict';

  const model = window.PensionModel;
  const dataLoader = window.PensionData;
  const simulation = window.PensionSimulation;
  const charts = window.PensionCharts;

  /**
   * Control definitions. Each maps a UI control to a simulation parameter.
   * `toParam` converts the raw input value to the engine's internal unit.
   */
  const CONTROLS = [
    { id: 'retirementAge', toParam: v => Number(v), format: v => v },
    { id: 'contributionRate', toParam: v => Number(v) / 100, format: v => (v * 100).toFixed(1) },
    { id: 'employmentRate', toParam: v => Number(v) / 100, format: v => (v * 100).toFixed(1) },
    { id: 'wageGrowth', toParam: v => Number(v) / 100, format: v => (v * 100).toFixed(1) },
    { id: 'gdpGrowth', toParam: v => Number(v) / 100, format: v => (v * 100).toFixed(1) },
    { id: 'investmentReturn', toParam: v => Number(v) / 100, format: v => (v * 100).toFixed(1) },
    { id: 'fertilityRate', toParam: v => Number(v), format: v => Number(v).toFixed(2) },
    { id: 'migrationLevel', toParam: v => Number(v), format: v => v },
    { id: 'pensionIndexation', toParam: v => Number(v) / 100, format: v => (v * 100).toFixed(1) }
  ];

  let data = null;
  let baseline = null;

  // ==========================================================================
  // PARAMETER HANDLING
  // ==========================================================================

  /**
   * Read the current parameter values from the controls.
   * @returns {object} Parameter object for the simulation engine
   */
  function readParameters() {
    const params = {};
    CONTROLS.forEach(c => {
      const el = document.getElementById(c.id);
      params[c.id] = c.toParam(el.value);
    });
    return params;
  }

  /**
   * Apply parameters to the controls (used for URL loading and reset).
   * @param {object} params - Parameter object
   */
  function writeParameters(params) {
    CONTROLS.forEach(c => {
      if (params[c.id] === undefined) return;
      const el = document.getElementById(c.id);
      // Convert the engine unit back to the control's display unit
      const display = c.format(params[c.id]);
      el.value = display;
      updateControlLabel(c.id, display);
    });
  }

  /**
   * Update the numeric label next to a control.
   */
  function updateControlLabel(id, value) {
    const label = document.getElementById(id + 'Value');
    if (label) label.textContent = value;
  }

  // ==========================================================================
  // URL SCENARIO HANDLING
  // ==========================================================================

  /**
   * Parse and validate parameters from the URL query string.
   * Invalid values are ignored (never trusted blindly).
   * @returns {object} Validated parameter overrides
   */
  function readUrlParameters() {
    const params = new URLSearchParams(window.location.search);
    const result = {};

    CONTROLS.forEach(c => {
      const raw = params.get(c.id);
      if (raw === null) return;

      const value = c.toParam(raw);
      if (!isFinite(value)) return;

      // Validate against the control's own min/max
      const el = document.getElementById(c.id);
      const min = Number(el.min);
      const max = Number(el.max);
      const display = Number(raw);
      if (display < min || display > max) return;

      result[c.id] = value;
    });

    return result;
  }

  /**
   * Write the current scenario into the URL without reloading the page.
   */
  function updateUrl() {
    const params = new URLSearchParams();
    CONTROLS.forEach(c => {
      const el = document.getElementById(c.id);
      params.set(c.id, el.value);
    });
    const url = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', url);
  }

  // ==========================================================================
  // RENDERING
  // ==========================================================================

  /**
   * Format a number with Finnish thousands separators.
   */
  function formatNumber(value, decimals) {
    return value.toLocaleString('fi-FI', {
      minimumFractionDigits: decimals || 0,
      maximumFractionDigits: decimals || 0
    });
  }

  /**
   * Update the current-state metric cards from the baseline result.
   */
  function renderMetrics(result) {
    const i = 0; // base year
    const population = result.population[i].reduce((a, b) => a + b, 0);

    document.getElementById('metricPopulation').textContent = formatNumber(population);
    document.getElementById('metricEmployed').textContent = formatNumber(result.employed[i]);
    document.getElementById('metricPensioners').textContent = formatNumber(result.pensioners[i]);
    document.getElementById('metricAvgPension').textContent = formatNumber(result.avgPension[i]);
    document.getElementById('metricExpenditure').textContent =
      formatNumber(result.pensionExpenditure[i] / 1e6, 0);
    document.getElementById('metricAssets').textContent =
      formatNumber(result.pensionAssets[i] / 1e6, 0);
  }

  /**
   * Re-run the simulation and update all outputs.
   */
  function update() {
    const params = readParameters();
    const scenario = simulation.simulateScenario(params, { data });

    renderMetrics(scenario);

    const metricKey = document.getElementById('metricSelect').value;
    charts.render(document.getElementById('chart'), baseline, scenario, metricKey);

    updateUrl();
  }

  // ==========================================================================
  // INITIALISATION
  // ==========================================================================

  async function init() {
    try {
      data = await dataLoader.loadProcessedDataBrowser();
    } catch (err) {
      document.getElementById('error').textContent =
        'Datan lataus epäonnistui: ' + err.message;
      return;
    }

    // Baseline uses the engine defaults
    baseline = simulation.simulateScenario({}, { data });

    // Apply URL parameters, then defaults for anything not in the URL
    const urlParams = readUrlParameters();
    writeParameters({ ...simulation.DEFAULT_PARAMETERS, ...urlParams });

    // Wire up controls
    CONTROLS.forEach(c => {
      const el = document.getElementById(c.id);
      el.addEventListener('input', () => {
        updateControlLabel(c.id, el.value);
        update();
      });
    });

    document.getElementById('metricSelect').addEventListener('change', update);
    document.getElementById('reset').addEventListener('click', () => {
      writeParameters(simulation.DEFAULT_PARAMETERS);
      update();
    });

    update();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
