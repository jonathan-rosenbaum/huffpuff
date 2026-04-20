import { store } from '../storage.js';
import { byId, getBubbles } from '../affirmations.js';
import { navigate, toast } from '../app.js';

export function renderDetail(id) {
  const el = document.createElement('section');
  el.className = 'screen';

  const aff = byId(id);
  if (!aff) {
    el.innerHTML = `
      <header class="header">
        <button class="back" id="back">\u2190 back</button>
      </header>
      <div class="empty">We couldn\u2019t find that one.</div>
    `;
    el.querySelector('#back').addEventListener('click', () => navigate('/today'));
    return el;
  }

  const bubbles = getBubbles(aff);
  const saved = store.saved.some(s => s.id === aff.id);
  const author = aff.source && aff.source.author ? aff.source.author : '';
  const work   = aff.source && aff.source.work ? aff.source.work : '';

  el.innerHTML = `
    <header class="header">
      <button class="back" id="back" aria-label="Back">\u2190 back</button>
      <span class="brand">${(aff.focus || []).join(' \u00b7 ')}</span>
    </header>
    <div class="detail-hero">
      <h1 class="quote">${escapeHtml(aff.text)}</h1>
      ${author ? `<div class="attribution">\u2014 ${escapeHtml(author)}${work ? `<span class="work">, ${escapeHtml(work)}</span>` : ''}</div>` : ''}
    </div>
    <div class="bubbles" id="bubbles"></div>
    <div class="actions" style="margin-top:24px;">
      <button class="icon-btn ${saved ? 'saved' : ''}" id="save">${saved ? '\u2665 saved' : '\u2661 save'}</button>
      <button class="icon-btn primary" id="reflect">reflect \u2192</button>
    </div>
  `;

  el.querySelector('#back').addEventListener('click', () => {
    if (window.history.length > 1) window.history.back();
    else navigate('/today');
  });

  el.querySelector('#save').addEventListener('click', () => {
    let list = store.saved;
    if (list.some(s => s.id === aff.id)) {
      list = list.filter(s => s.id !== aff.id);
      store.saved = list;
      toast('removed from collection');
    } else {
      list.unshift({ id: aff.id, text: aff.text, date: new Date().toISOString().slice(0, 10) });
      store.saved = list;
      toast('saved');
    }
    el.replaceWith(renderDetail(id));
  });

  el.querySelector('#reflect').addEventListener('click', () => navigate('/reflect'));

  const bEl = el.querySelector('#bubbles');
  bubbles.forEach((b) => {
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = `
      <div class="bubble-label">${escapeHtml(b.label)}</div>
      <div class="bubble-short">${escapeHtml(b.short)}</div>
      ${b.long ? `<button class="bubble-more">read more \u2193</button><div class="bubble-long" hidden>${escapeHtml(b.long)}</div>` : ''}
    `;
    const more = bubble.querySelector('.bubble-more');
    if (more) {
      const long = bubble.querySelector('.bubble-long');
      more.addEventListener('click', () => {
        const open = !long.hidden;
        long.hidden = open;
        more.textContent = open ? 'read more \u2193' : 'show less \u2191';
      });
    }
    bEl.appendChild(bubble);
  });

  return el;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
