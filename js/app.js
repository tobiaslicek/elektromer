import { $, MONTHS, MONTHS_FULL, nf, kc, esc, D, iso, fmtDate, REDUCED } from "./util.js";
import { DEFAULTS, state } from "./state.js";
import { periods, model, forecast, invest, dueInfo } from "./model.js";
import { whenSeen, T_START, reveal, countUps, cnt, setHTML, digits } from "./motion.js";
import { barChart, lineChart } from "./charts.js";
import { sheet, setStatus, sheetCalc, openSheet, closeSheet, readPhotos, saveReading } from "./sheet.js";

export function render() {
  if (state.loaded && !state.revealReq) { state.revealReq = true; setTimeout(reveal, Math.max(0, 1300 - (performance.now() - T_START))); }
  const R = state.readings, s = state.settings;
  const P = periods(R, s), M = model(P, s);
  const last = R[R.length - 1];

  digits($("regT1"), last ? last.t1 : null);
  digits($("regT2"), last ? last.t2 : null);
  $("regDate").textContent = last ? "Stav k " + fmtDate(last.date, true) : state.loaded ? "Zatím bez odečtu" : "Načítám odečty…";
  $("regCount").textContent = R.length + " odečtů ›";
  $("regCount").hidden = !R.length;

  const di = dueInfo();
  if (state.loaded) {
    $("nextDue").textContent = "";
    $("introT").textContent = di.days > 0 ? "Další odečet za " + di.days + " dní" : "Je čas na samoodečet";
    $("introS").textContent = (di.days > 0 ? "Termín " : "Termín byl ") + fmtDate(iso(di.due), true) + (last ? " · poslední stav z " + fmtDate(last.date) : "");
    $("dueBanner").hidden = di.days > 0;
    if (di.days <= 0) $("dueBanner").innerHTML = '<span class="icw ic"><img src="icons/08-pripominka.png" alt="" width="40" height="40"></span>' + "<span><b>Je čas na samoodečet.</b> Termín byl " + fmtDate(iso(di.due)) + (di.days < 0 ? ", to je před " + (-di.days) + " dny." : ", tedy dnes.") + "</span>";
  }

  $("emptyCard").hidden = !(state.loaded && P.length === 0);
  for (const id of ["heroCard", "barCard", "dayCard", "statCard"]) $(id).hidden = P.length === 0;
  if (!P.length) $("advCard").hidden = true;
  $("fcCard").hidden = !(M && M.annualHeat != null);

  if (P.length) {
    const p = P[P.length - 1], prev = P[P.length - 2];
    let delta = "";
    if (prev) {
      const ch = (p.perDay / prev.perDay - 1) * 100;
      delta = `<span class="delta">${ch >= 0 ? "▲" : "▼"} ${nf(Math.abs(ch))} % na den proti minulému období</span>`;
    }
    setHTML($("heroCard"), `
      <div class="hd"><span class="icw ic"><img src="icons/01-spotreba.png" alt="" width="40" height="40"></span><p class="eyebrow">Poslední období · ${fmtDate(p.from)} až ${fmtDate(p.to)} · ${p.days} dní</p></div>
      <div class="hero-line"><p class="hero-figure num">${cnt(p.kwh)} <small>kWh</small></p><p class="hero-figure num">${cnt(Math.round(p.cost))} <small>Kč</small></p></div>
      ${delta}
      <div class="split">
        <div><p class="k"><span class="dot t1"></span>T1 vysoký tarif</p><p class="v num">${cnt(p.d1)} kWh</p><p class="s num">${kc(p.c1)}</p></div>
        <div><p class="k"><span class="dot t2"></span>T2 nízký tarif</p><p class="v num">${cnt(p.d2)} kWh</p><p class="s num">${kc(p.c2)}</p></div>
      </div>`);

    const PB = P.slice(-12), off = P.length - PB.length;
    const lab = (q) => MONTHS[new Date(D(q.to)).getUTCMonth()];
    const selB = state.sel.bar != null && state.sel.bar < PB.length ? state.sel.bar : PB.length - 1;
    const kcMode = state.unit === "kc";
    barChart($("barChart"), PB.map((q) => ({ label: lab(q), segs: [{ v: kcMode ? q.c2 : q.d2, color: "--t2" }, { v: kcMode ? q.c1 : q.d1, color: "--t1" }] })),
      { sel: selB, unit: kcMode ? "Kč" : "kWh", animKey: state.unit, aria: "Spotřeba za jednotlivá období podle tarifu", onSel: (i) => { state.sel.bar = i; render(); } });
    const q = PB[selB];
    $("barRead").innerHTML = `<b>${fmtDate(q.from)} až ${fmtDate(q.to, true)}</b> · ${q.days} dní<br><span class="num">T2 ${nf(q.d2)} kWh (${kc(q.c2)}) · T1 ${nf(q.d1)} kWh (${kc(q.c1)}) · celkem <b>${nf(q.kwh)} kWh, ${kc(q.cost)}</b></span>`;
    void off;

    const selD = state.sel.day != null && state.sel.day < PB.length ? state.sel.day : PB.length - 1;
    lineChart($("dayChart"), PB.map((q2) => ({ label: lab(q2), v: q2.perDay })), { sel: selD, animKey: "d", aria: "Průměrná denní spotřeba v kWh", onSel: (i) => { state.sel.day = i; render(); } });
    const qd = PB[selD];
    $("dayRead").innerHTML = `<b>${fmtDate(qd.from)} až ${fmtDate(qd.to, true)}</b><br><span class="num">${nf(qd.perDay, 1)} kWh za den · ${kc(qd.cost / qd.days)} za den</span>`;

    const totCost = P.reduce((a, x) => a + x.cost, 0);
    const maxP = P.reduce((a, x) => (x.perDay > a.perDay ? x : a), P[0]);
    setHTML($("statCard"), `
      <div class="hd"><span class="icw ic"><img src="icons/06-historie.png" alt="" width="40" height="40"></span><h2>Od prvního odečtu</h2></div>
      <div class="split">
        <div><p class="k">Spotřeba celkem</p><p class="v num">${cnt(M.totKwh)} kWh</p><p class="s num">za ${M.totDays} dní</p></div>
        <div><p class="k">Zaplaceno za energii</p><p class="v num">${cnt(Math.round(totCost))} Kč</p><p class="s num">průměr ${nf(M.avgPrice, 2)} Kč/kWh</p></div>
        <div><p class="k">Podíl nízkého tarifu</p><p class="v num">${cnt(Math.round(M.tot2 / M.totKwh * 100))} %</p><p class="s">T2 z celkové spotřeby</p></div>
        <div><p class="k">Nejnáročnější období</p><p class="v num">${cnt(Math.round(maxP.perDay * 10) / 10, 1)} kWh/den</p><p class="s num">do ${fmtDate(maxP.to, true)}</p></div>
        <div><p class="k">Spotřeba mimo topení</p><p class="v num">${cnt(Math.round(M.base * 10) / 10, 1)} kWh/den</p><p class="s">${M.hasSummer ? "podle letních odečtů" : "odhad, chybí letní odečet"}</p></div>
        <div><p class="k">Odhad na celý rok</p><p class="v num">${M.annual == null ? "zatím nelze" : cnt(Math.round(M.annual / 100) * 100) + " kWh"}</p><p class="s num">${M.annualCost == null ? "chybí odečty z topné sezóny" : "asi " + kc(Math.round(M.annualCost / 100) * 100)}</p></div>
      </div>`);

    $("advCard").hidden = !(s.advance > 0);
    if (s.advance > 0) {
      const months = M.totDays / 30.44, paid = s.advance * months, diff = paid - totCost;
      const yearPaid = s.advance * 12, yearDiff = M.annualCost == null ? null : yearPaid - M.annualCost;
      const lab = (d) => (d >= 0 ? "přeplatek" : "nedoplatek");
      const chip = (d) => `<span class="verdict ${d >= 0 ? "good" : "bad"}"><i></i>${lab(d)} ${kc(Math.round(Math.abs(d) / 10) * 10)}</span>`;
      setHTML($("advCard"), `
        <div class="card-head"><div class="hd"><span class="icw ic"><img src="icons/02-naklady.png" alt="" width="40" height="40"></span><h2>Zálohy</h2></div><span class="small muted num">${kc(s.advance)} měsíčně</span></div>
        <div class="split">
          <div><p class="k">Zaplaceno na zálohách</p><p class="v num">${cnt(Math.round(paid))} Kč</p><p class="s num">za ${nf(months, 1)} měsíce od prvního odečtu</p></div>
          <div><p class="k">Skutečně spotřebováno</p><p class="v num">${cnt(Math.round(totCost))} Kč</p><p class="s">za stejnou dobu</p></div>
        </div>
        <p class="small">Zatím: ${chip(diff)}</p>
        ${yearDiff == null ? "" : `<div class="split">
          <div><p class="k">Zálohy za rok</p><p class="v num">${cnt(yearPaid)} Kč</p><p class="s">12 záloh</p></div>
          <div><p class="k">Odhad spotřeby za rok</p><p class="v num">${cnt(Math.round(M.annualCost / 100) * 100)} Kč</p><p class="s">podle výhledu níže</p></div>
        </div>
        <p class="small">Při ročním vyúčtování vychází: ${chip(yearDiff)}</p>
        <p class="small muted">Aby záloha pokryla celý rok, vycházela by asi na ${kc(Math.ceil(M.annualCost / 12 / 50) * 50)} měsíčně. Je to odhad, zpřesní se se zimními odečty.${s.fixedMonthly > 0 ? "" : " Stálé měsíční platby v něm nejsou, dokud je nedoplníte v Nastavení."}</p>`}`);
    }

    const F = forecast(M, last.date);
    if (F.length) {
      const selF = state.sel.fc != null ? state.sel.fc : 0;
      barChart($("fcChart"), F.map((f) => ({ label: MONTHS[f.m], segs: [{ v: f.kwh, color: "--forecast" }] })), { sel: selF, unit: "kWh", animKey: "f", aria: "Odhad spotřeby na dalších 12 měsíců", onSel: (i) => { state.sel.fc = i; render(); } });
      const f = F[selF];
      $("fcRead").innerHTML = `<b>${MONTHS_FULL[f.m]} ${f.y}</b><br><span class="num">odhad ${nf(Math.round(f.kwh / 10) * 10)} kWh · asi ${kc(Math.round(f.cost / 10) * 10)}</span>`;
      $("fcNote").textContent = "Odhad v kWh. Vychází ze spotřeby mimo topení a z toho, jak se v Česku běžně dělí topná sezóna mezi měsíce. Podíl topné sezóny pokrytý odečty: " + nf(Math.min(M.share, 1) * 100) + " %. S každým zimním odečtem se zpřesní.";
    }
  }

  renderTable(R, P);
  renderInvest(M, s, P.length);
  renderSettings();
  countUps();
  document.querySelectorAll(".icw").forEach((el) => {
    if (el._u) return;
    el._u = true;
    const im = el.querySelector("img");
    if (im) el.style.setProperty("--src", `url("${im.src}")`);
  });
  if (state.revealed) document.querySelectorAll(".icw").forEach((el) => { if (!el._p) { el._p = true; whenSeen(el, () => el.classList.add("charge")); } });
}

export function renderTable(R, P) {
  $("tblCount").textContent = R.length ? R.length + " záznamů · klepnutím odečet upravíte" : "";
  if (!R.length) { setHTML($("tbl"), `<section class="card"><p>${state.loaded ? "Zatím žádný odečet." : "Načítám…"}</p></section>`); return; }
  const byTo = new Map(P.map((p, i) => [p.to, { p, prev: P[i - 1] }]));
  const max = Math.max(1, ...P.map((p) => p.kwh));
  let h = "";
  for (const r of [...R].reverse()) {
    const [y, m, d] = r.date.split("-").map(Number);
    const hit = byTo.get(r.date), p = hit && hit.p;
    let delta = "";
    if (p && hit.prev) {
      const ch = (p.perDay / hit.prev.perDay - 1) * 100;
      delta = `<span class="delta">${ch >= 0 ? "▲" : "▼"} ${nf(Math.abs(ch))} %</span>`;
    }
    h += `<button class="card rrow" type="button" data-edit="${esc(r.date)}" aria-label="Upravit odečet z ${fmtDate(r.date, true)}">
      <span class="rr-top">
        <span class="rr-date"><b>${d}. ${m}.</b><span>${y}</span></span>
        <span class="rr-main">${p
          ? `<span class="rr-kwh num">${nf(p.kwh)} <small>kWh</small></span><span class="rr-sub num"><b class="rr-cost">${kc(p.cost)}</b> · ${p.days} dní · ${nf(p.perDay, 1)} kWh/den</span>`
          : `<span class="rr-kwh">Výchozí stav</span><span class="rr-sub">První odečet, od něj se počítá.</span>`}</span>
        ${delta}
      </span>
      ${p ? `<span class="rr-bar" aria-hidden="true"><span style="width:${(p.d2 / max * 100).toFixed(1)}%;background:var(--t2)"></span><span style="width:${Math.max(p.d1 / max * 100, 0.8).toFixed(1)}%;background:var(--t1)"></span></span>` : ""}
      <span class="rr-foot num"><span><i class="dot t1"></i>T1 ${nf(r.t1)} kWh</span><span><i class="dot t2"></i>T2 ${nf(r.t2)} kWh</span><span class="rr-edit">Upravit ›</span></span>
    </button>`;
  }
  setHTML($("tbl"), h);
}

export function renderInvest(M, s, nP) {
  const list = invest(M, s);
  if (!list.length) {
    $("invIntro").innerHTML = `<p class="small">Výpočet potřebuje odhad roční spotřeby na topení. Ten vznikne, až budou odečty pokrývat aspoň kus topné sezóny.</p>`;
    $("invList").innerHTML = "";
  } else {
    $("invIntro").innerHTML = `
      
      <p class="small">Odhad z ${nP + 1} odečtů.</p>
      <div class="split">
        <div><p class="k">Topení za rok</p><p class="v num">${nf(Math.round(M.annualHeat / 100) * 100)} kWh</p><p class="s num">asi ${kc(Math.round(M.annualHeat * s.priceT2 / 100) * 100)}</p></div>
        <div><p class="k">Ostatní spotřeba za rok</p><p class="v num">${nf(Math.round(M.annualBase / 100) * 100)} kWh</p><p class="s num">asi ${kc(Math.round(M.annualBase * M.avgPrice / 100) * 100)}</p></div>
      </div>
      <p class="small muted">Ceny technologií jsou obvyklá rozpětí z podzimu 2026 včetně montáže, bez dotací. Nevratné dotace z Nové zelené úsporám dnes dostanou jen nízkopříjmové domácnosti (NZÚ Light), ostatním stát nabízí bezúročný úvěr. Aktuální podmínky ověřte na novazelenausporam.cz. Je to orientační výpočet, ne nabídka. Před rozhodnutím si nechte udělat nabídku na míru.</p>`;
    const vt = { good: "Vyplatí se", warn: "Na hraně", bad: "Nevyplatí se" };
    $("invList").innerHTML = list.map((t) => {
      const yrs = isFinite(t.yMid) ? (t.yLo >= 60 ? "přes 60 let" : nf(t.yLo) + " až " + (t.yHi >= 60 ? "60+" : nf(t.yHi)) + " let") : "nikdy";
      const w = isFinite(t.yMid) ? Math.min(100, t.yMid / 40 * 100) : 100;
      return `<section class="card tech">
        <div class="tech-top"><span class="icw ic"><img src="icons/${t.icon}.png" alt="" width="48" height="48"></span><div class="tech-name"><h3>${t.name}</h3><p>${t.sub}</p></div><span class="verdict ${t.verdict}"><i></i>${vt[t.verdict]}</span></div>
        <div class="facts">
          <div><p class="k">Pořízení</p><p class="v num">${nf(t.lo / 1000)}–${nf(t.hi / 1000)} tis.</p></div>
          <div><p class="k">Úspora za rok</p><p class="v num">${t.net > 0 ? kc(Math.round(t.net / 100) * 100) : "žádná"}</p></div>
          <div><p class="k">Návratnost</p><p class="v num">${yrs}</p></div>
        </div>
        <div class="payback"><div class="track"><div class="fill" style="width:${w}%"></div><div class="life" style="left:${Math.min(100, t.life / 40 * 100)}%"></div></div>
          <div class="cap"><span>0</span><span>černá čárka: životnost ${t.life} let</span><span>40 let</span></div></div>
        <details><summary>Jak se to počítá</summary><p>${t.how}</p>${t.extra.length ? "<p>Cena je " + t.extra.join(" a ") + ".</p>" : ""}<p>Úspora je po odečtení servisu ${nf(t.service)} Kč za rok.${t.note ? " " + t.note : ""}</p></details>
      </section>`;
    }).join("");
  }
  const tips = [
    "Zkontrolujte distribuční sazbu a jistič na vyúčtování. Stálé platy za jistič dělají u elektrického topení tisíce korun ročně.",
    "Porovnejte dodavatele. Rozdíl 0,50 Kč na kWh je u vaší spotřeby několik tisíc korun za rok bez jakékoli investice.",
    "Chytré termostaty a útlum topení přes noc a v práci stojí pár tisíc a obvykle ušetří 5 až 10 % tepla.",
    "Těsnění oken a dveří a izolace stropu pod půdou bývají nejlevnější úspora tepla.",
  ];
  $("tips").innerHTML = tips.map((t) => "<li>" + t + "</li>").join("");
}

export function renderSettings() {
  const s = state.settings, a = document.activeElement;
  const set = (id, v) => { if (a !== $(id)) $(id).value = v; };
  set("sP1", s.priceT1); set("sP2", s.priceT2); set("sFix", s.fixedMonthly); set("sWood", s.woodPrice); set("sAdv", s.advance);
  $("sHyd").checked = !!s.hasHydronic; $("sChim").checked = !!s.hasChimney;
}

export async function saveSettings() {
  const num = (id, def) => { const v = parseFloat($(id).value); return isFinite(v) && v >= 0 ? v : def; };
  const next = { ...state.settings, priceT1: num("sP1", state.settings.priceT1), priceT2: num("sP2", state.settings.priceT2), fixedMonthly: num("sFix", 0), advance: num("sAdv", 0), woodPrice: num("sWood", 1900), hasHydronic: $("sHyd").checked, hasChimney: $("sChim").checked };
  state.settings = next; render();
  if (!state.db) { $("saveState").textContent = "Změna platí jen do zavření stránky, úložiště není dostupné."; return; }
  try { await state.db.doc("settings/main").set(next); $("saveState").textContent = "Uloženo."; }
  catch (e) { $("saveState").textContent = "Nastavení se nepodařilo uložit. Zkuste to znovu."; }
}

export function showTab(name) {
  state.tab = name;
  for (const t of ["prehled", "odecty", "investice", "nastaveni"]) $("v-" + t).hidden = t !== name;
  document.querySelectorAll(".tab").forEach((b) => { if (b.dataset.tab === name) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  window.scrollTo(0, 0);
  const app = document.querySelector(".app");
  app.classList.add("swap"); clearTimeout(state.swapT); state.swapT = setTimeout(() => app.classList.remove("swap"), 800);
  render();
}

export function notice(text) { $("notice").hidden = !text; $("notice").textContent = text || ""; }

export async function boot() {
  setTimeout(() => { state.loaded = true; render(); }, 6000);
  render();
  document.querySelectorAll(".tab").forEach((b) => (b.onclick = () => showTab(b.dataset.tab)));
  $("unitKwh").onclick = () => { state.unit = "kwh"; $("unitKwh").setAttribute("aria-pressed", "true"); $("unitKc").setAttribute("aria-pressed", "false"); render(); };
  $("unitKc").onclick = () => { state.unit = "kc"; $("unitKc").setAttribute("aria-pressed", "true"); $("unitKwh").setAttribute("aria-pressed", "false"); render(); };
  $("btnPhoto").onclick = () => { if (state.sample && state.canImages) { $("fileInput").value = ""; sheet.append = false; $("fileInput").click(); } else openSheet("manual"); };
  $("btnManual").onclick = () => openSheet("manual");
  $("regCount").onclick = () => showTab("odecty");
  $("btnMore").onclick = () => { $("fileInput").value = ""; sheet.append = true; $("fileInput").click(); };
  $("fileInput").onchange = () => {
    const picked = [...$("fileInput").files];
    if (!picked.length) return;
    if (!sheet.append) openSheet("photo");
    sheet.files = (sheet.append ? sheet.files : []).concat(picked).slice(0, 4);
    readPhotos();
  };
  $("btnCancel").onclick = closeSheet;
  $("sheetBack").onclick = (e) => { if (e.target === $("sheetBack")) closeSheet(); };
  $("sheet").onsubmit = saveReading;
  for (const id of ["fDate", "fT1", "fT2"]) $(id).oninput = sheetCalc;
  $("btnDel").onclick = () => { $("btnDel").hidden = true; $("btnDelYes").hidden = false; };
  $("btnDelYes").onclick = async () => {
    if (!state.db || !sheet.editing) return;
    try { await state.db.collection("readings").doc(sheet.editing).delete(); closeSheet(); }
    catch (e) { setStatus("err", "Smazání se nepovedlo. Zkuste to znovu."); }
  };
  $("tbl").onclick = (e) => { const b = e.target.closest ? e.target.closest("[data-edit]") : null; const d = b ? b.dataset.edit : null; if (d) { const r = state.readings.find((x) => x.date === d); if (r) openSheet("manual", r); } };
  for (const id of ["sP1", "sP2", "sFix", "sAdv", "sWood", "sHyd", "sChim"]) $(id).onchange = saveSettings;
  const topBar = document.querySelector(".top");
  window.addEventListener("scroll", () => topBar.classList.toggle("scrolled", window.scrollY > 4), { passive: true });
  document.addEventListener("click", (e) => {
    const im = e.target.closest && e.target.closest(".icw");
    if (!im || REDUCED) return;
    im.classList.remove("charge", "zap"); void im.offsetWidth; im.classList.add("zap");
  });
  const vv = window.visualViewport;
  if (vv) {
    const fit = () => { const sb = $("sheetBack"); sb.style.height = vv.height + "px"; sb.style.top = vv.offsetTop + "px"; };
    vv.addEventListener("resize", fit); vv.addEventListener("scroll", fit); fit();
  }
  let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(render, 150); });

  const c = window.claude;
  if (!c || !c.use) { state.loaded = true; notice("Data se tady nedají načíst. Otevřete stránku přes Clauda a přihlaste se."); render(); return; }
  c.use("sample").then(async (sample) => {
    if (!sample) return;
    state.sample = sample;
    const lim = await sample.limits().catch(() => null);
    state.canImages = !!(lim && lim.images);
  });
  const db = await c.use("db");
  if (!db) { state.loaded = true; notice("Odečty se nepodařilo načíst. Zkontrolujte, že jste přihlášení ke Claudovi."); render(); return; }
  state.db = db;
  const slow = setTimeout(() => notice("Odečty se zatím nedaří načíst. Zkontrolujte připojení, stránka to zkouší dál."), 10000);
  db.collection("readings").onSnapshot((snap) => {
    state.readings = snap.docs.map((d) => d.data()).filter((r) => r && /^\d{4}-\d{2}-\d{2}$/.test(r.date) && Number.isFinite(r.t1) && Number.isFinite(r.t2))
      .map((r) => ({ date: r.date, t1: r.t1, t2: r.t2 })).sort((a, b) => (a.date < b.date ? -1 : 1));
    state.loaded = true;
    if (!snap.metadata || !snap.metadata.fromCache) { clearTimeout(slow); notice(""); }
    render();
  }, () => { clearTimeout(slow); state.loaded = true; notice("Odečty se nepodařilo načíst. Zavřete stránku a otevřete ji znovu."); render(); });
  db.doc("settings/main").onSnapshot((snap) => {
    if (snap.exists) { const d = snap.data() || {}; const n = { ...DEFAULTS }; for (const k of Object.keys(DEFAULTS)) if (typeof d[k] === typeof DEFAULTS[k]) n[k] = d[k]; state.settings = n; render(); }
  }, () => {});
}

boot();
