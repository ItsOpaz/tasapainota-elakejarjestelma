/**
 * src/charts.js - Chart rendering
 *
 * Thin wrapper around Chart.js. Renders a line chart comparing the baseline
 * scenario with the user scenario for a selected metric.
 *
 * No frameworks; Chart.js is loaded from a CDN in index.html.
 */

(function () {
  'use strict';

  let chart = null;

  /**
   * Metric definitions: how to read a series from a simulation result and
   * how to format its values for display.
   */
  const METRICS = {
    pensionToGDP: {
      label: 'Eläkemeno / BKT',
      unit: '%',
      get: r => r.pensionToGDP.map(v => v * 100),
      format: v => v.toFixed(1) + ' %'
    },
    contributionRate: {
      label: 'Eläkemaksutaso',
      unit: '%',
      get: r => r.contributions.map((c, i) => (c / r.wageBill[i]) * 100),
      format: v => v.toFixed(1) + ' %'
    },
    pensionAssets: {
      label: 'Eläkevarat',
      unit: 'mrd €',
      get: r => r.pensionAssets.map(v => v / 1e9),
      format: v => v.toFixed(0) + ' mrd €'
    },
    replacementRate: {
      label: 'Eläketaso suhteessa palkkoihin',
      unit: '%',
      get: r => r.replacementRate.map(v => v * 100),
      format: v => v.toFixed(1) + ' %'
    },
    pensionerWorkerRatio: {
      label: 'Eläkeläiset / työlliset',
      unit: '',
      get: r => r.pensionerWorkerRatio,
      format: v => v.toFixed(2)
    }
  };

  /**
   * Render or update the comparison chart.
   * @param {HTMLCanvasElement} canvas - Target canvas
   * @param {object} baseline - Baseline simulation result
   * @param {object} scenario - User scenario simulation result
   * @param {string} metricKey - Key into METRICS
   */
  function render(canvas, baseline, scenario, metricKey) {
    const metric = METRICS[metricKey];
    if (!metric) throw new Error(`Unknown metric: ${metricKey}`);

    const datasets = [
      {
        label: 'Perusskenaario',
        data: metric.get(baseline),
        borderColor: '#8b5a2b',
        borderDash: [6, 4],
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.2
      },
      {
        label: 'Oma skenaario',
        data: metric.get(scenario),
        borderColor: '#2b1b0e',
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.2
      }
    ];

    if (chart) {
      chart.data.labels = baseline.years;
      chart.data.datasets = datasets;
      chart.options.scales.y.title.text = metric.unit;
      chart.update();
      return;
    }

    chart = new Chart(canvas, {
      type: 'line',
      data: { labels: baseline.years, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.dataset.label}: ${metric.format(ctx.parsed.y)}`
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Vuosi' }
          },
          y: {
            title: { display: true, text: metric.unit },
            beginAtZero: false
          }
        }
      }
    });
  }

  window.PensionCharts = { render, METRICS };
})();
