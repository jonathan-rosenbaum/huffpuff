import { store, tickStreak } from './storage.js';
import { reschedule } from './notifications.js';
import { renderOnboarding } from './screens/onboarding.js';
import { renderToday }      from './screens/today.js';
import { renderReflect }    from './screens/reflect.js';
import { renderCollection } from './screens/collection.js';
import { renderSettings }   from './screens/settings.js';

const appEl = document.getElementById('app');

const routes = {
  '':            renderToday,
  '/':           renderToday,
  '/today':      renderToday,
  '/reflect':    renderReflect,
  '/collection': renderCollection,
  '/settings':   renderSettings,
};

function currentRoute() {
  const hash = window.location.hash.replace(/^#/, '');
  return hash || '/today';
}

export function navigate(to) {
  window.location.hash = '#' + to;
}

export function renderTabs(active) {
  const tabs = [
    { id: '/today',      label: 'Today'      },
    { id: '/reflect',    label: 'Reflect'    },
    { id: '/collection', label: 'Collection' },
    { id: '/settings',   label: 'She'        },
  ];
  const nav = document.createElement('nav');
  nav.className = 'tabs';
  tabs.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'tab' + (t.id === active ? ' active' : '');
    btn.textContent = t.label;
    btn.addEventListener('click', () => navigate(t.id));
    nav.appendChild(btn);
  });
  return nav;
}

export function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => t.classList.remove('show'), 1800);
}

function render() {
  const profile = store.profile;
  appEl.innerHTML = '';

  // Remove any existing tab bar
  document.querySelectorAll('.tabs').forEach(n => n.remove());

  if (!profile.onboarded) {
    appEl.appendChild(renderOnboarding());
    return;
  }

  const route = currentRoute();
  const renderer = routes[route] || renderToday;
  appEl.appendChild(renderer());
  document.body.appendChild(renderTabs(route));
}

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', () => {
  if (store.profile.onboarded) tickStreak();
  render();
  reschedule();
});

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
