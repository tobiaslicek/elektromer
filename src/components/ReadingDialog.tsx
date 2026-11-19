import { useEffect, useRef, useState, type FormEvent } from "react";
import { fmtDate, kc, nf, todayIso } from "../lib/format";
import { prevFor } from "../lib/model";
import type { Store } from "../lib/store";
import type { Reading } from "../types";
import { btnCls } from "./ui";

export interface DialogRequest {
  editing?: Reading;
  files?: File[];
}

type Status = { kind: "" | "busy" | "ok" | "err"; text: string };

const COPY: Record<string, string> = {
  not_granted: "Čtení z fotky není povolené. Opište stav z displeje ručně.",
  sampling_disabled: "Čtení z fotky není pro tento účet dostupné. Opište stav ručně.",
  images_unavailable: "Fotky tady nejdou poslat. Opište stav z displeje ručně.",
  image_rejected: "Fotku se nepodařilo zpracovat. Zkuste jinou, nejlépe JPEG.",
  rate_limited: "Teď je příliš mnoho požadavků. Zkuste to za chvíli nebo stav opište.",
  session_expired: "Přihlášení vypršelo. Přihlaste se znovu a zkuste to.",
  invalid_json: "Z fotky se nepodařilo vyčíst čísla. Zkuste ostřejší fotku bez odlesku nebo stav opište.",
  refused: "Fotku se nepodařilo přečíst. Zkuste jinou nebo stav opište.",
};

const fieldCls = "min-h-12 w-full rounded-xl border border-white/10 bg-black/25 p-3 font-mono text-[17px] font-semibold text-on-dark";

export function ReadingDialog({ request, store, onClose }: { request: DialogRequest | null; store: Store; onClose: () => void }) {
  const { readings, settings, sample, canImages, loaded } = store;
  const open = !!request;
  const [date, setDate] = useState(todayIso());
  const [t1, setT1] = useState("");
  const [t2, setT2] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<Status>({ kind: "", text: "" });
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const back = useRef<HTMLDivElement>(null);
  const more = useRef<HTMLInputElement>(null);
  const ctl = useRef<AbortController | null>(null);
  const editing = request?.editing ?? null;
  const photo = !!sample && canImages;

  useEffect(() => {
    if (!request) {
      ctl.current?.abort();
      return;
    }
    setDate(request.editing ? request.editing.date : todayIso());
    setT1(request.editing ? String(request.editing.t1) : "");
    setT2(request.editing ? String(request.editing.t2) : "");
    setConfirmDelete(false);
    setFiles(request.files ?? []);
    setStatus(
      !request.editing && !request.files && !photo && loaded
        ? { kind: "", text: "Čtení z fotky tady není dostupné. Opište stav z displeje." }
        : { kind: "", text: "" },
    );
    if (request.files?.length) void read(request.files);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  useEffect(() => {
    const vv = window.visualViewport;
    const el = back.current;
    if (!vv || !el) return;
    const fit = () => {
      el.style.height = vv.height + "px";
      el.style.top = vv.offsetTop + "px";
    };
    vv.addEventListener("resize", fit);
    vv.addEventListener("scroll", fit);
    fit();
    return () => {
      vv.removeEventListener("resize", fit);
      vv.removeEventListener("scroll", fit);
    };
  }, []);

  async function read(list: File[]) {
    if (!sample || !list.length) return;
    const last = readings[readings.length - 1];
    const prompt =
      "Na fotkách je displej nebo číselník českého elektroměru se dvěma tarify. Přečti stav registru T1 (vysoký tarif, VT, OBIS kód 1.8.1) a T2 (nízký tarif, NT, OBIS kód 1.8.2) v celých kWh. Desetinná místa zahoď, nezaokrouhluj nahoru. Úvodní nuly vynech.\n" +
      (last ? `Poslední známý stav: T1 = ${last.t1} kWh, T2 = ${last.t2} kWh. Nový stav je stejný nebo o desítky až stovky kWh vyšší. Podle toho urči, který registr je na fotce, když to z označení na displeji není jasné.\n` : "") +
      "Když některý registr na fotkách není nebo ho nejde spolehlivě přečíst, vrať pro něj null. Nehádej.\n" +
      'Odpověz pouze jedním JSON objektem: {"t1": číslo nebo null, "t2": číslo nebo null, "poznamka": "jedna krátká česká věta o tom, co je na fotce a čím si nejsi jistý"}';
    ctl.current = new AbortController();
    setBusy(true);
    setStatus({ kind: "busy", text: "Čtu stav z fotky. Trvá to obvykle do půl minuty." });
    try {
      const r = (await sample.json(prompt, { images: list, signal: ctl.current.signal })) as { t1?: unknown; t2?: unknown; poznamka?: unknown } | null;
      const pick = (v: unknown) => (v !== null && v !== undefined && Number.isFinite(Number(v)) ? Math.floor(Number(v)) : null);
      const a = pick(r?.t1), b = pick(r?.t2);
      if (a != null) setT1(String(a));
      if (b != null) setT2(String(b));
      const note = typeof r?.poznamka === "string" ? r.poznamka.slice(0, 200) : "";
      if (a != null && b != null) setStatus({ kind: "ok", text: "Přečteno. Zkontrolujte čísla proti displeji a uložte. " + note });
      else if (a != null || b != null) setStatus({ kind: "", text: `Na fotce je jen ${a != null ? "T1" : "T2"}. Přidejte fotku druhého tarifu nebo ho dopište. ${note}` });
      else setStatus({ kind: "err", text: "Stav se z fotky nepodařilo přečíst. Zkuste ostřejší fotku nebo čísla opište. " + note });
    } catch (e) {
      const code = (e as { code?: string } | null)?.code;
      if (code !== "cancelled") setStatus({ kind: "err", text: (code && COPY[code]) || "Čtení se nepovedlo. Zkuste to znovu nebo stav opište ručně." });
    } finally {
      setBusy(false);
    }
  }

  const n1 = parseInt(t1, 10), n2 = parseInt(t2, 10);
  const prev = date ? prevFor(readings.filter((r) => r.date !== editing?.date), date) : null;
  const both = Number.isFinite(n1) && Number.isFinite(n2);
  const lower = !!prev && both && (n1 < prev.t1 || n2 < prev.t2);
  const calc = !prev || !both ? "" : lower
    ? `Stav je nižší než při minulém odečtu ${fmtDate(prev.date)}. Zkontrolujte čísla, možná jsou tarify prohozené.`
    : `Od ${fmtDate(prev.date)}: ${nf(n1 - prev.t1 + n2 - prev.t2)} kWh, ${kc((n1 - prev.t1) * settings.priceT1 + (n2 - prev.t2) * settings.priceT2)}.`;

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    const err = (text: string) => setStatus({ kind: "err", text });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return err("Vyplňte datum odečtu.");
    if (!both || n1 < 0 || n2 < 0) return err("Vyplňte oba stavy, T1 i T2, v celých kWh.");
    if (date > todayIso()) return err("Datum odečtu je v budoucnosti.");
    if (lower) return err("Stav nemůže být nižší než při minulém odečtu. Opravte čísla.");
    setBusy(true);
    try {
      await store.saveReading({ date, t1: n1, t2: n2 }, files.length ? "photo" : "manual", editing?.date ?? null);
      onClose();
    } catch (e) {
      const code = (e as { code?: string } | null)?.code;
      err(code === "no_db" ? "Úložiště není dostupné, odečet nejde uložit. Otevřete stránku přihlášení." : code === "invalid_argument" ? "Na ukládání nemáte oprávnění." : "Uložení se nepovedlo. Zkuste to znovu.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!editing) return;
    try {
      await store.deleteReading(editing.date);
      onClose();
    } catch {
      setStatus({ kind: "err", text: "Smazání se nepovedlo. Zkuste to znovu." });
    }
  }

  const ghost = `${btnCls} flex-1 basis-[140px] text-on-dark shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]`;
  const statusRing = status.kind === "err" ? "shadow-[inset_0_0_0_1px_var(--color-bad)]" : status.kind === "ok" ? "shadow-[inset_0_0_0_1px_var(--color-good)]" : "";

  return (
    <div ref={back} inert={!open}
      className={`sheet-back fixed inset-x-0 top-0 z-30 flex h-full items-start justify-center overscroll-contain bg-[rgb(8_12_18/0.55)] px-4 pt-[calc(env(safe-area-inset-top,0px)+56px)] pb-4 ${open ? "open" : ""}`}
      onClick={(e) => e.target === back.current && onClose()}>
      <form noValidate onSubmit={submit}
        className="sheet flex max-h-full w-full max-w-[440px] flex-col gap-[18px] overflow-y-auto overscroll-contain rounded-3xl bg-sheet px-5 pt-6 pb-5 shadow-[0_24px_60px_-12px_rgb(0_0_0/0.45),0_0_0_1px_rgb(255_255_255/0.06)]">
        <h2 className="font-display text-base font-semibold">{editing ? "Upravit odečet" : "Nový odečet"}</h2>
        {status.text && (
          <div className={`flex items-start gap-2.5 rounded-[14px] bg-black/25 px-4 py-3.5 text-sm text-on-dark-2 ${statusRing}`}>
            {status.kind === "busy" && <span className="spin mt-0.5 size-4 flex-none rounded-full border-2 border-white/25 border-t-on-dark" />}
            <span>{status.text}</span>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <label htmlFor="fDate" className="text-[13px] font-medium text-on-dark-2">Datum odečtu</label>
          <input id="fDate" type="date" required className={fieldCls} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {([["fT1", "T1 vysoký tarif", t1, setT1, prev?.t1], ["fT2", "T2 nízký tarif", t2, setT2, prev?.t2]] as const).map(([id, label, val, set, was]) => (
            <div key={id} className="flex min-w-0 flex-col gap-2">
              <label htmlFor={id} className="text-[13px] font-medium text-on-dark-2">{label}</label>
              <input id={id} type="number" inputMode="numeric" min="0" step="1" placeholder="kWh" className={fieldCls} value={val} onChange={(e) => set(e.target.value)} />
              <span className="text-xs text-on-dark-muted">{was != null ? "minule " + nf(was) : ""}</span>
            </div>
          ))}
        </div>
        {calc && <p className="text-[13px]">{calc}</p>}
        {photo && files.length > 0 && (
          <>
            <button type="button" disabled={busy} onClick={() => more.current?.click()} className={ghost}>Přidat další fotku</button>
            <input ref={more} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden
              onChange={(e) => {
                const next = [...files, ...Array.from(e.target.files ?? [])].slice(0, 4);
                e.target.value = "";
                setFiles(next);
                void read(next);
              }} />
          </>
        )}
        <div className="mt-1 flex flex-wrap gap-3">
          <button type="button" onClick={onClose} className={ghost}>Zrušit</button>
          <button type="submit" disabled={busy} className={`${btnCls} flex-1 basis-[140px] bg-signal text-signal-ink`}>Uložit odečet</button>
        </div>
        {editing && (
          <div className="flex">
            {confirmDelete
              ? <button type="button" onClick={remove} className={`${ghost} !text-[#e66767]`}>Opravdu smazat</button>
              : <button type="button" onClick={() => setConfirmDelete(true)} className={`${ghost} !text-[#e66767]`}>Smazat odečet</button>}
          </div>
        )}
      </form>
    </div>
  );
}
