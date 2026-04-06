/* KSH Web — view renderer */

const KSH = window.KSH_DATA;

const state = {
  view: 'biome',
  body: '',
  biome: '',
  expId: '',
  sitKey: '',
  incompleteOnly: false,
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
  sel.innerHTML = biomes.map(bm =>
    `<option value="${escHtml(bm.name)}">${escHtml(bm.name)}</option>`
  ).join('');
  state.biome = biomes[0]?.name ?? '';
}

// ── View switching ───────────────────────────────────────────────────────────

function switchView(view) {
  state.view = view;

  document.querySelectorAll('.tab-btn').forEach(btn => {
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
    const cells = row.cells.map(done =>
      `<td class="sit-cell${done ? ' done' : ''}"></td>`
    ).join('');
    return `<tr><td class="row-label">${escHtml(row.label)}</td>${cells}</tr>`;
  }).join('');
  return `<table>
    <thead><tr><th class="row-header"></th>${head}</tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}

// ── Renderers ────────────────────────────────────────────────────────────────

function renderBiomeView() {
  const body = KSH.bodies.find(b => b.name === state.body);
  if (!body) return '<p class="empty-state">Select a body above.</p>';

  const biome = body.biomes.find(bm => bm.name === state.biome);
  if (!biome) return '<p class="empty-state">Select a biome above.</p>';

  const cols = KSH.situations.map(s => ({ label: KSH.situation_labels[s] }));

  let rows = biome.experiments.map(exp => ({
    label: exp.title,
    cells: KSH.situations.map(s => exp.situations.includes(s)),
  }));

  if (state.incompleteOnly) {
    rows = rows.filter(r => r.cells.some(c => !c));
  }

  if (rows.length === 0) {
    return '<p class="empty-state">All experiments complete here!</p>';
  }

  return buildTable(cols, rows, 'sit-col');
}

function renderExperimentView() {
  if (!state.expId) return '<p class="empty-state">Select an experiment above.</p>';

  const cols = KSH.situations.map(s => ({ label: KSH.situation_labels[s] }));
  let rows = [];

  for (const body of KSH.bodies) {
    for (const biome of body.biomes) {
      const exp = biome.experiments.find(e => e.id === state.expId);
      if (!exp) continue;
      rows.push({
        label: `${body.name} / ${biome.name}`,
        cells: KSH.situations.map(s => exp.situations.includes(s)),
      });
    }
  }

  if (state.incompleteOnly) {
    rows = rows.filter(r => r.cells.some(c => !c));
  }

  if (rows.length === 0) {
    return state.incompleteOnly
      ? '<p class="empty-state">Nothing incomplete — you\'ve done this everywhere!</p>'
      : '<p class="empty-state">No data for this experiment yet.</p>';
  }

  return buildTable(cols, rows, 'sit-col');
}

function renderSituationView() {
  if (!state.sitKey) return '<p class="empty-state">Select a situation above.</p>';

  // Columns: experiments done at least once in this situation, anywhere
  const expCols = KSH.experiments.filter(exp => {
    for (const body of KSH.bodies) {
      for (const biome of body.biomes) {
        const e = biome.experiments.find(e => e.id === exp.id);
        if (e && e.situations.includes(state.sitKey)) return true;
      }
    }
    return false;
  });

  if (expCols.length === 0) {
    return '<p class="empty-state">No experiments done in this situation yet.</p>';
  }

  // Rows: (body, biome) pairs that have at least one experiment done in this situation
  let rows = [];
  for (const body of KSH.bodies) {
    for (const biome of body.biomes) {
      const cells = expCols.map(expCol => {
        const e = biome.experiments.find(e => e.id === expCol.id);
        return e ? e.situations.includes(state.sitKey) : false;
      });
      if (cells.some(c => c)) {
        rows.push({ label: `${body.name} / ${biome.name}`, cells });
      }
    }
  }

  if (state.incompleteOnly) {
    rows = rows.filter(r => r.cells.some(c => !c));
  }

  const cols = expCols.map(e => ({ label: e.title }));

  if (rows.length === 0) {
    return '<p class="empty-state">All done for this situation!</p>';
  }

  return buildTable(cols, rows, 'exp-header');
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
  expSel.innerHTML = KSH.experiments.map(e =>
    `<option value="${escHtml(e.id)}">${escHtml(e.title)}</option>`
  ).join('');
  state.expId = KSH.experiments[0]?.id ?? '';

  const sitSel = document.getElementById('sel-sit-key');
  sitSel.innerHTML = KSH.situations.map(s =>
    `<option value="${escHtml(s)}">${escHtml(KSH.situation_labels[s])}</option>`
  ).join('');
  state.sitKey = KSH.situations[0] ?? '';

  // Tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
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

  // Incomplete-only toggle
  document.getElementById('incomplete-only').addEventListener('change', e => {
    state.incompleteOnly = e.target.checked;
    renderView();
  });

  renderView();
}

document.addEventListener('DOMContentLoaded', init);
