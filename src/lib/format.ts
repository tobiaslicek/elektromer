export const MONTHS = ["led", "úno", "bře", "dub", "kvě", "čvn", "čvc", "srp", "zář", "říj", "lis", "pro"];
export const MONTHS_FULL = ["leden", "únor", "březen", "duben", "květen", "červen", "červenec", "srpen", "září", "říjen", "listopad", "prosinec"];

export const nf = (n: number, d = 0) =>
  Number(n).toLocaleString("cs-CZ", { minimumFractionDigits: d, maximumFractionDigits: d });
export const kc = (n: number) => nf(Math.round(n)) + " Kč";

export const D = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
export const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
export const todayIso = () => {
  const n = new Date();
  return iso(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
};
export const fmtDate = (isoStr: string, year = false) => {
  const [y, m, d] = isoStr.split("-").map(Number);
  return d + ". " + m + "." + (year ? " " + y : "");
};
export const dim = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

export function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

export const round = (n: number, step: number) => Math.round(n / step) * step;
