import { useEffect, useRef, useState } from "react";
import { BarChart, LineChart } from "../components/charts";
import { Banner, BannerTitle, Card, CountUp, Delta, Dot, Icon, Intro, Readout, Split, Stat, btnCls, cardCls } from "../components/ui";
import { MONTHS, MONTHS_FULL, D, fmtDate, iso, kc, nf, round } from "../lib/format";
import { dueInfo, forecast } from "../lib/model";
import { REDUCED, tween } from "../lib/motion";
import type { Model, Period, Reading, Settings } from "../types";

function Digits({ value, row }: { value: number | null; row: number }) {
  const [shown, setShown] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    if (value == null) return;
    const from = prev.current;
    prev.current = value;
    if (REDUCED) {
      setShown(value);
      return;
    }
    return tween(1400, (p) => setShown(from + (value - from) * p));
  }, [value]);
  const str = value == null ? "––––––" : String(Math.round(shown)).padStart(6, "0");
  return (
    <div className="flex items-center gap-1">
      {[...str].map((ch, i) => (
        <i key={i} className="digit min-w-6 rounded-[5px] bg-cell px-[5px] py-[7px] text-center font-mono text-[22px] leading-none font-semibold not-italic"
          style={{ "--i": i + row * 2.5 } as React.CSSProperties}>
          {ch}
        </i>
      ))}
      <em className="ml-[5px] font-mono text-xs font-medium text-muted not-italic">kWh</em>
    </div>
  );
}

interface Props {
  readings: Reading[];
  settings: Settings;
  periods: Period[];
  model: Model | null;
  loaded: boolean;
  onPhoto: () => void;
  onManual: () => void;
  onShowReadings: () => void;
}

export function Overview({ readings, settings: s, periods: P, model: M, loaded, onPhoto, onManual, onShowReadings }: Props) {
  const last = readings[readings.length - 1];
  const di = dueInfo(readings, s);
  const [unit, setUnit] = useState<"kwh" | "kc">("kwh");
  const [selBar, setSelBar] = useState<number | null>(null);
  const [selDay, setSelDay] = useState<number | null>(null);
  const [selFc, setSelFc] = useState(0);

  const PB = P.slice(-12);
  const lab = (q: Period) => MONTHS[new Date(D(q.to)).getUTCMonth()];
  const bi = selBar != null && selBar < PB.length ? selBar : PB.length - 1;
  const dayI = selDay != null && selDay < PB.length ? selDay : PB.length - 1;
  const p = P[P.length - 1], prev = P[P.length - 2];
  const totCost = P.reduce((a, x) => a + x.cost, 0);
  const maxP = P.reduce((a, x) => (x.perDay > a.perDay ? x : a), P[0]);
  const F = last ? forecast(M, last.date, s) : [];
  const kcMode = unit === "kc";

  return (
    <>
      <Intro
        icon="03-elektromer"
        title={di.days > 0 ? `Další odečet za ${di.days} dní` : "Je čas na samoodečet"}
        sub={`${di.days > 0 ? "Termín " : "Termín byl "}${fmtDate(iso(di.due), true)}${last ? " · poslední stav z " + fmtDate(last.date) : ""}`}
      />

      {di.days <= 0 && (
        <div className="flex items-center gap-3 rounded-2xl bg-signal px-[18px] py-4 font-medium text-signal-ink">
          <Icon name="08-pripominka" size={48} />
          <span>
            <b className="font-display">Je čas na samoodečet.</b> Termín byl {fmtDate(iso(di.due))}
            {di.days < 0 ? `, to je před ${-di.days} dny.` : ", tedy dnes."}
          </span>
        </div>
      )}

      <section className={`${cardCls} !gap-5 !py-[26px]`} aria-label="Poslední stav elektroměru">
        {(["t1", "t2"] as const).map((t, row) => (
          <div key={t} className="flex items-center justify-between gap-2.5">
            <div className="flex min-w-0 flex-col">
              <b className="flex items-center gap-[7px] font-display text-[15px] font-semibold">
                <Dot color={t} />
                {t.toUpperCase()}
              </b>
              <span className="text-xs text-muted">{t === "t1" ? "vysoký tarif" : "nízký tarif"}</span>
            </div>
            <Digits value={last ? last[t] : null} row={row} />
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-[18px] text-xs text-muted">
          <span>{last ? "Stav k " + fmtDate(last.date, true) : loaded ? "Zatím bez odečtu" : "Načítám odečty…"}</span>
          {readings.length > 0 && (
            <button type="button" onClick={onShowReadings} className="press -my-2.5 py-2.5 pl-3 text-[13px] font-semibold text-ink underline underline-offset-[3px]">
              {readings.length} odečtů ›
            </button>
          )}
        </div>
      </section>

      <div className="flex flex-col items-center gap-2">
        <button type="button" onClick={onPhoto} className={`${btnCls} w-full bg-signal text-base text-signal-ink`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M7 12h10" />
          </svg>
          Vyfotit elektroměr
        </button>
        <button type="button" onClick={onManual} className="press px-2 py-2.5 text-sm font-medium text-on-dark-2 underline underline-offset-[3px]">
          Zadat stav ručně
        </button>
      </div>

      {loaded && P.length === 0 && (
        <Card className="items-center text-center text-ink-2">
          <h2 className="font-display text-base font-semibold text-ink">Zatím tu nejsou žádné odečty</h2>
          <p>Vyfoťte displej elektroměru. Po druhém odečtu se objeví spotřeba, cena a grafy.</p>
        </Card>
      )}

      {p && M && (
        <>
          <Card>
            <Banner icon="01-spotreba">
              <p className="text-[11px] leading-normal font-semibold tracking-[0.08em] text-[#ffb38c] uppercase">
                Poslední období · {fmtDate(p.from)} až {fmtDate(p.to)} · {p.days} dní
              </p>
            </Banner>
            <div className="flex flex-wrap items-baseline justify-between gap-4 pt-3.5">
              {[[p.kwh, "kWh"], [Math.round(p.cost), "Kč"]].map(([v, u]) => (
                <p key={u} className="font-display text-[34px] leading-none font-bold tracking-[-0.02em] tabular-nums">
                  <CountUp value={v as number} /> <small className="text-[17px] font-semibold tracking-normal text-ink-2">{u}</small>
                </p>
              ))}
            </div>
            {prev && <div className="mb-2.5 flex"><Delta pct={(p.perDay / prev.perDay - 1) * 100} long /></div>}
            <Split>
              <Stat dot="t1" k="T1 vysoký tarif" v={<><CountUp value={p.d1} /> kWh</>} s={kc(p.c1)} />
              <Stat dot="t2" k="T2 nízký tarif" v={<><CountUp value={p.d2} /> kWh</>} s={kc(p.c2)} />
            </Split>
          </Card>

          <Card>
            <div className="flex flex-col gap-3.5">
              <Banner icon="04-graf-spotreby"><BannerTitle>Spotřeba po odečtech</BannerTitle></Banner>
              <div className="inline-flex self-end rounded-[10px] bg-well p-[3px]" role="group" aria-label="Jednotka grafu">
                {(["kwh", "kc"] as const).map((u) => (
                  <button key={u} type="button" aria-pressed={unit === u} onClick={() => setUnit(u)}
                    className={`press min-h-8 rounded-lg px-3 py-1.5 text-[13px] font-semibold ${unit === u ? "bg-t1 text-white" : "text-ink-2"}`}>
                    {u === "kwh" ? "kWh" : "Kč"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-x-[18px] gap-y-2.5 text-xs text-ink-2">
              <span className="inline-flex items-center gap-1.5"><Dot color="t2" />T2 nízký tarif</span>
              <span className="inline-flex items-center gap-1.5"><Dot color="t1" />T1 vysoký tarif</span>
            </div>
            <BarChart
              cols={PB.map((q) => ({ label: lab(q), segs: [{ v: kcMode ? q.c2 : q.d2, color: "--color-t2" }, { v: kcMode ? q.c1 : q.d1, color: "--color-t1" }] }))}
              sel={bi} onSel={setSelBar} unit={kcMode ? "Kč" : "kWh"} animKey={unit} aria="Spotřeba za jednotlivá období podle tarifu"
            />
            <Readout>
              <b>{fmtDate(PB[bi].from)} až {fmtDate(PB[bi].to, true)}</b> · {PB[bi].days} dní<br />
              T2 {nf(PB[bi].d2)} kWh ({kc(PB[bi].c2)}) · T1 {nf(PB[bi].d1)} kWh ({kc(PB[bi].c1)}) · celkem <b>{nf(PB[bi].kwh)} kWh, {kc(PB[bi].cost)}</b>
            </Readout>
          </Card>

          <Card>
            <Banner icon="05-denni-prumer"><BannerTitle>Průměr za den</BannerTitle></Banner>
            <p className="text-[13px] text-muted">Odečty nejsou vždy po stejném počtu dní. Průměr na den to srovná.</p>
            <LineChart pts={PB.map((q) => ({ label: lab(q), v: q.perDay }))} sel={dayI} onSel={setSelDay} aria="Průměrná denní spotřeba v kWh" />
            <Readout>
              <b>{fmtDate(PB[dayI].from)} až {fmtDate(PB[dayI].to, true)}</b><br />
              {nf(PB[dayI].perDay, 1)} kWh za den · {kc(PB[dayI].cost / PB[dayI].days)} za den
            </Readout>
          </Card>

          <Card>
            <Banner icon="06-historie"><BannerTitle>Od prvního odečtu</BannerTitle></Banner>
            <Split>
              <Stat k="Spotřeba celkem" v={<><CountUp value={M.totKwh} /> kWh</>} s={`za ${M.totDays} dní`} />
              <Stat k="Zaplaceno za energii" v={<><CountUp value={Math.round(totCost)} /> Kč</>} s={`průměr ${nf(M.avgPrice, 2)} Kč/kWh`} />
              <Stat k="Podíl nízkého tarifu" v={<><CountUp value={Math.round((M.tot2 / M.totKwh) * 100)} /> %</>} s="T2 z celkové spotřeby" />
              <Stat k="Nejnáročnější období" v={<><CountUp value={Math.round(maxP.perDay * 10) / 10} dec={1} /> kWh/den</>} s={`do ${fmtDate(maxP.to, true)}`} />
              <Stat k="Spotřeba mimo topení" v={<><CountUp value={Math.round(M.base * 10) / 10} dec={1} /> kWh/den</>} s={M.hasSummer ? "podle letních odečtů" : "odhad, chybí letní odečet"} />
              <Stat k="Odhad na celý rok" v={M.annual == null ? "zatím nelze" : <><CountUp value={round(M.annual, 100)} /> kWh</>}
                s={M.annualCost == null ? "chybí odečty z topné sezóny" : "asi " + kc(round(M.annualCost, 100))} />
            </Split>
          </Card>

          {s.advance > 0 && <Advance s={s} M={M} totCost={totCost} />}

          {F.length > 0 && (
            <Card>
              <Banner icon="07-vyhled"><BannerTitle>Výhled na 12 měsíců</BannerTitle></Banner>
              <p className="text-[13px] text-muted">
                Odhad v kWh. Vychází ze spotřeby mimo topení a z toho, jak se v Česku běžně dělí topná sezóna mezi měsíce. Podíl topné sezóny pokrytý odečty: {nf(Math.min(M.share, 1) * 100)} %. S každým zimním odečtem se zpřesní.
              </p>
              <BarChart cols={F.map((f) => ({ label: MONTHS[f.m], segs: [{ v: f.kwh, color: "--color-forecast" }] }))}
                sel={Math.min(selFc, F.length - 1)} onSel={setSelFc} unit="kWh" animKey="fc" aria="Odhad spotřeby na dalších 12 měsíců" />
              <Readout>
                <b>{MONTHS_FULL[F[selFc].m]} {F[selFc].y}</b><br />
                odhad {nf(round(F[selFc].kwh, 10))} kWh · asi {kc(round(F[selFc].cost, 10))}
              </Readout>
            </Card>
          )}
        </>
      )}
    </>
  );
}

function Chip({ diff }: { diff: number }) {
  const good = diff >= 0;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-[9px] py-1 text-xs font-semibold whitespace-nowrap shadow-[inset_0_0_0_1px_var(--color-line)]">
      <i className={`inline-block size-2 ${good ? "rounded-full bg-good" : "rotate-45 bg-bad"}`} />
      {good ? "přeplatek" : "nedoplatek"} {kc(round(Math.abs(diff), 10))}
    </span>
  );
}

function Advance({ s, M, totCost }: { s: Settings; M: Model; totCost: number }) {
  const months = M.totDays / 30.44, paid = s.advance * months;
  const yearPaid = s.advance * 12;
  return (
    <Card>
      <div className="flex flex-col gap-3.5">
        <Banner icon="02-naklady"><BannerTitle>Zálohy</BannerTitle></Banner>
        <span className="self-end text-[13px] text-muted tabular-nums">{kc(s.advance)} měsíčně</span>
      </div>
      <Split>
        <Stat k="Zaplaceno na zálohách" v={<><CountUp value={Math.round(paid)} /> Kč</>} s={`za ${nf(months, 1)} měsíce od prvního odečtu`} />
        <Stat k="Skutečně spotřebováno" v={<><CountUp value={Math.round(totCost)} /> Kč</>} s="za stejnou dobu" />
      </Split>
      <p className="text-[13px]">Zatím: <Chip diff={paid - totCost} /></p>
      {M.annualCost != null && (
        <>
          <Split>
            <Stat k="Zálohy za rok" v={<><CountUp value={yearPaid} /> Kč</>} s="12 záloh" />
            <Stat k="Odhad spotřeby za rok" v={<><CountUp value={round(M.annualCost, 100)} /> Kč</>} s="podle výhledu níže" />
          </Split>
          <p className="text-[13px]">Při ročním vyúčtování vychází: <Chip diff={yearPaid - M.annualCost} /></p>
          <p className="text-[13px] text-muted">
            Aby záloha pokryla celý rok, vycházela by asi na {kc(Math.ceil(M.annualCost / 12 / 50) * 50)} měsíčně. Je to odhad, zpřesní se se zimními odečty.
            {s.fixedMonthly > 0 ? "" : " Stálé měsíční platby v něm nejsou, dokud je nedoplníte v Nastavení."}
          </p>
        </>
      )}
    </Card>
  );
}
