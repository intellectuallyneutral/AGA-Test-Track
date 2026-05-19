// ============================================
// Form Logic — Submission form for family members
// ============================================

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  // Auto-fill date/time fields with current Eastern Time
  const now = getCurrentEasternForInput();
  document.getElementById('entry-datetime').value = now;
  document.getElementById('symptom-datetime').value = now;
  document.getElementById('medicine-datetime').value = now;

  // Restore remembered name from localStorage
  const savedName = localStorage.getItem('tracker_submitter_name');
  if (savedName) {
    document.getElementById('entry-name').value = savedName;
    document.getElementById('symptom-name').value = savedName;
    document.getElementById('medicine-name').value = savedName;
  }

  // Sync names between all forms
  const nameFields = ['entry-name', 'symptom-name', 'medicine-name'];
  nameFields.forEach(fieldId => {
    document.getElementById(fieldId).addEventListener('input', (e) => {
      nameFields.forEach(otherId => {
        if (otherId !== fieldId) {
          document.getElementById(otherId).value = e.target.value;
        }
      });
    });
  });

  // Show/hide "other" symptom field
  document.getElementById('symptom-type').addEventListener('change', (e) => {
    const otherGroup = document.getElementById('symptom-other-group');
    otherGroup.style.display = e.target.value === 'other' ? 'block' : 'none';
    if (e.target.value === 'other') {
      document.getElementById('symptom-other').setAttribute('required', 'required');
    } else {
      document.getElementById('symptom-other').removeAttribute('required');
    }
  });

  // Show/hide "other" medicine field
  document.getElementById('medicine-type').addEventListener('change', (e) => {
    const otherGroup = document.getElementById('medicine-other-group');
    otherGroup.style.display = e.target.value === 'other' ? 'block' : 'none';
    if (e.target.value === 'other') {
      document.getElementById('medicine-other').setAttribute('required', 'required');
    } else {
      document.getElementById('medicine-other').removeAttribute('required');
    }
  });
});

// --- Tab Switching ---
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

  document.getElementById('entry-form').style.display = tab === 'entry' ? 'block' : 'none';
  document.getElementById('medicine-form').style.display = tab === 'medicine' ? 'block' : 'none';
  document.getElementById('symptom-form').style.display = tab === 'symptom' ? 'block' : 'none';

  // Refresh datetime for the active tab
  const now = getCurrentEasternForInput();
  if (tab === 'symptom') document.getElementById('symptom-datetime').value = now;
  if (tab === 'medicine') document.getElementById('medicine-datetime').value = now;
}

// --- Severity Selection ---
function selectSeverity(btn, level) {
  document.querySelectorAll('.severity-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('symptom-severity').value = level;
}

// --- Submit Food/Drink Entry ---
async function submitEntry(e) {
  e.preventDefault();

  const name = document.getElementById('entry-name').value.trim();
  const entryType = document.querySelector('input[name="entry-type"]:checked').value;
  const item = document.getElementById('entry-item').value.trim();
  const portion = document.getElementById('entry-portion').value;
  const datetime = document.getElementById('entry-datetime').value;
  const notes = document.getElementById('entry-notes').value.trim();

  if (!name || !item || !datetime) {
    showToast('Please fill in all required fields', 'error');
    return;
  }

  // Save name for next time
  localStorage.setItem('tracker_submitter_name', name);

  // Convert Eastern input to UTC ISO
  const entryTimeISO = easternInputToISO(datetime);

  setSubmitting('entry', true);

  try {
    const db = await getSupabase();
    const { error } = await db.from('entries').insert({
      entry_time: entryTimeISO,
      submitter_name: name,
      entry_type: entryType,
      item_name: item,
      portion_size: portion || null,
      notes: notes || null
    });

    if (error) throw error;

    showSuccess();
    // Reset form but keep name and datetime
    document.getElementById('entry-item').value = '';
    document.getElementById('entry-portion').value = '';
    document.getElementById('entry-notes').value = '';
    document.getElementById('entry-datetime').value = getCurrentEasternForInput();
  } catch (err) {
    console.error('Submit error:', err);
    showToast('Something went wrong. Please try again.', 'error');
  } finally {
    setSubmitting('entry', false);
  }
}

// --- Submit Medicine ---
async function submitMedicine(e) {
  e.preventDefault();

  const name = document.getElementById('medicine-name').value.trim();
  let medicineName = document.getElementById('medicine-type').value;
  const dose = document.getElementById('medicine-dose').value.trim();
  const datetime = document.getElementById('medicine-datetime').value;
  const notes = document.getElementById('medicine-notes').value.trim();

  if (medicineName === 'other') {
    medicineName = document.getElementById('medicine-other').value.trim();
    if (!medicineName) {
      showToast('Please specify the medicine name', 'error');
      return;
    }
  }

  if (!name || !medicineName || !datetime) {
    showToast('Please fill in all required fields', 'error');
    return;
  }

  localStorage.setItem('tracker_submitter_name', name);

  const entryTimeISO = easternInputToISO(datetime);

  setSubmitting('medicine', true);

  try {
    const db = await getSupabase();
    const { error } = await db.from('entries').insert({
      entry_time: entryTimeISO,
      submitter_name: name,
      entry_type: 'medicine',
      item_name: medicineName,
      portion_size: dose || null,
      notes: notes || null
    });

    if (error) throw error;

    showSuccess();
    // Reset form but keep name, medicine type, and datetime
    document.getElementById('medicine-dose').value = '';
    document.getElementById('medicine-notes').value = '';
    document.getElementById('medicine-datetime').value = getCurrentEasternForInput();
  } catch (err) {
    console.error('Submit error:', err);
    showToast('Something went wrong. Please try again.', 'error');
  } finally {
    setSubmitting('medicine', false);
  }
}

// --- Submit Symptom ---
async function submitSymptom(e) {
  e.preventDefault();

  const name = document.getElementById('symptom-name').value.trim();
  let symptomType = document.getElementById('symptom-type').value;
  const severity = document.getElementById('symptom-severity').value;
  const datetime = document.getElementById('symptom-datetime').value;
  const notes = document.getElementById('symptom-notes').value.trim();

  if (symptomType === 'other') {
    symptomType = document.getElementById('symptom-other').value.trim();
    if (!symptomType) {
      showToast('Please describe the symptom', 'error');
      return;
    }
  }

  if (!name || !symptomType || !severity || !datetime) {
    showToast('Please fill in all required fields (including severity)', 'error');
    return;
  }

  localStorage.setItem('tracker_submitter_name', name);

  const symptomTimeISO = easternInputToISO(datetime);

  setSubmitting('symptom', true);

  try {
    const db = await getSupabase();
    const { error } = await db.from('symptoms').insert({
      symptom_time: symptomTimeISO,
      submitter_name: name,
      symptom_type: symptomType,
      severity: severity,
      notes: notes || null
    });

    if (error) throw error;

    showSuccess();
    // Reset form
    document.getElementById('symptom-type').value = '';
    document.getElementById('symptom-other-group').style.display = 'none';
    document.getElementById('symptom-severity').value = '';
    document.querySelectorAll('.severity-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('symptom-notes').value = '';
    document.getElementById('symptom-datetime').value = getCurrentEasternForInput();
  } catch (err) {
    console.error('Submit error:', err);
    showToast('Something went wrong. Please try again.', 'error');
  } finally {
    setSubmitting('symptom', false);
  }
}

// --- UI Helpers ---
function setSubmitting(formType, isSubmitting) {
  const btn = document.getElementById(`btn-submit-${formType}`);
  const text = document.getElementById(`${formType}-btn-text`);
  const spinner = document.getElementById(`${formType}-spinner`);

  btn.disabled = isSubmitting;
  text.style.display = isSubmitting ? 'none' : 'inline';
  spinner.style.display = isSubmitting ? 'inline' : 'none';
}

function showSuccess() {
  const overlay = document.getElementById('success-overlay');
  overlay.classList.add('visible');
  setTimeout(() => overlay.classList.remove('visible'), 1800);
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} visible`;
  setTimeout(() => toast.classList.remove('visible'), 3000);
}
