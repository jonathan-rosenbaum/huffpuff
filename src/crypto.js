// End-to-end encryption for Sabrina Is.
// Uses Web Crypto API only — no external deps.
// - PBKDF2 (SHA-256, 310k iters — OWASP 2023 recommendation) to derive a key from passphrase
// - AES-GCM 256 to encrypt/decrypt JSON blobs
// - Per-record random IV; shared salt stored alongside the encrypted record
//
// The passphrase NEVER leaves the device. The derived key lives only in memory
// (optionally sessionStorage-backed for the tab lifetime).

const KDF_ITERS = 310_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64(bytes) {
  let s = '';
  bytes.forEach(b => s += String.fromCharCode(b));
  return btoa(s);
}
function unb64(str) {
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function importPassphrase(passphrase) {
  return crypto.subtle.importKey(
    'raw', enc.encode(passphrase),
    { name: 'PBKDF2' }, false, ['deriveKey']
  );
}

export async function deriveKey(passphrase, saltBytes) {
  const base = await importPassphrase(passphrase);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBytes, iterations: KDF_ITERS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export function randomSalt() { return crypto.getRandomValues(new Uint8Array(SALT_BYTES)); }
export function randomIV()   { return crypto.getRandomValues(new Uint8Array(IV_BYTES)); }

// Encrypt a JSON-serializable value into { iv, ct } strings (base64).
export async function encryptJSON(key, value) {
  const iv = randomIV();
  const pt = enc.encode(JSON.stringify(value));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, pt);
  return { iv: b64(iv), ct: b64(new Uint8Array(ct)) };
}

export async function decryptJSON(key, { iv, ct }) {
  const ivBytes = unb64(iv);
  const ctBytes = unb64(ct);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, key, ctBytes);
  return JSON.parse(dec.decode(pt));
}

// ---------- Vault: single-envelope encryption for the whole store ----------
// We serialize the full user state, encrypt with the key derived from passphrase,
// and store one big envelope under 'sabrina.v1.vault'.
// A separate 'sabrina.v1.vault.meta' holds { salt, check } — a short plaintext
// authenticator so we can verify the passphrase without touching the vault.

const META_KEY  = 'sabrina.v1.vault.meta';
const VAULT_KEY = 'sabrina.v1.vault';
const CHECK_PLAINTEXT = 'sabrina:unlock-ok';

export function hasVault() {
  return !!localStorage.getItem(META_KEY) && !!localStorage.getItem(VAULT_KEY);
}

export async function createVault(passphrase, initialState) {
  const salt = randomSalt();
  const key = await deriveKey(passphrase, salt);
  const check = await encryptJSON(key, CHECK_PLAINTEXT);
  const vault = await encryptJSON(key, initialState);
  localStorage.setItem(META_KEY, JSON.stringify({ salt: b64(salt), check }));
  localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
  return key;
}

export async function unlockVault(passphrase) {
  const meta = JSON.parse(localStorage.getItem(META_KEY));
  const salt = unb64(meta.salt);
  const key = await deriveKey(passphrase, salt);
  try {
    const ok = await decryptJSON(key, meta.check);
    if (ok !== CHECK_PLAINTEXT) throw new Error('bad');
  } catch {
    const e = new Error('wrong passphrase');
    e.code = 'WRONG_PASSPHRASE';
    throw e;
  }
  return key;
}

export async function readVault(key) {
  const raw = localStorage.getItem(VAULT_KEY);
  if (!raw) return null;
  return decryptJSON(key, JSON.parse(raw));
}

export async function writeVault(key, state) {
  const vault = await encryptJSON(key, state);
  localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
}

export function destroyVault() {
  localStorage.removeItem(META_KEY);
  localStorage.removeItem(VAULT_KEY);
}

// ---------- Exportable encrypted backup ----------
// Format: { v: 1, salt, check, vault, exported }
// The backup is self-contained — the receiver enters the passphrase on import.
export function exportBackup() {
  const meta = JSON.parse(localStorage.getItem(META_KEY) || 'null');
  const vault = JSON.parse(localStorage.getItem(VAULT_KEY) || 'null');
  if (!meta || !vault) throw new Error('Nothing to export yet.');
  return {
    v: 1,
    exported: new Date().toISOString(),
    salt: meta.salt,
    check: meta.check,
    vault,
  };
}

export async function importBackup(backup, passphrase) {
  if (!backup || backup.v !== 1) throw new Error('Unsupported backup format');
  const salt = unb64(backup.salt);
  const key = await deriveKey(passphrase, salt);
  try {
    const ok = await decryptJSON(key, backup.check);
    if (ok !== CHECK_PLAINTEXT) throw new Error('bad');
  } catch {
    const e = new Error('wrong passphrase for this backup');
    e.code = 'WRONG_PASSPHRASE';
    throw e;
  }
  // At this point the passphrase is valid. Replace local vault + meta.
  localStorage.setItem(META_KEY, JSON.stringify({ salt: backup.salt, check: backup.check }));
  localStorage.setItem(VAULT_KEY, JSON.stringify(backup.vault));
  return key;
}
