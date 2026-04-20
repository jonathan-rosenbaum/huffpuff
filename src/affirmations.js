// Affirmation library loader.
// All affirmation content lives in /data/sources/*.json. This module fetches
// them at boot, merges them into a single AFFIRMATIONS array, and exposes
// helpers for picking daily/random entries.

export const FOCUS_AREAS = [
  { id: 'worth',      label: 'Worth',      hint: 'enoughness, deserving'       },
  { id: 'calm',       label: 'Calm',       hint: 'peace, stillness, breath'    },
  { id: 'confidence', label: 'Confidence', hint: 'courage, voice, capability'  },
  { id: 'love',       label: 'Love',       hint: 'tenderness, receiving, soft' },
  { id: 'rest',       label: 'Rest',       hint: 'permission, slow, recover'   },
  { id: 'growth',     label: 'Growth',     hint: 'becoming, patience, change'  },
];

export let AFFIRMATIONS = [];
let loaded = false;
let loading = null;

// Each entry, after loading, looks like:
// { id, text, long?, focus: [..], ref?, source: { author, work, era, translator } }

export async function loadAffirmations() {
  if (loaded) return AFFIRMATIONS;
  if (loading) return loading;
  loading = (async () => {
    const indexResp = await fetch('./data/index.json');
    const index = await indexResp.json();
    const files = index.files || [];
    const merged = [];
    const seen = new Set();
    const fileBatches = await Promise.all(
      files.map(name =>
        fetch('./data/sources/' + name)
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      )
    );
    fileBatches.forEach((data, i) => {
      if (!data || !data.entries) return;
      const source = data.source || {};
      for (const entry of data.entries) {
        if (!entry || !entry.id) continue;
        if (seen.has(entry.id)) {
          console.warn('duplicate affirmation id:', entry.id, 'in', files[i]);
          continue;
        }
        seen.add(entry.id);
        merged.push({
          id: entry.id,
          text: entry.text,
          long: entry.long || null,
          focus: Array.isArray(entry.focus) ? entry.focus : (entry.focus ? [entry.focus] : []),
          ref: entry.ref || null,
          source,
        });
      }
    });
    AFFIRMATIONS = merged;
    loaded = true;
    return AFFIRMATIONS;
  })();
  return loading;
}

export function personalize(text) {
  // New content is not personalized with {name}. Kept for backward compat
  // in case a saved entry from a previous version still has the token.
  return String(text || '').replaceAll('{name}', '');
}

function matchesFocus(entry, focus) {
  if (!focus || !focus.length) return true;
  const f = Array.isArray(entry.focus) ? entry.focus : [entry.focus];
  return f.some(x => focus.includes(x));
}

export function pickForDate(dateStr, focus, name, excludeIds = []) {
  const pool = AFFIRMATIONS.filter(a => matchesFocus(a, focus));
  const candidates = pool.filter(a => !excludeIds.includes(a.id));
  const list = candidates.length ? candidates : pool.length ? pool : AFFIRMATIONS;
  if (!list.length) return null;
  const seed = hash(`${dateStr}|${(focus || []).join(',')}|${name || ''}`);
  return list[seed % list.length];
}

export function pickRandom(focus, name, excludeIds = []) {
  const pool = AFFIRMATIONS.filter(a => matchesFocus(a, focus));
  const candidates = pool.filter(a => !excludeIds.includes(a.id));
  const list = candidates.length ? candidates : pool.length ? pool : AFFIRMATIONS;
  if (!list.length) return null;
  return list[Math.floor(Math.random() * list.length)];
}

export function byId(id) {
  return AFFIRMATIONS.find(a => a.id === id) || null;
}

// Build detail-screen "bubbles" derived from an entry's source + long passage.
export function getBubbles(entry) {
  if (!entry) return [];
  const bubbles = [];
  const s = entry.source || {};
  if (s.author) {
    const era = s.era ? ` (${s.era})` : '';
    const work = s.work ? `, *${s.work}*` : '';
    bubbles.push({
      label: 'The source',
      short: `${s.author}${era}${work}.`,
      long: s.translator ? `Translation: ${s.translator}.` : null,
    });
  }
  if (entry.ref) {
    bubbles.push({
      label: 'Citation',
      short: entry.ref,
    });
  }
  if (entry.long) {
    bubbles.push({
      label: 'Context',
      short: entry.long.length > 140 ? entry.long.slice(0, 137) + '…' : entry.long,
      long: entry.long,
    });
  }
  bubbles.push({
    label: 'Sit with this',
    short: 'Read it slowly. Once aloud, once in your head. Then notice what softens.',
  });
  return bubbles;
}

function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}
