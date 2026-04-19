// Sabrina Is state layer.
// Two modes:
//  - PLAINTEXT (default): each key written to its own localStorage entry.
//  - VAULT (opt-in): the entire state lives in an encrypted envelope, decrypted
//    in memory after the user unlocks with their passphrase.
//
// The public API (`store.profile`, etc.) is stable across modes.

import { hasVault as hasVaultBlob, createVault, unlockVault, readVault, writeVault, destroyVault } from './crypto.js';

const NS = 'sabrina.v1.';
const KEYS = ['profile', 'saved', 'reflections', 'daily', 'streak', 'notify', 'history'];

const defaults = () => ({
  profile:     { name: '', focus: [], onboarded: false, created: null },
  saved:       [],
  reflections: [],
  daily:       null,
  streak:      { last: null, count: 0 },
  notify:      { enabled: false, times: ['08:00'] },
  history:     [],
});

// Runtime state: the in-memory mirror.
let mem = defaults();
let vaultKey = null;       // non-null only when unlocked in vault mode
let mode = 'plaintext';    // 'plaintext' | 'locked' | 'unlocked'

// ---------- Boot ----------
// Called once at app start, before any rendering.
export async function initStorage() {
  if (hasVaultBlob()) {
    mode = 'locked';
    // mem stays at defaults until unlock()
  } else {
    mode = 'plaintext';
    loadPlaintext();
  }
}

export function currentMode() { return mode; }
export function hasVault() { return hasVaultBlob(); }
export function isLocked() { return mode === 'locked'; }

function loadPlaintext() {
  const d = defaults();
  KEYS.forEach(k => {
    try {
      const raw = localStorage.getItem(NS + k);
      mem[k] = raw === null ? d[k] : JSON.parse(raw);
    } catch {
      mem[k] = d[k];
    }
  });
}

// ---------- Vault lifecycle ----------
export async function setupVault(passphrase) {
  // Migrate whatever is in plaintext into the vault, then wipe plaintext keys.
  const key = await createVault(passphrase, mem);
  vaultKey = key;
  mode = 'unlocked';
  KEYS.forEach(k => localStorage.removeItem(NS + k));
}

export async function unlock(passphrase) {
  const key = await unlockVault(passphrase);
  const state = await readVault(key);
  mem = { ...defaults(), ...state };
  vaultKey = key;
  mode = 'unlocked';
}

export function lock() {
  if (mode !== 'unlocked') return;
  vaultKey = null;
  mem = defaults();
  mode = 'locked';
}

// Remove encryption entirely — decrypt to plaintext keys. Requires currently unlocked.
export function removeVault() {
  if (mode !== 'unlocked') throw new Error('unlock first');
  destroyVault();
  // Write current state back to individual plaintext keys
  KEYS.forEach(k => localStorage.setItem(NS + k, JSON.stringify(mem[k])));
  vaultKey = null;
  mode = 'plaintext';
}

// ---------- Persistence ----------
function persistKey(k) {
  if (mode === 'unlocked') {
    // Re-encrypt the full vault. Each setter triggers this — safe because
    // interactions are user-driven and infrequent.
    writeVault(vaultKey, mem).catch(err => console.error('vault write failed', err));
  } else if (mode === 'plaintext') {
    localStorage.setItem(NS + k, JSON.stringify(mem[k]));
  }
  // mode === 'locked' → writes are a no-op (shouldn't happen — lock screen blocks UI)
}

// ---------- Public store API ----------
export const store = {
  get profile()      { return mem.profile; },
  set profile(v)     { mem.profile = v; persistKey('profile'); },

  get saved()        { return mem.saved; },
  set saved(v)       { mem.saved = v; persistKey('saved'); },

  get reflections()  { return mem.reflections; },
  set reflections(v) { mem.reflections = v; persistKey('reflections'); },

  get daily()        { return mem.daily; },
  set daily(v)       { mem.daily = v; persistKey('daily'); },

  get streak()       { return mem.streak; },
  set streak(v)      { mem.streak = v; persistKey('streak'); },

  get notify()       { return mem.notify; },
  set notify(v)      { mem.notify = v; persistKey('notify'); },

  get history()      { return mem.history; },
  set history(v)     { mem.history = v; persistKey('history'); },

  resetAll() {
    mem = defaults();
    KEYS.forEach(k => localStorage.removeItem(NS + k));
    destroyVault();
    vaultKey = null;
    mode = 'plaintext';
  },
};

// Dates helper.
export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function tickStreak() {
  const today = todayKey();
  const s = store.streak;
  if (s.last === today) return s;
  if (s.last) {
    const days = Math.round((new Date(today) - new Date(s.last)) / 86400000);
    s.count = days === 1 ? s.count + 1 : 1;
  } else {
    s.count = 1;
  }
  s.last = today;
  store.streak = s;
  return s;
}
