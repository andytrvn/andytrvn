// =============================================================
// Persistent dashboard top bar.
// Drop this on any page with:
//     <script src="topbar.js" defer></script>
// It self-injects HTML + CSS, reads progress from the same
// localStorage keys the dashboard's tabs already use, and syncs
// the *entire* localStorage state to a hidden file in the signed-in
// user's Google Drive (appDataFolder) so the same data shows up on
// every device. Nothing else on any page needs to change — this
// file wraps localStorage.setItem/removeItem globally.
// =============================================================
(function () {
  'use strict';

  // -------- CSS --------
  const css = `
.topbar {
  position: sticky; top: 0; z-index: 40;
  display: flex; gap: 6px;
  padding: max(10px, env(safe-area-inset-top)) 14px 10px;
  /* Fully opaque so each page's body background can't bleed through
     and tint the bar a different color. Matches the dashboard's base
     dark background so the bar feels continuous with the page chrome. */
  background: #0a0a0b;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
}
.topbar-pill {
  flex: 1 1 0; min-width: 0;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 11px;
  text-decoration: none;
  color: #FAFAFA;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s, border-color 0.15s;
}
.topbar-pill:hover { background: rgba(255, 255, 255, 0.07); border-color: rgba(255, 255, 255, 0.10); }
.topbar-pill-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #6ee7b7; flex-shrink: 0;
}
.topbar-pill.warn .topbar-pill-dot { background: #fbbf24; }
.topbar-pill.miss .topbar-pill-dot {
  background: #ff8a8a;
  animation: topbar-miss-pulse 1.6s ease-in-out infinite;
}
@keyframes topbar-miss-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
  50%      { box-shadow: 0 0 0 5px rgba(239, 68, 68, 0); }
}
.topbar-pill-label {
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
}
.topbar-pill-count {
  margin-left: auto;
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 12px; font-weight: 700;
  color: #FAFAFA;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.topbar-water-wrap {
  flex: 1 1 0; min-width: 0;
  display: flex;
}
.topbar-water-pill {
  flex: 1; min-width: 0;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 12px;
  background: rgba(125, 211, 252, 0.07);
  border: 1px solid rgba(125, 211, 252, 0.14);
  border-right: none;
  border-radius: 11px 0 0 11px;
  text-decoration: none;
  color: #FAFAFA;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s;
}
.topbar-water-pill:hover { background: rgba(125, 211, 252, 0.12); }
.topbar-water-pill .topbar-pill-dot { background: #7DD3FC; }
.topbar-water-add {
  flex: 0 0 auto;
  width: 38px;
  border: 1px solid rgba(125, 211, 252, 0.14);
  background: linear-gradient(180deg, rgba(125, 211, 252, 0.22), rgba(110, 231, 183, 0.22));
  color: #FFFFFF;
  font-family: inherit; font-size: 17px; font-weight: 700;
  cursor: pointer;
  border-radius: 0 11px 11px 0;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s, transform 0.10s;
}
.topbar-water-add:hover {
  background: linear-gradient(180deg, rgba(125, 211, 252, 0.34), rgba(110, 231, 183, 0.34));
}
.topbar-water-add:active { transform: scale(0.94); }
.topbar-water-add.flash {
  background: linear-gradient(180deg, rgba(125, 211, 252, 0.65), rgba(110, 231, 183, 0.65));
}
.topbar-sync-btn {
  flex: 0 0 auto;
  width: 38px; height: 38px;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 11px;
  color: rgba(255, 255, 255, 0.55);
  font-size: 15px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  position: relative;
}
.topbar-sync-btn:hover { background: rgba(255, 255, 255, 0.07); color: #FAFAFA; }
.topbar-sync-dot {
  position: absolute; top: 6px; right: 6px;
  width: 7px; height: 7px; border-radius: 50%;
  background: rgba(255, 255, 255, 0.22);
}
.topbar-sync-btn.syncing .topbar-sync-dot {
  background: #F2C063;
  animation: topbar-sync-pulse 1s ease-in-out infinite;
}
.topbar-sync-btn.synced .topbar-sync-dot { background: #6ee7b7; }
.topbar-sync-btn.error .topbar-sync-dot {
  background: #ff8a8a;
  animation: topbar-miss-pulse 1.6s ease-in-out infinite;
}
@keyframes topbar-sync-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }

@media (max-width: 480px) {
  .topbar { padding-left: 10px; padding-right: 10px; gap: 4px; }
  .topbar-pill, .topbar-water-pill { padding: 7px 9px; gap: 5px; }
  .topbar-pill-label { font-size: 9px; letter-spacing: 0.10em; }
  .topbar-pill-count { font-size: 11px; }
  .topbar-water-add { width: 32px; font-size: 16px; }
  .topbar-sync-btn { width: 32px; height: 32px; font-size: 13px; }
}
@media (max-width: 380px) {
  .topbar-pill-label { display: none; }
}

/* === Global mobile lockdown ===
   1) Hide the right-side scrollbar on phones (iOS uses overlay scrollbars anyway).
   2) Stop iOS auto-text-size-adjust.
   3) touch-action: pan-y prevents pinch-zoom while still allowing vertical scroll.
   4) overscroll-behavior on every common modal class stops scroll chaining —
      scrolling inside a settings popup won't drag the page behind it.
   5) When body has .topbar-modal-open, the page can't scroll at all (locked).
*/
html, body {
  -webkit-text-size-adjust: 100%;
}
@media (max-width: 768px) {
  html { touch-action: pan-y; }
  ::-webkit-scrollbar { width: 0; height: 0; display: none; }
  html, body { scrollbar-width: none; -ms-overflow-style: none; }
}
.modal-bg, .modal, .po-modal-bg, .po-modal, .wt-overlay, .wt-viewer {
  overscroll-behavior: contain;
}
body.topbar-modal-open {
  overflow: hidden;
  touch-action: none;
}
/* On phones, blow the modals up to full screen and let them be the only
   scrolling element. Way less "is this scrolling the page or the modal?"
   confusion. */
@media (max-width: 480px) {
  .modal-bg, .po-modal-bg {
    padding: 0 !important;
    align-items: stretch !important;
    justify-content: stretch !important;
  }
  .modal, .po-modal {
    width: 100% !important;
    max-width: 100% !important;
    max-height: 100vh !important;
    height: 100vh !important;
    border-radius: 0 !important;
    padding-top: max(20px, env(safe-area-inset-top)) !important;
    padding-bottom: max(28px, env(safe-area-inset-bottom)) !important;
    overflow-y: auto !important;
    overscroll-behavior: contain;
  }
}
`;

  // -------- HTML --------
  const html = `
<header class="topbar" id="topbar" role="navigation" aria-label="Quick stats">
  <a href="index.html" class="topbar-pill" id="topbarGoals">
    <span class="topbar-pill-dot"></span>
    <span class="topbar-pill-label">GOALS</span>
    <span class="topbar-pill-count" id="topbarGoalsCount">—/—</span>
  </a>
  <a href="health.html" class="topbar-pill" id="topbarStack">
    <span class="topbar-pill-dot"></span>
    <span class="topbar-pill-label">STACK</span>
    <span class="topbar-pill-count" id="topbarStackCount">—/—</span>
  </a>
  <div class="topbar-water-wrap">
    <a href="health.html#water" class="topbar-water-pill" id="topbarWater">
      <span class="topbar-pill-dot"></span>
      <span class="topbar-pill-label">WATER</span>
      <span class="topbar-pill-count" id="topbarWaterCount">—/—</span>
    </a>
    <button class="topbar-water-add" id="topbarWaterAdd" aria-label="Log one drink" type="button">+</button>
  </div>
  <a href="gym.html" class="topbar-pill" id="topbarGym">
    <span class="topbar-pill-dot"></span>
    <span class="topbar-pill-label">GYM</span>
  </a>
  <a href="finance.html" class="topbar-pill" id="topbarFinance">
    <span class="topbar-pill-dot"></span>
    <span class="topbar-pill-label">FINANCE</span>
  </a>
  <button class="topbar-sync-btn" id="topbarSync" type="button" title="Click to sign in and sync across devices">
    ☁<span class="topbar-sync-dot" id="topbarSyncDot"></span>
  </button>
</header>
`;

  function injectStyleAndHTML() {
    if (document.getElementById('topbar')) return; // already injected
    const style = document.createElement('style');
    style.id = 'topbar-style';
    style.textContent = css;
    document.head.appendChild(style);

    const wrap = document.createElement('div');
    wrap.innerHTML = html.trim();
    document.body.insertBefore(wrap.firstChild, document.body.firstChild);
  }

  // -------- Active-date helpers (match the goals page 6 AM rollover) --------
  function activeDateKey() {
    const now = new Date();
    const d = new Date(now);
    if (now.getHours() < 6) d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }
  function calendarDateKey() {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  // -------- Read progress from localStorage --------
  function getGoalsProgress() {
    const key = 'goals:' + activeDateKey();
    let goals = [];
    try { goals = JSON.parse(localStorage.getItem(key)) || []; } catch (e) {}
    const total = Array.isArray(goals) ? goals.length : 0;
    const done = total ? goals.filter(g => g && g.done).length : 0;
    return { done, total };
  }

  function getStackProgress() {
    let items = [];
    try { items = JSON.parse(localStorage.getItem('stack:items')) || []; } catch (e) {}
    let taken = {};
    try { taken = JSON.parse(localStorage.getItem('stack:taken:' + activeDateKey())) || {}; } catch (e) {}
    const total = Array.isArray(items) ? items.length : 0;
    const done = total ? items.filter(i => i && taken[i.id]).length : 0;
    return { done, total };
  }

  function getWaterProgress() {
    let state = null;
    try { state = JSON.parse(localStorage.getItem('po_water_v1')); } catch (e) {}
    if (!state) return { done: 0, total: 0 };
    const todayKey = calendarDateKey();
    const done = (state.logs || {})[todayKey] || 0;
    const p = state.profile || { weightKg: 75 };
    const wKg = state.weightUnit === 'lb' ? (p.weightKg || 0) / 2.20462 : (p.weightKg || 0);
    const base = wKg * 35;
    const exercise = (p.activityHrsPerWeek || 0) / 7 * 500;
    const caffeine = Math.max(0, (state.caffeineMgPerDay || 0) - 200) * 1.5;
    const subs = (state.substances || []).reduce((s, x) => {
      const dose = (x && x.dose != null ? x.dose : (x && x.defaultDose)) || 0;
      return s + Math.max(0, dose * ((x && x.mlPerUnit) || 0));
    }, 0);
    let adjust = 0;
    if (p.sex === 'm') adjust += 200;
    if ((p.age || 0) >= 50) adjust += 100;
    const totalMl = base + exercise + caffeine + subs + adjust;
    let unitVol;
    if (state.unit === 'glass') unitVol = state.glassMl || 250;
    else if (state.unit === 'oz') unitVol = 30;
    else if (state.unit === 'ml') unitVol = 1;
    else unitVol = state.bottleMl || 500;
    const total = Math.max(1, Math.ceil(totalMl / unitVol));
    return { done, total };
  }

  function classifyStatus(done, total) {
    if (total === 0) return 'idle';
    if (done >= total) return 'good';
    if (done >= total * 0.5) return 'warn';
    // Past 6pm and still under half → flag as missed
    const h = new Date().getHours();
    if (h >= 18 && done < total * 0.5) return 'miss';
    return 'warn';
  }

  function setPillStatus(pillEl, status) {
    pillEl.classList.remove('good', 'warn', 'miss');
    if (status === 'warn' || status === 'miss') pillEl.classList.add(status);
  }

  function render() {
    const goalsEl = document.getElementById('topbarGoals');
    const stackEl = document.getElementById('topbarStack');
    const waterEl = document.getElementById('topbarWater');
    if (!goalsEl) return; // not injected yet

    const g = getGoalsProgress();
    const s = getStackProgress();
    const w = getWaterProgress();

    document.getElementById('topbarGoalsCount').textContent =
      g.total ? g.done + '/' + g.total : '0/0';
    document.getElementById('topbarStackCount').textContent =
      s.total ? s.done + '/' + s.total : '0/0';
    document.getElementById('topbarWaterCount').textContent =
      w.total ? w.done + '/' + w.total : '0/0';

    setPillStatus(goalsEl, classifyStatus(g.done, g.total));
    setPillStatus(stackEl, classifyStatus(s.done, s.total));
    setPillStatus(waterEl, classifyStatus(w.done, w.total));
  }

  // -------- Water +1 (works from any page) --------
  function defaultWaterState() {
    return {
      unit: 'bottle', bottleMl: 500, glassMl: 250, weightUnit: 'kg',
      profile: { weightKg: 75, age: 25, sex: 'm', activityHrsPerWeek: 5 },
      caffeineMgPerDay: 200, substances: [], logs: {}
    };
  }

  function addWater() {
    let state = null;
    try { state = JSON.parse(localStorage.getItem('po_water_v1')); } catch (e) {}
    if (!state || typeof state !== 'object') state = defaultWaterState();
    state.logs = state.logs || {};
    const k = calendarDateKey();
    state.logs[k] = (state.logs[k] || 0) + 1;
    try { localStorage.setItem('po_water_v1', JSON.stringify(state)); } catch (e) {}
    render();

    const btn = document.getElementById('topbarWaterAdd');
    if (btn) {
      btn.classList.add('flash');
      setTimeout(() => btn.classList.remove('flash'), 220);
    }
  }

  // =============================================================
  // Cloud sync via Google Drive (appDataFolder)
  // -------------------------------------------------------------
  // Mirrors the page's *entire* localStorage to one hidden JSON file
  // in the signed-in user's Google Drive app-data folder (not visible
  // in their normal Drive UI). Works the same on every page since it
  // doesn't know or care what the keys mean — it just keeps whatever
  // is in localStorage in sync across devices signed into the same
  // Google account.
  //
  // If you're not signed in, everything behaves exactly as before —
  // pure local-only localStorage, no network calls.
  // =============================================================
  const DRIVE_CLIENT_ID = '774079251219-5of21s9telrbdd5s6hmgccno5qhhv4j3.apps.googleusercontent.com';
  const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
  const DRIVE_FILE_NAME = 'dashboard-sync.json';
  const DS_SKIP_PREFIX = '__ds_';

  let dsTokenClient = null;
  let dsAccessToken = null;
  let dsFileId = null;
  let dsPushTimer = null;
  let dsApplyingRemote = false;
  let dsLastSyncedJson = null;

  const _dsOrigSet = localStorage.setItem.bind(localStorage);
  const _dsOrigRemove = localStorage.removeItem.bind(localStorage);

  // Wrap setItem/removeItem so a sync-side error can NEVER prevent the
  // underlying write from happening. The original call always runs;
  // any error in sync scheduling is swallowed.
  localStorage.setItem = function (k, v) {
    _dsOrigSet(k, v);
    try {
      if (!dsApplyingRemote && k.indexOf(DS_SKIP_PREFIX) !== 0) dsScheduleDebouncedPush();
    } catch (e) {}
  };
  localStorage.removeItem = function (k) {
    _dsOrigRemove(k);
    try {
      if (!dsApplyingRemote && k.indexOf(DS_SKIP_PREFIX) !== 0) dsScheduleDebouncedPush();
    } catch (e) {}
  };

  function dsMeta() {
    try { return JSON.parse(localStorage.getItem('__ds_meta')) || {}; } catch (e) { return {}; }
  }
  function dsSetMeta(patch) {
    const m = Object.assign({}, dsMeta(), patch);
    try { _dsOrigSet('__ds_meta', JSON.stringify(m)); } catch (e) {}
    return m;
  }

  function dsCollectSnapshot() {
    const out = {};
    for (const k of Object.keys(localStorage)) {
      if (k.indexOf(DS_SKIP_PREFIX) === 0) continue;
      out[k] = localStorage.getItem(k);
    }
    return out;
  }

  // Applies a full remote snapshot on top of localStorage: writes any
  // changed keys, deletes local (non-internal) keys the remote doesn't
  // have. Returns true if anything actually changed.
  function dsApplyRemoteSnapshot(remoteData) {
    dsApplyingRemote = true;
    let changed = false;
    try {
      for (const k in remoteData) {
        if (!Object.prototype.hasOwnProperty.call(remoteData, k)) continue;
        if (localStorage.getItem(k) !== remoteData[k]) {
          _dsOrigSet(k, remoteData[k]);
          changed = true;
        }
      }
      for (const k of Object.keys(localStorage)) {
        if (k.indexOf(DS_SKIP_PREFIX) === 0) continue;
        if (!(k in remoteData)) { _dsOrigRemove(k); changed = true; }
      }
    } finally {
      dsApplyingRemote = false;
    }
    return changed;
  }

  function dsIsEditing() {
    const ae = document.activeElement;
    if (!ae) return false;
    const tag = ae.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (ae.getAttribute && ae.getAttribute('contenteditable') === 'true') return true;
    return false;
  }

  function dsSetStatus(status) {
    const btn = document.getElementById('topbarSync');
    if (!btn) return;
    btn.classList.remove('syncing', 'synced', 'error');
    if (status === 'syncing') { btn.classList.add('syncing'); btn.title = 'Syncing…'; }
    else if (status === 'synced') { btn.classList.add('synced'); btn.title = 'Synced with Google Drive — click to sign out'; }
    else if (status === 'error') { btn.classList.add('error'); btn.title = 'Sync error — click to retry'; }
    else { btn.title = 'Click to sign in and sync across devices'; }
  }

  function loadGisScript(cb) {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) { cb(); return; }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = cb;
    s.onerror = () => {};
    document.head.appendChild(s);
  }

  function dsInitTokenClient() {
    if (dsTokenClient) return;
    dsTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: DRIVE_CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: (resp) => {
        if (!resp || resp.error) { dsSetStatus('idle'); return; }
        dsAccessToken = resp.access_token;
        dsFileId = null;
        dsSetMeta({ everSignedIn: true });
        dsPullAndApply(true);
      },
    });
  }

  async function dsFindFile() {
    const q = "name='" + DRIVE_FILE_NAME + "' and trashed=false";
    const res = await fetch(
      'https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id)&q=' + encodeURIComponent(q),
      { headers: { Authorization: 'Bearer ' + dsAccessToken } }
    );
    if (!res.ok) throw new Error('drive find failed: ' + res.status);
    const j = await res.json();
    return (j.files && j.files[0] && j.files[0].id) || null;
  }

  async function dsCreateFile(initialJson) {
    const boundary = 'ds_boundary_314159265';
    const metadata = { name: DRIVE_FILE_NAME, parents: ['appDataFolder'] };
    const body =
      '--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) + '\r\n' +
      '--' + boundary + '\r\nContent-Type: application/json\r\n\r\n' + initialJson + '\r\n' +
      '--' + boundary + '--';
    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + dsAccessToken,
        'Content-Type': 'multipart/related; boundary=' + boundary,
      },
      body,
    });
    if (!res.ok) throw new Error('drive create failed: ' + res.status);
    const j = await res.json();
    return j.id;
  }

  async function dsEnsureFile() {
    if (dsFileId) return dsFileId;
    const cached = dsMeta().fileId;
    if (cached) { dsFileId = cached; return dsFileId; }
    let id = await dsFindFile();
    if (!id) id = await dsCreateFile(JSON.stringify({ savedAt: 0, data: {} }));
    dsFileId = id;
    dsSetMeta({ fileId: id });
    return id;
  }

  async function dsPullRemote() {
    const id = await dsEnsureFile();
    const res = await fetch('https://www.googleapis.com/drive/v3/files/' + id + '?alt=media', {
      headers: { Authorization: 'Bearer ' + dsAccessToken },
    });
    if (!res.ok) throw new Error('drive pull failed: ' + res.status);
    const text = await res.text();
    try { return JSON.parse(text); } catch (e) { return { savedAt: 0, data: {} }; }
  }

  async function dsPushRemoteRaw(payload) {
    const id = await dsEnsureFile();
    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files/' + id + '?uploadType=media', {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + dsAccessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('drive push failed: ' + res.status);
  }

  function dsMaybeSilentReauth(err) {
    if (String(err && err.message).indexOf('401') === -1) return;
    dsAccessToken = null;
    if (dsTokenClient) { try { dsTokenClient.requestAccessToken({ prompt: '' }); } catch (e) {} }
  }

  // Local edits always win: push whatever's currently in localStorage,
  // debounced so rapid typing doesn't spam the API.
  async function dsPushLocal() {
    if (!dsAccessToken) return;
    const snapshot = dsCollectSnapshot();
    const json = JSON.stringify(snapshot);
    if (json === dsLastSyncedJson) return;
    dsSetStatus('syncing');
    try {
      const savedAt = Date.now();
      await dsPushRemoteRaw({ savedAt, data: snapshot });
      dsLastSyncedJson = json;
      dsSetMeta({ lastSavedAt: savedAt });
      dsSetStatus('synced');
    } catch (e) {
      dsSetStatus('error');
      dsMaybeSilentReauth(e);
    }
  }

  function dsScheduleDebouncedPush() {
    if (!dsAccessToken) return;
    clearTimeout(dsPushTimer);
    dsPushTimer = setTimeout(dsPushLocal, 1500);
  }

  // Only called at "safe" moments (load, sign-in, tab focus/visible) —
  // never mid-edit — so it's safe to overwrite local state with Drive's.
  async function dsPullAndApply(reloadIfChanged) {
    if (!dsAccessToken) return;
    if (dsIsEditing()) return;
    dsSetStatus('syncing');
    try {
      const remote = await dsPullRemote();
      const remoteData = (remote && remote.data) || {};
      if (Object.keys(remoteData).length === 0) {
        // Nothing in the cloud yet — seed it with whatever's local.
        dsSetStatus('synced');
        await dsPushLocal();
        return;
      }
      const remoteJson = JSON.stringify(remoteData);
      if (remoteJson === dsLastSyncedJson) { dsSetStatus('synced'); return; }
      const changed = dsApplyRemoteSnapshot(remoteData);
      dsLastSyncedJson = remoteJson;
      dsSetMeta({ lastSavedAt: remote.savedAt || Date.now() });
      dsSetStatus('synced');
      if (changed && reloadIfChanged) setTimeout(() => location.reload(), 150);
    } catch (e) {
      dsSetStatus('error');
      dsMaybeSilentReauth(e);
    }
  }

  function dsSignOut() {
    try {
      if (dsAccessToken && window.google && google.accounts && google.accounts.oauth2) {
        google.accounts.oauth2.revoke(dsAccessToken, () => {});
      }
    } catch (e) {}
    dsAccessToken = null;
    dsFileId = null;
    dsLastSyncedJson = null;
    dsSetMeta({ everSignedIn: false });
    dsSetStatus('idle');
  }

  function dsHandleSyncClick(e) {
    e.preventDefault();
    if (dsAccessToken) { dsSignOut(); return; }
    loadGisScript(() => {
      dsInitTokenClient();
      dsTokenClient.requestAccessToken({ prompt: '' });
    });
  }

  function dsAttemptSilentRestore() {
    if (!dsMeta().everSignedIn) return;
    loadGisScript(() => {
      dsInitTokenClient();
      dsTokenClient.requestAccessToken({ prompt: '' });
    });
  }

  // -------- Mobile lockdown helpers --------
  // Belt-and-suspenders zoom prevention — iOS Safari sometimes ignores
  // user-scalable=no, so we also kill the gesture events directly.
  function blockGesture(e) { e.preventDefault(); }
  function lockGestures() {
    document.addEventListener('gesturestart', blockGesture, { passive: false });
    document.addEventListener('gesturechange', blockGesture, { passive: false });
    document.addEventListener('gestureend', blockGesture, { passive: false });
    // Also kill the iOS double-tap-to-zoom on any tap.
    let lastTouch = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouch <= 300) e.preventDefault();
      lastTouch = now;
    }, { passive: false });
  }

  // Watch every known modal-bg / overlay class — when any one of them
  // gets `.show` or `.is-open`, lock the body scroll. When the last
  // one closes, unlock.
  function startModalLock() {
    const MODAL_SELECTORS = [
      '.modal-bg', '.po-modal-bg', '.wt-overlay', '.wt-viewer', '.wt-cam'
    ];
    function anyOpen() {
      for (const sel of MODAL_SELECTORS) {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          if (el.classList.contains('show') || el.classList.contains('is-open')) {
            return true;
          }
        }
      }
      return false;
    }
    function sync() {
      document.body.classList.toggle('topbar-modal-open', anyOpen());
    }
    const observer = new MutationObserver(sync);
    // Observe class changes anywhere in body — modal toggles are rare so
    // a global subtree observer is cheap.
    observer.observe(document.body, {
      attributes: true, attributeFilter: ['class'], subtree: true
    });
    sync();
  }

  // -------- Boot --------
  function boot() {
    injectStyleAndHTML();
    const waterBtn = document.getElementById('topbarWaterAdd');
    if (waterBtn) waterBtn.addEventListener('click', (e) => { e.preventDefault(); addWater(); });
    const syncBtn = document.getElementById('topbarSync');
    if (syncBtn) syncBtn.addEventListener('click', dsHandleSyncClick);
    render();
    lockGestures();
    startModalLock();
    dsAttemptSilentRestore();

    // Re-render when localStorage changes from another tab/window OR when
    // the page becomes visible (sync may have pulled in the background).
    // Also re-pull from Drive at those same moments.
    window.addEventListener('storage', render);
    window.addEventListener('focus', () => { render(); dsPullAndApply(true); });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) { render(); dsPullAndApply(true); }
    });

    // Periodic refresh so counts stay current after midnight rollover etc.
    setInterval(render, 30 * 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
