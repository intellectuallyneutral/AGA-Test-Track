#!/usr/bin/env node
// ============================================================
// Weekly Report Email — Isabelle's Meal & Symptom Tracker
// ============================================================
// Runs via GitHub Actions every Friday at 6 PM ET.
// Queries Supabase → generates HTML email → sends via Gmail SMTP.
// Zero external dependencies beyond nodemailer.
// ============================================================

const nodemailer = require('nodemailer');

// --- Configuration from environment ---
const SUPABASE_URL = 'https://exztnkqtsbelwbcyznei.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL || 'zen.hannah1113@gmail.com';

// --- Main ---
async function main() {
  console.log('=== Isabelle Weekly Report ===');
  console.log(`Recipient: ${RECIPIENT_EMAIL}`);
  console.log(`Time: ${new Date().toISOString()}`);

  // Validate env
  if (!SUPABASE_KEY || !GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.error('Missing required environment variables.');
    console.error('Need: SUPABASE_SERVICE_KEY, GMAIL_USER, GMAIL_APP_PASSWORD');
    process.exit(1);
  }

  // Calculate date range (last 7 days)
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const startISO = weekAgo.toISOString();
  const endISO = now.toISOString();

  console.log(`Date range: ${startISO} to ${endISO}`);

  // Query Supabase
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
  };

  const [entriesRes, symptomsRes] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/entries?entry_time=gte.${startISO}&entry_time=lte.${endISO}&order=entry_time.desc`, { headers }),
    fetch(`${SUPABASE_URL}/rest/v1/symptoms?symptom_time=gte.${startISO}&symptom_time=lte.${endISO}&order=symptom_time.desc`, { headers }),
  ]);

  if (!entriesRes.ok) throw new Error(`Supabase entries error: ${entriesRes.status}`);
  if (!symptomsRes.ok) throw new Error(`Supabase symptoms error: ${symptomsRes.status}`);

  const entries = await entriesRes.json();
  const symptoms = await symptomsRes.json();

  console.log(`Found ${entries.length} entries, ${symptoms.length} symptoms`);

  // Generate email
  const html = generateEmailHTML(entries, symptoms, weekAgo, now);
  const subject = `Isabelle's Weekly Report - ${formatDateShort(weekAgo)} to ${formatDateShort(now)}`;

  // Send via Gmail SMTP
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });

  const info = await transporter.sendMail({
    from: `"Isabelle's Tracker" <${GMAIL_USER}>`,
    to: RECIPIENT_EMAIL,
    subject: subject,
    html: html,
  });

  console.log(`Email sent: ${info.messageId}`);
  console.log('=== Done ===');
}

// --- Date Formatting ---
function formatDateShort(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' });
}

function formatDateTime(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York',
  });
}

function formatDateOnly(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/New_York',
  });
}

function formatTimeOnly(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York',
  });
}

// --- Correlation Analysis ---
function findCorrelations(entries, symptoms) {
  const WINDOW_MS = 8 * 60 * 60 * 1000;
  const correlations = [];

  symptoms.forEach(symptom => {
    const symptomTime = new Date(symptom.symptom_time);
    const windowStart = new Date(symptomTime - WINDOW_MS);

    const relatedMeals = entries.filter(entry => {
      const entryTime = new Date(entry.entry_time);
      return entryTime >= windowStart && entryTime <= symptomTime;
    });

    correlations.push({ symptom, meals: relatedMeals });
  });

  return correlations;
}

// --- HTML Email Generator ---
function generateEmailHTML(entries, symptoms, startDate, endDate) {
  const foods = entries.filter(e => e.entry_type === 'food');
  const drinks = entries.filter(e => e.entry_type === 'drink');
  const correlations = findCorrelations(entries, symptoms);

  const grouped = {};
  const allItems = [
    ...entries.map(e => ({ ...e, _type: 'entry', _time: e.entry_time })),
    ...symptoms.map(s => ({ ...s, _type: 'symptom', _time: s.symptom_time })),
  ].sort((a, b) => new Date(b._time) - new Date(a._time));

  allItems.forEach(item => {
    const dateKey = formatDateOnly(item._time);
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(item);
  });

  let dailyLogHTML = '';
  if (Object.keys(grouped).length === 0) {
    dailyLogHTML = '<p style="color:#94a3b8;text-align:center;padding:24px;">No entries this week.</p>';
  } else {
    for (const [date, items] of Object.entries(grouped)) {
      dailyLogHTML += '<div style="margin-bottom:20px;">';
      dailyLogHTML += '<div style="font-weight:600;font-size:14px;color:#3b82f6;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">' + date + '</div>';
      for (const item of items) {
        if (item._type === 'entry') {
          const emoji = item.entry_type === 'food' ? '&#x1F355;' : '&#x1F964;';
          const bgColor = item.entry_type === 'food' ? '#eff6ff' : '#f5f3ff';
          const badgeColor = item.entry_type === 'food' ? '#3b82f6' : '#7c3aed';
          dailyLogHTML += '<div style="background:' + bgColor + ';border-radius:8px;padding:12px 16px;margin-bottom:6px;border-left:3px solid ' + badgeColor + ';">';
          dailyLogHTML += '<div><span style="font-weight:600;color:#1e293b;">' + emoji + ' ' + escapeHtml(item.item_name) + '</span></div>';
          dailyLogHTML += '<div style="font-size:12px;color:#64748b;margin-top:4px;">' + formatTimeOnly(item.entry_time);
          if (item.portion_size) dailyLogHTML += ' &middot; ' + item.portion_size;
          dailyLogHTML += ' &middot; by ' + escapeHtml(item.submitter_name) + '</div>';
          if (item.notes) dailyLogHTML += '<div style="font-size:12px;color:#94a3b8;margin-top:4px;font-style:italic;">' + escapeHtml(item.notes) + '</div>';
          dailyLogHTML += '</div>';
        } else {
          const severityColor = item.severity === 'severe' ? '#ef4444' : item.severity === 'moderate' ? '#f59e0b' : '#22c55e';
          dailyLogHTML += '<div style="background:#fef2f2;border-radius:8px;padding:12px 16px;margin-bottom:6px;border-left:3px solid ' + severityColor + ';">';
          dailyLogHTML += '<span style="font-weight:600;color:#1e293b;">&#x1FA7A; ' + escapeHtml(item.symptom_type) + '</span>';
          dailyLogHTML += ' <span style="display:inline-block;background:' + severityColor + ';color:white;padding:1px 8px;border-radius:12px;font-size:11px;font-weight:600;margin-left:8px;">' + item.severity + '</span>';
          dailyLogHTML += '<div style="font-size:12px;color:#64748b;margin-top:4px;">' + formatTimeOnly(item.symptom_time) + ' &middot; by ' + escapeHtml(item.submitter_name) + '</div>';
          if (item.notes) dailyLogHTML += '<div style="font-size:12px;color:#94a3b8;margin-top:4px;font-style:italic;">' + escapeHtml(item.notes) + '</div>';
          dailyLogHTML += '</div>';
        }
      }
      dailyLogHTML += '</div>';
    }
  }

  let correlationHTML = '';
  if (symptoms.length > 0) {
    correlationHTML = '<tr><td style="padding:0 24px;"><h2 style="margin:0 0 16px;font-size:18px;color:#1e293b;border-bottom:2px solid #e2e8f0;padding-bottom:8px;">&#x1F517; Symptom &harr; Meal Correlations</h2></td></tr>';
    correlationHTML += '<tr><td style="padding:0 24px 24px;"><p style="font-size:13px;color:#94a3b8;margin:0 0 16px;">Meals/drinks consumed within 8 hours before each symptom.</p>';
    for (const c of correlations) {
      const sevColor = c.symptom.severity === 'severe' ? '#ef4444' : c.symptom.severity === 'moderate' ? '#f59e0b' : '#22c55e';
      correlationHTML += '<div style="background:#fffbeb;border-left:3px solid #f59e0b;border-radius:8px;padding:12px 16px;margin-bottom:12px;">';
      correlationHTML += '<div style="font-weight:600;color:#1e293b;">&#x1FA7A; ' + escapeHtml(c.symptom.symptom_type) + ' <span style="color:' + sevColor + ';font-size:12px;">(' + c.symptom.severity + ')</span></div>';
      correlationHTML += '<div style="font-size:12px;color:#64748b;">' + formatDateTime(c.symptom.symptom_time) + '</div>';
      if (c.meals.length === 0) {
        correlationHTML += '<div style="font-size:13px;color:#94a3b8;margin-top:8px;">No meals in prior 8 hours.</div>';
      } else {
        correlationHTML += '<div style="margin-top:8px;">';
        for (const m of c.meals) {
          const mEmoji = m.entry_type === 'food' ? '&#x1F355;' : '&#x1F964;';
          const timeDiff = getTimeDiff(m.entry_time, c.symptom.symptom_time);
          correlationHTML += '<div style="font-size:13px;color:#475569;padding:4px 0;border-bottom:1px solid #fef3c7;">' + mEmoji + ' ' + escapeHtml(m.item_name) + (m.portion_size ? ' (' + m.portion_size + ')' : '') + ' &mdash; <span style="color:#f59e0b;font-weight:500;">' + timeDiff + ' before</span></div>';
        }
        correlationHTML += '</div>';
      }
      correlationHTML += '</div>';
    }
    correlationHTML += '</td></tr>';
  } else {
    correlationHTML = '<tr><td style="padding:0 24px 24px;text-align:center;"><div style="background:#f0fdf4;border-radius:12px;padding:24px;"><div style="font-size:32px;">&#x2705;</div><div style="font-weight:600;color:#22c55e;margin-top:8px;">No Symptoms This Week!</div><div style="font-size:13px;color:#94a3b8;margin-top:4px;">Great news &mdash; no symptoms were reported.</div></div></td></tr>';
  }

  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>'
    + '<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif;">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;">'
    + '<tr><td align="center" style="padding:24px 16px;">'
    + '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">'
    + '<tr><td style="background:linear-gradient(135deg,#3b82f6,#7c3aed);padding:32px 24px;text-align:center;">'
    + '<h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">&#x1F4CB; Isabelle\'s Weekly Report</h1>'
    + '<p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">' + formatDateShort(startDate) + ' &mdash; ' + formatDateShort(endDate) + '</p>'
    + '</td></tr>'
    + '<tr><td style="padding:24px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>'
    + '<td width="25%" align="center" style="padding:12px 4px;"><div style="background:#eff6ff;border-radius:12px;padding:16px 8px;"><div style="font-size:28px;font-weight:700;color:#3b82f6;">' + foods.length + '</div><div style="font-size:12px;color:#64748b;margin-top:4px;">Foods</div></div></td>'
    + '<td width="25%" align="center" style="padding:12px 4px;"><div style="background:#f5f3ff;border-radius:12px;padding:16px 8px;"><div style="font-size:28px;font-weight:700;color:#7c3aed;">' + drinks.length + '</div><div style="font-size:12px;color:#64748b;margin-top:4px;">Drinks</div></div></td>'
    + '<td width="25%" align="center" style="padding:12px 4px;"><div style="background:' + (symptoms.length > 0 ? '#fef2f2' : '#f0fdf4') + ';border-radius:12px;padding:16px 8px;"><div style="font-size:28px;font-weight:700;color:' + (symptoms.length > 0 ? '#ef4444' : '#22c55e') + ';">' + symptoms.length + '</div><div style="font-size:12px;color:#64748b;margin-top:4px;">Symptoms</div></div></td>'
    + '<td width="25%" align="center" style="padding:12px 4px;"><div style="background:#f0fdf4;border-radius:12px;padding:16px 8px;"><div style="font-size:28px;font-weight:700;color:#22c55e;">' + allItems.length + '</div><div style="font-size:12px;color:#64748b;margin-top:4px;">Total</div></div></td>'
    + '</tr></table></td></tr>'
    + '<tr><td style="padding:0 24px;"><h2 style="margin:0 0 16px;font-size:18px;color:#1e293b;border-bottom:2px solid #e2e8f0;padding-bottom:8px;">&#x1F4C5; Daily Activity Log</h2></td></tr>'
    + '<tr><td style="padding:0 24px 24px;">' + dailyLogHTML + '</td></tr>'
    + correlationHTML
    + '<tr><td style="background:#f8fafc;padding:20px 24px;text-align:center;border-top:1px solid #e2e8f0;"><p style="margin:0;font-size:12px;color:#94a3b8;">This report was generated automatically by Isabelle\'s Meal Tracker.<br><a href="https://intellectuallyneutral.github.io/AGA-Test-Track/apps/meal-tracker/dashboard.html" style="color:#3b82f6;text-decoration:none;">View Full Dashboard &rarr;</a></p></td></tr>'
    + '</table></td></tr></table></body></html>';
}

// --- Utilities ---
function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getTimeDiff(startISO, endISO) {
  const diffMs = new Date(endISO) - new Date(startISO);
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours === 0) return mins + 'm';
  if (mins === 0) return hours + 'h';
  return hours + 'h ' + mins + 'm';
}

// --- Run ---
main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
