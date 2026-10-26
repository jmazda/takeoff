// Take-Off app controller: screens, the year loop, modals, saving, end screen.
import { loadData, drawCountry, pickSiblings, startingHand, incomeAt, availableStartYears } from './data.js';
import * as M from './model.js';
import { SECTORS } from './sectors.js';
import { pickEvent, firmName, PAUSES, GLOSSARY } from './content.js';
import { RNG, hashSeed } from './rng.js';
import { drawChart, indexPath } from './chart.js';
import { renderShareImage, shareOrDownload } from './share.js';
import { A } from './assumptions.js';

const $ = (s, el = document) => el.querySelector(s);
const ICON = {
  power: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
  customs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17h18l-2 4H5z"/><path d="M5 17V9h14v8"/><path d="M9 9V5h6v4"/></svg>',
  sez: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>',
  anchor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="3"/><path d="M12 8v13"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>',
  sme: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l1-5h16l1 5"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M5 12v9h14v-9"/><path d="M10 21v-6h4v6"/></svg>',
  skills: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10 12 5 2 10l10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
  macro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="M17 7H9.5a3 3 0 0 0 0 6h5a3 3 0 0 1 0 6H6"/></svg>',
  ipa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>',
  hold: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  watch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  voice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a9 9 0 0 1 0 14"/></svg>',
  convene: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2"/><path d="M17 14a4 4 0 0 1 4 4v3"/></svg>',
  leave: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>',
};
const iconFor = o => ICON[o.lever] || ({ m_hold: 'hold', a_protect: 'hold', f_convene: 'convene', f_leave: 'leave', o_wait: 'watch', o_voice: 'voice', o_funder: 'convene' }[o.id] ? ICON[{ m_hold: 'hold', a_protect: 'hold', f_convene: 'convene', f_leave: 'leave', o_wait: 'watch', o_voice: 'voice', o_funder: 'convene' }[o.id]] : ICON.watch);
const SAVE_KEY = 'takeoff.v1';
const SPEEDS = { 1: 4000, 2: 2000, 4: 1000, 8: 500, 16: 250 };

const app = window.__takeoff = {
  db: null, settings: { weighting: 'pop', era: 'any', globalShocks: 'real' },
  game: null, // { state, country, siblings, ctx, pausesDone, speed, playing, auto, timer, selected, lastEntry }
};

// ---------- utilities ----------
const fmtMoney = v => v == null ? '–' : '$' + Math.round(v).toLocaleString('en-US');
const fmtBig = v => v == null ? '–' : v >= 1e9 ? '$' + (v / 1e9).toFixed(v >= 1e10 ? 0 : 1) + 'bn' : '$' + (v / 1e6).toFixed(0) + 'm';
const fmtK = v => { if (v == null) return '–'; const a = Math.abs(v), sg = v < 0 ? '-' : ''; return sg + (a >= 1e6 ? (a / 1e6).toFixed(1) + 'm' : a >= 1e3 ? Math.round(a / 1e3) + 'k' : String(Math.round(a))); };
const sign = v => (v >= 0 ? '+' : '') + v.toFixed(1);
const pct = v => (v >= 0 ? '+' : '') + Math.round(v) + '%';
const T = (term, text) => `<span class="term" data-term="${term}">${text || term}</span>`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function show(id) { document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id)); window.scrollTo(0, 0); $('#nav-restart').hidden = id === 'home'; if (id === 'home' && app.db) renderHome(); }
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.style.display = 'block'; clearTimeout(t._h); t._h = setTimeout(() => t.style.display = 'none', 2200); }
function pips(n, max, cls) { let s = `<span class="pips ${cls}">`; for (let i = 0; i < max; i++) s += `<i class="${i < Math.round(n) ? 'on' : ''}"></i>`; return s + '</span>'; }
function openModal(html) { $('#modal-box').innerHTML = html; $('#modal').classList.add('open'); }
function closeModal() { $('#modal').classList.remove('open'); $('#modal-box').innerHTML = ''; }

// Glossary tooltips (tap or hover)
(function tips() {
  const tip = $('#tip');
  let cur = null;
  const showTip = el => { const k = el.dataset.term; const text = GLOSSARY[k] || GLOSSARY[k.toLowerCase()]; if (!text) return; tip.innerHTML = `<b>${esc(k)}</b><br>${esc(text)}`; tip.style.display = 'block'; const r = el.getBoundingClientRect(); const w = Math.min(300, window.innerWidth - 24); tip.style.width = w + 'px'; let left = Math.max(12, Math.min(r.left, window.innerWidth - w - 12)); tip.style.left = left + 'px'; tip.style.top = (r.bottom + 8 + (tip.offsetHeight + r.bottom + 8 > window.innerHeight ? -(tip.offsetHeight + r.height + 16) : 0)) + 'px'; cur = el; };
  document.addEventListener('click', e => { const el = e.target.closest('.term'); if (el && el !== cur) { showTip(el); e.preventDefault(); } else { tip.style.display = 'none'; cur = null; } });
  document.addEventListener('mouseover', e => { const el = e.target.closest('.term'); if (el) showTip(el); });
  document.addEventListener('mouseout', e => { if (e.target.closest && e.target.closest('.term')) { tip.style.display = 'none'; cur = null; } });
})();

// ---------- save / load ----------
function save() {
  const g = app.game; if (!g) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ state: M.serialize(g.state), iso: g.country.iso3, siblings: g.siblings.map(s => ({ iso: s.iso3, path: s.path, simulated: s.simulated })), pausesDone: g.pausesDone, settings: app.settings })); } catch (e) { /* storage may be unavailable */ }
}
function loadSave() { try { const j = localStorage.getItem(SAVE_KEY); return j ? JSON.parse(j) : null; } catch (e) { return null; } }
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } }

// ---------- game setup ----------
function makeCtx(country) { return { db: app.db, country, pickEvent, firmName }; }

function newGame() {
  const seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
  const rng = new RNG(seed);
  const { country, startYear } = drawCountry(app.db, rng, app.settings);
  startGame(country, startYear, seed, rng);
}
function startGame(country, startYear, seed, rng) {
  const ctx = makeCtx(country);
  const state = M.createState({ country, startYear, seed, settings: app.settings, db: app.db });
  state.hand = startingHand(country, startYear);
  const sibs = pickSiblings(app.db, country, startYear, rng).map((s, j) => sibling(s, startYear, state.unit, seed + 101 * (j + 1)));
  app.game = { state, country, siblings: sibs, ctx, pausesDone: {}, speed: 1, playing: false, auto: false, timer: null, selected: null, sector: state.bestSector, lastEntry: null };
  save();
  renderDraw();
  show('draw');
}
function sibling(country, startYear, unit, seed) {
  const real = M.realPath(country, startYear, unit);
  const complete = real.every(v => v != null);
  if (complete) return { iso3: country.iso3, name: country.name, path: real, simulated: false };
  const st = M.createState({ country, startYear, seed, settings: app.settings, db: app.db, role: 'sibling' });
  st.hand = startingHand(country, startYear);
  M.runAuto(st, makeCtx(country));
  return { iso3: country.iso3, name: country.name, path: st.incomePath, simulated: true };
}
function restoreGame(sv) {
  const country = app.db.byIso[sv.iso]; if (!country) return false;
  const state = M.deserialize(sv.state);
  state.hand = startingHand(country, state.startYear);
  app.settings = sv.settings || app.settings;
  const sibs = sv.siblings.map(s => ({ iso3: s.iso, name: app.db.byIso[s.iso]?.name || s.iso, path: s.path, simulated: s.simulated }));
  app.game = { state, country, siblings: sibs, ctx: makeCtx(country), pausesDone: sv.pausesDone || {}, speed: 1, playing: false, auto: false, timer: null, selected: null, sector: state.bestSector, lastEntry: state.log[state.log.length - 1] || null };
  if (state.pendingYear) { state.pendingYear = null; state.current = null; } // a reload mid-year: that year is replayed
  if (state.ended) { renderEnd(); show('end'); } else { renderPlay(); show('play'); checkPauses(); }
  return true;
}

// ---------- Draw screen ----------
function renderDraw() {
  const g = app.game, c = g.country, h = g.state.hand, st = g.state;
  const inc = h.income;
  const bars = h.basket.map(b => `<div class="barrow"><div class="lbl"><span>${b.name}</span><span class="muted">${Math.round(b.share)}%</span></div><div class="bar"><i style="width:${Math.min(100, b.share)}%"></i></div></div>`).join('');
  const near = h.nearby.map(n => `<span class="chip" title="proximity ${(n.proximity * 100).toFixed(0)}%">${n.name} <span class="muted">${n.short}</span></span>`).join('');
  const cons = h.constraints.rows.map(r => `<div class="barrow"><div class="lbl"><span>${r.label}</span><span class="muted">${r.share}%</span></div><div class="bar warm"><i style="width:${Math.min(100, r.share * 2.5)}%"></i></div></div>`).join('');
  const p = h.politics;
  const seatName = M.SEATS[st.career.seat].long;
  const sibs = g.siblings.map(s => `<li>${s.name}${s.simulated ? ' <span class="tiny muted">(simulated)</span>' : ''}</li>`).join('');
  const histNote = st.startYear < c.lastYear - 5 ? `<p class="small muted">A historical start. Your siblings follow their real paths from ${st.startYear}. Your country's path is yours to change. Firm-survey and governance numbers below are the latest available, not ${st.startYear} values.</p>` : '';
  const prior = `${(st.prior * 100).toFixed(1)}%`;
  $('#draw').innerHTML = `
    <div class="countrycard">
      <p class="eyebrow">${esc(c.regionName.trim())} · ${c.income === 'LIC' ? 'Low income' : c.income === 'LMC' ? 'Lower-middle income' : 'Upper-middle income'}</p>
      <h1>${esc(c.name)}</h1>
      <div class="sub">It is ${st.startYear}. You have just been appointed ${esc(seatName.replace(/^Head of the /, 'head of the ').replace(/^Director-General/, 'director-general').replace(/^Minister/, 'minister'))}.</div>
    </div>
    ${histNote}
    <div class="card hand">
      <h3>Income <small>${inc.label}</small></h3>
      <div class="kv"><span>GDP per person</span><b>${fmtMoney(inc.value)}</b><span>Population</span><b>${fmtK(h.pop)}</b><span>Exports</span><b>${Math.round(h.exportsGdp)}% of GDP</b><span>Growth per person, ${st.startYear < 1995 ? '1960' : '1990'}–2023</span><b>${(h.history.growth_1990_2023.mean * 100).toFixed(1)}%/yr</b></div>
      <p class="tiny muted" style="margin:8px 0 0">The model's growth prior for you is ${prior} a year: your own history, shrunk toward the LMIC average.</p>
    </div>
    <div class="card hand">
      <h3>Export basket <small>WDI ${h.basketYear || ''}</small></h3>
      ${bars}
      <p class="tiny muted" style="margin:8px 0 0">Commodity share of exports: ${Math.round(h.commodityShare * 100)}%. That is how much a swing in ${T('terms of trade')} hits you.</p>
    </div>
    <div class="card hand">
      <h3>Nearby sectors <small>simplified ${T('product space')}</small></h3>
      <div class="chips">${near}</div>
      <p class="tiny muted" style="margin:8px 0 0">Derived from the export basket by stated rules, not Atlas data. Proximity sets the odds that an anchor investor lands.</p>
    </div>
    <div class="card hand">
      <h3>Power <small>${h.power.year ? 'Enterprise Survey ' + h.power.year : ''}</small></h3>
      <div class="kv">
        <span>Access to electricity</span><b>${h.power.access != null ? Math.round(h.power.access) + '%' : '–'}</b>
        <span>Outages in a typical month</span><b>${h.power.outages != null ? h.power.outages : '–'}</b>
        <span>Firms calling electricity a major constraint</span><b>${h.power.constraint != null ? Math.round(h.power.constraint) + '%' : '–'}</b>
        <span>Sales lost to outages</span><b>${h.power.outageLoss != null ? h.power.outageLoss.toFixed(1) + '%' : '–'}</b>
      </div>
    </div>
    <div class="card hand">
      <h3>Ports and customs <small>${h.trade.year ? 'Enterprise Survey ' + h.trade.year : ''}</small></h3>
      <div class="kv">
        <span>Days to clear exports through customs</span><b>${h.trade.customsDays != null ? h.trade.customsDays : '–'}</b>
        <span>Border compliance to export (Doing Business ${h.trade.dbYear || ''})</span><b>${h.trade.borderHours != null ? h.trade.borderHours + ' hrs' : '–'}</b>
        <span>Logistics performance (1–5, ${h.trade.lpiYear || ''})</span><b>${h.trade.lpi != null ? h.trade.lpi.toFixed(2) : '–'}</b>
      </div>
    </div>
    <div class="card hand">
      <h3>What firms say blocks them most <small>${T('Enterprise Surveys', 'Enterprise Survey')} ${h.constraints.year || ''}</small></h3>
      ${cons || '<p class="small muted">No Enterprise Survey for this country. The model uses LMIC averages for constraints.</p>'}
    </div>
    <div class="card hand">
      <h3>Political setting <small>${T('WGI')} ${p.year || ''}</small></h3>
      <p class="small">Stability is <b>${p.stab}</b>; ${p.voice}; ${p.state}. External debt ${h.macro.debt != null ? Math.round(h.macro.debt) + '% of GNI' : 'unknown'}; inflation ${h.macro.inflation != null ? h.macro.inflation.toFixed(0) + '%' : 'unknown'}.</p>
      <p class="small">${st.overvalued ? 'The currency looks overvalued and a parallel market is open.' : 'No obvious exchange-rate misalignment right now.'} <span class="tiny muted">(a judgement call drawn from inflation)</span></p>
    </div>
    <div class="card hand">
      <h3>Your siblings <small>same start, similar income</small></h3>
      <ul class="small" style="margin:0; padding-left:18px">${sibs}</ul>
    </div>
    <button class="btn primary block" id="btn-begin">Begin your career</button>
    <p class="tiny muted" style="margin-top:10px">You will be reshuffled when the tenure data says so, not when you choose. Use the time.</p>`;
  $('#btn-begin').onclick = () => { renderPlay(); show('play'); checkPauses(); };
}

// ---------- Play screen ----------
function renderPlay() {
  const g = app.game, st = g.state;
  const seat = M.SEATS[st.career.seat];
  const html = `
    <div class="topbar">
      <div class="row spread" style="align-items:flex-start">
        <div><div class="yr">${st.year} <span class="muted">year ${st.t + 1} of ${M.HORIZON}</span></div><div class="seat">${esc(seat.long)}${st.career.seat !== 'out' ? ` · year ${st.career.seatYears + 1} in seat` : ` · ${st.career.outYears} ${st.career.outYears === 1 ? 'year' : 'years'} out`}</div></div>
        <div class="meters"><span class="meter">${T('political capital', 'Capital')} ${pips(st.career.pc, 10, '')}</span><span class="meter">${T('budget', 'Budget')} ${pips(st.career.budget, 8, 'budget')}</span></div>
      </div>
      <div class="track">${Array.from({ length: M.HORIZON }, (_, i) => `<i class="${i < st.t ? 'on' : i === st.t ? 'now' : ''}"></i>`).join('')}</div>
    </div>
    <div class="card chartcard"><canvas class="chart" id="chart"></canvas><div class="legend"><span><i style="background:var(--you)"></i>${esc(g.country.name)}</span><span><i style="background:var(--sib)"></i>siblings</span>${regimeBadges(st)}</div></div>
    <div class="stats">
      <div class="stat"><div class="v">${fmtMoney(st.income)}</div><div class="k">income per person</div></div>
      <div class="stat"><div class="v">${fmtBig(st.exports)}</div><div class="k">exports <span class="${st.exports >= st.exports0 ? 'pos' : 'neg'}">${pct(100 * (st.exports / st.exports0 - 1))}</span></div></div>
      <div class="stat"><div class="v">${(st.jobs - st.jobs0 >= 0 ? '+' : '') + fmtK(st.jobs - st.jobs0)}</div><div class="k">formal jobs beyond population growth</div></div>
    </div>
    <div id="lastyear"></div>
    <div class="card" id="thisyear"></div>
    <div class="card"><details><summary>Reforms and who kept them</summary><div id="reforms" style="margin-top:8px"></div></details></div>
    <div class="card"><details><summary>Career log</summary><ul class="log" id="history" style="margin-top:8px"></ul></details></div>`;
  $('#play').innerHTML = html;
  renderChart($('#chart'));
  renderLastYear();
  renderThisYear();
  renderReforms();
  renderHistory();
}
function regimeBadges(st) {
  const b = [];
  if (st.regime.accel) b.push('<span class="pill">growth spurt</span>');
  if (st.regime.collapse) b.push('<span class="pill bad">collapse</span>');
  if (st.regime.conflict) b.push('<span class="pill bad">conflict</span>');
  if (st.crisisYears > 0 || st.budgetSqueeze > 0) b.push('<span class="pill bad">debt programme</span>');
  if (st.overvalued) b.push(`<span class="pill warm">${T('overvalued', 'overvalued currency')}</span>`);
  for (const bm of st.booms.filter(x => !x.faded)) b.push(`<span class="pill">${SECTORS[bm.sector].name.toLowerCase()} boom</span>`);
  return b.join(' ');
}
function renderChart(canvas, big = false) {
  const g = app.game, st = g.state;
  const series = g.siblings.map(s => ({ values: indexPath(s.path.slice(0, big ? 26 : st.t + 1), s.path[0]), color: getComputedStyle(document.documentElement).getPropertyValue('--sib').trim(), width: 1, label: big ? s.name : '' }));
  series.push({ values: indexPath(st.incomePath, st.income0), color: getComputedStyle(document.documentElement).getPropertyValue('--you').trim(), width: 2.5, label: g.country.name, bold: true });
  if (g.refPath) series.push({ values: g.refPath.values, color: getComputedStyle(document.documentElement).getPropertyValue('--real').trim(), width: 2, dash: [5, 4], label: g.refPath.label });
  drawChart(canvas, { series, startYear: st.startYear });
}
function renderThisYear() {
  const g = app.game, st = g.state;
  const menu = M.menuFor(st);
  const seatHint = { minister: 'Big levers, little time.', adviser: 'Smaller levers, more continuity.', ipa: 'Close to firms, weak on policy.', funder: 'No direct policy, long view.', out: 'The country keeps going. So do you.' }[st.career.seat];
  const opts = menu.map(o => `<button class="opt ${g.selected === o.id ? 'on' : ''}" data-id="${o.id}" ${o.affordable ? '' : 'disabled'}>
      <span class="ico">${iconFor(o)}</span><span class="t">${esc(o.label)}</span><span class="cost">${o.pc ? o.pc + ' capital' : ''}${o.pc && o.budget ? ' · ' : ''}${o.budget ? o.budget + ' budget' : ''}${!o.pc && !o.budget ? 'free' : ''}</span>
      <span class="b">${esc(o.blurb)}</span>${o.why ? `<span class="why">${esc(o.why)}</span>` : ''}</button>`).join('');
  const sel = menu.find(o => o.id === g.selected);
  const sectorRow = sel && sel.sector ? `<div style="margin-top:10px"><div class="small muted" style="margin-bottom:6px">Which sector?</div><div class="chips">${Object.entries(st.prox).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, p]) => `<button class="chip ${g.sector === k ? 'on' : ''}" data-sector="${k}">${SECTORS[k].name} <span class="${g.sector === k ? '' : 'muted'}">${Math.round(p * 100)}%</span></button>`).join('')}</div><div class="tiny muted" style="margin-top:4px">Percentages are proximity to your current exports: the odds an anchor firm lands scale with it.</div></div>` : '';
  $('#thisyear').innerHTML = `
    <p class="eyebrow">This year · ${st.year} → ${st.year + 1}</p><p class="small muted" style="margin-top:-4px">${esc(seatHint)}</p>
    <div class="menu">${opts}</div>
    ${sectorRow}
    <div class="row spread" style="margin-top:12px">
      <button class="btn primary" id="btn-run" ${g.selected ? '' : 'disabled'}>Run the year</button>
      <div class="speed"><button id="btn-play">${g.playing ? '❚❚ Pause' : '▶ Fast-forward'}</button>${[1, 2, 4, 8, 16].map(s => `<button data-speed="${s}" class="${g.speed === s ? 'on' : ''}">${s}x</button>`).join('')}<button id="btn-auto" class="${g.auto ? 'on' : ''}">Auto</button></div>
    </div>
    <p class="tiny muted" style="margin:8px 0 0">Fast-forward repeats your last focus when it fits the seat and you can afford it, and stops for decisions. Auto plays the whole career with a reasonable default government.</p>`;
  $('#thisyear').querySelectorAll('.opt').forEach(b => b.onclick = () => { g.selected = b.dataset.id; renderThisYear(); });
  $('#thisyear').querySelectorAll('[data-sector]').forEach(b => b.onclick = () => { g.sector = b.dataset.sector; renderThisYear(); });
  $('#btn-run').onclick = () => runYear();
  $('#btn-play').onclick = () => { g.playing = !g.playing; if (g.playing) scheduleNext(0); else stopTimer(); renderThisYear(); };
  $('#btn-auto').onclick = () => { g.auto = !g.auto; g.playing = g.auto; if (g.auto) scheduleNext(0); else stopTimer(); renderThisYear(); };
  $('#thisyear').querySelectorAll('[data-speed]').forEach(b => b.onclick = () => { g.speed = +b.dataset.speed; renderThisYear(); });
}
function renderLastYear() {
  const g = app.game, e = g.lastEntry;
  const el = $('#lastyear'); if (!el) return;
  if (!e) { el.innerHTML = ''; return; }
  const ppt = v => v ? `<span class="ppt ${v > 0 ? 'pos' : 'neg'}">${sign(v)} pt</span>` : '';
  const shocks = e.shocks.map(s => `<div class="shock"><span>${esc(s.text)}</span>${ppt(s.ppt)}</div>`).join('');
  const events = e.events.map(v => `<div class="shock"><span><b>${esc(v.title)}.</b> You chose “${esc(v.choice)}”. ${esc(v.result)}</span>${ppt(v.ppt)}</div>`).join('');
  const career = e.career.map(n => `<div class="shock"><span>${esc(n.text)}</span></div>`).join('');
  const succ = g.state.flags.lastSuccessor && e.career.some(n => n.id === 'left') ? `<div class="small" style="margin-top:6px">Your successor ${g.state.flags.lastSuccessor.length ? g.state.flags.lastSuccessor.map(o => `<span class="pill ${o.kept ? '' : 'bad'}">${o.kept ? 'kept' : 'reversed'} ${M.LEVER_INFO[o.lever].name.toLowerCase()}</span>`).join(' ') : 'found nothing worth reversing.'}</div>` : '';
  el.innerHTML = `<div class="card yearcard">
    <p class="eyebrow" style="display:flex;justify-content:space-between"><span>${e.year - 1} → ${e.year}</span><span class="muted" style="text-transform:none;letter-spacing:0;font-weight:500">${e.choice ? 'focus: ' + esc(e.choice.label) : ''}</span></p>
    <p class="sum">${esc(e.summary)}</p>
    ${shocks}${events}${career}${succ}
    <details class="why" style="margin-top:8px"><summary>Why did this happen?</summary>${whyPanel(e)}</details>
  </div>`;
}
function whyPanel(e) {
  const b = e.breakdown;
  const rows = [['Country prior (own history, shrunk to LMIC mean, plus shock offset)', b.prior], ['Convergence', b.convergence], ['Regime (spurt or collapse)', b.regime], ['Reforms (capped at ' + A.policy_cap_ppt.value + ' pt)', b.policy], ['Shocks', b.shocks], ['Noise', b.noise]];
  for (const v of e.events) if (v.ppt) rows.push(['Event: ' + v.title, v.ppt]);
  const maxAbs = Math.max(2, ...rows.map(r => Math.abs(r[1])));
  const bar = v => `<div class="bb"><i class="${v < 0 ? 'neg' : ''}" style="left:${v < 0 ? 50 - 50 * Math.abs(v) / maxAbs : 50}%; width:${50 * Math.abs(v) / maxAbs}%"></i></div>`;
  const parts = Object.entries(e.policyParts || {}).filter(([, v]) => v > 0.005).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(', ');
  return `<div style="margin-top:8px">${rows.map(([k, v]) => `<div class="barrow"><span class="small">${k}</span>${bar(v)}<span class="small ppt" style="text-align:right">${sign(v)}</span></div>`).join('')}
    <div class="small" style="margin-top:6px"><b>Growth per person: ${sign(e.growth)}%.</b></div>
    ${parts ? `<div class="tiny muted">Reform parts: ${parts}${e.policyCapped ? ' (hit the cap)' : ''}.</div>` : ''}
    <div class="tiny muted" style="margin-top:4px">Prior and noise come from this country's own WDI growth history. Shock odds come from its agriculture share, governance scores, debt and export basket. Each rate is on the <a href="methods.html">methods page</a>.</div></div>`;
}
function renderReforms() {
  const g = app.game, st = g.state, el = $('#reforms'); if (!el) return;
  el.innerHTML = M.LEVERS.map(l => { const r = st.reforms[l]; const info = M.LEVER_INFO[l]; return `<div class="reform"><div class="n"><span>${T(l === 'sez' ? 'SEZ' : l === 'anchor' ? 'anchor investor' : 'reform stock', info.name)}</span>${r.constituency ? `<span class="pill">${T('constituency')}</span>` : ''}${r.protected ? '<span class="pill">protected</span>' : ''}${r.reversed ? `<span class="pill bad">reversed ×${r.reversed}</span>` : ''}${r.kept ? `<span class="pill grey">kept ×${r.kept}</span>` : ''}</div><div class="bar"><i style="width:${Math.round(r.stock * 100)}%"></i></div></div>`; }).join('') +
    (st.booms.length ? `<div class="small" style="margin-top:10px"><b>Firms:</b> ${st.booms.map(b => `${esc(b.firm)} (${SECTORS[b.sector].name.toLowerCase()}, ${b.faded ? 'faded' : fmtBig(b.value) + ' exports'}${b.followers ? ', ' + b.followers + ' follower' + (b.followers > 1 ? 's' : '') : ''})`).join('; ')}</div>` : '');
}
function renderHistory() {
  const g = app.game, el = $('#history'); if (!el) return;
  el.innerHTML = [...g.state.log].reverse().map(e => `<li><span class="y">${e.year}</span>${esc(e.summary)} <span class="muted">${e.choice ? '· ' + esc(e.choice.label) : ''}</span></li>`).join('') || '<li class="muted small">Nothing yet.</li>';
}

// ---------- Year loop ----------
function stopTimer() { const g = app.game; if (g && g.timer) { clearTimeout(g.timer); g.timer = null; } }
function scheduleNext(delay) {
  const g = app.game; stopTimer();
  if (!g.playing || g.state.ended || $('#modal').classList.contains('open')) return;
  g.timer = setTimeout(() => {
    g.timer = null; if (!g.playing || g.state.ended) return;
    try { autoPick(); runYear(); } catch (e) { console.error('year loop failed', e); g.playing = false; g.auto = false; toast('Something went wrong this year. See the console.'); renderThisYear(); }
  }, delay == null ? SPEEDS[g.speed] : delay);
}
function autoPick() {
  const g = app.game, st = g.state;
  const menu = M.menuFor(st);
  if (g.auto) { const ch = M.autoChoose(st, g.ctx, menu, st.rng.career); g.selected = ch.optionId; g.sector = ch.sector; return; }
  const last = st.choices[st.choices.length - 1];
  const same = last && menu.find(o => o.id === last.id && o.affordable);
  if (same) { g.selected = same.id; return; }
  const ch = M.autoChoose(st, g.ctx, menu, st.rng.career); g.selected = ch.optionId; g.sector = ch.sector;
}
function runYear() {
  const g = app.game, st = g.state;
  if (!g.selected || st.ended) return;
  const opt = M.OPTIONS_BY_ID[g.selected];
  if (!opt || opt.seat !== st.career.seat) { g.selected = null; renderThisYear(); return; }
  M.chooseFocus(st, g.selected, g.sector);
  M.rollYear(st, g.ctx);
  if (st.pending) {
    if (g.auto) { M.resolveEvent(st, g.ctx, st.pending.autoChoice ?? 0); finishYear(); }
    else showEvent();
  } else finishYear();
}
function finishYear() {
  const g = app.game, st = g.state;
  const seatBefore = st.career.seat;
  const entry = M.closeYear(st, g.ctx);
  g.lastEntry = entry;
  if (st.career.seat !== seatBefore) g.selected = null; else if (g.selected && !M.menuFor(st).find(o => o.id === g.selected && o.affordable)) g.selected = null;
  save();
  if (st.ended) { stopTimer(); g.playing = false; checkPauses(() => { renderEnd(); show('end'); }); return; }
  renderPlay();
  checkPauses(() => scheduleNext());
}
function showEvent() {
  const g = app.game, st = g.state, ev = st.pending;
  stopTimer();
  openModal(`<div class="tiny muted">${st.year + 1} · a decision</div><h2>${esc(ev.title)}</h2><p>${esc(ev.text)}</p>
    ${ev.options.map((o, i) => { const ok = (o.pc || 0) <= st.career.pc && (o.budget || 0) <= st.career.budget; return `<button class="evopt" data-i="${i}" ${ok ? '' : 'disabled'}><span>${esc(o.label)}</span><span class="muted small">${o.pc ? o.pc + ' capital' : ''}${o.pc && o.budget ? ' · ' : ''}${o.budget ? o.budget + ' budget' : ''}</span></button>`; }).join('')}
    <p class="tiny muted" style="margin-top:10px">The odds of this event come from your seat, your reform stock and the country's conditions. Every firm and person in it is fictional.</p>`);
  $('#modal-box').querySelectorAll('.evopt').forEach(b => b.onclick = () => {
    const res = M.resolveEvent(st, g.ctx, +b.dataset.i);
    openModal(`<h2>${esc(ev.title)}</h2><p>${esc(res.text)}</p><button class="btn primary block" id="ev-ok">Continue</button>`);
    $('#ev-ok').onclick = () => { closeModal(); finishYear(); };
  });
}
// The five career moments.
function checkPauses(done) {
  const g = app.game, st = g.state;
  const due = PAUSES.find(p => !g.pausesDone[p.id] && p.when(st));
  if (!due) { if (done) done(); return; }
  g.pausesDone[due.id] = true; stopTimer();
  openModal(`<div class="tiny muted">A pause · ${esc(due.title)}</div><h2>${esc(due.q)}</h2><p class="small muted">One line is enough. Your answers appear on the end screen. Nothing is sent anywhere.</p>
    <textarea id="pause-answer" placeholder="Your answer"></textarea>
    <div class="row" style="margin-top:10px"><button class="btn primary" id="pause-save">Save</button><button class="btn ghost" id="pause-skip">Skip</button></div>`);
  const finish = (answer) => { st.answers.push({ id: due.id, year: st.year, title: due.title, q: due.q, answer: answer || null }); save(); closeModal(); checkPauses(done); };
  $('#pause-save').onclick = () => finish($('#pause-answer').value.trim());
  $('#pause-skip').onclick = () => finish(null);
  setTimeout(() => $('#pause-answer') && $('#pause-answer').focus(), 50);
}

// ---------- End screen ----------
function renderEnd() {
  const g = app.game, st = g.state, c = g.country;
  const endYear = st.startYear + M.HORIZON;
  const myG = 100 * Math.log(st.income / st.income0) / M.HORIZON;
  const sibs = g.siblings.map(s => { const v = s.path.filter(x => x != null); const gr = v.length > 1 ? 100 * Math.log(v[v.length - 1] / v[0]) / (v.length - 1) : null; return { ...s, g: gr, final: v[v.length - 1], tookOff: gr != null && gr > 3.5 }; });
  const beaten = sibs.filter(s => s.g != null && myG > s.g).length;
  const tookOff = myG > 3.5;
  const kept = M.LEVERS.filter(l => st.reforms[l].yours > 0.3 && st.reforms[l].stock > 0.3).map(l => M.LEVER_INFO[l].name);
  const lost = M.LEVERS.filter(l => st.reforms[l].yours > 0.3 && st.reforms[l].reversed > 0 && st.reforms[l].stock <= 0.3).map(l => M.LEVER_INFO[l].name);
  const verdict = tookOff ? `${c.name} took off: ${myG.toFixed(1)}% a year for 25 years. One career in five gets here. Yours did.` : myG > 2 ? `${c.name} grew ${myG.toFixed(1)}% a year: real, steady gains for millions of people, without a take-off. Most good careers look like this.` : myG > 0.5 ? `${c.name} grew ${myG.toFixed(1)}% a year. Some good years, some hard shocks, no take-off yet. What survived you is where the next attempt starts.` : `${c.name} barely grew: ${myG.toFixed(1)}% a year. A rough 25 years, with shocks nobody in the room controlled. The seat was still worth taking.`;
  const careerLine = `${st.career.history.filter(h => !['out', 'funder'].includes(h.seat)).length} government seats, ${st.career.reshuffles} reshuffles, ${st.career.outYears} years out of office, ${st.elections} elections, ${st.log.filter(e => e.shocks.some(s => s.id === 'coup')).length} coup attempts, ${st.booms.filter(b => b.byYou).length} pioneer firms landed on your watch.`;
  $('#end').innerHTML = `
    <div class="countrycard"><p class="eyebrow">${st.startYear}–${endYear} · your career</p><h1>${esc(c.name)}</h1><div class="sub">${esc(verdict)}</div></div>
    <div class="card chartcard"><canvas class="chart big" id="endchart"></canvas><div class="legend"><span><i style="background:var(--you)"></i>${esc(c.name)}</span><span><i style="background:var(--sib)"></i>siblings${sibs.some(s => s.simulated) ? ' (simulated)' : ' (real history)'}</span><span id="ref-legend"></span></div></div>
    <div class="stats">
      <div class="stat"><div class="v">${myG.toFixed(1)}%</div><div class="k">growth per person, per year</div></div>
      <div class="stat"><div class="v">${pct(100 * (st.exports / st.exports0 - 1))}</div><div class="k">exports (${fmtBig(st.exports0)} → ${fmtBig(st.exports)})</div></div>
      <div class="stat"><div class="v">${(st.jobs - st.jobs0 >= 0 ? '+' : '') + fmtK(st.jobs - st.jobs0)}</div><div class="k">formal jobs beyond population growth</div></div>
    </div>
    <div class="card">
      <h3>Against your siblings</h3>
      <p class="small">You grew faster than ${beaten} of ${sibs.length}. ${sibs.filter(s => s.tookOff).length ? `${sibs.filter(s => s.tookOff).map(s => s.name).join(' and ')} took off.` : 'None of them took off either.'}</p>
      ${sibs.map(s => `<div class="barrow"><div class="lbl"><span>${esc(s.name)}${s.tookOff ? ' <span class="pill">take-off</span>' : ''}</span><span class="muted">${s.g != null ? s.g.toFixed(1) + '%/yr' : '–'}</span></div><div class="bar"><i style="width:${Math.max(0, Math.min(100, (s.g || 0) * 14))}%; background: var(--sib)"></i></div></div>`).join('')}
      <div class="barrow"><div class="lbl"><span><b>${esc(c.name)}</b></span><span class="muted">${myG.toFixed(1)}%/yr</span></div><div class="bar"><i style="width:${Math.max(0, Math.min(100, myG * 14))}%"></i></div></div>
      ${sibs.some(s => s.tookOff) ? `<p class="tiny muted" style="margin-top:8px">${sibs.filter(s => s.tookOff).map(s => s.simulated ? `${s.name} (simulated) hit a growth spurt that lasted.` : `${s.name}'s real growth over ${st.startYear}–${endYear} came from its actual history: a commodity boom, a manufacturing boom, or a recovery from a very low base. Look it up; the game does not pretend to know which.`).join(' ')}</p>` : ''}
    </div>
    <div class="card">
      <h3>What survived you</h3>
      <p class="small">${kept.length ? `Still standing: <b>${kept.join(', ')}</b>.` : 'None of the reforms you built is still above a third of its full strength.'} ${lost.length ? `Reversed by successors and never rebuilt: ${lost.join(', ')}.` : ''}</p>
      <p class="small muted">${esc(careerLine)}</p>
      ${st.booms.length ? `<p class="small">Firms: ${st.booms.map(b => `${esc(b.firm)} (${SECTORS[b.sector].name.toLowerCase()}, ${b.faded ? 'left' : 'still here'})`).join('; ')}.</p>` : ''}
    </div>
    <div class="card" id="luck"><h3>You versus luck</h3><p class="small muted">Rerunning your career 80 times…</p></div>
    <div class="card">
      <h3>Your answers</h3>
      ${st.answers.length ? `<ul class="answers">${st.answers.map(a => `<li><div class="q">${a.year} · ${esc(a.title)}: ${esc(a.q)}</div><div class="a">${a.answer ? esc(a.answer) : '<span class="muted small">skipped</span>'}</div></li>`).join('')}</ul>` : '<p class="small muted">You skipped every pause. Next time, answer one: they are the questions people in these seats actually ask themselves.</p>'}
    </div>
    <div class="card">
      <h3>Where you actually work</h3>
      <p class="small muted">Pick the country you work in or on, and see its real record over the same years.</p>
      <select id="ref-country"><option value="">Choose a country…</option>${app.db.countries.slice().sort((a, b) => a.name.localeCompare(b.name)).map(x => `<option value="${x.iso3}">${esc(x.name)}</option>`).join('')}</select>
      <div id="ref-out" class="small" style="margin-top:8px"></div>
    </div>
    <div class="row">
      <button class="btn primary lg" id="btn-share">Share the result <span class="arrow">→</span></button>
      <button class="btn" id="btn-again">Play again</button>
    </div>
    <p class="tiny muted" style="margin-top:12px">Siblings: real countries with a similar income in ${st.startYear}. ${sibs.some(s => s.simulated) ? 'Their paths are simulated with the same model and a default government, because the years have not happened yet.' : 'Their paths are their real income data (WDI).'} Growth per person is annual log growth over 25 years.</p>`;
  g.refPath = null;
  renderChart($('#endchart'), true);
  $('#btn-again').onclick = () => { clearSave(); app.game = null; show('home'); renderHome(); };
  $('#btn-share').onclick = async () => {
    const series = g.siblings.map(s => ({ values: indexPath(s.path, s.path[0]), color: '#9aa0a6', width: 1.5 }));
    series.push({ values: indexPath(st.incomePath, st.income0), color: '#0f766e', width: 3 });
    const blob = await renderShareImage({ name: c.name, startYear: st.startYear, endYear, series, verdict, stats: [[`growth per person, per year`, myG.toFixed(1) + '%'], ['exports', pct(100 * (st.exports / st.exports0 - 1))], ['formal jobs beyond population growth', (st.jobs - st.jobs0 >= 0 ? '+' : '') + fmtK(st.jobs - st.jobs0)], ['siblings beaten', `${beaten} of ${sibs.length}`]] });
    const r = await shareOrDownload(blob, `takeoff-${c.iso3}-${st.startYear}.png`);
    toast(r === 'shared' ? 'Shared.' : 'Image downloaded.');
  };
  $('#ref-country').onchange = e => referenceCountry(e.target.value);
  setTimeout(() => luckVersusSkill(myG), 30);
}
function referenceCountry(iso) {
  const g = app.game, st = g.state, out = $('#ref-out');
  if (!iso) { g.refPath = null; out.innerHTML = ''; $('#ref-legend').innerHTML = ''; renderChart($('#endchart'), true); return; }
  const rc = app.db.byIso[iso];
  const real = M.realPath(rc, st.startYear, st.unit);
  const have = real.filter(v => v != null);
  const endYear = st.startYear + M.HORIZON;
  if (have.length > 5) {
    const gr = 100 * Math.log(have[have.length - 1] / have[0]) / (have.length - 1);
    const myG = 100 * Math.log(st.income / st.income0) / M.HORIZON;
    g.refPath = { values: indexPath(real, have[0]), label: rc.name };
    $('#ref-legend').innerHTML = `<i style="background:var(--real)"></i>${esc(rc.name)} (real)`;
    out.innerHTML = `<b>${esc(rc.name)}</b> actually grew ${gr.toFixed(1)}% a year over ${st.startYear}–${Math.min(endYear, rc.lastYear)}${have.length < 26 ? ' (data so far)' : ''}. Your ${esc(g.country.name)} grew ${myG.toFixed(1)}%. ${gr > 3.5 ? 'That is a real take-off, which the game would call rare.' : gr > myG ? 'Reality did a little better than your run.' : 'Your run did better than reality.'}`;
  } else {
    const s = rc.series.gdppc_usd; const ys = Object.keys(s).map(Number); const y0 = Math.max(Math.min(...ys), rc.lastYear - 25);
    const gr = 100 * Math.log(s[rc.lastYear] / s[y0]) / (rc.lastYear - y0);
    g.refPath = null; $('#ref-legend').innerHTML = '';
    out.innerHTML = `<b>${esc(rc.name)}</b> has no data for ${st.startYear}–${endYear}. Over ${y0}–${rc.lastYear} its income per person grew ${gr.toFixed(1)}% a year.`;
  }
  renderChart($('#endchart'), true);
}
// Reruns: same shocks with autopilot choices (what the default government would have got with your luck),
// and your choices with different shocks (what your plan would have got with other luck).
async function luckVersusSkill(myG) {
  const g = app.game, st = g.state, c = g.country;
  const N = 40;
  const yourChoices = st.choices;
  const replay = (s, ctx, menu) => { const rec = yourChoices.find(x => x.t === s.t); if (rec) { const o = menu.find(m => m.id === rec.id && m.affordable); if (o) return { optionId: o.id, sector: rec.sector }; } return M.autoChoose(s, ctx, menu); };
  const sameLuck = [], otherLuck = [];
  const growth = s => 100 * Math.log(s.income / s.income0) / M.HORIZON;
  for (let i = 0; i < N; i++) {
    const a = M.createState({ country: c, startYear: st.startYear, seed: st.seed, settings: st.settings, db: app.db, seeds: { career: st.seed + 7919 * (i + 1) } }); a.hand = st.hand;
    M.runAuto(a, g.ctx); sameLuck.push(growth(a));
    const b = M.createState({ country: c, startYear: st.startYear, seed: st.seed, settings: st.settings, db: app.db, seeds: { shock: st.seed + 104729 * (i + 1), event: st.seed + 1299709 * (i + 1), bg: st.seed + 15485863 * (i + 1) } }); b.hand = st.hand;
    M.runAuto(b, g.ctx, replay); otherLuck.push(growth(b));
    if (i % 8 === 7) await new Promise(r => setTimeout(r, 0));
  }
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const skill = myG - mean(sameLuck);           // you vs a default government, same luck
  const luck = myG - mean(otherLuck);           // your luck vs the average luck, same plan
  const pctile = Math.round(100 * otherLuck.filter(x => x < myG).length / N);
  const spreadLuck = Math.sqrt(mean(otherLuck.map(x => (x - mean(otherLuck)) ** 2)));
  const tot = Math.abs(skill) + Math.abs(luck) + 1e-9;
  const line = Math.abs(skill) < 0.15 ? 'Your choices made about as much difference as a default government would have.' : skill > 0 ? `Your choices added about ${skill.toFixed(1)} points a year over a default government with the same luck.` : `A default government with your luck would have done about ${(-skill).toFixed(1)} points a year better. It happens.`;
  const line2 = `With your plan but other luck, growth landed anywhere from ${Math.min(...otherLuck).toFixed(1)}% to ${Math.max(...otherLuck).toFixed(1)}% a year. Your draw was in the ${pctile}th percentile.`;
  $('#luck').innerHTML = `<h3>You versus luck</h3>
    <div class="lucks">
      <div class="stat"><div class="v ${skill >= 0 ? 'pos' : 'neg'}">${sign(skill)} pt</div><div class="k">your choices, same luck</div></div>
      <div class="stat"><div class="v ${luck >= 0 ? 'pos' : 'neg'}">${sign(luck)} pt</div><div class="k">your luck, same choices</div></div>
    </div>
    <div class="split"><i style="width:${100 * Math.abs(skill) / tot}%; background: var(--accent)"></i><i style="width:${100 * Math.abs(luck) / tot}%; background: var(--warm)"></i></div>
    <div class="tiny muted">share of the gap: <span class="pos">you</span> ${Math.round(100 * Math.abs(skill) / tot)}% · <span style="color:var(--warm)">luck</span> ${Math.round(100 * Math.abs(luck) / tot)}%</div>
    <p class="small" style="margin-top:10px">${line} ${line2} Luck alone moves the result by ±${spreadLuck.toFixed(1)} points a year. That is the weather every reformer works in, and why the ones who keep going through it deserve more credit than they get.</p>
    <p class="tiny muted">Method: ${N} reruns with your shocks and a default government, and ${N} reruns with your choices and fresh shocks. Where your recorded choice does not fit the seat you held in the rerun, the default government decides.</p>`;
}

// ---------- Home ----------
function renderHome() {
  const sv = loadSave();
  $('#btn-continue').hidden = !sv;
  if (sv) { const c = app.db.byIso[sv.iso]; $('#btn-continue').textContent = `Continue: ${c ? c.name : sv.iso}`; }
  document.querySelectorAll('.seg').forEach(seg => seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', app.settings[seg.dataset.setting] === b.dataset.v)));
}
document.querySelectorAll('.seg').forEach(seg => seg.querySelectorAll('button').forEach(b => b.onclick = () => { app.settings[seg.dataset.setting] = b.dataset.v; renderHome(); }));
$('#btn-draw').onclick = () => { if (!app.db) return; clearSave(); newGame(); };
$('#btn-continue').onclick = () => { const sv = loadSave(); if (sv && !restoreGame(sv)) toast('Could not restore the saved career.'); };
$('#nav-restart').onclick = () => { if (confirm('Abandon this career and go back to the start?')) { stopTimer(); clearSave(); app.game = null; show('home'); renderHome(); } };
$('#brand').onclick = e => { e.preventDefault(); if (app.game && !app.game.state.ended) { show('play'); } else { show('home'); renderHome(); } };
window.addEventListener('resize', () => { const c = $('#chart'); if (c && $('#play').classList.contains('active')) renderChart(c); const e = $('#endchart'); if (e && $('#end').classList.contains('active')) renderChart(e, true); });

// Debug/URL options: ?country=KEN&year=2000&seed=123
(async function init() {
  try {
    app.db = await loadData();
    $('#loading').textContent = `${app.db.countries.length} low- and middle-income countries loaded · WDI data as of ${app.db.built}.`;
    renderHome();
    const q = new URLSearchParams(location.search);
    if (q.get('country')) {
      const c = app.db.byIso[q.get('country').toUpperCase()];
      if (c) { const years = availableStartYears(c); const y = +(q.get('year') || years[0]); const seed = q.get('seed') ? hashSeed(q.get('seed')) : (Date.now() >>> 0); clearSave(); startGame(c, years.includes(y) ? y : years[0], seed, new RNG(seed)); }
    }
  } catch (e) { $('#loading').textContent = 'Could not load country data. Serve this folder over HTTP (file:// blocks fetch).'; console.error(e); }
})();
