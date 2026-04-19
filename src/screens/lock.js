import { unlock } from '../storage.js';
import { toast } from '../app.js';

export function renderLock({ onUnlocked }) {
  const el = document.createElement('section');
  el.className = 'screen';
  el.innerHTML = `
    <div class="ob" style="text-align:center;">
      <div class="eyebrow">Locked</div>
      <h1 class="ob-title">Welcome back.</h1>
      <p class="ob-sub">Your passphrase unlocks<br/>what\u2019s yours.</p>
      <input class="ob-input" id="pass" type="password" placeholder="passphrase" autocomplete="current-password" />
      <button class="big-btn" id="go">Unlock</button>
      <p class="ob-sub" style="margin-top:20px; font-size:12px;">Passphrases can\u2019t be recovered. If yours is lost,<br/>only an exported backup can restore your data.</p>
    </div>
  `;
  const input = el.querySelector('#pass');
  const btn = el.querySelector('#go');
  setTimeout(() => input.focus(), 50);

  async function tryUnlock() {
    const pass = input.value;
    if (!pass) return;
    btn.disabled = true;
    btn.textContent = 'Unlocking\u2026';
    try {
      await unlock(pass);
      toast('welcome back');
      onUnlocked();
    } catch (e) {
      btn.disabled = false;
      btn.textContent = 'Unlock';
      input.value = '';
      input.focus();
      toast(e.code === 'WRONG_PASSPHRASE' ? 'that\u2019s not quite right' : 'unlock failed');
    }
  }
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryUnlock(); });
  btn.addEventListener('click', tryUnlock);
  return el;
}
