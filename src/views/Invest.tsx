import { Banner, Card, Intro, Split, Stat } from "../components/ui";
import { kc, nf, round } from "../lib/format";
import { invest } from "../lib/model";
import type { Model, Settings, Verdict } from "../types";

const VERDICT: Record<Verdict, [string, string]> = {
  good: ["Vyplatí se", "rounded-full bg-good"],
  warn: ["Na hraně", "rounded-xs bg-warn"],
  bad: ["Nevyplatí se", "rotate-45 bg-bad"],
};

const TIPS = [
  "Zkontrolujte distribuční sazbu a jistič na vyúčtování. Stálé platy za jistič dělají u elektrického topení tisíce korun ročně.",
  "Porovnejte dodavatele. Rozdíl 0,50 Kč na kWh je u vaší spotřeby několik tisíc korun za rok bez jakékoli investice.",
  "Chytré termostaty a útlum topení přes noc a v práci stojí pár tisíc a obvykle ušetří 5 až 10 % tepla.",
  "Těsnění oken a dveří a izolace stropu pod půdou bývají nejlevnější úspora tepla.",
];

export function Invest({ model: M, settings: s, count }: { model: Model | null; settings: Settings; count: number }) {
  const list = invest(M, s);
  return (
    <>
      <Intro icon="09-uspory" title="Vyplatí se investice?" sub="Od nejvýhodnější po nejméně výhodnou, podle návratnosti v poměru k životnosti." />
      {!M || M.annualHeat == null ? (
        <Card>
          <p className="text-[13px]">Výpočet potřebuje odhad roční spotřeby na topení. Ten vznikne, až budou odečty pokrývat aspoň kus topné sezóny.</p>
        </Card>
      ) : (
        <Card>
          <p className="text-[13px]">Odhad z {count} odečtů.</p>
          <Split>
            <Stat k="Topení za rok" v={`${nf(round(M.annualHeat, 100))} kWh`} s={"asi " + kc(round(M.annualHeat * s.priceT2, 100))} />
            <Stat k="Ostatní spotřeba za rok" v={`${nf(round(M.annualBase, 100))} kWh`} s={"asi " + kc(round(M.annualBase * M.avgPrice, 100))} />
          </Split>
          <p className="text-[13px] text-muted">
            Ceny technologií jsou obvyklá rozpětí z podzimu 2026 včetně montáže, bez dotací. Nevratné dotace z Nové zelené úsporám dnes dostanou jen nízkopříjmové domácnosti (NZÚ Light), ostatním stát nabízí bezúročný úvěr. Aktuální podmínky ověřte na novazelenausporam.cz. Je to orientační výpočet, ne nabídka. Před rozhodnutím si nechte udělat nabídku na míru.
          </p>
        </Card>
      )}
      <div className="flex flex-col gap-6">
        {list.map((t) => {
          const years = !isFinite(t.yMid) ? "nikdy" : t.yLo >= 60 ? "přes 60 let" : `${nf(t.yLo)} až ${t.yHi >= 60 ? "60+" : nf(t.yHi)} let`;
          const w = isFinite(t.yMid) ? Math.min(100, (t.yMid / 40) * 100) : 100;
          const [label, mark] = VERDICT[t.verdict];
          return (
            <Card key={t.id} className="!gap-5">
              <Banner icon={t.icon}>
                <h3 className="font-display text-lg leading-tight font-semibold text-balance">{t.name}</h3>
                <p className="mt-1 text-[13px] text-on-dark-2">{t.sub}</p>
                <span className="mt-3 mb-1.5 inline-flex items-center gap-1.5 rounded-full px-[9px] py-1 text-xs font-semibold whitespace-nowrap shadow-[inset_0_0_0_1px_rgb(255_255_255/0.22)]">
                  <i className={`inline-block size-2 ${mark}`} />
                  {label}
                </span>
              </Banner>
              <div className="grid grid-cols-3 gap-4">
                {[["Pořízení", `${nf(t.lo / 1000)}–${nf(t.hi / 1000)} tis.`], ["Úspora za rok", t.net > 0 ? kc(round(t.net, 100)) : "žádná"], ["Návratnost", years]].map(([k, v]) => (
                  <div key={k} className="flex min-w-0 flex-col gap-[3px]">
                    <p className="text-[11px] text-muted">{k}</p>
                    <p className="font-display text-sm font-semibold tabular-nums">{v}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <div className="relative h-2.5 overflow-hidden rounded-[5px] bg-well">
                  <div className="bar-x absolute inset-y-0 left-0 rounded-[5px] bg-t2" style={{ width: `${w}%` }} />
                  <div className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: `${Math.min(100, (t.life / 40) * 100)}%` }} />
                </div>
                <div className="flex justify-between text-xs text-muted">
                  <span>0</span>
                  <span>černá čárka: životnost {t.life} let</span>
                  <span>40 let</span>
                </div>
              </div>
              <details className="text-[13px] text-ink-2">
                <summary className="cursor-pointer py-1.5 font-medium">Jak se to počítá</summary>
                <p className="mt-2">{t.how}</p>
                {t.extra.length > 0 && <p className="mt-2">Cena je {t.extra.join(" a ")}.</p>}
                <p className="mt-2">Úspora je po odečtení servisu {nf(t.service)} Kč za rok.</p>
              </details>
            </Card>
          );
        })}
      </div>
      <Card>
        <Banner icon="10-tipy"><h2 className="font-display text-lg leading-tight font-semibold text-balance">Co zvážit dřív než velkou investici</h2></Banner>
        <ul className="flex list-disc flex-col gap-2.5 pl-[18px] text-sm leading-normal text-ink-2">
          {TIPS.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </Card>
    </>
  );
}
