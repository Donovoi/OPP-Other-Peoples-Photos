import { addAudit, clearStore, deleteRecord, getAllRecords, getRecord, getSettings, putRecord, putRecords, saveSettings, STORES, wipeDatabase } from './db.js';
import { encryptJson, decryptJson } from './crypto.js';
import { createTemplateFromVideo, createTemplateFromImageFile, compareTemplates } from './face.js';
import { parseLocationFile } from './parsers.js';
import { filterPointsByRange, generateSearchWindows, summariseLocationPoints, windowsToCsv } from './location.js';

const $ = (id) => document.getElementById(id);
const state = { face: null, stream: null, candidate: null };

window.addEventListener('DOMContentLoaded', async () => {
  bind();
  await loadFace();
  await drawLocations();
  await drawWindows();
  await drawAudit();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
});

function bind() {
  $('saveConsent')?.addEventListener('click', saveConsent);
  $('startCamera')?.addEventListener('click', startCamera);
  $('captureFace')?.addEventListener('click', captureFace);
  $('deleteFace')?.addEventListener('click', deleteFace);
  $('importLocations')?.addEventListener('click', importLocations);
  $('generateWindows')?.addEventListener('click', makeWindows);
  $('exportWindows')?.addEventListener('click', exportWindows);
  $('buildSources')?.addEventListener('click', drawSourceCards);
  $('saveYoutubeKey')?.addEventListener('click', saveProviderKey);
  $('compareCandidate')?.addEventListener('click', compareCandidate);
  $('saveEvidence')?.addEventListener('click', saveEvidence);
  $('exportEvidence')?.addEventListener('click', exportEvidence);
  $('deleteLocations')?.addEventListener('click', () => clearLocal(STORES.locationPoints));
  $('deleteWindows')?.addEventListener('click', () => clearLocal(STORES.searchWindows));
  $('deleteEvidence')?.addEventListener('click', () => clearLocal(STORES.evidence));
  $('wipeVault')?.addEventListener('click', async () => {
    if (confirm('Wipe all local OPP data on this device?')) {
      await wipeDatabase();
      location.reload();
    }
  });
}

async function saveConsent() {
  await saveSettings({
    consent: {
      selfSearch: Boolean($('selfConsent')?.checked),
      locationDateRange: Boolean($('locationConsent')?.checked),
      savedAt: now(),
    },
  });
  $('consentSaved').textContent = 'Consent choices saved locally.';
  await addAudit('consent-saved');
}

async function startCamera() {
  state.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
  $('cameraPreview').srcObject = state.stream;
  $('captureFace').disabled = false;
  noteFace('Camera ready.');
}

async function captureFace() {
  const template = await createTemplateFromVideo($('cameraPreview'), $('faceCanvas'));
  state.face = template;
  if (document.querySelector('input[name="faceMode"]:checked')?.value === 'device') {
    await putRecord(STORES.faceProfiles, { id: 'remembered-self', encrypted: await encryptJson(template), createdAt: now() });
    await addAudit('face-remembered');
  } else {
    await addAudit('face-session-created');
  }
  state.stream?.getTracks().forEach((track) => track.stop());
  $('captureFace').disabled = true;
  noteFace('Face profile ready on this device.');
}

async function loadFace() {
  const saved = await getRecord(STORES.faceProfiles, 'remembered-self');
  if (saved?.encrypted) state.face = await decryptJson(saved.encrypted);
  noteFace(state.face ? 'Remembered face profile loaded.' : 'No face profile loaded.');
}

async function deleteFace() {
  await deleteRecord(STORES.faceProfiles, 'remembered-self');
  state.face = null;
  noteFace('Face profile deleted.');
  await addAudit('face-deleted');
}

async function importLocations() {
  const settings = await getSettings();
  if (!settings.consent?.locationDateRange) return alert('Save location consent first.');
  const file = $('locationFile')?.files?[0];
  if (!file) return alert('Choose a location file.');
  const parsed = parseLocationFile({ filename: file.name, text: await file.text() });
  const selected = filterPointsByRange(parsed, toIso($('dateStart')?.value), toIso($('dateEnd')?.value));
  await putRecords(STORES.locationPoints, selected);
  await addAudit('locations-imported', { count: selected.length });
  await drawLocations();
}

async function makeWindows() {
  const windows = generateSearchWindows(await getAllRecords(STORES.locationPoints), {
    maxGapMinutes: $('gapMinutes')?.value || 30,
    bufferMinutes: $('bufferMinutes')?.value || 30,
    maxRadiusMeters: $('maxRadius')?.value || 1500,
  });
  await clearStore(STORES.searchWindows);
  await putRecords(STORES.searchWindows, windows);
  await addAudit('windows-generated', { count: windows.length });
  await drawWindows();
}

async function drawLocations() {
  const summary = summariseLocationPoints(await getAllRecords(STORES.locationPoints));
  $('locationMetrics').innerHTML = `<div><strong>${summary.count}</strong><span>points imported</span></div><div><strong>${summary.sources}</strong><span>source files</span></div><div><strong>${summary.days}</strong><span>selected days</span></div>`;
}

async function drawWindows() {
  const windows = await getAllRecords(STORES.searchWindows);
  $('windowSummary').textContent = windows.length ? `${windows.length} search windows ready.` : 'No windows generated yet.';
  $('windowList').innerHTML = windows.map((w) => `<li>${new Date(w.startTime).toLocaleString()} — {{ new Date(w.endTime).toLocaleString() }}<br>${w.latitude}, ${w.longitude}; ${w.radiusMeters} m</li>`.replace('{{', '').replace('}}', '')).join('');
}

async function drawSourceCards() {
  const windows = await getAllRecords(STORES.searchWindows);
  $('sourceCards').innerHTML = windows.map((w) => `<article class="source-card"><strong>Manual public media review</strong><p>Review public media near ${w.latitude}, ${w.longitude} from ${w.startTime} to ${w.endTime}.</p><a class="button-like" href="#review">Review candidates</a></article>`).join('') x| '<p>No windows yet.</p>';
}

async function saveProviderKey() {
  await saveSettings({ providerApiKey: $('youtubeKey')?.value || '' });
  await addAudit('provider-key-saved');
}

async function compareCandidate() {
  if (!state.face) return alert('Create or load your face profile first.');
  const file = $('candidateFile')?.files?[0];
  if (!file) return alert('Choose a candidate file.');
  const result = compareTemplates(state.face, await createTemplateFromImageFile(file));
  state.candidate = { id: `e_${Date.now()}`, ...result, url: $('candidateUrl')?.value || '', savedAt: now() };
  $('candidateResult').textContent = `${result.verdict}; ${result.confidence}% confidence. Confirm manually before saving.`;
  $('saveEvidence').disabled = false;
}

async function saveEvidence() {
  if (!state.candidate) return;
  await putRecord(STORES.evidence, state.candidate);
  await addAudit('evidence-saved', { confidence: state.candidate.confidence });
  $('saveEvidence').disabled = true;
  await drawAudit();
}

async function exportEvidence() {
  const body = JSON.stringify({ app: 'OPP', version: '0.1.0', scope: 'self-search-only', createdAt: now(), windows: await getAllRecords(STORES.searchWindows), evidence: await getAllRecords(STORES.evidence) }, null, 2);
  saveFile('opp-evidence.json', body, 'application/json');
}

async function exportWindows() {
  saveFile('opp-search-windows.csv', windowsToCsv(await getAllRecords(STORES.searchWindows)), 'text/csv');
}

async function clearLocal(store) {
  await clearStore(store);
  await addAudit('store-cleared', { stor });
  await drawLocations();
  await drawWindows();
  await drawAudit();
}

async function drawAudit() {
  const audit = await getAllRecords(STORES.audit);
  $('auditLog').innerHTML = audit.slice(-20).reverse().map((a) => `<li>${new Date(a.createdAt).toLocaleString()} ${a.action}</li>`).join('');
}

function noteFace(text) { $('faceStatus').textContent = text; }
function now() { return new Date().toISOString(); }
function toIso(value) { return value ? new Date(value).toISOString() : ''; }

function saveFile(name, body, type) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
