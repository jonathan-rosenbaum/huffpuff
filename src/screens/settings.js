import { store, hasVault, currentMode, setupVault, lock, removeVault } from '../storage.js';
import { FOCUS_AREAS } from '../affirmations.js';
import { requestPermission, permission, reschedule } from '../notifications.js';
import { exportBackup, importBackup } from '../crypto.js';
import { toast, render as appRender } from '../app.js';

export function renderSettings() {
  const el = document.createElement('section');
  el.className = 'screen';

  const profile = store.profile;
  const notify = store.notify;
  const locked = hasVault();

  el.innerHTML = `
    <header class="header">
      <span class="brand">Her Settings</span>
    </header>

    <div class="section">
      <div class="section-label">Your name</div>
      <div class="setting-row">
        <label for="name">Called</label>
        <input type="text" id="name" value="${escapeHtml(profile.name)}" maxlength="32" autocapitalize="words" />
      </div>
    </div>

    <div class="section">
      <div class="section-label">Focus areas</div>
      <div class="chips" id="chips" style="justify-content:flex-start;"></div>
    </div>

    <div class="section">
      <div class="section-label">Reminders</div>
      <div class="setting-row">
        <label>Daily nudges</label>
        <div class="toggle ${notify.enabled ? 'on' : ''}" id="toggle" role="switch" aria-checked="${notify.enabled}"></div>
      </div>
      <div id="times-wrap" style="margin-top:10px;"></div>
    </div>

    <div class="section">
      <div class="section-label">Privacy</div>
      ${locked ? `
        <div class="setting-row">
          <label>Encrypted with passphrase</label>
          <span class="value">on</span>
        </div>
        <button class="ghost-btn" id="lock-now">Lock now</button>
        <button class="ghost-btn" id="remove-passphrase" style="margin-top:8px;">Remove passphrase</button>
      ` : `
        <div class="setting-row">
          <label style="font-style:italic; color:var(--ink-soft); font-size:13px;">Your data is stored on this device only.<br/>Add a passphrase for end-to-end encryption.</label>
        </div>
        <button class="ghost-btn" id="set-passphrase">Set a passphrase</button>
      `}
    </div>

    <div class="section">
      <div class="section-label">Backup</div>
      <button class="ghost-btn" id="export">Download encrypted backup</button>
      <button class="ghost-btn" id="import" style="margin-top:8px;">Import a backup</button>
      <input type="file" id="import-file" accept="application/json,.json" hidden />
    </div>

    <div class="section">
      <div class="section-label">Danger zone</div>
      <button class="ghost-btn danger" id="reset">Reset everything</button>
    </div>
  `;

  // --- Name ---
  el.querySelector('#name').addEventListener('change', (e) => {
    const p = store.profile;
    p.name = e.target.value.trim();
    store.profile = p;
    toast('saved');
  });

  // --- Focus chips ---
  const chipsEl = el.querySelector('#chips');
  FOCUS_AREAS.forEach(f => {
    const c = document.createElement('button');
    c.className = 'chip' + (profile.focus.includes(f.id) ? ' selected' : '');
    c.textContent = f.label;
    c.addEventListener('click', () => {
      const p = store.profile;
      const i = p.focus.indexOf(f.id);
      if (i >= 0) {
        if (p.focus.length <= 1) { toast('keep at least one'); return; }
        p.focus.splice(i, 1);
      } else {
        if (p.focus.length >= 5) { toast('up to five'); return; }
        p.focus.push(f.id);
      }
      store.profile = p;
      c.classList.toggle('selected');
    });
    chipsEl.appendChild(c);
  });

  // --- Notifications ---
  const toggle = el.querySelector('#toggle');
  toggle.addEventListener('click', async () => {
    const n = store.notify;
    if (!n.enabled) {
      const res = await requestPermission();
      if (res !== 'granted') {
        toast(res === 'denied' ? 'permission blocked' : 'not supported');
        return;
      }
      n.enabled = true;
    } else {
      n.enabled = false;
    }
    store.notify = n;
    toggle.classList.toggle('on', n.enabled);
    toggle.setAttribute('aria-checked', String(n.enabled));
    reschedule();
    renderTimes();
  });

  const timesWrap = el.querySelector('#times-wrap');
  function renderTimes() {
    const n = store.notify;
    timesWrap.innerHTML = '';
    if (!n.enabled) {
      if (permission() === 'denied') {
        const hint = document.createElement('div');
        hint.className = 'setting-row';
        hint.innerHTML = `<label style="color:var(--ink-soft); font-style:italic; font-size:13px;">Enable in your browser settings to use reminders.</label>`;
        timesWrap.appendChild(hint);
      }
      return;
    }
    const list = document.createElement('div');
    list.className = 'time-list';
    n.times.forEach((t, i) => {
      const row = document.createElement('div');
      row.className = 'setting-row';
      row.innerHTML = `
        <label>Nudge ${i + 1}</label>
        <div class="time-row">
          <input type="time" value="${t}" data-i="${i}" />
          ${n.times.length > 1 ? '<button class="x" aria-label="Remove">\u00d7</button>' : ''}
        </div>
      `;
      row.querySelector('input').addEventListener('change', (e) => {
        const nn = store.notify;
        nn.times[i] = e.target.value;
        store.notify = nn;
        reschedule();
        toast('updated');
      });
      const x = row.querySelector('.x');
      if (x) x.addEventListener('click', () => {
        const nn = store.notify;
        nn.times.splice(i, 1);
        store.notify = nn;
        reschedule();
        renderTimes();
      });
      list.appendChild(row);
    });
    const add = document.createElement('button');
    add.className = 'add-time-btn';
    add.textContent = '+ add another time';
    add.addEventListener('click', () => {
      const nn = store.notify;
      if (nn.times.length >= 6) { toast('up to six'); return; }
      nn.times.push('20:00');
      store.notify = nn;
      reschedule();
      renderTimes();
    });
    list.appendChild(add);
    timesWrap.appendChild(list);
  }
  renderTimes();

  // --- Privacy / passphrase ---
  const setBtn = el.querySelector('#set-passphrase');
  if (setBtn) setBtn.addEventListener('click', () => openSetPassphrase());

  const lockBtn = el.querySelector('#lock-now');
  if (lockBtn) lockBtn.addEventListener('click', () => { lock(); appRender(); });

  const removeBtn = el.querySelector('#remove-passphrase');
  if (removeBtn) removeBtn.addEventListener('click', () => {
    if (!confirm('Remove passphrase? Your data stays, but it will no longer be encrypted.')) return;
    removeVault();
    toast('passphrase removed');
    el.replaceWith(renderSettings());
  });

  // --- Backup ---
  el.querySelector('#export').addEventListener('click', () => {
    if (!hasVault()) {
      toast('set a passphrase first');
      return;
    }
    try {
      const blob = exportBackup();
      const json = JSON.stringify(blob, null, 2);
      const file = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `sabrina-is-backup-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast('backup downloaded');
    } catch (e) {
      toast(e.message || 'export failed');
    }
  });

  const fileInput = el.querySelector('#import-file');
  el.querySelector('#import').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    let backup;
    try { backup = JSON.parse(text); }
    catch { toast('that doesn\u2019t look like a backup'); return; }
    openImportPassphrase(backup);
  });

  // --- Reset ---
  el.querySelector('#reset').addEventListener('click', () => {
    if (confirm('Reset name, focus, saved affirmations, reflections, passphrase, and settings?')) {
      store.resetAll();
      window.location.hash = '';
      window.location.reload();
    }
  });

  return el;
}

// -------- Modals --------
function openSetPassphrase() {
  const overlay = modal(`
    <h2>Set a passphrase</h2>
    <p>This encrypts everything on this device with a key only you know. If you forget it, your data can\u2019t be recovered.</p>
    <input id="p1" type="password" placeholder="passphrase" autocomplete="new-password" />
    <input id="p2" type="password" placeholder="confirm passphrase" autocomplete="new-password" />
    <div class="modal-actions">
      <button class="ghost-btn" id="cancel">Cancel</button>
      <button class="big-btn" id="go">Encrypt</button>
    </div>
  `);
  const p1 = overlay.querySelector('#p1');
  const p2 = overlay.querySelector('#p2');
  overlay.querySelector('#cancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#go').addEventListener('click', async () => {
    const a = p1.value, b = p2.value;
    if (a.length < 8) { toast('8+ characters, please'); return; }
    if (a !== b)     { toast('doesn\u2019t match'); return; }
    try {
      await setupVault(a);
      overlay.remove();
      toast('encrypted');
      appRender();
    } catch (e) {
      toast('couldn\u2019t encrypt');
    }
  });
  setTimeout(() => p1.focus(), 50);
}

function openImportPassphrase(backup) {
  const overlay = modal(`
    <h2>Restore from backup</h2>
    <p>This will replace the data on this device with the backup\u2019s contents.</p>
    <input id="p" type="password" placeholder="passphrase for this backup" autocomplete="current-password" />
    <div class="modal-actions">
      <button class="ghost-btn" id="cancel">Cancel</button>
      <button class="big-btn" id="go">Restore</button>
    </div>
  `);
  const p = overlay.querySelector('#p');
  overlay.querySelector('#cancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#go').addEventListener('click', async () => {
    try {
      await importBackup(backup, p.value);
      overlay.remove();
      toast('restored');
      // Reload so the app re-initializes into the new vault state
      setTimeout(() => window.location.reload(), 400);
    } catch (e) {
      toast(e.code === 'WRONG_PASSPHRASE' ? 'wrong passphrase' : 'couldn\u2019t restore');
    }
  });
  setTimeout(() => p.focus(), 50);
}

function modal(html) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal">${html}</div>`;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  return overlay;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
