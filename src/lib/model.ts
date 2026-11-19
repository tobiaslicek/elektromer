import { D, dim } from "./format";
import type { ForecastMonth, Model, Period, Reading, Settings, Tech, TechContext, TechResult, Verdict } from "../types";

export const DEFAULTS: Settings = { priceT1: 4, priceT2: 3.5, fixedMonthly: 0, hasHydronic: false, hasChimney: true, woodPrice: 1900, reminderDay: 15, advance: 0 };

export const HDD_RAW = [18, 15, 13, 8, 3, 0, 0, 0, 2.5, 8, 13, 17.5];

export const HDD_SUM = HDD_RAW.reduce((a, b) => a + b, 0);

export const HDD = HDD_RAW.map((v) => v / HDD_SUM);

export function hddShare(fromIso: string, toIso: string) {
  let s = 0;
  for (let t = D(fromIso); t < D(toIso); t += 864e5) {
    const dt = new Date(t);
    s += HDD[dt.getUTCMonth()] / dim(dt.getUTCFullYear(), dt.getUTCMonth());
  }
  return s;
}

export function periods(readings: Reading[], s: Settings): Period[] {
  const out: Period[] = [];
  for (let i = 1; i < readings.length; i++) {
    const a = readings[i - 1], b = readings[i];
    const days = Math.round((D(b.date) - D(a.date)) / 864e5);
    if (days <= 0) continue;
    const d1 = b.t1 - a.t1, d2 = b.t2 - a.t2;
    const c1 = d1 * s.priceT1, c2 = d2 * s.priceT2, fix = s.fixedMonthly * days / 30.44;
    out.push({ from: a.date, to: b.date, days, d1, d2, kwh: d1 + d2, c1, c2, fix, cost: c1 + c2 + fix, perDay: (d1 + d2) / days, heat: hddShare(a.date, b.date) });
  }
  return out;
}

export function model(P: Period[], s: Settings): Model | null {
  if (!P.length) return null;
  const totKwh = P.reduce((a, p) => a + p.kwh, 0), totDays = P.reduce((a, p) => a + p.days, 0);
  const tot1 = P.reduce((a, p) => a + p.d1, 0), tot2 = P.reduce((a, p) => a + p.d2, 0);
  const energyCost = P.reduce((a, p) => a + p.c1 + p.c2, 0);
  const avgPrice = totKwh > 0 ? energyCost / totKwh : s.priceT2;
  const summer = P.filter((p) => p.heat < 0.01).map((p) => p.perDay).sort((a, b) => a - b);
  const base = summer.length ? summer[Math.floor((summer.length - 1) / 2)] : Math.min(...P.map((p) => p.perDay));
  let heat = 0, share = 0;
  for (const p of P) if (p.heat >= 0.005) { heat += Math.max(0, p.kwh - base * p.days); share += p.heat; }
  const annualHeat = share >= 0.08 ? heat / share : null;
  const annualBase = base * 365;
  const annual = annualHeat == null ? null : annualBase + annualHeat;
  return { totKwh, totDays, tot1, tot2, avgPrice, base, annualBase, annualHeat, annual, share, hasSummer: summer.length > 0,
    annualCost: annual == null ? null : annual * avgPrice + s.fixedMonthly * 12 };
}

export function forecast(M: Model | null, lastIso: string, s: Settings): ForecastMonth[] {
  if (!M || M.annualHeat == null) return [];
  const last = new Date(D(lastIso));
  const out: ForecastMonth[] = [];
  for (let i = 1; i <= 12; i++) {
    const dt = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth() + i, 1));
    const y = dt.getUTCFullYear(), m = dt.getUTCMonth();
    const kwh = M.base * dim(y, m) + M.annualHeat * HDD[m];
    out.push({ y, m, kwh, cost: kwh * M.avgPrice + s.fixedMonthly });
  }
  return out;
}

export const TECH: Tech[] = [
  { id: "a1", icon: "14-klimatizace", name: "Jedna klimatizace s topením", sub: "Jedna jednotka do hlavní obytné místnosti.", cost: [38000, 55000], life: 14, service: 800,
    save: (c: TechContext) => c.H * 0.4 * (1 - 1 / 3.2) * c.p,
    how: "Počítá se s tím, že vytopí hlavní místnost a tím pokryje 40 % topení. Z 1 kWh elektřiny udělá asi 3,2 kWh tepla. V létě chladí." },
  { id: "aa", icon: "15-tc-vzduch-vzduch", name: "Tepelné čerpadlo vzduch–vzduch", sub: "Klimatizace, která i topí. Dvě až tři vnitřní jednotky.", cost: [80000, 160000], life: 14, service: 1500,
    save: (c: TechContext) => c.H * 0.65 * (1 - 1 / 3.2) * c.p,
    how: "Počítá se s tím, že pokryje 65 % topení a z 1 kWh elektřiny udělá 3,2 kWh tepla. V létě chladí, to je pohodlí navíc a ve výpočtu není." },
  { id: "aw", icon: "16-tc-vzduch-voda", name: "Tepelné čerpadlo vzduch–voda", sub: "Topí do radiátorů nebo podlahovky a ohřívá vodu.", cost: [280000, 450000], life: 18, service: 3000, hydronic: true,
    save: (c: TechContext) => (c.H * (1 - 1 / 3.2) + c.DHW * (1 - 1 / 2.5)) * c.p,
    how: "Pokryje celé topení (z 1 kWh udělá v průměru 3,2 kWh tepla, v mrazech méně) a ohřev vody. Potřebuje teplovodní rozvod." },
  { id: "dhw", icon: "17-bojler", name: "Bojler s tepelným čerpadlem", sub: "Náhrada elektrického bojleru.", cost: [45000, 75000], life: 15, service: 500,
    save: (c: TechContext) => c.DHW * (1 - 1 / 2.8) * c.p,
    how: "Ohřev vody tvoří odhadem 40 % spotřeby mimo topení. Bojler s tepelným čerpadlem na ni spotřebuje asi třetinu elektřiny." },
  { id: "pv", icon: "18-fotovoltaika", name: "Fotovoltaika 5 kWp bez baterie", sub: "Panely na střeše, přebytky do sítě.", cost: [120000, 180000], life: 25, service: 1500,
    save: (c: TechContext) => { const prod = 5000, self = Math.min(prod * 0.32, c.B * 0.5 + c.H * 0.08); return self * c.p + (prod - self) * 0.8; },
    how: "Vyrobí asi 5 000 kWh za rok, většinu v létě. Bez baterie doma spotřebujete zhruba třetinu, zbytek prodáte asi za 0,80 Kč/kWh. V zimě, kdy topíte, vyrábí málo." },
  { id: "pvb", icon: "19-fotovoltaika-baterie", name: "Fotovoltaika 5 kWp s baterií", sub: "Panely a baterie kolem 7 kWh.", cost: [220000, 300000], life: 22, service: 2000,
    save: (c: TechContext) => { const prod = 5000, self = Math.min(prod * 0.62, c.B * 0.8 + c.H * 0.12); return self * c.p + (prod - self) * 0.8; },
    how: "Baterie zvedne podíl doma spotřebované výroby asi na 60 %. Baterii je potřeba po 12 až 15 letech vyměnit." },
  { id: "stove", icon: "20-kamna", name: "Krbová kamna teplovzdušná", sub: "Vytopí místnost, kde stojí, a okolí.", cost: [25000, 60000], life: 20, service: 1500, chimney: true,
    save: (c: TechContext) => c.H * 0.35 * (c.p - c.wood),
    how: "Počítá se s tím, že dřevem nahradíte 35 % topení. Úspora je rozdíl mezi cenou elektřiny a dřeva. Dřevo je práce: skládání, přikládání, popel." },
  { id: "stovew", icon: "21-kamna-vymenik", name: "Krbová kamna s teplovodním výměníkem", sub: "Část tepla jde do radiátorů a zásobníku.", cost: [90000, 170000], life: 20, service: 2000, chimney: true, hydronic: true,
    save: (c: TechContext) => c.H * 0.7 * (c.p - c.wood),
    how: "S akumulační nádrží pokryjí asi 70 % topení. Potřebují teplovodní rozvod a komín." },
  { id: "ins", icon: "22-zatepleni", name: "Zateplení a okna", sub: "Fasáda, strop nebo střecha, případně okna.", cost: [400000, 900000], life: 40, service: 0,
    save: (c: TechContext) => c.H * 0.3 * c.p,
    how: "Počítá se s úsporou 30 % tepla. Skutečný přínos hodně závisí na tom, v jakém stavu dům je." },
];

export function invest(M: Model | null, s: Settings): TechResult[] {
  if (!M || M.annualHeat == null) return [];
  const c: TechContext = { H: M.annualHeat, B: M.annualBase, DHW: M.annualBase * 0.4, p: s.priceT2, wood: s.woodPrice / 950 };
  return TECH.map((t) => {
    let lo = t.cost[0], hi = t.cost[1];
    const extra: string[] = [];
    if (t.hydronic && !s.hasHydronic) { lo += 150000; hi += 250000; extra.push("včetně nového teplovodního rozvodu"); }
    if (t.chimney && !s.hasChimney) { lo += 60000; hi += 120000; extra.push("včetně nového komínu"); }
    const net = t.save(c) - t.service;
    const mid = (lo + hi) / 2;
    const yLo = net > 0 ? lo / net : Infinity, yHi = net > 0 ? hi / net : Infinity, yMid = net > 0 ? mid / net : Infinity;
    const verdict: Verdict = yMid <= t.life * 0.65 ? "good" : yMid <= t.life ? "warn" : "bad";
    return { ...t, lo, hi, extra, net, yLo, yHi, yMid, verdict };
  }).sort((a, b) => a.yMid / a.life - b.yMid / b.life || a.yMid - b.yMid);
}

export function dueInfo(readings: Reading[], s: Settings) {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth(), day = s.reminderDay || 15;
  const ym = y + "-" + String(m + 1).padStart(2, "0");
  const hasThis = readings.some((r) => r.date.startsWith(ym));
  const today = Date.UTC(y, m, now.getDate());
  const due = hasThis ? Date.UTC(y, m + 1, day) : Date.UTC(y, m, day);
  return { due, days: Math.round((due - today) / 864e5) };
}

export function prevFor(readings: Reading[], dateIso: string): Reading | null {
  let prev: Reading | null = null;
  for (const r of readings) if (r.date < dateIso) prev = r;
  return prev;
}
