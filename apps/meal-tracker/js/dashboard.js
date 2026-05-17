// ============================================
// Dashboard Logic — Admin view with correlations & PDF export
// ============================================

let allEntries = [];
let allSymptoms = [];
let currentView = 'timeline';
let selectedItems = new Set(); // tracks "entry:id" or "symptom:id"

// --- Authentication ---
function authenticate(e) {
  e.preventDefault();
  const pw = document.getElementById('auth-password').value;
  if (pw === DASHBOARD_PASSWORD) {
    document.getElementById('password-modal').style.display = 'none';
    document.getElementById('dashboard-content').style.display = 'block';
    initDashboard();
  } else {
    alert('Incorrect password.');
  }
}

// --- Initialize ---
function initDashboard() {
  setQuickFilter('week');
}

// --- Quick Date Filters ---
function setQuickFilter(range) {
  const now = new Date();
  const etDateStr = now.toLocaleString('en-CA', { timeZone: 'America/New_York' }).split(',')[0];
  const [y, m, d] = etDateStr.split('-').map(Number);
  const end = new Date(y, m - 1, d);
  let start;

  if (range === 'today') {
    start = new Date(end);
  } else if (range === 'week') {
    start = new Date(end);
    start.setDate(start.getDate() - 7);
  } else {
    start = new Date('2020-01-01');
  }

  document.getElementById('filter-start').value = formatDateInput(start);
  document.getElementById('filter-end').value = formatDateInput(end);
  loadData();
}

function formatDateInput(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// --- Load Data ---
async function loadData() {
  const startDate = document.getElementById('filter-start').value;
  const endDate = document.getElementById('filter-end').value;

  if (!startDate || !endDate) return;

  document.getElementById('loading').style.display = 'block';
  document.getElementById('timeline-container').innerHTML = '';
  document.getElementById('table-container').innerHTML = '';
  document.getElementById('correlations-container').innerHTML = '';

  const startISO = easternInputToISO(startDate + 'T00:00');
  const endISO = easternInputToISO(endDate + 'T23:59');

  try {
    const db = await getSupabase();
    const [entriesRes, symptomsRes] = await Promise.all([
      db.from('entries').select('*').gte('entry_time', startISO).lte('entry_time', endISO).order('entry_time', { ascending: false }),
      db.from('symptoms').select('*').gte('symptom_time', startISO).lte('symptom_time', endISO).order('symptom_time', { ascending: false })
    ]);

    if (entriesRes.error) throw entriesRes.error;
    if (symptomsRes.error) throw symptomsRes.error;

    allEntries = entriesRes.data || [];
    allSymptoms = symptomsRes.data || [];

    selectedItems.clear();
    updateDeleteBar();
    updateStats();
    renderTimeline();
    renderTable();
    renderCorrelations();
  } catch (err) {
    console.error('Load error:', err);
    document.getElementById('timeline-container').innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><h3>Error loading data</h3><p>' + err.message + '</p></div>';
  } finally {
    document.getElementById('loading').style.display = 'none';
  }
}

// --- Update Stats ---
function updateStats() {
  const foods = allEntries.filter(e => e.entry_type === 'food').length;
  const drinks = allEntries.filter(e => e.entry_type === 'drink').length;
  const symptoms = allSymptoms.length;
  const people = new Set([...allEntries.map(e => e.submitter_name), ...allSymptoms.map(s => s.submitter_name)]).size;

  document.getElementById('stat-meals').textContent = foods;
  document.getElementById('stat-drinks').textContent = drinks;
  document.getElementById('stat-symptoms').textContent = symptoms;
  document.getElementById('stat-people').textContent = people;
}

// --- View Toggle ---
function setView(view, btn) {
  currentView = view;
  document.querySelectorAll('.view-toggle button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('timeline-view').style.display = view === 'timeline' ? 'block' : 'none';
  document.getElementById('table-view').style.display = view === 'table' ? 'block' : 'none';
}

// ============================================
// Selection & Delete
// ============================================

function toggleSelect(type, id) {
  const key = type + ':' + id;
  if (selectedItems.has(key)) {
    selectedItems.delete(key);
  } else {
    selectedItems.add(key);
  }
  updateDeleteBar();
  const cb = document.querySelector(`input[data-key="${key}"]`);
  if (cb) cb.checked = selectedItems.has(key);
}

function selectAll() {
  const allItems = [
    ...allEntries.map(e => 'entry:' + e.id),
    ...allSymptoms.map(s => 'symptom:' + s.id)
  ];

  if (selectedItems.size === allItems.length) {
    selectedItems.clear();
  } else {
    allItems.forEach(k => selectedItems.add(k));
  }

  document.querySelectorAll('.item-checkbox').forEach(cb => {
    cb.checked = selectedItems.has(cb.dataset.key);
  });
  updateDeleteBar();
}

function updateDeleteBar() {
  const bar = document.getElementById('delete-bar');
  const count = selectedItems.size;
  if (count > 0) {
    bar.style.display = 'flex';
    document.getElementById('delete-count').textContent = count + ' selected';
  } else {
    bar.style.display = 'none';
  }
}

async function deleteSelected() {
  const count = selectedItems.size;
  if (count === 0) return;

  if (!confirm(`Delete ${count} item(s)? This cannot be undone.`)) return;

  const entryIds = [];
  const symptomIds = [];
  selectedItems.forEach(key => {
    const [type, id] = key.split(':');
    if (type === 'entry') entryIds.push(id);
    else symptomIds.push(id);
  });

  try {
    const db = await getSupabase();
    const promises = [];
    if (entryIds.length > 0) {
      promises.push(db.from('entries').delete().in('id', entryIds));
    }
    if (symptomIds.length > 0) {
      promises.push(db.from('symptoms').delete().in('id', symptomIds));
    }

    const results = await Promise.all(promises);
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      throw new Error(errors.map(e => e.error.message).join(', '));
    }

    selectedItems.clear();
    updateDeleteBar();
    await loadData();
  } catch (err) {
    console.error('Delete error:', err);
    alert('Failed to delete: ' + err.message);
  }
}

// --- Render Timeline ---
function renderTimeline() {
  const container = document.getElementById('timeline-container');

  const items = [
    ...allEntries.map(e => ({ ...e, _type: 'entry', _time: e.entry_time })),
    ...allSymptoms.map(s => ({ ...s, _type: 'symptom', _time: s.symptom_time }))
  ].sort((a, b) => new Date(b._time) - new Date(a._time));

  if (items.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="icon">📭</div><h3>No entries yet</h3><p>Entries will appear here once family members start logging.</p></div>';
    return;
  }

  const grouped = {};
  items.forEach(item => {
    const dateKey = formatEasternDate(item._time);
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(item);
  });

  let html = '<div class="timeline">';
  for (const [date, dateItems] of Object.entries(grouped)) {
    html += `<div class="timeline-date">${date}</div>`;
    dateItems.forEach(item => {
      const key = item._type + ':' + item.id;
      const checked = selectedItems.has(key) ? 'checked' : '';
      const checkboxHtml = `<label class="item-select-label"><input type="checkbox" class="item-checkbox" data-key="${key}" ${checked} onchange="toggleSelect('${item._type}','${item.id}')"></label>`;

      if (item._type === 'entry') {
        const typeEmoji = item.entry_type === 'food' ? '🍕' : '🥤';
        const typeClass = item.entry_type;
        html += `
          <div class="timeline-item">
            ${checkboxHtml}
            <div class="item-content">
              <div class="item-header">
                <span class="item-name">${typeEmoji} ${escapeHtml(item.item_name)}</span>
                <span class="item-time">${formatEasternTime(item.entry_time)}</span>
              </div>
              <div class="item-meta">
                <span class="badge ${typeClass}">${item.entry_type}</span>
                ${item.portion_size ? `<span class="badge">${item.portion_size}</span>` : ''}
                <span class="badge submitter">by ${escapeHtml(item.submitter_name)}</span>
              </div>
              ${item.notes ? `<div class="item-notes">${escapeHtml(item.notes)}</div>` : ''}
            </div>
          </div>`;
      } else {
        html += `
          <div class="timeline-item symptom-item">
            ${checkboxHtml}
            <div class="item-content">
              <div class="item-header">
                <span class="item-name">🩺 ${escapeHtml(item.symptom_type)}</span>
                <span class="item-time">${formatEasternTime(item.symptom_time)}</span>
              </div>
              <div class="item-meta">
                <span class="badge symptom">symptom</span>
                <span class="badge ${item.severity}">${item.severity}</span>
                <span class="badge submitter">by ${escapeHtml(item.submitter_name)}</span>
              </div>
              ${item.notes ? `<div class="item-notes">${escapeHtml(item.notes)}</div>` : ''}
            </div>
          </div>`;
      }
    });
  }
  html += '</div>';
  container.innerHTML = html;
}

// --- Render Table ---
function renderTable() {
  const container = document.getElementById('table-container');

  const items = [
    ...allEntries.map(e => ({ id: e.id, _type: 'entry', time: e.entry_time, type: e.entry_type, name: e.item_name, detail: e.portion_size || '—', severity: '—', submitter: e.submitter_name, notes: e.notes || '' })),
    ...allSymptoms.map(s => ({ id: s.id, _type: 'symptom', time: s.symptom_time, type: 'symptom', name: s.symptom_type, detail: '—', severity: s.severity, submitter: s.submitter_name, notes: s.notes || '' }))
  ].sort((a, b) => new Date(b.time) - new Date(a.time));

  if (items.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="icon">📭</div><h3>No data</h3></div>';
    return;
  }

  let html = `<table class="data-table">
    <thead><tr>
      <th style="width:40px;"><input type="checkbox" onchange="selectAll()" title="Select all"></th>
      <th>Date/Time (ET)</th><th>Type</th><th>Item</th><th>Portion/Severity</th><th>Submitted By</th><th>Notes</th>
    </tr></thead><tbody>`;

  items.forEach(item => {
    const key = item._type + ':' + item.id;
    const checked = selectedItems.has(key) ? 'checked' : '';
    html += `<tr>
      <td><input type="checkbox" class="item-checkbox" data-key="${key}" ${checked} onchange="toggleSelect('${item._type}','${item.id}')"></td>
      <td>${formatEastern(item.time)}</td>
      <td><span class="badge ${item.type}">${item.type}</span></td>
      <td>${escapeHtml(item.name)}</td>
      <td>${item.type === 'symptom' ? `<span class="badge ${item.severity}">${item.severity}</span>` : escapeHtml(item.detail)}</td>
      <td>${escapeHtml(item.submitter)}</td>
      <td>${escapeHtml(item.notes)}</td>
    </tr>`;
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

// --- Render Symptom-Meal Correlations ---
function renderCorrelations() {
  const container = document.getElementById('correlations-container');

  if (allSymptoms.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="icon">✅</div><h3>No symptoms reported</h3><p>Good news! No symptoms in this date range.</p></div>';
    return;
  }

  const WINDOW_MS = 8 * 60 * 60 * 1000;
  let html = '';

  allSymptoms.forEach(symptom => {
    const symptomTime = new Date(symptom.symptom_time);
    const windowStart = new Date(symptomTime - WINDOW_MS);

    const correlatedMeals = allEntries.filter(entry => {
      const entryTime = new Date(entry.entry_time);
      return entryTime >= windowStart && entryTime <= symptomTime;
    }).sort((a, b) => new Date(b.entry_time) - new Date(a.entry_time));

    html += `
      <div class="card correlation-card" style="margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
          <div>
            <h3 style="margin-bottom:4px;">🩺 ${escapeHtml(symptom.symptom_type)} <span class="badge ${symptom.severity}">${symptom.severity}</span></h3>
            <p style="margin:0;font-size:0.9rem;color:var(--color-text-secondary);">
              ${formatEastern(symptom.symptom_time)} · reported by ${escapeHtml(symptom.submitter_name)}
            </p>
            ${symptom.notes ? `<p style="margin:4px 0 0;font-size:0.85rem;color:var(--color-text-secondary);font-style:italic;">"${escapeHtml(symptom.notes)}"</p>` : ''}
          </div>
        </div>
        <h4 style="margin-top:16px;margin-bottom:8px;color:var(--color-text-secondary);font-size:0.85rem;">
          Meals/Drinks in prior 8 hours (${correlatedMeals.length} found)
        </h4>`;

    if (correlatedMeals.length === 0) {
      html += '<p style="color:var(--color-text-secondary);font-size:0.9rem;margin:0;">No meals logged in the 8 hours before this symptom.</p>';
    } else {
      correlatedMeals.forEach(meal => {
        const diff = timeDiffReadable(meal.entry_time, symptom.symptom_time);
        const emoji = meal.entry_type === 'food' ? '🍕' : '🥤';
        html += `
          <div class="correlation-item">
            <span>${emoji} ${escapeHtml(meal.item_name)} ${meal.portion_size ? `(${meal.portion_size})` : ''} <span class="badge submitter">${escapeHtml(meal.submitter_name)}</span></span>
            <span class="time-since">${diff} before</span>
          </div>`;
      });
    }

    html += '</div>';
  });

  container.innerHTML = html;
}

// --- PDF Export ---
function exportPDF() {
  const start = document.getElementById('filter-start').value;
  const end = document.getElementById('filter-end').value;
  document.getElementById('print-date-range').textContent = `Report period: ${start} to ${end} · Generated ${new Date().toLocaleDateString('en-US')}`;

  // Temporarily hide delete bar and checkboxes for clean PDF
  const deleteBar = document.getElementById('delete-bar');
  const checkboxes = document.querySelectorAll('.item-select-label, .data-table th:first-child, .data-table td:first-child');
  deleteBar.style.display = 'none';
  checkboxes.forEach(el => el.style.display = 'none');

  const element = document.getElementById('dashboard-content');

  const opt = {
    margin: [10, 10, 10, 10],
    filename: `isabelle-tracker-${start}-to-${end}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#0f172a' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  };

  html2pdf().set(opt).from(element).save().then(function() {
    checkboxes.forEach(el => el.style.display = '');
    updateDeleteBar();
  });
}

// --- Utility ---
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
