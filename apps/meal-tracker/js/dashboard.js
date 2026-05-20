// ============================================
// Dashboard Logic — Admin view with correlations & PDF export
// ============================================

let allEntries = [];
let allSymptoms = [];
let currentView = 'timeline';
let selectedItems = new Set();
let activeFilters = new Set();

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

function initDashboard() {
  setQuickFilter('week');
}

function setQuickFilter(range) {
  const now = new Date();
  const etDateStr = now.toLocaleString('en-CA', { timeZone: 'America/New_York' }).split(',')[0];
  const [y, m, d] = etDateStr.split('-').map(Number);
  const end = new Date(y, m - 1, d);
  let start;
  if (range === 'today') { start = new Date(end); }
  else if (range === 'week') { start = new Date(end); start.setDate(start.getDate() - 7); }
  else { start = new Date('2020-01-01'); }
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
    updateActionBar();
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

// --- Stat Card Filtering ---
function toggleFilter(category) {
  if (activeFilters.has(category)) {
    activeFilters.delete(category);
  } else {
    activeFilters.add(category);
  }
  updateFilterUI();
  renderTimeline();
  renderTable();
}

function clearFilters() {
  activeFilters.clear();
  updateFilterUI();
  renderTimeline();
  renderTable();
}

function updateFilterUI() {
  const cards = document.querySelectorAll('.stat-card[data-filter]');
  cards.forEach(card => {
    const filter = card.getAttribute('data-filter');
    if (activeFilters.size === 0) {
      card.classList.remove('active');
    } else {
      card.classList.toggle('active', activeFilters.has(filter));
    }
  });
  const clearBtn = document.getElementById('clear-filters-btn');
  if (clearBtn) {
    clearBtn.style.display = activeFilters.size > 0 ? 'inline-flex' : 'none';
  }
}

function getFilteredItems() {
  let entries = allEntries;
  let symptoms = allSymptoms;
  if (activeFilters.size > 0) {
    entries = allEntries.filter(e => activeFilters.has(e.entry_type));
    symptoms = activeFilters.has('symptom') ? allSymptoms : [];
  }
  return [
    ...entries.map(e => ({ ...e, _type: 'entry', _time: e.entry_time })),
    ...symptoms.map(s => ({ ...s, _type: 'symptom', _time: s.symptom_time }))
  ].sort((a, b) => new Date(b._time) - new Date(a._time));
}

function updateStats() {
  const foods = allEntries.filter(e => e.entry_type === 'food').length;
  const drinks = allEntries.filter(e => e.entry_type === 'drink').length;
  const medicines = allEntries.filter(e => e.entry_type === 'medicine').length;
  const symptoms = allSymptoms.length;
  const people = new Set([...allEntries.map(e => e.submitter_name), ...allSymptoms.map(s => s.submitter_name)]).size;
  document.getElementById('stat-meals').textContent = foods;
  document.getElementById('stat-drinks').textContent = drinks;
  document.getElementById('stat-medicines').textContent = medicines;
  document.getElementById('stat-symptoms').textContent = symptoms;
  document.getElementById('stat-people').textContent = people;
}

function setView(view, btn) {
  currentView = view;
  document.querySelectorAll('.view-toggle button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('timeline-view').style.display = view === 'timeline' ? 'block' : 'none';
  document.getElementById('table-view').style.display = view === 'table' ? 'block' : 'none';
}

function toggleSelect(type, id) {
  const key = type + ':' + id;
  if (selectedItems.has(key)) selectedItems.delete(key);
  else selectedItems.add(key);
  updateActionBar();
  const cb = document.querySelector(`input[data-key="${key}"]`);
  if (cb) cb.checked = selectedItems.has(key);
}

function selectAll() {
  const items = getFilteredItems();
  const allKeys = items.map(i => i._type + ':' + i.id);
  if (selectedItems.size === allKeys.length) selectedItems.clear();
  else allKeys.forEach(k => selectedItems.add(k));
  document.querySelectorAll('.item-checkbox').forEach(cb => { cb.checked = selectedItems.has(cb.dataset.key); });
  updateActionBar();
}

function updateActionBar() {
  const bar = document.getElementById('action-bar');
  const count = selectedItems.size;
  if (count > 0) {
    bar.style.display = 'flex';
    document.getElementById('action-count').textContent = count + ' selected';
    const editBtn = document.getElementById('btn-edit');
    if (editBtn) {
      editBtn.disabled = count !== 1;
      editBtn.title = count === 1 ? 'Edit selected item' : 'Select exactly 1 item to edit';
    }
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
    const db = await getAdminSupabase();
    const promises = [];
    if (entryIds.length > 0) promises.push(db.from('entries').delete().in('id', entryIds));
    if (symptomIds.length > 0) promises.push(db.from('symptoms').delete().in('id', symptomIds));
    const results = await Promise.all(promises);
    const errors = results.filter(r => r.error);
    if (errors.length > 0) throw new Error(errors.map(e => e.error.message).join(', '));
    selectedItems.clear();
    updateActionBar();
    await loadData();
  } catch (err) {
    console.error('Delete error:', err);
    alert('Failed to delete: ' + err.message);
  }
}

// --- Edit Functionality ---
function openEditModal() {
  if (selectedItems.size !== 1) return;
  const key = [...selectedItems][0];
  const [type, id] = key.split(':');
  const modal = document.getElementById('edit-modal');
  const form = document.getElementById('edit-form');
  if (type === 'entry') {
    const item = allEntries.find(e => e.id === id);
    if (!item) return;
    form.innerHTML = `
      <input type="hidden" id="edit-id" value="${item.id}">
      <input type="hidden" id="edit-type" value="entry">
      <div class="form-group">
        <label class="form-label">Item Name</label>
        <input type="text" id="edit-item-name" class="form-input" value="${escapeHtml(item.item_name)}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Type</label>
        <select id="edit-entry-type" class="form-select">
          <option value="food" ${item.entry_type === 'food' ? 'selected' : ''}>Food</option>
          <option value="drink" ${item.entry_type === 'drink' ? 'selected' : ''}>Drink</option>
          <option value="medicine" ${item.entry_type === 'medicine' ? 'selected' : ''}>Medicine</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Portion / Dose</label>
        <input type="text" id="edit-portion" class="form-input" value="${escapeHtml(item.portion_size || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">Submitter</label>
        <input type="text" id="edit-submitter" class="form-input" value="${escapeHtml(item.submitter_name)}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea id="edit-notes" class="form-textarea" rows="2">${escapeHtml(item.notes || '')}</textarea>
      </div>`;
  } else {
    const item = allSymptoms.find(s => s.id === id);
    if (!item) return;
    form.innerHTML = `
      <input type="hidden" id="edit-id" value="${item.id}">
      <input type="hidden" id="edit-type" value="symptom">
      <div class="form-group">
        <label class="form-label">Symptom Type</label>
        <input type="text" id="edit-symptom-type" class="form-input" value="${escapeHtml(item.symptom_type)}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Severity</label>
        <select id="edit-severity" class="form-select">
          <option value="mild" ${item.severity === 'mild' ? 'selected' : ''}>Mild</option>
          <option value="moderate" ${item.severity === 'moderate' ? 'selected' : ''}>Moderate</option>
          <option value="severe" ${item.severity === 'severe' ? 'selected' : ''}>Severe</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Submitter</label>
        <input type="text" id="edit-submitter" class="form-input" value="${escapeHtml(item.submitter_name)}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea id="edit-notes" class="form-textarea" rows="2">${escapeHtml(item.notes || '')}</textarea>
      </div>`;
  }
  modal.style.display = 'flex';
}

function closeEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
}

async function saveEdit() {
  const id = document.getElementById('edit-id').value;
  const type = document.getElementById('edit-type').value;
  const notes = document.getElementById('edit-notes').value.trim() || null;
  const submitter = document.getElementById('edit-submitter').value.trim();
  try {
    const db = await getAdminSupabase();
    let result;
    if (type === 'entry') {
      result = await db.from('entries').update({
        item_name: document.getElementById('edit-item-name').value.trim(),
        entry_type: document.getElementById('edit-entry-type').value,
        portion_size: document.getElementById('edit-portion').value.trim() || null,
        submitter_name: submitter,
        notes: notes
      }).eq('id', id);
    } else {
      result = await db.from('symptoms').update({
        symptom_type: document.getElementById('edit-symptom-type').value.trim(),
        severity: document.getElementById('edit-severity').value,
        submitter_name: submitter,
        notes: notes
      }).eq('id', id);
    }
    if (result.error) throw result.error;
    closeEditModal();
    selectedItems.clear();
    updateActionBar();
    await loadData();
    showToast('Entry updated successfully');
  } catch (err) {
    console.error('Edit error:', err);
    alert('Failed to save: ' + err.message);
  }
}

function showToast(message, type) {
  type = type || 'success';
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast ' + type + ' visible';
  setTimeout(function() { toast.classList.remove('visible'); }, 3000);
}

// --- Render Functions ---
function renderTimeline() {
  const container = document.getElementById('timeline-container');
  const items = getFilteredItems();
  if (items.length === 0) {
    var msg = activeFilters.size > 0 ? 'No entries match the selected filter.' : 'No entries yet';
    container.innerHTML = '<div class="empty-state"><div class="icon">📭</div><h3>' + msg + '</h3></div>';
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
        let typeEmoji, typeClass, mainClass = '';
        if (item.entry_type === 'medicine') {
          typeEmoji = '💊'; typeClass = 'medicine'; mainClass = ' medicine-item';
        } else {
          typeEmoji = item.entry_type === 'food' ? '🍕' : '🥤';
          typeClass = item.entry_type;
        }
        html += `
          <div class="timeline-item${mainClass}">
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

function renderTable() {
  const container = document.getElementById('table-container');
  const items = getFilteredItems().map(i => {
    if (i._type === 'entry') {
      return { id: i.id, _type: 'entry', time: i.entry_time, type: i.entry_type, name: i.item_name, detail: i.portion_size || '\u2014', severity: '\u2014', submitter: i.submitter_name, notes: i.notes || '' };
    } else {
      return { id: i.id, _type: 'symptom', time: i.symptom_time, type: 'symptom', name: i.symptom_type, detail: '\u2014', severity: i.severity, submitter: i.submitter_name, notes: i.notes || '' };
    }
  });
  if (items.length === 0) {
    var msg = activeFilters.size > 0 ? 'No entries match the selected filter.' : 'No data';
    container.innerHTML = '<div class="empty-state"><div class="icon">📭</div><h3>' + msg + '</h3></div>';
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
          Food, drinks & medicine in prior 8 hours (${correlatedMeals.length} found)
        </h4>`;
    if (correlatedMeals.length === 0) {
      html += '<p style="color:var(--color-text-secondary);font-size:0.9rem;margin:0;">No meals logged in the 8 hours before this symptom.</p>';
    } else {
      correlatedMeals.forEach(meal => {
        const diff = timeDiffReadable(meal.entry_time, symptom.symptom_time);
        const emoji = meal.entry_type === 'medicine' ? '💊' : (meal.entry_type === 'food' ? '🍕' : '🥤');
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

function exportPDF() {
  const start = document.getElementById('filter-start').value;
  const end = document.getElementById('filter-end').value;
  document.getElementById('print-date-range').textContent = `Report period: ${start} to ${end} · Generated ${new Date().toLocaleDateString('en-US')}`;
  const actionBar = document.getElementById('action-bar');
  const checkboxes = document.querySelectorAll('.item-select-label, .data-table th:first-child, .data-table td:first-child');
  actionBar.style.display = 'none';
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
    updateActionBar();
  });
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
