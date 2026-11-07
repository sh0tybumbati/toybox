// Game modes (pure, tested). Kid mode is the Toybox everyone knows; hard mode is the adults-only life sim
// (docs/hardcore-mode.md). They are two separate saves: nothing in the kid save reads hard-mode data.
export const MODES = ['kid', 'hard'];
export const COIN_TO_CASH = 100;                      // 1 coin = 100 cash (cash is the smaller denomination)

export const toCash = coins => Math.max(0, Math.floor(coins)) * COIN_TO_CASH;
export const toCoins = cash => Math.floor(Math.max(0, cash) / COIN_TO_CASH);

// The bank: swap `n` coins for cash ('toCash') or `n` coins' worth of cash back into coins ('toCoins').
// Takes and returns { coins, cash } (coins = the kid-mode purse); null if you can't afford it.
export function exchange({ coins, cash }, direction, n) {
  n = Math.floor(n);
  if (!(n > 0)) return null;
  if (direction === 'toCash') return coins >= n ? { coins: coins - n, cash: cash + toCash(n) } : null;
  if (direction === 'toCoins') return cash >= toCash(n) ? { coins: coins + n, cash: cash - toCash(n) } : null;
  return null;
}

// --- the lock -----------------------------------------------------------------------------------
// Not security, just a gate a child won't get through: a 4-digit PIN kept as a hash.
export const isPin = s => typeof s === 'string' && /^\d{4}$/.test(s);
export function hashPin(pin) {
  let h = 5381;
  for (const ch of `toybox:${pin}`) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0;
  return h.toString(36);
}
export const checkPin = (pin, hash) => isPin(pin) && typeof hash === 'string' && hashPin(pin) === hash;

// The hidden switch: tap the version text `need` times, each within `gap` ms of the last.
export function tapCounter(state, now, { need = 7, gap = 2500 } = {}) {
  const n = state && now - state.t <= gap ? state.n + 1 : 1;
  return n >= need ? { n: 0, t: now, open: true } : { n, t: now, open: false };
}

// --- the setup chosen when a hard-mode game starts -----------------------------------------------
export const FAILURE_MODES = ['soft', 'true'];                       // soft = debt and a recovery path; true = permadeath, real homelessness
export const TOGGLES = ['violence', 'substances', 'police', 'survival'];
export const defaultSetup = () => ({ failure: 'soft', toggles: { violence: true, substances: true, police: true, survival: true }, scenario: 'bench' });

export function cleanSetup(raw, scenarios) {
  const d = defaultSetup(), s = raw && typeof raw === 'object' ? raw : {};
  return {
    failure: FAILURE_MODES.includes(s.failure) ? s.failure : d.failure,
    toggles: Object.fromEntries(TOGGLES.map(t => [t, s.toggles && typeof s.toggles[t] === 'boolean' ? s.toggles[t] : d.toggles[t]])),
    scenario: scenarios.includes(s.scenario) ? s.scenario : d.scenario,
  };
}
