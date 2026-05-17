// ============================================
// Timezone Utilities — All times stored as UTC,
// displayed in Eastern Time
// ============================================

const EASTERN_TZ = 'America/New_York';

function getCurrentEasternForInput() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: EASTERN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(now);

  const get = (type) => parts.find(p => p.type === type)?.value || '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

function easternInputToISO(datetimeLocalValue) {
  const [datePart] = datetimeLocalValue.split('T');
  const testDate = new Date(datePart + 'T12:00:00Z');
  const utcHour = testDate.getUTCHours();
  const etStr = new Intl.DateTimeFormat('en-US', {
    timeZone: EASTERN_TZ,
    hour: 'numeric',
    hour12: false
  }).format(testDate);
  const etHour = parseInt(etStr);
  let offset = utcHour - etHour;
  if (offset < 0) offset += 24;
  if (offset > 12) offset -= 24;

  const offsetStr = `-${String(offset).padStart(2, '0')}:00`;
  return new Date(datetimeLocalValue + ':00' + offsetStr).toISOString();
}

function formatEastern(isoString) {
  return new Date(isoString).toLocaleString('en-US', {
    timeZone: EASTERN_TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function formatEasternDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-US', {
    timeZone: EASTERN_TZ,
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatEasternTime(isoString) {
  return new Date(isoString).toLocaleTimeString('en-US', {
    timeZone: EASTERN_TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function timeDiffReadable(earlierISO, laterISO) {
  const diffMs = new Date(laterISO) - new Date(earlierISO);
  const totalMin = Math.round(diffMs / 60000);
  if (totalMin < 1) return 'just now';
  if (totalMin < 60) return `${totalMin}m`;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
