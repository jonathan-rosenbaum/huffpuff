import { store } from '../storage.js';
import { FOCUS_AREAS } from '../affirmations.js';
import { requestPermission, permission, reschedule } from '../notifications.js';
import { toast } from '../app.js';

export function renderSettings() {
  const el = document.createElement('section');
  el.className = 'screen';

  const profile = store.profile;
  const notify = store.notify;

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
      <div class="section-label">Danger zone</div>
      <button class="ghost-btn danger" id="reset">Reset everything</button>
    </div>
  `;

  // Name
  el.querySelector('#name').addEventListener('change', (e) => {
    const p = store.profile;
    p.name = e.target.value.trim();
    store.profile = p;
    toast('saved');
  });

  // Focus chips
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

  // Toggle notifications
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

  // Times editor
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

  // Reset
  el.querySelector('#reset').addEventListener('click', () => {
    if (confirm('Reset name, focus, saved affirmations, reflections, and settings?')) {
      store.resetAll();
      window.location.hash = '';
      window.location.reload();
    }
  });

  return el;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
