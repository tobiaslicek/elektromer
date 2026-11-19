import { Delta, Dot, Intro, cardCls } from "../components/ui";
import { fmtDate, kc, nf } from "../lib/format";
import type { Period, Reading } from "../types";

export function Readings({ readings, periods, loaded, onEdit }: { readings: Reading[]; periods: Period[]; loaded: boolean; onEdit: (r: Reading) => void }) {
  const byTo = new Map(periods.map((p, i) => [p.to, { p, prev: periods[i - 1] }]));
  const max = Math.max(1, ...periods.map((p) => p.kwh));
  return (
    <>
      <Intro icon="06-historie" title="Všechny odečty" sub={readings.length ? `${readings.length} záznamů · klepnutím odečet upravíte` : ""} />
      {!readings.length && <section className={cardCls}><p>{loaded ? "Zatím žádný odečet." : "Načítám…"}</p></section>}
      <div className="flex flex-col gap-4">
        {[...readings].reverse().map((r) => {
          const [y, m, d] = r.date.split("-").map(Number);
          const hit = byTo.get(r.date);
          const p = hit?.p;
          return (
            <button key={r.date} type="button" onClick={() => onEdit(r)} aria-label={`Upravit odečet z ${fmtDate(r.date, true)}`}
              className={`${cardCls} press w-full !gap-4 !p-5 text-left active:!scale-[0.98]`}>
              <span className="flex min-w-0 items-center gap-4">
                <span className="flex h-[68px] w-[76px] flex-none flex-col items-center justify-center gap-1 rounded-2xl bg-panel text-on-dark">
                  <b className="font-display text-[19px] leading-none font-bold whitespace-nowrap">{d}. {m}.</b>
                  <span className="text-xs tracking-[0.02em] text-mint">{y}</span>
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-[5px]">
                  {p ? (
                    <>
                      <span className="font-display text-[22px] leading-[1.1] font-bold tracking-[-0.01em] tabular-nums">
                        {nf(p.kwh)} <small className="text-[13px] font-semibold text-ink-2">kWh</small>
                      </span>
                      <span className="text-[13px] text-ink-2 tabular-nums">
                        <b className="font-display text-base leading-tight font-bold text-accent">{kc(p.cost)}</b> · {p.days} dní · {nf(p.perDay, 1)} kWh/den
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="font-display text-[22px] leading-[1.1] font-bold tracking-[-0.01em]">Výchozí stav</span>
                      <span className="text-[13px] text-ink-2">První odečet, od něj se počítá.</span>
                    </>
                  )}
                </span>
                {p && hit.prev && <Delta pct={(p.perDay / hit.prev.perDay - 1) * 100} />}
              </span>
              {p && (
                <span className="flex h-2.5 gap-0.5 overflow-hidden rounded-[5px] bg-well" aria-hidden="true">
                  <span className="bar-x h-full rounded-xs bg-t2" style={{ width: `${((p.d2 / max) * 100).toFixed(1)}%` }} />
                  <span className="bar-x h-full rounded-xs bg-t1" style={{ width: `${Math.max((p.d1 / max) * 100, 0.8).toFixed(1)}%` }} />
                </span>
              )}
              <span className="flex flex-wrap items-center gap-3 border-t border-line pt-3.5 font-mono text-[12.5px] font-medium text-ink-2 tabular-nums">
                <span className="inline-flex items-center gap-[7px]"><Dot color="t1" />T1 {nf(r.t1)} kWh</span>
                <span className="inline-flex items-center gap-[7px]"><Dot color="t2" />T2 {nf(r.t2)} kWh</span>
                <span className="ml-auto font-sans text-[13px] font-semibold text-ink">Upravit ›</span>
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
