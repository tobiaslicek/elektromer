export interface Reading {
  date: string;
  t1: number;
  t2: number;
}

export interface Settings {
  priceT1: number;
  priceT2: number;
  fixedMonthly: number;
  hasHydronic: boolean;
  hasChimney: boolean;
  woodPrice: number;
  reminderDay: number;
  advance: number;
}

export interface Period {
  from: string;
  to: string;
  days: number;
  d1: number;
  d2: number;
  kwh: number;
  c1: number;
  c2: number;
  fix: number;
  cost: number;
  perDay: number;
  heat: number;
}

export interface Model {
  totKwh: number;
  totDays: number;
  tot1: number;
  tot2: number;
  avgPrice: number;
  base: number;
  annualBase: number;
  annualHeat: number | null;
  annual: number | null;
  share: number;
  hasSummer: boolean;
  annualCost: number | null;
}

export interface ForecastMonth {
  y: number;
  m: number;
  kwh: number;
  cost: number;
}

export interface TechContext {
  H: number;
  B: number;
  DHW: number;
  p: number;
  wood: number;
}

export interface Tech {
  id: string;
  icon: string;
  name: string;
  sub: string;
  cost: [number, number];
  life: number;
  service: number;
  hydronic?: boolean;
  chimney?: boolean;
  save: (c: TechContext) => number;
  how: string;
}

export type Verdict = "good" | "warn" | "bad";

export interface TechResult extends Tech {
  lo: number;
  hi: number;
  extra: string[];
  net: number;
  yLo: number;
  yHi: number;
  yMid: number;
  verdict: Verdict;
}

export type TabId = "prehled" | "odecty" | "investice" | "nastaveni";
