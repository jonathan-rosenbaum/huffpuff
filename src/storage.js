// Thin localStorage wrapper with namespacing + JSON + defaults.
const NS = 'sabrina.v1.';

const defaults = {
  profile: { name: '', focus: [], onboarded: false, created: null },
  saved: [],
  reflections: [],
  daily: null,          // { date: 'YYYY-MM-DD', affirmationId }
  streak: { last: null, count: 0 },
  notify: { enabled: false, times: ['08:00'] },
  history: [],          // ids seen in last N days, for variety
};

function read(key) {
  try {
    const raw = localStorage.getItem(NS + key);
    if (raw === null) return structuredClone(defaults[key]);
    return JSON.parse(raw);
  } catch {
    return structuredClone(defaults[key]);
  }
}

function write(key, val) {
  localStorage.setItem(NS + key, JSON.stringify(val));
}

export const store = {
  get profile()      { return read('profile'); },
  set profile(v)     { write('profile', v); },

  get saved()        { return read('saved'); },
  set saved(v)       { write('saved', v); },

  get reflections()  { return read('reflections'); },
  set reflections(v) { write('reflections', v); },

  get daily()        { return read('daily'); },
  set daily(v)       { write('daily', v); },

  get streak()       { return read('streak'); },
  set streak(v)      { write('streak', v); },

  get notify()       { return read('notify'); },
  set notify(v)      { write('notify', v); },

  get history()      { return read('history'); },
  set history(v)     { write('history', v); },

  resetAll() {
    Object.keys(defaults).forEach(k => localStorage.removeItem(NS + k));
  },
};

// Convenience: today's date as YYYY-MM-DD in the user's local timezone.
export function todayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Update streak when the user opens today.
export function tickStreak() {
  const today = todayKey();
  const s = store.streak;
  if (s.last === today) return s;
  if (s.last) {
    const prev = new Date(s.last);
    const now = new Date(today);
    const days = Math.round((now - prev) / 86400000);
    s.count = days === 1 ? s.count + 1 : 1;
  } else {
    s.count = 1;
  }
  s.last = today;
  store.streak = s;
  return s;
}
