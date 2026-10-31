/**
 * NusaTrails lead pipeline (Google Apps Script, bound to the Google Sheet).
 * Receives a request from the website server (Cloudflare Pages Function),
 * creates the reference number, appends a row, notifies the team on Telegram.
 * Setup steps: backend/README.md
 */
const SHEET_NAME = 'Requests';
const HEADERS = ['reference','created_at','status','handled_by','type','trip_slug','trip_name','start_date','participants','accommodation','pickup_area','hotel_name','full_name','whatsapp','email','notes','source_page','consent_at','telegram_status'];

/** Run once from the editor. Creates the sheet, headers, text format and placeholder properties. */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) { sh.appendRow(HEADERS); sh.setFrozenRows(1); }
  // Plain-text format keeps "+62..." numbers intact and stops formula injection ("=...").
  sh.getRange(1, 1, sh.getMaxRows(), HEADERS.length).setNumberFormat('@');
  const props = PropertiesService.getScriptProperties();
  ['SHARED_SECRET', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'].forEach(function (k) {
    if (!props.getProperty(k)) props.setProperty(k, 'CHANGE_ME');
  });
}

function doGet() { return json_({ ok: true, service: 'nusatrails-lead' }); }

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const props = PropertiesService.getScriptProperties();
    const d = JSON.parse(e.postData.contents);
    if (!d || d.secret !== props.getProperty('SHARED_SECRET')) return json_({ ok: false, error: 'unauthorized' });
    const problem = validate_(d);
    if (problem) return json_({ ok: false, error: problem });

    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const reference = nextReference_(sh);
    const now = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
    sh.appendRow([reference, now, 'New', '', d.type, d.trip_slug || '', d.trip_name || '', d.start_date || '',
      d.participants || '', d.accommodation || '', d.pickup_area || '', d.hotel_name || '', d.full_name,
      d.whatsapp, d.email || '', d.notes || '', d.source_page || '', now, '']);
    const row = sh.getLastRow();
    const status = notifyTelegram_(reference, d);
    sh.getRange(row, HEADERS.indexOf('telegram_status') + 1).setValue(status);
    return json_({ ok: true, reference: reference });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'server_error' });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function validate_(d) {
  if (['booking', 'question'].indexOf(d.type) < 0) return 'bad_type';
  if (!d.full_name || String(d.full_name).length > 100) return 'bad_name';
  if (!/^\+[1-9]\d{7,14}$/.test(String(d.whatsapp || ''))) return 'bad_whatsapp';
  if (d.consent !== true) return 'no_consent';
  if (String(d.notes || '').length > 1000) return 'notes_too_long';
  if (d.type === 'booking') {
    if (!d.trip_slug) return 'no_trip';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d.start_date || ''))) return 'bad_date';
    const isMoreThanFour = String(d.participants || '').trim().toLowerCase() === 'more than 4';
    const n = parseInt(d.participants, 10);
    if (!isMoreThanFour && !(n >= 1 && n <= 20)) return 'bad_participants';
  }
  return '';
}

/** NT-YYMMDD-NN: date plus a daily counter. Called under the script lock, so numbers never repeat. */
function nextReference_(sh) {
  const prefix = 'NT-' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyMMdd') + '-';
  let n = 0;
  const last = sh.getLastRow();
  if (last > 1) {
    sh.getRange(2, 1, last - 1, 1).getValues().forEach(function (r) {
      const v = String(r[0]);
      if (v.indexOf(prefix) === 0) { const k = parseInt(v.slice(prefix.length), 10); if (k > n) n = k; }
    });
  }
  return prefix + String(n + 1).padStart(2, '0');
}

function notifyTelegram_(reference, d) {
  const p = PropertiesService.getScriptProperties();
  const token = p.getProperty('TELEGRAM_BOT_TOKEN'), chat = p.getProperty('TELEGRAM_CHAT_ID');
  if (!token || token === 'CHANGE_ME') return 'not_configured';
  const wa = 'https://wa.me/' + String(d.whatsapp).replace(/\D/g, '') + '?text=' +
    encodeURIComponent('Hello ' + d.full_name + ', this is NusaTrails about your request ' + reference + '.');
  const lines = ['<b>New ' + (d.type === 'booking' ? 'booking request' : 'question') + '</b> ' + esc_(reference)];
  if (d.type === 'booking') {
    lines.push('Trip: ' + esc_(d.trip_name || d.trip_slug), 'Start: ' + esc_(d.start_date), 'People: ' + esc_(d.participants),
      'Stay: ' + esc_(d.accommodation || '-'), 'Pick-up: ' + esc_((d.pickup_area || '-') + (d.hotel_name ? ' / ' + d.hotel_name : '')));
  }
  lines.push('Name: ' + esc_(d.full_name), 'WhatsApp: ' + esc_(d.whatsapp), 'Notes: ' + esc_(d.notes || '-'), '<a href="' + wa + '">Open WhatsApp chat</a>');
  try {
    const res = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      payload: JSON.stringify({ chat_id: chat, text: lines.join('\n'), parse_mode: 'HTML', disable_web_page_preview: true })
    });
    return res.getResponseCode() === 200 ? 'sent' : 'error_' + res.getResponseCode();
  } catch (e) { return 'error_exception'; }
}

/** Optional: add a time-driven trigger (daily, 08:00) for this function. */
function dailyReminder() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sh || sh.getLastRow() < 2) return;
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, HEADERS.length).getValues()
    .filter(function (r) { return r[HEADERS.indexOf('status')] === 'New'; });
  if (!rows.length) return;
  const p = PropertiesService.getScriptProperties();
  const text = '<b>' + rows.length + ' request(s) still marked New</b>\n' + rows.map(function (r) {
    return esc_(r[0]) + ' · ' + esc_(r[HEADERS.indexOf('full_name')]) + ' · ' + esc_(r[HEADERS.indexOf('trip_name')] || r[HEADERS.indexOf('type')]);
  }).join('\n');
  UrlFetchApp.fetch('https://api.telegram.org/bot' + p.getProperty('TELEGRAM_BOT_TOKEN') + '/sendMessage', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({ chat_id: p.getProperty('TELEGRAM_CHAT_ID'), text: text, parse_mode: 'HTML' })
  });
}

function esc_(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
