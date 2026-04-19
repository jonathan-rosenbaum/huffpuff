import { store } from '../storage.js';
import { personalize } from '../affirmations.js';
import { toast, navigate } from '../app.js';

export function renderCollection() {
  const el = document.createElement('section');
  el.className = 'screen';

  const profile = store.profile;
  const saved = store.saved;
  const reflections = store.reflections;

  el.innerHTML = `
    <header class="header">
      <span class="brand">Collection</span>
      <span class="streak"><strong>${saved.length}</strong> saved</span>
    </header>
  `;

  if (saved.length === 0 && reflections.length === 0) {
    const e = document.createElement('div');
    e.className = 'empty';
    e.innerHTML = `<p style="font-size:16px; font-style:italic;">Nothing here yet.</p><p style="margin-top:8px; font-size:13px;">Save affirmations from the Today screen to gather them here.</p>`;
    el.appendChild(e);
    return el;
  }

  if (saved.length) {
    const header = document.createElement('div');
    header.className = 'section-label';
    header.textContent = 'Saved affirmations';
    el.appendChild(header);

    const list = document.createElement('div');
    list.className = 'collection-list';
    saved.forEach(s => {
      const card = document.createElement('div');
      card.className = 'card';
      const date = new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      card.innerHTML = `
        <div class="text">${escapeHtml(personalize(s.text, profile.name))}</div>
        <div class="meta"><span>${date}</span><span id="rm">remove</span></div>
      `;
      card.querySelector('#rm').addEventListener('click', (e) => {
        e.stopPropagation();
        const next = store.saved.filter(x => x.id !== s.id);
        store.saved = next;
        toast('removed');
        el.replaceWith(renderCollection());
      });
      card.addEventListener('click', () => navigate('/affirmation/' + s.id));
      list.appendChild(card);
    });
    el.appendChild(list);
  }

  if (reflections.length) {
    const header = document.createElement('div');
    header.className = 'section-label';
    header.style.marginTop = '32px';
    header.textContent = 'Reflections';
    el.appendChild(header);

    const list = document.createElement('div');
    list.className = 'collection-list';
    reflections.forEach(r => {
      const card = document.createElement('div');
      card.className = 'card';
      const date = new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const preview = r.text.length > 160 ? r.text.slice(0, 160) + '\u2026' : r.text;
      card.innerHTML = `
        <div class="text" style="font-style:normal; font-family:Georgia,serif; font-size:16px;">${escapeHtml(preview)}</div>
        <div class="meta"><span>${date}</span></div>
      `;
      list.appendChild(card);
    });
    el.appendChild(list);
  }

  return el;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
