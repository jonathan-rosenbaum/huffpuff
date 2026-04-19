import { store, todayKey } from '../storage.js';
import { pickForDate, pickRandom, byId, personalize } from '../affirmations.js';
import { navigate, toast } from '../app.js';

export function renderToday() {
  const el = document.createElement('section');
  el.className = 'screen';

  const profile = store.profile;
  const streak = store.streak;
  const today = todayKey();

  // Ensure today's affirmation is set (deterministic).
  let daily = store.daily;
  if (!daily || daily.date !== today) {
    const aff = pickForDate(today, profile.focus, profile.name, store.history);
    daily = { date: today, affirmationId: aff.id };
    store.daily = daily;

    // Track recent history to avoid repeats (keep last 14).
    const h = store.history;
    h.push(aff.id);
    while (h.length > 14) h.shift();
    store.history = h;
  }
  const aff = byId(daily.affirmationId);

  const savedIds = new Set(store.saved.map(s => s.id));
  const isSaved = savedIds.has(aff.id);

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric'
  });

  el.innerHTML = `
    <header class="header">
      <span class="brand">${escapeHtml(profile.name || 'She')} Is</span>
      <span class="streak">${streak.count > 0 ? `<strong>${streak.count}</strong> day${streak.count===1?'':'s'}` : ''}</span>
    </header>
    <div class="date">${dateLabel}</div>
    <div class="affirmation">
      <h1 id="aff">${escapeHtml(personalize(aff.text, profile.name))}</h1>
      <div class="dots">\u2022 \u2022 \u2022</div>
      <div class="sub-cta">tap save, or reflect below</div>
    </div>
    <div class="actions">
      <button class="icon-btn ${isSaved ? 'saved' : ''}" id="save">${isSaved ? '\u2665 saved' : '\u2661 save'}</button>
      <button class="icon-btn" id="next">\u21bb another</button>
      <button class="icon-btn primary" id="reflect">reflect \u2192</button>
    </div>
  `;

  el.querySelector('#save').addEventListener('click', () => {
    let saved = store.saved;
    if (saved.find(s => s.id === aff.id)) {
      saved = saved.filter(s => s.id !== aff.id);
      store.saved = saved;
      toast('removed from collection');
    } else {
      saved.unshift({ id: aff.id, text: aff.text, date: today });
      store.saved = saved;
      toast('saved to collection');
    }
    // Re-render to update icon
    el.replaceWith(renderToday());
  });

  el.querySelector('#next').addEventListener('click', () => {
    const another = pickRandom(profile.focus, profile.name, [aff.id, ...store.history]);
    // Override today's pick with this one
    store.daily = { date: today, affirmationId: another.id };
    const h = store.history;
    h.push(another.id);
    while (h.length > 14) h.shift();
    store.history = h;
    el.replaceWith(renderToday());
  });

  el.querySelector('#reflect').addEventListener('click', () => navigate('/reflect'));

  return el;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
