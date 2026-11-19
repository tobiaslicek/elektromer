import { useEffect, useMemo, useRef, useState } from "react";
import { ReadingDialog, type DialogRequest } from "./components/ReadingDialog";
import { model as buildModel, periods as buildPeriods } from "./lib/model";
import { useStore } from "./lib/store";
import type { TabId } from "./types";
import { Invest } from "./views/Invest";
import { Overview } from "./views/Overview";
import { Readings } from "./views/Readings";
import { SettingsView } from "./views/SettingsView";

const TABS: Array<[TabId, string, string]> = [
  ["prehled", "Přehled", "04-graf-spotreby"],
  ["odecty", "Odečty", "06-historie"],
  ["investice", "Investice", "09-uspory"],
  ["nastaveni", "Nastavení", "11-dum"],
];

const T_START = performance.now();

export function App() {
  const store = useStore();
  const { readings, settings, loaded, notice } = store;
  const [tab, setTab] = useState<TabId>("prehled");
  const [revealed, setRevealed] = useState(false);
  const [splash, setSplash] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [dialog, setDialog] = useState<DialogRequest | null>(null);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loaded || revealed) return;
    const t = setTimeout(() => {
      setRevealed(true);
      setTimeout(() => setSplash(false), 520);
    }, Math.max(0, 1300 - (performance.now() - T_START)));
    return () => clearTimeout(t);
  }, [loaded, revealed]);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const P = useMemo(() => buildPeriods(readings, settings), [readings, settings]);
  const M = useMemo(() => buildModel(P, settings), [P, settings]);

  const go = (t: TabId) => {
    setTab(t);
    window.scrollTo(0, 0);
  };
  const photo = () => {
    if (store.sample && store.canImages) file.current?.click();
    else setDialog({});
  };

  return (
    <>
      {splash && (
        <div aria-hidden="true" className={`splash fixed inset-0 z-50 flex flex-col items-center gap-[22px] bg-page pt-[min(34vh,300px)] ${revealed ? "gone" : ""}`}>
          <svg viewBox="0 0 100 100" className="size-[148px] overflow-visible">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="5" />
            <circle className="ring" cx="50" cy="50" r="42" pathLength={1} fill="none" stroke="var(--color-signal)" strokeWidth="5" strokeLinecap="round" strokeDasharray="1" strokeDashoffset="0.25" />
            <image className="mark" href="icons/03-elektromer.png" x="22" y="22" width="56" height="56" />
          </svg>
          <b className="font-display text-[22px] font-bold tracking-[-0.01em]">Elektro<span className="text-mint">měr</span></b>
          <p className="-mt-3 text-[13px] text-on-dark-muted">Načítám odečty</p>
        </div>
      )}

      <div className="mx-auto flex max-w-[560px] flex-col gap-6">
        <header className={`topbar ${scrolled ? "scrolled" : ""}`}>
          <h1 className="flex items-center justify-center gap-2.5 font-display text-[26px] font-bold tracking-[-0.02em] whitespace-nowrap">
            <img src="icons/01-spotreba.png" alt="" width="34" height="34" className="-ml-1 size-[34px] object-contain" />
            <span>Elektro<b className="text-mint">měr</b></span>
          </h1>
          <nav aria-label="Části aplikace" className="mt-6 grid grid-cols-4 gap-1 rounded-[14px] bg-black/25 p-1">
            {TABS.map(([id, label, icon]) => {
              const on = tab === id;
              return (
                <button key={id} type="button" onClick={() => go(id)} aria-current={on ? "page" : undefined}
                  className={`press flex min-h-[62px] flex-col items-center justify-center gap-1 rounded-[10px] px-0.5 pt-2 pb-[7px] text-xs font-semibold ${on ? "bg-white/10 text-on-dark shadow-[0_1px_2px_rgb(0_0_0/0.18)]" : "text-on-dark-2"}`}>
                  <img src={`icons/${icon}.png`} alt="" width="26" height="26"
                    className={`size-[26px] object-contain transition-[filter,scale] duration-200 ${on ? "scale-[1.14]" : "brightness-[0.85] saturate-[0.55]"}`} />
                  {label}
                </button>
              );
            })}
          </nav>
        </header>

        {notice && <div className="rounded-[14px] bg-black/25 px-4 py-3.5 text-sm shadow-[inset_0_0_0_1px_var(--color-bad)]">{notice}</div>}

        {revealed && (
          <main key={tab} className="enter flex flex-col gap-6">
            {tab === "prehled" && (
              <Overview readings={readings} settings={settings} periods={P} model={M} loaded={loaded}
                onPhoto={photo} onManual={() => setDialog({})} onShowReadings={() => go("odecty")} />
            )}
            {tab === "odecty" && <Readings readings={readings} periods={P} loaded={loaded} onEdit={(r) => setDialog({ editing: r })} />}
            {tab === "investice" && <Invest model={M} settings={settings} count={readings.length} />}
            {tab === "nastaveni" && <SettingsView settings={settings} onSave={store.saveSettings} />}
          </main>
        )}
      </div>

      <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden
        onChange={(e) => {
          const picked = Array.from(e.target.files ?? []).slice(0, 4);
          e.target.value = "";
          if (picked.length) setDialog({ files: picked });
        }} />
      <ReadingDialog request={dialog} store={store} onClose={() => setDialog(null)} />
    </>
  );
}
