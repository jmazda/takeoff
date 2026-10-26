// Runs many careers headlessly and prints base rates. node tools/calibrate.mjs [runs]
import fs from 'node:fs';
import { indexData, drawCountry, pickSiblings, startingHand } from '../src/data.js';
import * as M from '../src/model.js';
import { pickEvent, firmName } from '../src/content.js';
import { RNG } from '../src/rng.js';

const raw = JSON.parse(fs.readFileSync('data/countries.json', 'utf8'));
const db = indexData(raw);
const N = +(process.argv[2] || 300);
const settings = { weighting: 'equal', era: 'recent', globalShocks: 'real' };

function thoughtful(state, ctx, menu) {
  // Persistent, focused: finish the binding constraint, then court one anchor in the nearest sector, then protect and maintain.
  const aff = menu.filter(o => o.affordable);
  const L = ctx.country.latest;
  const elec = (L.es_elec_constraint || 20), cust = (L.es_customs_constraint || 10) * 1.5;
  const order = [];
  if (state.overvalued && state.career.pc >= 5) order.push('macro');
  order.push(elec >= cust ? 'power' : 'customs', 'anchor', elec >= cust ? 'customs' : 'power', 'ipa', 'skills');
  const seat = state.career.seat;
  if (seat === 'ipa' && state.booms.some(b => !b.faded)) { const o = aff.find(x => x.id === 'i_aftercare'); if (o) return { optionId: o.id }; }
  if (seat === 'adviser') { const best = Object.entries(state.reforms).filter(([k, r]) => r.stock > 0.5 && !r.protected).length; const o = aff.find(x => x.id === 'a_protect'); if (best && o) return { optionId: o.id }; }
  for (const lever of order) {
    const r = state.reforms[lever];
    if (r.stock >= 0.9) continue;
    if (lever === 'anchor' && state.booms.some(b => !b.faded)) continue;
    const o = aff.find(x => x.lever === lever);
    if (o) return { optionId: o.id, sector: state.bestSector };
  }
  const hold = aff.find(x => ['m_hold', 'i_aftercare', 'o_voice', 'f_ipa', 'a_power'].includes(x.id));
  if (hold) return { optionId: hold.id, sector: state.bestSector };
  return { optionId: aff[0].id, sector: state.bestSector };
}
function randomChooser(state, ctx, menu) { const aff = menu.filter(o => o.affordable); const o = aff[state.rng.career.int(aff.length)]; return { optionId: o.id, sector: Object.keys(state.prox)[state.rng.career.int(13)] }; }

const stats = { thoughtful: [], auto: [], random: [] };
const comp = { prior: 0, convergence: 0, regime: 0, policy: 0, shocks: 0, noise: 0, n: 0 };
const sibG = []; const polBy = { thoughtful: 0, auto: 0, random: 0 }; const boomBy = { thoughtful: 0, auto: 0, random: 0 };
const agg = { boomsEver: 0, accel: 0, coups: 0, debt: 0, booms: 0, reshuffles: 0, outYears: 0, growth: [], takeoff: 0, seatsHeld: [], tenure: [] };
for (let i = 0; i < N; i++) {
  const rng = new RNG(1000 + i);
  const { country, startYear } = drawCountry(db, rng, settings);
  const seed = 77 + i * 13;
  const ctx = { db, country, pickEvent, firmName };
  const runs = {};
  for (const [name, chooser] of [['thoughtful', thoughtful], ['auto', null], ['random', randomChooser]]) {
    const st = M.createState({ country, startYear, seed, settings, db });
    st.hand = startingHand(country, startYear);
    M.runAuto(st, ctx, chooser);
    runs[name] = st;
  }
  // Siblings (simulated with autopilot, their own seeds)
  const sibs = pickSiblings(db, country, startYear, rng).map((s, j) => { const st = M.createState({ country: s, startYear, seed: seed * 7 + j, settings, db, role: 'sibling' }); st.hand = startingHand(s, startYear); M.runAuto(st, { ...ctx, country: s }); return st; });
  const sibGrowth = sibs.map(s => Math.log(s.income / s.income0) / 25);
  sibG.push(...sibGrowth);
  const sg = [...sibGrowth].sort((a, b) => a - b); const medianSib = sg.length ? (sg[Math.floor((sg.length - 1) / 2)] + sg[Math.ceil((sg.length - 1) / 2)]) / 2 : 0;
  for (const name of Object.keys(runs)) {
    const g = Math.log(runs[name].income / runs[name].income0) / 25;
    stats[name].push({ g, beats: g > medianSib, beatsAll: sibGrowth.every(x => g > x) });
  }
  const st = runs.thoughtful;
  for (const e of st.log) { for (const k of Object.keys(comp)) if (k !== 'n') comp[k] += e.breakdown[k]; comp.n++; }
  for (const name of Object.keys(runs)) { polBy[name] += runs[name].log.reduce((a, e) => a + e.breakdown.policy, 0) / 25; if (runs[name].booms.length) boomBy[name]++; }
  if (st.booms.length) agg.boomsEver++;
  agg.growth.push(Math.log(st.income / st.income0) / 25);
  if (st.log.some(e => e.shocks.some(s => s.id === 'accel'))) agg.accel++;
  if (st.log.some(e => e.shocks.some(s => s.id === 'coup'))) agg.coups++;
  if (st.log.some(e => e.shocks.some(s => s.id === 'debt'))) agg.debt++;
  if (st.booms.some(b => !b.faded)) agg.booms++;
  agg.reshuffles += st.career.reshuffles; agg.outYears += st.career.outYears;
  if (Math.log(st.income / st.income0) / 25 > 0.035) agg.takeoff++;
  for (const h of st.career.history) if (!['out', 'funder'].includes(h.seat)) agg.seatsHeld.push(h.seat);
  const hist = st.career.history; for (let k = 0; k < hist.length - 1; k++) if (!['out', 'funder'].includes(hist[k].seat)) agg.tenure.push(hist[k + 1].year - hist[k].year);
}
const pct = x => (100 * x / N).toFixed(0) + '%';
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
console.log(`runs: ${N}`);
console.log(`mean annual pc growth (thoughtful): ${(100 * mean(agg.growth)).toFixed(2)}%  sd ${(100 * Math.sqrt(mean(agg.growth.map(g => (g - mean(agg.growth)) ** 2)))).toFixed(2)}`);
console.log('mean breakdown ppt/yr:', Object.fromEntries(Object.keys(comp).filter(k=>k!=='n').map(k=>[k,(comp[k]/comp.n).toFixed(2)])));
console.log('mean policy ppt/yr by strategy:', Object.fromEntries(Object.entries(polBy).map(([k,v])=>[k,(v/N).toFixed(2)])));
console.log('booms ever landed by strategy:', Object.fromEntries(Object.entries(boomBy).map(([k,v])=>[k,pct(v)])));
console.log(`sibling mean growth ${(100 * mean(sibG)).toFixed(2)}%  sd ${(100 * Math.sqrt(mean(sibG.map(g => (g - mean(sibG)) ** 2)))).toFixed(2)}`);
console.log(`careers with an acceleration: ${pct(agg.accel)}  coup: ${pct(agg.coups)}  debt crisis: ${pct(agg.debt)}  live boom at end: ${pct(agg.booms)}  take-off (>3.5%/yr for 25y): ${pct(agg.takeoff)}`);
console.log(`avg reshuffles: ${(agg.reshuffles / N).toFixed(1)}  avg years out of office: ${(agg.outYears / N).toFixed(1)}  avg gov seats held: ${(agg.seatsHeld.length / N).toFixed(1)}  median tenure: ${agg.tenure.sort((a, b) => a - b)[Math.floor(agg.tenure.length / 2)]}y  mean tenure ${mean(agg.tenure).toFixed(1)}y`);
for (const name of Object.keys(stats)) {
  const s = stats[name];
  console.log(`${name.padEnd(10)} mean growth ${(100 * mean(s.map(x => x.g))).toFixed(2)}%  beats median sibling ${pct(s.filter(x => x.beats).length)}  beats all four ${pct(s.filter(x => x.beatsAll).length)}`);
}
