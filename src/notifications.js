// Lightweight notification scheduler.
// Uses the browser Notifications API; while the PWA tab is open, setTimeout fires
// at the next scheduled time each day. For background push, a full PWA would need
// a push server — out of scope for the free/offline MVP.

import { store } from './storage.js';
import { AFFIRMATIONS, personalize, pickForDate } from './affirmations.js';
import { todayKey } from './storage.js';

let timers = [];

export async function requestPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return await Notification.requestPermission();
}

export function permission() {
  return 'Notification' in window ? Notification.permission : 'unsupported';
}

export function cancelAll() {
  timers.forEach(clearTimeout);
  timers = [];
}

export function reschedule() {
  cancelAll();
  const n = store.notify;
  if (!n.enabled) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const now = new Date();
  (n.times || []).forEach(hhmm => {
    const [h, m] = hhmm.split(':').map(Number);
    const next = new Date();
    next.setHours(h, m, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    const ms = next - now;
    timers.push(setTimeout(() => {
      fire();
      // Re-arm for tomorrow
      timers.push(setTimeout(() => reschedule(), 2000));
    }, ms));
  });
}

function fire() {
  const profile = store.profile;
  const aff = pickForDate(todayKey(), profile.focus, profile.name);
  const text = personalize(aff.text, profile.name).replace(/\n/g, ' ');
  const title = profile.name ? `${profile.name} is…` : 'She is…';
  try {
    new Notification(title, {
      body: text,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'sabrina-daily',
    });
  } catch (e) {
    // Silently ignore — permission may have been revoked mid-session.
  }
}
