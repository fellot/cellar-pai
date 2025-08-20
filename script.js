/*
 * script.js
 * Contains common functionality for the wine cellar website, including
 * loading the dataset, initializing the inventory table with filters,
 * rendering charts on the statistics page, and handling the dark mode
 * toggle. This file is shared across all pages.
 */

// Global array to hold the wine dataset once loaded. The data is injected
// into each HTML page via a <script id="wineData" type="application/json"> tag.
// This avoids issues with fetch() on file:// URLs.
let wineData = [];

/**
 * Fetches the wine dataset from the JSON file. Returns a promise
 * resolving with the array of wine objects.
 */
async function fetchWineData() {
  // Return cached data if already loaded
  if (wineData.length > 0) {
    return wineData;
  }
  // Try to read from embedded JSON in the HTML page
  const dataEl = document.getElementById('wineData');
  if (dataEl) {
    try {
      wineData = JSON.parse(dataEl.textContent);
      return wineData;
    } catch (e) {
      console.error('Erro ao analisar dados embutidos:', e);
    }
  }
  // Fallback: attempt to fetch JSON via network. Might fail on file:// schemes.
  try {
    const response = await fetch('data/wine_data.json');
    if (!response.ok) throw new Error('Falha ao carregar dados');
    wineData = await response.json();
    return wineData;
  } catch (error) {
    console.error('Erro ao carregar dados via fetch:', error);
    return [];
  }
}

/**
 * Populates filter select elements with unique values from the dataset.
 * @param {Array} data
 */
function populateFilters(data) {
  const countrySet = new Set();
  const styleSet = new Set();
  const vintageSet = new Set();
  const grapeSet = new Set();
  data.forEach(item => {
    if (item.pais) countrySet.add(item.pais);
    if (item.estilo) styleSet.add(item.estilo);
    if (item.safra) vintageSet.add(item.safra);
    if (item.uvas) {
      // split grapes string into individual grapes by comma
      item.uvas.split(/[,;+&]/).forEach(g => {
        const trimmed = g.trim();
        if (trimmed) grapeSet.add(trimmed);
      });
    }
  });
  // convert sets to sorted arrays
  const countries = Array.from(countrySet).sort();
  const styles = Array.from(styleSet).sort();
  const vintages = Array.from(vintageSet).sort((a,b) => a.localeCompare(b));
  const grapes = Array.from(grapeSet).sort();
  // populate selects
  const countrySelect = document.getElementById('countryFilter');
  const styleSelect = document.getElementById('styleFilter');
  const vintageSelect = document.getElementById('vintageFilter');
  const grapeSelect = document.getElementById('grapeFilter');
  countries.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    countrySelect.appendChild(opt);
  });
  styles.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    styleSelect.appendChild(opt);
  });
  vintages.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    vintageSelect.appendChild(opt);
  });
  grapes.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g;
    opt.textContent = g;
    grapeSelect.appendChild(opt);
  });
}

/**
 * Calculates and updates the summary cards on the inventory page.
 * @param {Array} data
 */
function updateSummary(data) {
  const totalCountEl = document.getElementById('totalCount');
  const countryCountEl = document.getElementById('countryCount');
  const styleCountEl = document.getElementById('styleCount');
  const peakYearEl = document.getElementById('peakYear');
  totalCountEl.textContent = data.length;
  // Count unique countries and styles
  const countrySet = new Set();
  const styleSet = new Set();
  let upcomingPeak = null;
  data.forEach(item => {
    if (item.pais) countrySet.add(item.pais);
    if (item.estilo) styleSet.add(item.estilo);
    // Determine peak year: parse integer if possible
    const peak = parseInt(item.pico);
    const currentYear = new Date().getFullYear();
    if (!isNaN(peak) && peak >= currentYear) {
      if (upcomingPeak === null || peak < upcomingPeak) {
        upcomingPeak = peak;
      }
    }
  });
  countryCountEl.textContent = countrySet.size;
  styleCountEl.textContent = styleSet.size;
  peakYearEl.textContent = upcomingPeak !== null ? upcomingPeak : '–';
}

/**
 * Initializes the DataTable with the wine data and sets up filtering.
 * Uses DataTables jQuery plugin for sorting, searching and pagination.
 */
function initDataTable(data) {
  // Convert data to array of arrays for DataTables
  const rows = data.map(item => [
    item.rotulo,
    item.vinho,
    item.pais,
    item.regiao,
    item.safra,
    item.estilo,
    item.uvas,
    item.janela,
    item.pico,
    item.harmonizacao,
    item.prato,
    item.consumido
  ]);
  // Initialize DataTable
  const table = $('#wineTable').DataTable({
    data: rows,
    columns: [
      { title: 'Rótulo' },
      { title: 'Vinho' },
      { title: 'País' },
      { title: 'Região' },
      { title: 'Safra' },
      { title: 'Estilo' },
      { title: 'Uvas' },
      { title: 'Janela' },
      { title: 'Pico' },
      { title: 'Harmonização' },
      { title: 'Prato' },
      { title: 'Consumido' }
    ],
    pageLength: 10,
    autoWidth: false,
    language: {
      search: 'Buscar:',
      lengthMenu: 'Mostrar _MENU_ registros por página',
      info: 'Mostrando _START_ a _END_ de _TOTAL_ entradas',
      paginate: {
        first: 'Primeiro',
        last: 'Último',
        next: 'Próximo',
        previous: 'Anterior'
      },
      infoEmpty: 'Nenhum dado disponível',
      zeroRecords: 'Nenhum vinho encontrado'
    }
  });
  // Filter functions
  const applyFilters = () => {
    const countryVal = $('#countryFilter').val();
    const styleVal = $('#styleFilter').val();
    const vintageVal = $('#vintageFilter').val();
    const grapeVal = $('#grapeFilter').val();
    // Reset filters
    table.column(2).search(countryVal, false, false);
    table.column(5).search(styleVal, false, false);
    table.column(4).search(vintageVal, false, false);
    // For grapes, search inside cell with regex if value present
    if (grapeVal) {
      table.column(6).search(grapeVal, true, false);
    } else {
      table.column(6).search('');
    }
    table.draw();
  };
  $('#countryFilter, #styleFilter, #vintageFilter, #grapeFilter').on('change', applyFilters);
  // Search box filtering across all columns
  $('#searchBox').on('keyup', function () {
    table.search(this.value).draw();
  });
}

/**
 * Initializes the inventory page: loads data, updates summary, populates filters
 * and builds the table. Also sets up dark mode toggle.
 */
async function initializeInventoryPage() {
  setupDarkMode();
  const data = await fetchWineData();
  if (!data.length) return;
  updateSummary(data);
  populateFilters(data);
  initDataTable(data);
}

/**
 * Initializes the statistics page: loads data and renders charts.
 */
async function initializeStatsPage() {
  setupDarkMode();
  const data = await fetchWineData();
  if (!data.length) return;
  // Prepare data counts
  const countryCounts = {};
  const vintageCounts = {};
  const styleCounts = {};
  data.forEach(item => {
    // country
    if (item.pais) countryCounts[item.pais] = (countryCounts[item.pais] || 0) + 1;
    // vintage: only consider numbers; treat unknown as 'Outros'
    const vint = item.safra || 'Outros';
    vintageCounts[vint] = (vintageCounts[vint] || 0) + 1;
    // style
    const style = item.estilo || 'Desconhecido';
    styleCounts[style] = (styleCounts[style] || 0) + 1;
  });
  // Create charts
  const countryChartCtx = document.getElementById('countryChart').getContext('2d');
  const vintageChartCtx = document.getElementById('vintageChart').getContext('2d');
  const styleChartCtx = document.getElementById('styleChart').getContext('2d');
  const buildBarChart = (ctx, labels, dataVals, label, colors) => {
    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: label,
            data: dataVals,
            backgroundColor: colors,
            borderColor: colors,
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `${context.parsed.y} vinhos`
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: getComputedStyle(document.body).color
            },
            title: {
              display: true,
              text: '',
              color: getComputedStyle(document.body).color
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              color: getComputedStyle(document.body).color
            }
          }
        }
      }
    });
  };
  // Determine dynamic colors based on theme
  const generateColors = (count) => {
    const baseColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#8b1b34';
    // lighten/darken palette
    const colors = [];
    for (let i = 0; i < count; i++) {
      const ratio = 0.3 + (i / (count * 1.5));
      colors.push(shadeColor(baseColor, ratio));
    }
    return colors;
  };
  // Utility to shade a hex color: positive ratio lightens, negative darkens
  function shadeColor(color, ratio) {
    let r = parseInt(color.substring(1, 3), 16);
    let g = parseInt(color.substring(3, 5), 16);
    let b = parseInt(color.substring(5, 7), 16);
    r = Math.min(255, Math.floor(r + (255 - r) * ratio));
    g = Math.min(255, Math.floor(g + (255 - g) * ratio));
    b = Math.min(255, Math.floor(b + (255 - b) * ratio));
    return `rgb(${r}, ${g}, ${b})`;
  }
  // Build charts
  const countryLabels = Object.keys(countryCounts);
  const countryValues = Object.values(countryCounts);
  buildBarChart(countryChartCtx, countryLabels, countryValues, 'Vinhos por País', generateColors(countryLabels.length));
  const vintageLabels = Object.keys(vintageCounts);
  const vintageValues = Object.values(vintageCounts);
  buildBarChart(vintageChartCtx, vintageLabels, vintageValues, 'Vinhos por Safra', generateColors(vintageLabels.length));
  const styleLabels = Object.keys(styleCounts);
  const styleValues = Object.values(styleCounts);
  buildBarChart(styleChartCtx, styleLabels, styleValues, 'Vinhos por Estilo', generateColors(styleLabels.length));
}

/**
 * Initializes the sustainability page: only sets up dark mode toggle.
 */
function initializeSustainabilityPage() {
  setupDarkMode();
}

/**
 * Handles dark mode toggling. Reads the saved preference from localStorage
 * and applies the appropriate class on the body. Attaches event listener
 * to the toggle button.
 */
function setupDarkMode() {
  const body = document.body;
  const toggleBtn = document.getElementById('darkModeToggle');
  const saved = localStorage.getItem('wine_dark_mode');
  if (saved === 'true') {
    body.classList.add('dark-mode');
  }
  toggleBtn.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    localStorage.setItem('wine_dark_mode', body.classList.contains('dark-mode'));
  });
}