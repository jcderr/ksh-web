/* KSH Web — view renderer */

const KSH = window.KSH_DATA;

// Biome/Global/N/A matrix from KSP wiki (B=biome-specific, G=global, N=not available)
const EXPERIMENT_MASK = {
  surfaceSample:      { SrfLanded:'B', SrfSplashed:'B', FlyingLow:'N', FlyingHigh:'N', InSpaceLow:'N', InSpaceHigh:'N' },
  evaReport:          { SrfLanded:'B', SrfSplashed:'B', FlyingLow:'B', FlyingHigh:'G', InSpaceLow:'B', InSpaceHigh:'G' },
  evaExperiments:     { SrfLanded:'G', SrfSplashed:'N', FlyingLow:'N', FlyingHigh:'N', InSpaceLow:'G', InSpaceHigh:'G' },
  asteroidSample:     { SrfLanded:'B', SrfSplashed:'B', FlyingLow:'B', FlyingHigh:'G', InSpaceLow:'G', InSpaceHigh:'G' },
  cometSample:        { SrfLanded:'B', SrfSplashed:'B', FlyingLow:'B', FlyingHigh:'G', InSpaceLow:'G', InSpaceHigh:'G' },
  crewReport:         { SrfLanded:'B', SrfSplashed:'B', FlyingLow:'B', FlyingHigh:'G', InSpaceLow:'G', InSpaceHigh:'G' },
  mysteryGoo:         { SrfLanded:'B', SrfSplashed:'B', FlyingLow:'G', FlyingHigh:'G', InSpaceLow:'G', InSpaceHigh:'G' },
  mobileMaterialsLab: { SrfLanded:'B', SrfSplashed:'B', FlyingLow:'G', FlyingHigh:'G', InSpaceLow:'G', InSpaceHigh:'G' },
  temperatureScan:    { SrfLanded:'B', SrfSplashed:'B', FlyingLow:'B', FlyingHigh:'G', InSpaceLow:'G', InSpaceHigh:'G' },
  barometerScan:      { SrfLanded:'B', SrfSplashed:'B', FlyingLow:'G', FlyingHigh:'G', InSpaceLow:'G', InSpaceHigh:'G' },
  gravityScan:        { SrfLanded:'B', SrfSplashed:'B', FlyingLow:'N', FlyingHigh:'N', InSpaceLow:'B', InSpaceHigh:'B' },
  seismicScan:        { SrfLanded:'B', SrfSplashed:'B', FlyingLow:'N', FlyingHigh:'N', InSpaceLow:'N', InSpaceHigh:'N' },
  atmosphereAnalysis: { SrfLanded:'B', SrfSplashed:'N', FlyingLow:'B', FlyingHigh:'B', InSpaceLow:'N', InSpaceHigh:'N' },
  infraredTelescope:  { SrfLanded:'N', SrfSplashed:'N', FlyingLow:'N', FlyingHigh:'B', InSpaceLow:'N', InSpaceHigh:'G' },
};

// Returns true (done), false (not done), or null (N/A for this biome+situation combo)
function cellState(expId, sitKey, biomeName, doneSituations) {
  const mask = (EXPERIMENT_MASK[expId] ?? {})[sitKey] ?? 'B';
  if (mask === 'N') return null;
  const isGlobal = biomeName === '(Global)';
  if (mask === 'G' && !isGlobal) return null;
  if (mask === 'B' && isGlobal) return null;
  return doneSituations.includes(sitKey);
}

const state = {
  view: 'biome',
  body: '',
  biome: '',
  expId: '',
  sitKey: '',
  filter: 'all',  // 'all' | 'incomplete' | 'complete'
};

// ── Selector population ──────────────────────────────────────────────────────

function populateBodySelector() {
  const sel = document.getElementById('sel-body');
  sel.innerHTML = KSH.bodies.map(b =>
    `<option value="${escHtml(b.name)}">${escHtml(b.name)}</option>`
  ).join('');
  state.body = KSH.bodies[0]?.name ?? '';
  populateBiomeSelector();
}

function populateBiomeSelector() {
  const body = KSH.bodies.find(b => b.name === state.body);
  const sel = document.getElementById('sel-biome-name');
  const biomes = body?.biomes ?? [];
  sel.innerHTML = '<option value="ALL">(ALL)</option>' + biomes.map(bm =>
    `<option value="${escHtml(bm.name)}">${escHtml(bm.name)}</option>`
  ).join('');
  state.biome = 'ALL';
}

// ── View switching ───────────────────────────────────────────────────────────

function switchView(view) {
  state.view = view;

  document.querySelectorAll('.tab-btn:not(.filter-btn)').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  document.getElementById('sel-biome').classList.toggle('hidden', view !== 'biome');
  document.getElementById('sel-experiment').classList.toggle('hidden', view !== 'experiment');
  document.getElementById('sel-situation').classList.toggle('hidden', view !== 'situation');

  renderView();
}

// ── Table builder ────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// cols: [{label}]
// rows: [{label, cells: [bool]}]
function buildTable(cols, rows, colClass) {
  const thClass = colClass || 'sit-col';
  const head = cols.map(c => `<th class="${thClass}">${escHtml(c.label)}</th>`).join('');
  const body = rows.map(row => {
    const cells = row.cells.map(val =>
      val === null
        ? `<td class="sit-cell na-cell"></td>`
        : `<td class="sit-cell${val ? ' done' : ''}"></td>`
    ).join('');
    return `<tr><td class="row-label">${escHtml(row.label)}</td>${cells}</tr>`;
  }).join('');
  return `<table>
    <thead><tr><th class="row-header"></th>${head}</tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}

function applyFilter(rows) {
  const meaningful = rows.filter(r => r.cells.some(c => c !== null));
  if (state.filter === 'incomplete') return meaningful.filter(r => r.cells.some(c => c === false));
  if (state.filter === 'complete')   return meaningful.filter(r => r.cells.filter(c => c !== null).every(c => c));
  return meaningful;
}

function renderSection(heading, content) {
  return `<div class="section-block"><h3 class="section-heading">${escHtml(heading)}</h3>${content}</div>`;
}

// ── Renderers ────────────────────────────────────────────────────────────────

function renderBiomeTable(biome) {
  const cols = KSH.situations.map(s => ({ label: KSH.situation_labels[s] }));
  let rows = biome.experiments.map(exp => ({
    label: exp.title,
    cells: KSH.situations.map(s => cellState(exp.id, s, biome.name, exp.situations)),
  }));
  rows = applyFilter(rows);
  if (rows.length === 0) return null;
  return buildTable(cols, rows, 'sit-col');
}

function renderBiomeView() {
  const body = KSH.bodies.find(b => b.name === state.body);
  if (!body) return '<p class="empty-state">Select a body above.</p>';

  if (state.biome === 'ALL') {
    const sections = body.biomes.map(bm => {
      const table = renderBiomeTable(bm);
      return table ? renderSection(bm.name, table) : null;
    }).filter(Boolean);
    if (sections.length) return sections.join('');
    if (state.filter === 'incomplete') return '<p class="empty-state">No incomplete biomes found — all done here!</p>';
    if (state.filter === 'complete')   return '<p class="empty-state">No completed biomes found here yet.</p>';
    return '<p class="empty-state">No experiment data here.</p>';
  }

  const biome = body.biomes.find(bm => bm.name === state.biome);
  if (!biome) return '<p class="empty-state">Select a biome above.</p>';

  const table = renderBiomeTable(biome);
  if (table) return table;
  if (state.filter === 'incomplete') return '<p class="empty-state">No incomplete experiments found — all done here!</p>';
  if (state.filter === 'complete')   return '<p class="empty-state">No completed experiments found here yet.</p>';
  return '<p class="empty-state">No experiment data here.</p>';
}

function renderExperimentTable(expId) {
  const cols = KSH.situations.map(s => ({ label: KSH.situation_labels[s] }));
  let rows = [];
  for (const body of KSH.bodies) {
    for (const biome of body.biomes) {
      const exp = biome.experiments.find(e => e.id === expId);
      const cells = KSH.situations.map(s =>
        cellState(expId, s, biome.name, exp ? exp.situations : [])
      );
      if (cells.some(c => c !== null)) {
        rows.push({ label: `${body.name} / ${biome.name}`, cells });
      }
    }
  }
  rows = applyFilter(rows);
  if (rows.length === 0) return null;
  return buildTable(cols, rows, 'sit-col');
}

function renderExperimentView() {
  if (!state.expId) return '<p class="empty-state">Select an experiment above.</p>';

  if (state.expId === 'ALL') {
    const sections = KSH.experiments.map(exp => {
      const table = renderExperimentTable(exp.id);
      return table ? renderSection(exp.title, table) : null;
    }).filter(Boolean);
    if (!sections.length) {
      if (state.filter === 'incomplete') return '<p class="empty-state">No incomplete experiments found yet.</p>';
      if (state.filter === 'complete')   return '<p class="empty-state">No completed experiments found yet.</p>';
      return '<p class="empty-state">No experiment data yet.</p>';
    }
    return sections.join('');
  }

  const table = renderExperimentTable(state.expId);
  if (!table) {
    if (state.filter === 'incomplete') return '<p class="empty-state">No incomplete locations found here yet.</p>';
    if (state.filter === 'complete')   return '<p class="empty-state">No completed locations found here yet.</p>';
    return '<p class="empty-state">No data for this experiment yet.</p>';
  }
  return table;
}

function renderSituationTable(sitKey) {
  const expCols = KSH.experiments.filter(exp => {
    for (const body of KSH.bodies) {
      for (const biome of body.biomes) {
        const e = biome.experiments.find(e => e.id === exp.id);
        if (e && e.situations.includes(sitKey)) return true;
      }
    }
    return false;
  });
  if (expCols.length === 0) return null;

  let rows = [];
  for (const body of KSH.bodies) {
    for (const biome of body.biomes) {
      const cells = expCols.map(expCol => {
        const e = biome.experiments.find(e => e.id === expCol.id);
        return cellState(expCol.id, sitKey, biome.name, e ? e.situations : []);
      });
      if (cells.some(c => c !== null)) {
        rows.push({ label: `${body.name} / ${biome.name}`, cells });
      }
    }
  }
  rows = applyFilter(rows);
  if (rows.length === 0) return null;

  const cols = expCols.map(e => ({ label: e.title }));
  return buildTable(cols, rows, 'exp-header');
}

function renderSituationView() {
  if (!state.sitKey) return '<p class="empty-state">Select a situation above.</p>';

  if (state.sitKey === 'ALL') {
    const sections = KSH.situations.map(s => {
      const table = renderSituationTable(s);
      return table ? renderSection(KSH.situation_labels[s], table) : null;
    }).filter(Boolean);
    if (sections.length) return sections.join('');
    if (state.filter === 'incomplete') return '<p class="empty-state">No incomplete experiments found — all done everywhere!</p>';
    if (state.filter === 'complete')   return '<p class="empty-state">No completed experiments found yet.</p>';
    return '<p class="empty-state">No experiment data yet.</p>';
  }

  const table = renderSituationTable(state.sitKey);
  if (!table) {
    if (state.filter === 'incomplete') return '<p class="empty-state">No incomplete locations found here yet.</p>';
    if (state.filter === 'complete')   return '<p class="empty-state">No completed locations found here yet.</p>';
    return '<p class="empty-state">No experiments done in this situation yet.</p>';
  }
  return table;
}

// ── Main render dispatch ─────────────────────────────────────────────────────

function renderView() {
  let html = '';
  if (state.view === 'biome')      html = renderBiomeView();
  else if (state.view === 'experiment') html = renderExperimentView();
  else if (state.view === 'situation')  html = renderSituationView();
  document.getElementById('view-output').innerHTML = html;
}

// ── Init ─────────────────────────────────────────────────────────────────────

function init() {
  if (!KSH) return;

  document.getElementById('view-controls').style.display = '';

  populateBodySelector();

  const expSel = document.getElementById('sel-exp-id');
  expSel.innerHTML = '<option value="ALL">(ALL)</option>' + KSH.experiments.map(e =>
    `<option value="${escHtml(e.id)}">${escHtml(e.title)}</option>`
  ).join('');
  state.expId = 'ALL';

  const sitSel = document.getElementById('sel-sit-key');
  sitSel.innerHTML = '<option value="ALL">(ALL)</option>' + KSH.situations.map(s =>
    `<option value="${escHtml(s)}">${escHtml(KSH.situation_labels[s])}</option>`
  ).join('');
  state.sitKey = 'ALL';

  // Tab buttons (exclude filter buttons which share the tab-btn class)
  document.querySelectorAll('.tab-btn:not(.filter-btn)').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // Biome view selectors
  document.getElementById('sel-body').addEventListener('change', e => {
    state.body = e.target.value;
    populateBiomeSelector();
    renderView();
  });
  document.getElementById('sel-biome-name').addEventListener('change', e => {
    state.biome = e.target.value;
    renderView();
  });

  // Experiment view selector
  document.getElementById('sel-exp-id').addEventListener('change', e => {
    state.expId = e.target.value;
    renderView();
  });

  // Situation view selector
  document.getElementById('sel-sit-key').addEventListener('change', e => {
    state.sitKey = e.target.value;
    renderView();
  });

  // Filter buttons (All / Incomplete / Complete)
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.filter = btn.dataset.filter;
      renderView();
    });
  });

  renderView();
}

document.addEventListener('DOMContentLoaded', init);
