import { $, nf, kc, todayIso, fmtDate } from "./util.js";
import { state } from "./state.js";
import { prevFor } from "./model.js";

export const sheet = { files: [], editing: null, busy: false };

export function setStatus(kind, text) {
  const el = $("sheetStatus");
  el.hidden = !text; el.className = "status" + (kind === "err" ? " err" : kind === "ok" ? " ok" : "");
  el.innerHTML = "";
  if (kind === "busy") { const sp = document.createElement("span"); sp.className = "spin"; el.append(sp); }
  const t = document.createElement("span"); t.textContent = text || ""; el.append(t);
}

export function sheetCalc() {
  const date = $("fDate").value, t1 = parseInt($("fT1").value, 10), t2 = parseInt($("fT2").value, 10);
  const prev = date ? prevFor(date) : null;
  $("hT1").textContent = prev ? "minule " + nf(prev.t1) : "";
  $("hT2").textContent = prev ? "minule " + nf(prev.t2) : "";
  const el = $("sheetCalc");
  if (!prev || !isFinite(t1) || !isFinite(t2)) { el.textContent = ""; return true; }
  const d1 = t1 - prev.t1, d2 = t2 - prev.t2;
  if (d1 < 0 || d2 < 0) { el.textContent = "Stav je nižší než při minulém odečtu " + fmtDate(prev.date) + ". Zkontrolujte čísla, možná jsou tarify prohozené."; return false; }
  const s = state.settings;
  el.textContent = "Od " + fmtDate(prev.date) + ": " + nf(d1 + d2) + " kWh, " + kc(d1 * s.priceT1 + d2 * s.priceT2) + ".";
  return true;
}

export function openSheet(mode, reading) {
  sheet.files = []; sheet.editing = reading ? reading.date : null;
  $("sheetTitle").textContent = reading ? "Upravit odečet" : "Nový odečet";
  $("fDate").value = reading ? reading.date : todayIso();
  $("fT1").value = reading ? reading.t1 : ""; $("fT2").value = reading ? reading.t2 : "";
  $("delRow").hidden = !reading; $("btnDel").hidden = false; $("btnDelYes").hidden = true;
  $("btnMore").hidden = !(mode === "photo" && state.sample && state.canImages);
  setStatus(null, "");
  if (mode === "manual" && !reading && !(state.sample && state.canImages) && state.loaded) setStatus(null, "Čtení z fotky tady není dostupné. Opište stav z displeje.");
  sheetCalc();
  $("sheet").style.transform = ""; $("sheet").style.transition = ""; $("sheetBack").classList.add("open");
}

export function closeSheet() { $("sheet").style.transform = ""; $("sheet").style.transition = ""; $("sheetBack").classList.remove("open"); if (document.activeElement && $("sheet").contains(document.activeElement)) document.activeElement.blur(); if (sheet.ctl) sheet.ctl.abort(); }

export const SAMPLE_COPY = {
  not_granted: "Čtení z fotky není povolené. Opište stav z displeje ručně.",
  sampling_disabled: "Čtení z fotky není pro tento účet dostupné. Opište stav ručně.",
  images_unavailable: "Fotky tady nejdou poslat. Opište stav z displeje ručně.",
  image_rejected: "Fotku se nepodařilo zpracovat. Zkuste jinou, nejlépe JPEG.",
  rate_limited: "Teď je příliš mnoho požadavků. Zkuste to za chvíli nebo stav opište.",
  session_expired: "Přihlášení vypršelo. Přihlaste se znovu a zkuste to.",
  invalid_json: "Z fotky se nepodařilo vyčíst čísla. Zkuste ostřejší fotku bez odlesku nebo stav opište.",
  refused: "Fotku se nepodařilo přečíst. Zkuste jinou nebo stav opište.",
};

export async function readPhotos() {
  if (!sheet.files.length) return;
  const last = state.readings[state.readings.length - 1];
  const prompt =
    "Na fotkách je displej nebo číselník českého elektroměru se dvěma tarify. Přečti stav registru T1 (vysoký tarif, VT, OBIS kód 1.8.1) a T2 (nízký tarif, NT, OBIS kód 1.8.2) v celých kWh. Desetinná místa zahoď, nezaokrouhluj nahoru. Úvodní nuly vynech.\n" +
    (last ? "Poslední známý stav: T1 = " + last.t1 + " kWh, T2 = " + last.t2 + " kWh. Nový stav je stejný nebo o desítky až stovky kWh vyšší. Podle toho urči, který registr je na fotce, když to z označení na displeji není jasné.\n" : "") +
    "Když některý registr na fotkách není nebo ho nejde spolehlivě přečíst, vrať pro něj null. Nehádej.\n" +
    'Odpověz pouze jedním JSON objektem: {"t1": číslo nebo null, "t2": číslo nebo null, "poznamka": "jedna krátká česká věta o tom, co je na fotce a čím si nejsi jistý"}';
  sheet.ctl = new AbortController();
  sheet.busy = true; $("btnSave").disabled = true; $("btnMore").disabled = true;
  setStatus("busy", "Čtu stav z fotky. Trvá to obvykle do půl minuty.");
  try {
    const r = await state.sample.json(prompt, { images: sheet.files, signal: sheet.ctl.signal });
    const t1 = r && Number.isFinite(Number(r.t1)) && r.t1 !== null ? Math.floor(Number(r.t1)) : null;
    const t2 = r && Number.isFinite(Number(r.t2)) && r.t2 !== null ? Math.floor(Number(r.t2)) : null;
    if (t1 != null) $("fT1").value = t1;
    if (t2 != null) $("fT2").value = t2;
    const note = r && typeof r.poznamka === "string" ? r.poznamka.slice(0, 200) : "";
    if (t1 != null && t2 != null) setStatus("ok", "Přečteno. Zkontrolujte čísla proti displeji a uložte. " + note);
    else if (t1 != null || t2 != null) setStatus(null, "Na fotce je jen " + (t1 != null ? "T1" : "T2") + ". Přidejte fotku druhého tarifu nebo ho dopište. " + note);
    else setStatus("err", "Stav se z fotky nepodařilo přečíst. Zkuste ostřejší fotku nebo čísla opište. " + note);
  } catch (e) {
    if (!e || e.code !== "cancelled") setStatus("err", SAMPLE_COPY[e && e.code] || "Čtení se nepovedlo. Zkuste to znovu nebo stav opište ručně.");
  } finally {
    sheet.busy = false; $("btnSave").disabled = false; $("btnMore").disabled = false; sheetCalc();
  }
}

export async function saveReading(ev) {
  ev.preventDefault();
  const date = $("fDate").value, t1 = parseInt($("fT1").value, 10), t2 = parseInt($("fT2").value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setStatus("err", "Vyplňte datum odečtu.");
  if (!Number.isFinite(t1) || !Number.isFinite(t2) || t1 < 0 || t2 < 0) return setStatus("err", "Vyplňte oba stavy, T1 i T2, v celých kWh.");
  if (date > todayIso()) return setStatus("err", "Datum odečtu je v budoucnosti.");
  if (!sheetCalc()) return setStatus("err", "Stav nemůže být nižší než při minulém odečtu. Opravte čísla.");
  if (!state.db) return setStatus("err", "Úložiště není dostupné, odečet nejde uložit. Otevřete stránku přihlášení.");
  $("btnSave").disabled = true;
  try {
    const col = state.db.collection("readings");
    await col.doc(date).set({ date, t1, t2, source: sheet.files.length ? "photo" : "manual", savedAt: new Date().toISOString() });
    if (sheet.editing && sheet.editing !== date) await col.doc(sheet.editing).delete();
    closeSheet();
  } catch (e) {
    setStatus("err", e && e.code === "invalid_argument" ? "Na ukládání nemáte oprávnění." : "Uložení se nepovedlo. Zkuste to znovu.");
  } finally { $("btnSave").disabled = false; }
}
