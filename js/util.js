export const $ = (id) => document.getElementById(id);

export const MONTHS = ["led", "úno", "bře", "dub", "kvě", "čvn", "čvc", "srp", "zář", "říj", "lis", "pro"];

export const MONTHS_FULL = ["leden", "únor", "březen", "duben", "květen", "červen", "červenec", "srpen", "září", "říjen", "listopad", "prosinec"];

export const nf = (n, d = 0) => Number(n).toLocaleString("cs-CZ", { minimumFractionDigits: d, maximumFractionDigits: d });

export const kc = (n) => nf(Math.round(n)) + " Kč";

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const D = (iso) => { const [y, m, d] = iso.split("-").map(Number); return Date.UTC(y, m - 1, d); };

export const iso = (t) => new Date(t).toISOString().slice(0, 10);

export const todayIso = () => { const n = new Date(); return iso(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())); };

export const fmtDate = (isoStr, year) => { const [y, m, d] = isoStr.split("-").map(Number); return d + ". " + m + "." + (year ? " " + y : ""); };

export const dim = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

export function niceMax(v) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

export const REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const easeOut = (p) => 1 - Math.pow(1 - p, 4);

export function tween(ms, paint) {
  let done = false;
  const t0 = performance.now();
  const end = () => { if (!done) { done = true; paint(1); } };
  const step = (t) => { if (done) return; const p = Math.min(1, (t - t0) / ms); if (p >= 1) return end(); paint(easeOut(p)); requestAnimationFrame(step); };
  requestAnimationFrame(step);
  setTimeout(end, ms + 400);
}
