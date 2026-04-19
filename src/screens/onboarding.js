import { store } from '../storage.js';
import { FOCUS_AREAS } from '../affirmations.js';
import { requestPermission } from '../notifications.js';
import { navigate, toast } from '../app.js';

export function renderOnboarding() {
  const el = document.createElement('section');
  el.className = 'screen';

  const state = {
    step: 0,
    name: '',
    focus: [],
    notifyEnabled: false,
  };

  function render() {
    el.innerHTML = '';
    if (state.step === 0) renderWelcome();
    else if (state.step === 1) renderName();
    else if (state.step === 2) renderFocus();
    else if (state.step === 3) renderNotify();
    else renderDone();
  }

  function renderWelcome() {
    el.innerHTML = `
      <div class="ob" style="text-align:center;">
        <div class="eyebrow">Welcome</div>
        <h1 class="ob-title">She is,<br/>softly,<br/>arriving.</h1>
        <p class="ob-sub">A quiet daily practice,<br/>personalized to you.</p>
        <button class="big-btn" id="begin">Begin</button>
      </div>
    `;
    el.querySelector('#begin').addEventListener('click', () => { state.step = 1; render(); });
  }

  function renderName() {
    el.innerHTML = `
      <div class="ob">
        <div class="eyebrow">Step 1 of 3</div>
        <h1 class="ob-title" style="margin-top:8px;">What should<br/>we call you?</h1>
        <input class="ob-input" id="name" placeholder="your first name" autocomplete="given-name" autocapitalize="words" />
        <button class="big-btn" id="next" disabled>Continue</button>
      </div>
    `;
    const input = el.querySelector('#name');
    const btn = el.querySelector('#next');
    input.value = state.name;
    btn.disabled = !state.name.trim();
    input.focus();
    input.addEventListener('input', () => {
      state.name = input.value;
      btn.disabled = !state.name.trim();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && state.name.trim()) { state.step = 2; render(); }
    });
    btn.addEventListener('click', () => { state.step = 2; render(); });
  }

  function renderFocus() {
    el.innerHTML = `
      <div class="ob">
        <div class="eyebrow">Step 2 of 3</div>
        <h1 class="ob-title" style="margin-top:8px;">What would you<br/>like to nurture?</h1>
        <p class="ob-sub">Pick 2 to 5.</p>
        <div class="chips" id="chips"></div>
        <button class="big-btn" id="next" disabled>Continue</button>
      </div>
    `;
    const chips = el.querySelector('#chips');
    const btn = el.querySelector('#next');

    FOCUS_AREAS.forEach(f => {
      const c = document.createElement('button');
      c.className = 'chip' + (state.focus.includes(f.id) ? ' selected' : '');
      c.innerHTML = `${f.label}<span class="hint">${f.hint}</span>`;
      c.addEventListener('click', () => {
        const i = state.focus.indexOf(f.id);
        if (i >= 0) state.focus.splice(i, 1);
        else if (state.focus.length < 5) state.focus.push(f.id);
        else return;
        c.classList.toggle('selected');
        btn.disabled = state.focus.length < 2;
      });
      chips.appendChild(c);
    });
    btn.disabled = state.focus.length < 2;
    btn.addEventListener('click', () => { state.step = 3; render(); });
  }

  function renderNotify() {
    el.innerHTML = `
      <div class="ob">
        <div class="eyebrow">Step 3 of 3</div>
        <h1 class="ob-title" style="margin-top:8px;">Gentle<br/>reminders?</h1>
        <p class="ob-sub">A small nudge each morning,<br/>or whenever you'd like.<br/>You can change or turn these off anytime.</p>
        <button class="big-btn" id="yes">Yes, remind me at 8am</button>
        <button class="ghost-btn" id="no">Not right now</button>
      </div>
    `;
    el.querySelector('#yes').addEventListener('click', async () => {
      const res = await requestPermission();
      state.notifyEnabled = res === 'granted';
      if (!state.notifyEnabled && res !== 'unsupported') {
        toast('Permission denied — that\u2019s okay');
      }
      finish();
    });
    el.querySelector('#no').addEventListener('click', () => { state.notifyEnabled = false; finish(); });
  }

  function finish() {
    store.profile = {
      name: state.name.trim(),
      focus: state.focus,
      onboarded: true,
      created: new Date().toISOString(),
    };
    store.notify = {
      enabled: !!state.notifyEnabled,
      times: ['08:00'],
    };
    state.step = 4; render();
  }

  function renderDone() {
    el.innerHTML = `
      <div class="ob" style="text-align:center;">
        <div class="eyebrow">Ready</div>
        <h1 class="ob-title">${escapeHtml(state.name)} is<br/><em>already</em><br/>enough.</h1>
        <p class="ob-sub" style="margin-top:24px;">Your first affirmation<br/>is waiting.</p>
        <button class="big-btn" id="go">Open today</button>
      </div>
    `;
    el.querySelector('#go').addEventListener('click', () => {
      // Trigger re-render by navigating
      navigate('/today');
      // Force a render since hash may already be empty
      setTimeout(() => window.dispatchEvent(new HashChangeEvent('hashchange')), 10);
    });
  }

  render();
  return el;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
