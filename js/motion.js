import { $, nf, REDUCED, tween } from "./util.js";
import { state } from "./state.js";
import { render } from "./app.js";

export const seenIO = "IntersectionObserver" in window ? new IntersectionObserver((es) => {
  for (const e of es) if (e.isIntersecting) { seenIO.unobserve(e.target); if (e.target._reveal) e.target._reveal(); }
}, { threshold: 0.3 }) : null;

export const pendingSeen = [];

export function whenSeen(el, fn) {
  el._reveal = fn;
  if (!state.revealed) { if (!pendingSeen.includes(el)) pendingSeen.push(el); return; }
  if (seenIO) seenIO.observe(el); else fn();
}

export const T_START = performance.now();

export function reveal() {
  if (state.revealed) return;
  state.revealed = true;
  const sp = $("splash");
  if (sp) { sp.classList.add("gone"); setTimeout(() => sp.remove(), 520); }
  const app = document.querySelector(".app");
  app.classList.add("first"); setTimeout(() => app.classList.remove("first"), 1800);
  pendingSeen.splice(0).forEach((el) => { if (seenIO) seenIO.observe(el); else if (el._reveal) el._reveal(); });
  render();
}

export function countUps() {
  if (REDUCED || !state.revealed) return;
  document.querySelectorAll("[data-count]").forEach((el) => {
    if (el._c) return;
    el._c = true;
    const to = Number(el.dataset.count), dec = Number(el.dataset.dec || 0);
    if (!Number.isFinite(to)) return;
    whenSeen(el, () => tween(1100, (p) => { el.textContent = nf(to * p, dec); }));
  });
}

export const cnt = (v, dec = 0) => `<span data-count="${v}" data-dec="${dec}">${nf(v, dec)}</span>`;

export function setHTML(el, html) { if (el._h !== html) { el._h = html; el.innerHTML = html; } }

export function digits(el, n) {
  if (!state.revealed) n = null;
  const key = n == null ? "x" : String(Math.round(n));
  if (el._s === key) return;
  el._s = key;
  const paint = (v) => {
    const str = v == null ? "––––––" : String(Math.round(v)).padStart(6, "0");
    if (el.children.length !== 7) el.innerHTML = [0, 1, 2, 3, 4, 5].map((i) => `<i style="--i:${i}"></i>`).join("") + "<em>kWh</em>";
    [...str].forEach((ch, i) => { if (el.children[i].textContent !== ch) el.children[i].textContent = ch; });
  };
  const from = el._n || 0;
  el._n = n == null ? 0 : n;
  if (n == null || REDUCED) return paint(n);
  tween(1400, (p) => paint(from + (n - from) * p));
}
