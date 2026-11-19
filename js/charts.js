import { $, nf, esc, niceMax } from "./util.js";
import { whenSeen } from "./motion.js";

export function barChart(el, cols, opt) {
  const W = Math.max(280, el.clientWidth || 340), H = 190, L = 40, R = 6, T = 12, B = 24;
  const sig = JSON.stringify([cols, opt.sel, W]);
  if (el._sig === sig) return;
  el._sig = sig;
  const anim = el._ak !== opt.animKey;
  el._ak = opt.animKey;
  const max = niceMax(Math.max(...cols.map((c) => c.segs.reduce((a, s) => a + s.v, 0))));
  const y = (v) => T + (H - T - B) * (1 - v / max);
  const slot = (W - L - R) / cols.length, bw = Math.min(34, slot * 0.62);
  let g = "";
  for (let i = 0; i <= 4; i++) {
    const v = max * i / 4;
    g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(${i ? "--line" : "--axis"})" stroke-width="1"/>`;
    g += `<text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${nf(v)}</text>`;
  }
  cols.forEach((c, i) => {
    const cx = L + slot * i + slot / 2, x = cx - bw / 2;
    const segs = c.segs.filter((s) => s.v > 0);
    let acc = 0;
    segs.forEach((s, k) => {
      const y0 = y(acc), y1 = y(acc + s.v);
      acc += s.v;
      const top = k === segs.length - 1;
      let h = Math.max(2, y0 - y1 - (k ? 2 : 0));
      const yy = y0 - (k ? 2 : 0) - h;
      const r = top ? Math.min(4, h) : 0;
      g += `<path d="M${x},${yy + h}V${yy + r}q0,${-r} ${r},${-r}H${x + bw - r}q${r},0 ${r},${r}V${yy + h}z" class="bar" style="--i:${i}" fill="var(${s.color})" opacity="${opt.sel == null || opt.sel === i ? 1 : 0.45}"/>`;
    });
    if (!cols.some((cc) => cc.label.length > 3) || cols.length <= 8 || i % 2 === 0) g += `<text x="${cx}" y="${H - 7}" text-anchor="middle" class="${opt.sel === i ? "val" : ""}">${esc(c.label)}</text>`;
    g += `<rect data-i="${i}" x="${L + slot * i}" y="${T}" width="${slot}" height="${H - T}" fill="transparent" style="cursor:pointer"/>`;
  });
  el.innerHTML = `<svg class="${anim ? "anim" : ""}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opt.aria)}">${g}</svg>`;
  settle(el, anim);
  wire(el, opt.onSel);
}

export function settle(el, anim) {
  const svg = el.firstChild;
  const play = (v) => { v.classList.remove("wait"); v.classList.add("anim"); setTimeout(() => v.classList.remove("anim"), 2600); };
  if (!el._seen) {
    svg.classList.remove("anim"); svg.classList.add("wait");
    whenSeen(el, () => { el._seen = true; play(el.firstChild); });
  } else if (anim) play(svg);
}

export function lineChart(el, pts, opt) {
  const W = Math.max(280, el.clientWidth || 340), H = 170, L = 40, R = 16, T = 20, B = 24;
  const sig = JSON.stringify([pts, opt.sel, W]);
  if (el._sig === sig) return;
  el._sig = sig;
  const anim = el._ak !== opt.animKey;
  el._ak = opt.animKey;
  const max = niceMax(Math.max(...pts.map((p) => p.v)));
  const y = (v) => T + (H - T - B) * (1 - v / max);
  const slot = (W - L - R) / pts.length;
  const x = (i) => L + slot * i + slot / 2;
  let g = "";
  for (let i = 0; i <= 4; i++) {
    const v = max * i / 4;
    g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(${i ? "--line" : "--axis"})" stroke-width="1"/>`;
    g += `<text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${nf(v)}</text>`;
  }
  if (pts.length > 1) g += `<polyline class="draw" pathLength="1" fill="none" stroke="var(--t2)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="${pts.map((p, i) => x(i) + "," + y(p.v)).join(" ")}"/>`;
  pts.forEach((p, i) => {
    const on = opt.sel === i;
    g += `<circle class="pt" style="--i:${i}" cx="${x(i)}" cy="${y(p.v)}" r="${on ? 6 : 4.5}" fill="var(--t2)" stroke="var(--sheet)" stroke-width="2"/>`;
    if (on) g += `<text x="${x(i)}" y="${y(p.v) - 11}" text-anchor="middle" class="val">${nf(p.v, 1)}</text>`;
    if (pts.length <= 8 || i % 2 === 0) g += `<text x="${x(i)}" y="${H - 7}" text-anchor="middle" class="${on ? "val" : ""}">${esc(p.label)}</text>`;
    g += `<rect data-i="${i}" x="${L + slot * i}" y="0" width="${slot}" height="${H}" fill="transparent" style="cursor:pointer"/>`;
  });
  el.innerHTML = `<svg class="${anim ? "anim" : ""}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opt.aria)}">${g}</svg>`;
  settle(el, anim);
  wire(el, opt.onSel);
}

export function wire(el, onSel) {
  const pick = (e) => { const i = e.target && e.target.dataset ? e.target.dataset.i : null; if (i != null) onSel(Number(i)); };
  el.onclick = pick;
  el.onpointermove = (e) => { if (e.pointerType === "mouse") pick(e); };
}
