import { useEffect, useState, type ReactNode } from "react";
import { Banner, BannerTitle, Card, Intro } from "../components/ui";
import type { Settings } from "../types";

type NumKey = "priceT1" | "priceT2" | "fixedMonthly" | "advance" | "woodPrice";

const inputCls = "min-h-12 w-full rounded-xl border border-line bg-well p-3 font-mono text-[17px] font-semibold text-ink";

function Field({ id, label, hint, children }: { id: string; label: string; hint: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={id} className="text-[13px] font-medium text-ink-2">{label}</label>
      {children}
      <span className="text-xs text-muted">{hint}</span>
    </div>
  );
}

export function SettingsView({ settings, onSave }: { settings: Settings; onSave: (s: Settings) => Promise<"saved" | "local" | "error"> }) {
  const [draft, setDraft] = useState<Record<NumKey, string>>(() => toDraft(settings));
  const [status, setStatus] = useState("");
  useEffect(() => setDraft(toDraft(settings)), [settings]);

  const commit = async (next: Settings) => {
    const r = await onSave(next);
    setStatus(r === "saved" ? "Uloženo." : r === "local" ? "Změna platí jen do zavření stránky, úložiště není dostupné." : "Nastavení se nepodařilo uložit. Zkuste to znovu.");
  };
  const commitNum = (key: NumKey) => {
    const v = parseFloat(draft[key].replace(",", "."));
    if (!isFinite(v) || v < 0 || v === settings[key]) return setDraft(toDraft(settings));
    void commit({ ...settings, [key]: v });
  };
  const num = (key: NumKey, step: string, mode: "decimal" | "numeric") => (
    <input id={key} type="number" step={step} min="0" inputMode={mode} className={inputCls} value={draft[key]}
      onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} onBlur={() => commitNum(key)} />
  );
  const check = (key: "hasHydronic" | "hasChimney", label: string) => (
    <label className="flex items-center gap-3 py-1 text-sm leading-snug">
      <input type="checkbox" className="tick" checked={settings[key]} onChange={(e) => void commit({ ...settings, [key]: e.target.checked })} />
      <span>{label}</span>
    </label>
  );

  return (
    <>
      <Intro icon="13-vypocet" title="Nastavení" sub="Ceny, zálohy a údaje o domě." />
      <Card>
        <Banner icon="02-naklady"><BannerTitle>Ceny elektřiny</BannerTitle></Banner>
        <div className="grid grid-cols-2 gap-3">
          <Field id="priceT1" label="T1 vysoký tarif" hint="Kč za kWh">{num("priceT1", "0.01", "decimal")}</Field>
          <Field id="priceT2" label="T2 nízký tarif" hint="Kč za kWh">{num("priceT2", "0.01", "decimal")}</Field>
        </div>
        <Field id="fixedMonthly" label="Stálé měsíční platby" hint="Kč za měsíc: jistič, stálý plat dodavateli. Najdete je na vyúčtování. Nula znamená, že se nepočítají.">
          {num("fixedMonthly", "1", "numeric")}
        </Field>
        <Field id="advance" label="Měsíční záloha dodavateli" hint="Kč za měsíc. Podle ní se na Přehledu počítá přeplatek nebo nedoplatek.">
          {num("advance", "50", "numeric")}
        </Field>
      </Card>
      <Card>
        <Banner icon="11-dum"><BannerTitle>Dům</BannerTitle></Banner>
        <p className="text-[13px] text-muted">Podle toho se počítá záložka Investice.</p>
        {check("hasHydronic", "V domě jsou radiátory nebo podlahové topení s teplou vodou")}
        {check("hasChimney", "V domě je funkční komín")}
        <Field id="woodPrice" label="Cena palivového dřeva" hint="Kč za prostorový metr sypaný (prms). Z jednoho vyjde asi 950 kWh tepla.">
          {num("woodPrice", "50", "numeric")}
        </Field>
        {status && <p className="text-[13px] text-muted">{status}</p>}
      </Card>
      <Card>
        <Banner icon="12-telefon"><BannerTitle>Aplikace na ploše telefonu</BannerTitle></Banner>
        <ol className="flex list-decimal flex-col gap-2.5 pl-5 text-sm leading-normal text-ink-2">
          <li>Otevřete odkaz na tuto stránku v Safari (iPhone) nebo v Chromu (Android) a přihlaste se ke Claudovi.</li>
          <li>iPhone: tlačítko Sdílet, pak Přidat na plochu. Android: nabídka se třemi tečkami, pak Přidat na plochu.</li>
          <li>Ikona pak otevře rovnou tuto stránku.</li>
        </ol>
      </Card>
      <Card>
        <Banner icon="08-pripominka"><BannerTitle>Připomínka odečtu</BannerTitle></Banner>
        <p className="text-[13px]">Stránka sama upozornění poslat neumí. Připomínku na 15. den v měsíci si nastavte v telefonu. Když odečet po 15. chybí, ukáže se nahoře na Přehledu žlutý pruh.</p>
      </Card>
    </>
  );
}

function toDraft(s: Settings): Record<NumKey, string> {
  return { priceT1: String(s.priceT1), priceT2: String(s.priceT2), fixedMonthly: String(s.fixedMonthly), advance: String(s.advance), woodPrice: String(s.woodPrice) };
}
