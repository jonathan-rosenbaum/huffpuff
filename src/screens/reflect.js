import { store, todayKey } from '../storage.js';
import { byId, personalize } from '../affirmations.js';
import { toast } from '../app.js';

const PROMPTS = [
  'Why might this be true for you today?',
  'Where in your life can you let this land?',
  'What would change if you believed this?',
  'When was the last time this felt true?',
  'Who needs to hear you say this out loud?',
];

export function renderReflect() {
  const el = document.createElement('section');
  el.className = 'screen';

  const profile = store.profile;
  const today = todayKey();
  const daily = store.daily;
  const aff = daily ? byId(daily.affirmationId) : null;
  if (!aff) {
    el.innerHTML = `<div class="empty">Open "Today" first to see your affirmation.</div>`;
    return el;
  }

  const existing = store.reflections.find(r => r.date === today && r.affirmationId === aff.id);
  const prompt = PROMPTS[new Date().getDate() % PROMPTS.length];

  el.innerHTML = `
    <header class="header">
      <span class="brand">Reflect</span>
      <span class="streak">${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
    </header>
    <div class="reflect-hero">${escapeHtml(personalize(aff.text, profile.name))}</div>
    <div class="reflect-prompt">${escapeHtml(prompt)}</div>
    <textarea class="journal" id="journal" placeholder="write freely\u2026">${escapeHtml(existing ? existing.text : '')}</textarea>
    <div class="actions" style="margin-top:16px;">
      <button class="icon-btn primary" id="save">save reflection</button>
    </div>
  `;

  const ta = el.querySelector('#journal');
  ta.addEventListener('focus', () => ta.scrollIntoView({ behavior: 'smooth', block: 'center' }));

  el.querySelector('#save').addEventListener('click', () => {
    const text = ta.value.trim();
    const list = store.reflections.filter(r => !(r.date === today && r.affirmationId === aff.id));
    if (text) {
      list.unshift({ date: today, affirmationId: aff.id, text, savedAt: new Date().toISOString() });
      toast('reflection saved');
    } else {
      toast('reflection cleared');
    }
    store.reflections = list;
  });

  return el;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
