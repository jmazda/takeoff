// The Take-Off simulation. Pure functions over a plain state object, deterministic given seeds.
// Three random streams: shock (weather, prices, politics), career (reshuffles), event (firm stories).
// Each stream draws a fixed set of numbers per year, so "same shocks, different choices" is well defined.
import { A, JOBS_PER_MUSD, GLOBAL_SHOCK_YEARS } from './assumptions.js';
import { SECTORS, sectorProximity, commodityShare } from './sectors.js';
import { RNG } from './rng.js';
import { at, incomeAt, incomeSeries } from './data.js';

export const HORIZON = 25;
export const LEVERS = ['power', 'customs', 'sez', 'anchor', 'sme', 'skills', 'macro', 'ipa'];
export const LEVER_INFO = {
  power:   { name: 'Reliable power', lag: 2, controversial: false, blurb: 'Grid reliability and industrial tariffs. Slow to build, hard to reverse once firms depend on it.' },
  customs: { name: 'Trade facilitation', lag: 1, controversial: false, blurb: 'Customs, ports and border agencies. Cheap, unglamorous, quietly effective for exporters.' },
  sez:     { name: 'Special economic zone', lag: 1, controversial: true, blurb: 'A zone with serviced land, power and one-stop services. Most zones underperform; it only pays off if an anchor firm comes.' },
  anchor:  { name: 'Anchor investor', lag: 0, controversial: true, blurb: 'Court one pioneer firm in a sector near your export basket. If it lands and stays, others follow.' },
  sme:     { name: 'Broad SME program', lag: 1, controversial: false, blurb: 'Grants, training and credit lines for small firms. Popular, cheap politically, weak evidence of growth effects.' },
  skills:  { name: 'Skills & TVET', lag: 4, controversial: false, blurb: 'Technical training tied to sectors. Pays off years later, usually after you have moved on.' },
  macro:   { name: 'Exchange rate & macro', lag: 0, controversial: true, blurb: 'Fix an overvalued currency and the parallel market. Big effect if the currency is overvalued; politically brutal either way.' },
  ipa:     { name: 'Investment agency capacity', lag: 0, controversial: false, blurb: 'A competent agency that knows which firms to call and what blocks them.' },
};

export const SEATS = {
  minister: { name: 'Minister', long: 'Minister of Trade and Industry', hazard: A.tenure_hazard_minister.value, mult: 1.0, pcStart: 6, pcRegen: 2, budgetRegen: 3 },
  adviser:  { name: 'Presidential adviser', long: 'Head of the Presidential Delivery Unit', hazard: A.tenure_hazard_adviser.value, mult: 0.6, pcStart: 5, pcRegen: 2, budgetRegen: 1 },
  ipa:      { name: 'Investment agency head', long: 'Director-General of the Investment Promotion Agency', hazard: A.tenure_hazard_ipa.value, mult: 0.5, pcStart: 4, pcRegen: 1.5, budgetRegen: 1.5 },
  funder:   { name: 'Funder', long: 'Program director at a foundation', hazard: 0, mult: 0.3, pcStart: 3, pcRegen: 1, budgetRegen: 2 },
  out:      { name: 'Out of office', long: 'Out of office', hazard: 0, mult: 0, pcStart: 2, pcRegen: 0.5, budgetRegen: 0 },
};

// Menu options. `lever` is the reform stock touched; `mult` scales the seat multiplier.
export const OPTIONS = [
  // Minister
  { id: 'm_power', seat: 'minister', lever: 'power', mult: 1.0, pc: 3, budget: 3, label: 'Fix the grid', blurb: 'Pay the utility\'s arrears, sign a power purchase deal, ring-fence industrial feeders.' },
  { id: 'm_anchor', seat: 'minister', lever: 'anchor', mult: 1.0, pc: 2, budget: 1, sector: true, label: 'Court an anchor investor', blurb: 'Personally chase one pioneer firm in a sector you can plausibly win.' },
  { id: 'm_sez', seat: 'minister', lever: 'sez', mult: 1.0, pc: 2, budget: 4, sector: true, label: 'Build a special economic zone', blurb: 'Serviced land, a one-stop shop, tax holidays. Expensive, visible, often empty.' },
  { id: 'm_sme', seat: 'minister', lever: 'sme', mult: 1.0, pc: 1, budget: 2, label: 'Broad SME program', blurb: 'Matching grants and a credit line for small firms. Every MP wants one in their district.' },
  { id: 'm_skills', seat: 'minister', lever: 'skills', mult: 1.0, pc: 1, budget: 3, label: 'Skills and TVET push', blurb: 'Technical colleges run with industry. The payoff lands long after you have left.' },
  { id: 'm_customs', seat: 'minister', lever: 'customs', mult: 1.0, pc: 2, budget: 1, label: 'Customs and port reform', blurb: 'Risk-based inspection, a single window, fewer agencies at the border.' },
  { id: 'm_macro', seat: 'minister', lever: 'macro', mult: 1.0, pc: 5, budget: 0, label: 'Exchange-rate and macro reform', blurb: 'Close the parallel-market gap and let the currency find its level. Importers and the urban middle class will hate you.' },
  { id: 'm_hold', seat: 'minister', lever: null, mult: 0, pc: 0, budget: 0, label: 'Consolidate', blurb: 'Defend what is already running. No decay this year, and you bank a point of political capital.' },
  // Adviser
  { id: 'a_agenda', seat: 'adviser', lever: 'anchor', mult: 0.6, pc: 2, budget: 0, sector: true, label: 'Put a sector on the President\'s agenda', blurb: 'Get one sector named in the national plan and the President\'s speeches.' },
  { id: 'a_power', seat: 'adviser', lever: 'power', mult: 0.7, pc: 2, budget: 1, label: 'Delivery unit on power', blurb: 'Weekly stocktakes with the utility and the regulator. Nagging, at scale.' },
  { id: 'a_customs', seat: 'adviser', lever: 'customs', mult: 0.7, pc: 1, budget: 1, label: 'Delivery unit on the port', blurb: 'Dwell-time targets, published every month, with the President\'s name on them.' },
  { id: 'a_unblock', seat: 'adviser', lever: 'anchor', mult: 0.8, pc: 2, budget: 0, sector: true, label: 'Unblock a stuck investor', blurb: 'One firm, one permit, one phone call from the right office.' },
  { id: 'a_donors', seat: 'adviser', lever: 'skills', mult: 0.5, pc: 1, budget: 0, label: 'Convene donors behind one plan', blurb: 'Stop the twelve parallel strategies. Extra budget next year, if it holds.' },
  { id: 'a_protect', seat: 'adviser', lever: null, mult: 0, pc: 3, budget: 0, label: 'Protect a reform', blurb: 'Build a constituency around the best thing already running so the next minister cannot quietly kill it.' },
  { id: 'a_macro', seat: 'adviser', lever: 'macro', mult: 0.5, pc: 3, budget: 0, label: 'Push on the exchange rate', blurb: 'Make the case to the President over the Finance Minister\'s head. Costly either way.' },
  // IPA head
  { id: 'i_outreach', seat: 'ipa', lever: 'anchor', mult: 0.8, pc: 1, budget: 1, sector: true, label: 'Investor outreach', blurb: 'Build a target list of 30 firms in one sector and call every one of them.' },
  { id: 'i_aftercare', seat: 'ipa', lever: 'ipa', mult: 0.8, pc: 1, budget: 1, label: 'Aftercare for existing investors', blurb: 'Solve the problems of firms already here. Expansions are cheaper than new wins.' },
  { id: 'i_zone', seat: 'ipa', lever: 'sez', mult: 0.6, pc: 1, budget: 2, sector: true, label: 'Run the zone properly', blurb: 'Make the one-stop shop actually one stop.' },
  { id: 'i_scout', seat: 'ipa', lever: 'anchor', mult: 0.6, pc: 1, budget: 1, sector: true, label: 'Scout for a pioneer firm', blurb: 'Go to the trade fairs. Find the one firm that is already looking for a new country.' },
  { id: 'i_power', seat: 'ipa', lever: 'power', mult: 0.4, pc: 2, budget: 0, label: 'Lobby for industrial power', blurb: 'Get the utility to prioritise the industrial feeder, with the investors\' numbers in hand.' },
  { id: 'i_customs', seat: 'ipa', lever: 'customs', mult: 0.5, pc: 2, budget: 0, label: 'Lobby for a green lane', blurb: 'A fast lane at customs for certified exporters.' },
  { id: 'i_evidence', seat: 'ipa', lever: 'ipa', mult: 0.6, pc: 0, budget: 1, label: 'Publish what blocks investors', blurb: 'An annual report on the top ten blockers, named. Buys you credibility.' },
  // Funder
  { id: 'f_delivery', seat: 'funder', lever: 'customs', mult: 0.6, pc: 1, budget: 2, label: 'Fund a delivery unit', blurb: 'Pay for the staff of a unit on trade facilitation.' },
  { id: 'f_power', seat: 'funder', lever: 'power', mult: 0.5, pc: 1, budget: 2, label: 'Fund power-sector reform', blurb: 'Technical assistance to the utility and the regulator. Slow.' },
  { id: 'f_research', seat: 'funder', lever: 'anchor', mult: 0.4, pc: 0, budget: 1, sector: true, label: 'Research on one sector', blurb: 'Pay for the sector study everyone will cite for a decade.' },
  { id: 'f_ipa', seat: 'funder', lever: 'ipa', mult: 1.0, pc: 1, budget: 2, label: 'Fund the investment agency', blurb: 'Staff, training and a CRM for the agency.' },
  { id: 'f_tvet', seat: 'funder', lever: 'skills', mult: 0.8, pc: 0, budget: 2, label: 'Fund a skills program', blurb: 'Industry-linked training. The results arrive after your grant cycle ends.' },
  { id: 'f_convene', seat: 'funder', lever: null, mult: 0, pc: 0, budget: 1, label: 'Convene', blurb: 'Get the minister, the agency and the firms in one room. Builds your political capital for later.' },
  { id: 'f_leave', seat: 'funder', lever: null, mult: 0, pc: 0, budget: 0, label: 'Step down and wait for a call', blurb: 'Leave the foundation. You will be out of office until someone calls.' },
  // Out of office
  { id: 'o_wait', seat: 'out', lever: null, mult: 0, pc: 0, budget: 0, label: 'Wait for the call', blurb: 'Watch the country from the outside.' },
  { id: 'o_voice', seat: 'out', lever: null, mult: 0, pc: 1, budget: 0, label: 'Write and talk', blurb: 'Op-eds, panels, a podcast. Keeps your name in play, slightly raises the odds of a call.' },
  { id: 'o_funder', seat: 'out', lever: null, mult: 0, pc: 0, budget: 0, label: 'Take the foundation job', blurb: 'Smaller levers, longer view. You choose when to leave.' },
];
export const OPTIONS_BY_ID = Object.fromEntries(OPTIONS.map(o => [o.id, o]));

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const nz = (x, d = 0) => (x == null || Number.isNaN(x) ? d : x);

// ---------- State construction ----------
export function createState({ country, startYear, seed, settings, db, role = 'player', seeds = {} }) {
  const rngs = { shock: new RNG((seeds.shock ?? seed) ^ 0xA5A5A5A5), career: new RNG((seeds.career ?? seed) ^ 0x3C3C3C3C), event: new RNG((seeds.event ?? seed) ^ 0x5A5A5A5A), bg: new RNG((seeds.bg ?? seed) ^ 0x0F0F0F0F) };
  const inc = incomeAt(country, startYear);
  const L = country.latest;
  const pop = at(country.series.pop, startYear) || L.pop;
  const exportsGdp = nz(at(country.series.exports_gdp, startYear), nz(L.exports_gdp, 20));
  const gdpUsd = (at(country.series.gdppc_usd, startYear) || L.gdppc_usd) * pop;
  const exportsUsd = gdpUsd * exportsGdp / 100;
  const g = country.stats.growth_1990_2023;
  const gAll = startYear < 1995 && country.stats.growth_1960_2023 ? country.stats.growth_1960_2023 : g;
  const prior = A.prior_weight_country.value * gAll.mean + (1 - A.prior_weight_country.value) * db.pooled.meanGrowth;
  const jobs0 = pop * A.working_age_share.value * nz(L.emp_pop, 60) / 100 * nz(L.emp_wage, 30) / 100;
  const totSd = country.stats.tot ? country.stats.tot.sd : db.pooled.medianTotSd;
  const state = {
    role, iso3: country.iso3, name: country.name, startYear, year: startYear, t: 0, settings, seed,
    unit: inc.unit, income0: inc.value, income: inc.value, incomePath: [inc.value],
    pop, exports: exportsUsd, exports0: exportsUsd, exportsPath: [exportsUsd], exportsGdp,
    jobs0, jobs: jobs0, jobsPath: [jobs0],
    prior, sdNoise: gAll.sd * A.noise_share_of_sd.value, totSd, commodityShare: commodityShare(country),
    debt: nz(at(country.series.ext_debt_gni, startYear), nz(L.ext_debt_gni, 40)), inflation: nz(L.inflation, 6),
    overvalued: false, overvaluedSet: false, crisisYears: 0, coupHangover: 0, budgetSqueeze: 0,
    regime: { accel: false, accelYears: 0, collapse: false, conflict: false },
    reforms: Object.fromEntries(LEVERS.map(l => [l, { stock: 0, history: [], years: 0, yours: 0, constituency: false, protected: false, reversed: 0, kept: 0, startedYear: null }])),
    booms: [], firmsCourted: 0,
    career: { seat: 'out', seatYears: 0, pc: 0, budget: 0, history: [], reshuffles: 0, outYears: 0, everSeats: [], leftReason: null },
    nextElection: null, elections: 0, electionNext: false,
    prox: sectorProximity(country), bestSector: null,
    log: [], choices: [], answers: [], flags: {}, pending: null, pauses: [],
    rng: rngs, ended: false,
  };
  state.bestSector = Object.entries(state.prox).filter(([k]) => !['commodities', 'oil_gas', 'mining'].includes(k)).sort((a, b) => b[1] - a[1])[0][0];
  // Starting conditions that are judgement calls: overvaluation and the election clock.
  const u = state.rng.shock;
  state.overvalued = u.chance(state.inflation > 10 ? 0.6 : 0.25);
  state.nextElection = startYear + 1 + u.int(A.election_cycle_years.value);
  // First seat
  const first = role === 'player' ? state.rng.career.pick(['minister', 'adviser', 'ipa']) : 'minister';
  enterSeat(state, first, 'appointed');
  return state;
}

export function serialize(state) {
  const rng = Object.fromEntries(Object.entries(state.rng).map(([k, r]) => [k, r.s]));
  return JSON.stringify({ ...state, rng, pending: null });
}
export function deserialize(json) {
  const s = JSON.parse(json);
  s.rng = Object.fromEntries(Object.entries(s.rng).map(([k, v]) => { const r = new RNG(0); r.s = v; return [k, r]; }));
  return s;
}

// ---------- Seats ----------
export function takeSeat(state, seat, reason) { enterSeat(state, seat, reason); }
function enterSeat(state, seat, reason) {
  const S = SEATS[seat];
  const c = state.career;
  c.seat = seat; c.seatYears = 0; c.pc = S.pcStart + (c.pcBank || 0); c.pcBank = 0; c.budget = S.budgetRegen;
  c.history.push({ year: state.year, seat, reason });
  if (!c.everSeats.includes(seat)) c.everSeats.push(seat);
  if (seat !== 'out' && seat !== 'funder') state.flags.inGovEver = true;
}
export function leaveSeat(state, reason) {
  const c = state.career;
  const was = c.seat;
  c.leftReason = reason;
  if (was !== 'out' && was !== 'funder') { c.reshuffles++; successorRolls(state, reason); }
  enterSeat(state, 'out', reason);
  state.flags.lastSeatLeft = was;
}

// What the successor keeps. Only reforms you actually built are at risk of being "your" losses.
function successorRolls(state, reason) {
  const rng = state.rng.career;
  const outcomes = [];
  for (const l of LEVERS) {
    const r = state.reforms[l];
    if (r.stock < 0.15) continue;
    let p = A.successor_keep_base.value + Math.min(0.3, 0.08 * r.years) + (r.constituency || r.protected ? 0.25 : 0) - (LEVER_INFO[l].controversial ? 0.15 : 0);
    if (reason === 'coup') p -= 0.2;
    p = clamp(p, 0.05, 0.95);
    const keep = rng.chance(p);
    if (keep) { r.kept++; outcomes.push({ lever: l, kept: true, p }); }
    else { r.stock *= 0.3; r.reversed++; r.protected = false; outcomes.push({ lever: l, kept: false, p }); }
  }
  state.flags.lastSuccessor = outcomes;
}

// ---------- Menus ----------
export function menuFor(state) {
  const seat = state.career.seat;
  return OPTIONS.filter(o => o.seat === seat).map(o => ({ ...o, affordable: o.pc <= state.career.pc + 1e-9 && o.budget <= state.career.budget + 1e-9, why: whyNow(state, o) }));
}
function whyNow(state, o) {
  const r = o.lever && state.reforms[o.lever];
  if (o.lever === 'power' && state.hand && state.hand.power.constraint != null) return `${Math.round(state.hand.power.constraint)}% of firms call electricity a major constraint.`;
  if (o.lever === 'customs' && state.hand && state.hand.trade.customsDays != null) return `Exports take ${state.hand.trade.customsDays} days to clear customs.`;
  if (o.lever === 'macro') return state.overvalued ? 'The parallel-market gap is wide. The currency looks overvalued.' : 'No obvious overvaluation right now. Payoff would be small.';
  if (o.lever === 'anchor') return `Nearest sector: ${SECTORS[state.bestSector].name}.`;
  if (o.lever === 'sez') return state.booms.length ? 'A zone helps the firms already here expand.' : 'Roughly one zone in three ever fills. Better with an anchor firm lined up.';
  if (o.lever === 'skills' && state.hand && state.hand.constraints.rows.find(x => x.key === 'obst_skills')) return `${state.hand.constraints.rows.find(x => x.key === 'obst_skills').share}% of firms name skills as their biggest obstacle.`;
  if (r && r.stock > 0.3) return `Already at ${Math.round(r.stock * 100)}% built. Keeps it from decaying.`;
  return '';
}

// ---------- Year loop ----------
// 1. chooseFocus  2. rollYear (shocks, maybe an event)  3. resolveEvent if any  4. closeYear
export function chooseFocus(state, optionId, sector) {
  const o = OPTIONS_BY_ID[optionId];
  if (!o || o.seat !== state.career.seat) throw new Error('bad option ' + optionId);
  const c = state.career;
  c.pc = Math.max(0, c.pc - o.pc); c.budget = Math.max(0, c.budget - o.budget);
  const mult = SEATS[c.seat].mult * o.mult;
  state.current = { option: o, sector: sector || state.bestSector, mult };
  state.choices.push({ year: state.year, t: state.t, id: o.id, sector: state.current.sector, seat: c.seat });
  if (o.lever) {
    const r = state.reforms[o.lever];
    const add = A.player_build_rate.value * mult;
    r.stock = Math.min(1, r.stock + add);
    if (state.role === 'player') r.yours += add;
    if (r.startedYear == null && r.stock > 0.1) r.startedYear = state.year;
    r.touched = true;
    if (o.lever === 'anchor') state.firmsCourted++;
  }
  if (o.id === 'm_hold') { c.pcBank = (c.pcBank || 0); c.pc = Math.min(10, c.pc + 1); state.flags.hold = true; }
  if (o.id === 'a_protect') { const best = bestReform(state); if (best) { state.reforms[best].protected = true; state.reforms[best].constituency = true; } }
  if (o.id === 'a_donors') state.flags.donorBudget = 2;
  if (o.id === 'f_convene') c.pcBank = (c.pcBank || 0) + 2;
  if (o.id === 'o_voice') state.flags.voice = true;
  if (o.id === 'i_aftercare') state.flags.aftercare = true;
  if (o.id === 'i_scout') state.flags.scouting = true;
  if (o.id === 'f_leave') { leaveSeat(state, 'resigned'); }
  if (o.id === 'o_funder') { enterSeat(state, 'funder', 'took the job'); }
}
function bestReform(state) {
  let best = null, bs = 0;
  for (const l of LEVERS) if (state.reforms[l].stock > bs && !state.reforms[l].protected) { bs = state.reforms[l].stock; best = l; }
  return bs > 0.2 ? best : null;
}

export function rollYear(state, ctx) {
  const rng = state.rng.shock;
  const u = { tot: rng.normal(), drought: rng.next(), coup: rng.next(), coupOk: rng.next(), conflict: rng.next(), conflictEnd: rng.next(), debt: rng.next(), recession: rng.next(), pandemic: rng.next(), accelStart: rng.next(), accelCont: rng.next(), collapseStart: rng.next(), collapseCont: rng.next(), noise: rng.normal(), boomFade: rng.next(), boomLand: rng.next(), follower: rng.next(), election: rng.next(), overval: rng.next() };
  const year = state.year + 1;
  // Real global shock years only exist up to the data horizon; beyond it, global shocks roll at random.
  const real = state.settings.globalShocks !== 'random' && year <= 2025;
  const shocks = [];
  const b = { prior: state.prior * 100 + A.shock_offset_ppt.value, convergence: 0, regime: 0, policy: 0, noise: 0 };

  // Convergence (mild)
  const med = state.unit === 'ppp' ? ctx.db.pooled.medianIncomePPP : ctx.db.pooled.medianIncomeUSD;
  b.convergence = -A.convergence_rate.value * 100 * Math.log(state.income / med);

  // Terms of trade
  let dTot = u.tot * state.totSd;
  if (real && GLOBAL_SHOCK_YEARS.commodity_crash.includes(year)) dTot -= 0.15;
  if (real && GLOBAL_SHOCK_YEARS.commodity_boom.includes(year)) dTot += 0.08;
  const totEffect = A.tot_elasticity.value * 100 * dTot * state.commodityShare;
  if (Math.abs(dTot) > 0.06) shocks.push({ id: 'tot', ppt: totEffect, text: dTot > 0 ? `Commodity prices up: terms of trade ${(dTot * 100).toFixed(0) > 0 ? '+' : ''}${(dTot * 100).toFixed(0)}%.` : `Commodity prices fall: terms of trade ${(dTot * 100).toFixed(0)}%.` });
  else b.policy += 0; // nothing
  let shockSum = totEffect;

  // Drought
  const agri = nz(ctx.country.latest.emp_agri, 30);
  const pDrought = clamp(A.drought_base_p.value * agri / 40, 0.03, 0.2);
  if (u.drought < pDrought) { const e = A.drought_ppt.value * Math.min(1, agri / 40); shockSum += e; shocks.push({ id: 'drought', ppt: e, text: 'Drought. The harvest fails in the main growing region.' }); }

  // Coup
  const stab = nz(ctx.country.latest.wgi_stability, -0.5);
  const pCoup = clamp(A.coup_base_p.value * Math.exp(-stab), 0.002, 0.06) * (state.regime.conflict ? 1.5 : 1);
  let coup = null;
  if (u.coup < pCoup) {
    const ok = u.coupOk < 0.5;
    coup = ok ? 'success' : 'failed';
    const e = ok ? A.coup_ppt.value : A.coup_ppt.value * 0.4;
    shockSum += e; state.coupHangover = ok ? 1 : 0;
    shocks.push({ id: 'coup', ppt: e, text: ok ? 'A coup. The government falls overnight; the borders close for a week.' : 'A coup attempt fails. Tanks on the airport road, then a tense calm.' });
  } else if (state.coupHangover > 0) { shockSum += A.coup_ppt.value * 0.5; state.coupHangover--; shocks.push({ id: 'coup_after', ppt: A.coup_ppt.value * 0.5, text: 'The year after the coup: investors wait and see.' }); }

  // Conflict
  if (!state.regime.conflict) {
    const pC = clamp(A.conflict_base_p.value * Math.exp(-stab), 0.001, 0.06);
    if (u.conflict < pC) { state.regime.conflict = true; shocks.push({ id: 'conflict', ppt: A.conflict_ppt.value, text: 'Armed conflict breaks out in one region. Trade routes through it close.' }); shockSum += A.conflict_ppt.value; }
  } else if (u.conflictEnd < 0.3) { state.regime.conflict = false; shocks.push({ id: 'conflict_end', ppt: 0, text: 'A ceasefire holds. The conflict winds down.' }); }
  else { shockSum += A.conflict_ppt.value; shocks.push({ id: 'conflict_on', ppt: A.conflict_ppt.value, text: 'The conflict continues.' }); }

  // Global recession / pandemic
  const recession = real ? GLOBAL_SHOCK_YEARS.recessions.includes(year) : u.recession < A.global_recession_random_p.value;
  if (recession) { const e = A.global_recession_ppt.value * (0.5 + state.exportsGdp / 100); shockSum += e; shocks.push({ id: 'recession', ppt: e, text: year === 2009 ? 'The global financial crisis reaches you through exports and remittances.' : year === 1982 ? 'The 1982 debt crisis: rates spike, lenders vanish.' : year === 1998 ? 'The Asian crisis spreads to emerging markets.' : year === 2015 ? 'The commodity bust and a China slowdown.' : 'A global recession. Export orders dry up.' }); state.debt += 4; }
  const pandemic = real ? GLOBAL_SHOCK_YEARS.pandemic.includes(year) : u.pandemic < 0.01;
  if (pandemic) { shockSum += A.pandemic_ppt.value; shocks.push({ id: 'pandemic', ppt: A.pandemic_ppt.value, text: 'A pandemic. Borders shut, tourism stops, the informal economy goes quiet.' }); state.debt += 6; }

  // Debt crisis
  if (state.crisisYears > 0) { shockSum += A.debt_crisis_ppt.value; state.crisisYears--; shocks.push({ id: 'debt_on', ppt: A.debt_crisis_ppt.value, text: 'The debt restructuring drags on. Budget frozen.' }); }
  else {
    const pDebt = A.debt_crisis_base_p.value + 0.002 * Math.max(0, state.debt - 50) + (state.inflation > 20 ? 0.02 : 0) + (state.overvalued ? 0.01 : 0);
    if (u.debt < clamp(pDebt, 0, 0.3)) { state.crisisYears = 1; state.budgetSqueeze = 3; shockSum += A.debt_crisis_ppt.value; state.debt *= 0.7; state.overvalued = false; shocks.push({ id: 'debt', ppt: A.debt_crisis_ppt.value, text: 'Debt crisis. The country misses a payment and calls the IMF.' }); }
  }

  // Policy effects (lagged reform stocks, capped)
  const pol = policyEffects(state, ctx);
  b.policy = pol.total;

  // Regimes: accelerations and collapses
  const coherence = reformCoherence(state);
  if (!state.regime.accel) {
    const p = A.accel_start_p.value + A.accel_policy_bonus_max.value * coherence + (shockSum > 1.5 ? 0.02 : 0) - (state.regime.conflict || state.crisisYears ? 0.02 : 0);
    if (u.accelStart < clamp(p, 0, 0.15)) { state.regime.accel = true; state.regime.accelYears = 0; shocks.push({ id: 'accel', ppt: A.accel_boost_ppt.value, text: 'Something clicks. Investment picks up across sectors. A growth spurt begins.' }); }
  } else {
    const p = A.accel_continue_p.value + A.accel_persistence_bonus_max.value * persistence(state) - (shockSum < -2 ? 0.2 : 0);
    if (u.accelCont > clamp(p, 0.3, 0.97)) { state.regime.accel = false; shocks.push({ id: 'accel_end', ppt: 0, text: `The growth spurt fades after ${state.regime.accelYears} years. Most do.` }); }
  }
  if (state.regime.accel) { b.regime += A.accel_boost_ppt.value; state.regime.accelYears++; }
  if (!state.regime.collapse) {
    const p = A.collapse_start_p.value + (state.debt > 60 ? 0.03 : 0) + (stab < -1 ? 0.02 : 0) + (shockSum < -2.5 ? 0.05 : 0);
    if (u.collapseStart < p) { state.regime.collapse = true; shocks.push({ id: 'collapse', ppt: A.collapse_ppt.value, text: 'A collapse. Firms close, capital leaves, the informal economy absorbs the shock.' }); }
  } else if (u.collapseCont > A.collapse_continue_p.value) { state.regime.collapse = false; shocks.push({ id: 'collapse_end', ppt: 0, text: 'The collapse bottoms out.' }); }
  if (state.regime.collapse) b.regime += A.collapse_ppt.value;

  // Overvaluation drift
  if (!state.overvalued && u.overval < 0.03 && state.reforms.macro.stock < 0.5) { state.overvalued = true; shocks.push({ id: 'overval', ppt: 0, text: 'The central bank holds the peg while inflation runs. A parallel market opens.' }); }
  if (state.overvalued) shockSum -= 0.5;

  b.noise = u.noise * state.sdNoise * 100;
  b.shocks = shockSum;
  const growth = b.prior + b.convergence + b.regime + b.policy + b.shocks + b.noise;
  state.pendingYear = { year, u, shocks, breakdown: b, growth, pol, dTot, coup, recession, pandemic, eventEffects: [] };

  // Booms: land, grow, fade, followers
  boomStep(state, ctx, u);

  // An event may need a decision.
  state.pending = ctx.pickEvent ? ctx.pickEvent(state, ctx) : null;
  return state.pendingYear;
}

function policyEffects(state, ctx) {
  const L = ctx.country.latest;
  const out = { total: 0, parts: {} };
  const eff = l => { const r = state.reforms[l]; const h = r.history; const lag = LEVER_INFO[l].lag; const st = h.length > lag ? h[h.length - 1 - lag] : 0; return Math.pow(st, A.effect_convexity.value); };
  const elecW = clamp(nz(L.es_elec_constraint, 25) / 40, 0.3, 1.2);
  const custW = clamp(nz(L.es_customs_constraint, 12) / 20, 0.3, 1.2) * clamp(state.exportsGdp / 30, 0.4, 1.3);
  out.parts.power = A.effect_power.value * eff('power') * elecW;
  out.parts.customs = A.effect_customs.value * eff('customs') * custW;
  out.parts.macro = state.overvalued ? 0.05 * eff('macro') : A.effect_macro.value * eff('macro') * (state.flags.macroFixed ? 1 : 0.3);
  out.parts.skills = A.effect_skills.value * eff('skills');
  out.parts.sme = A.effect_sme.value * eff('sme');
  let total = Object.values(out.parts).reduce((a, b) => a + b, 0);
  const boomGrowth = state.booms.reduce((a, bm) => a + bm.value, 0) / Math.max(1, state.exports) * 100;
  out.parts.booms = Math.min(1.0, boomGrowth * 0.08);
  total += out.parts.booms;
  out.total = Math.min(A.policy_cap_ppt.value, total);
  out.capped = total > A.policy_cap_ppt.value;
  return out;
}
function reformCoherence(state) {
  // 0..1: how much of a joined-up, persistent reform stock exists (stocks weighted, capped).
  const r = state.reforms;
  const s = 0.3 * r.power.stock + 0.25 * r.customs.stock + 0.15 * r.skills.stock + 0.15 * r.ipa.stock + 0.15 * (state.booms.length ? 1 : 0) + (state.overvalued ? -0.2 : 0.1 * r.macro.stock);
  return clamp(s, 0, 1);
}
function persistence(state) {
  const cons = LEVERS.filter(l => state.reforms[l].constituency).length;
  const divers = state.booms.filter(b => !b.faded).length;
  return clamp(0.25 * cons + 0.3 * divers, 0, 1);
}

function boomStep(state, ctx, u) {
  const r = state.reforms;
  // Landing a new anchor firm in the targeted sector.
  const cur = state.current;
  const targeting = cur && cur.option.lever === 'anchor' ? cur.sector : (r.sez.stock > 0.4 ? state.bestSector : null);
  if (targeting && !state.booms.find(b => b.sector === targeting && !b.faded)) {
    const S = SECTORS[targeting];
    const ready = 1 - 0.5 * (S.needs.power * (1 - r.power.stock) + S.needs.customs * (1 - r.customs.stock)) / (S.needs.power + S.needs.customs + 1e-9);
    const p = A.anchor_base_p.value * (cur && cur.option.lever === 'anchor' ? 1 : 0.4) * state.prox[targeting] * clamp(ready, 0.3, 1) * (1 + 0.8 * r.sez.stock + 0.6 * r.ipa.stock) * (state.regime.conflict ? 0.3 : 1);
    if (u.boomLand < p) {
      const firm = ctx.firmName ? ctx.firmName(targeting, state) : S.name + ' Co';
      state.booms.push({ sector: targeting, firm, value: state.exports * 0.01, age: 0, faded: false, landedYear: state.year + 1, byYou: state.role === 'player' && state.career.seat !== 'out', followers: 0 });
      state.pendingYear.shocks.push({ id: 'boom', ppt: 0, text: `${firm} commits to a plant in ${S.name.toLowerCase()}. A pioneer.` });
      r.anchor.constituency = true; if (r.sez.stock > 0.3) r.sez.constituency = true;
    }
  }
  for (const b of state.booms) {
    b.age++;
    if (b.faded) { b.value *= 0.7; continue; }
    const S = SECTORS[b.sector];
    const pFade = A.boom_fade_p.value * (state.flags.aftercare ? 0.6 : 1) * (1 + 0.6 * S.needs.power * (1 - r.power.stock)) * (state.regime.conflict ? 2 : 1) * (state.overvalued ? 1.5 : 1);
    if (b.age > 1 && u.boomFade < pFade) { b.faded = true; state.pendingYear.shocks.push({ id: 'boom_fade', ppt: 0, text: `${b.firm} scales back. The ${S.name.toLowerCase()} boom fades.` }); continue; }
    const g = b.age <= 8 ? A.boom_growth.value : 0.04;
    b.value *= 1 + g * (1 - 0.3 * (1 - r.power.stock) * S.needs.power);
    if (b.age >= 2 && u.follower < 0.12 * (0.5 + r.ipa.stock + r.sez.stock)) { b.followers++; b.value *= 1.3; state.pendingYear.shocks.push({ id: 'follower', ppt: 0, text: `A second ${S.name.toLowerCase()} firm follows ${b.firm}.` }); }
    if (b.age === 4) { r.power.constituency = r.power.constituency || S.needs.power > 0.5; r.customs.constituency = r.customs.constituency || S.needs.customs > 0.5; }
  }
}

export function resolveEvent(state, ctx, choiceIndex) {
  const ev = state.pending;
  if (!ev) return null;
  const opt = ev.options[choiceIndex];
  const res = opt.resolve(state, ctx, state.rng.event);
  state.career.pc = clamp(state.career.pc - (opt.pc || 0), 0, 10);
  state.career.budget = Math.max(0, state.career.budget - (opt.budget || 0));
  state.pendingYear.eventEffects.push({ id: ev.id, title: ev.title, choice: opt.label, result: res.text, ppt: res.ppt || 0 });
  if (res.ppt) state.pendingYear.growth += res.ppt;
  state.pending = null;
  state.flags['ev_' + ev.id] = (state.flags['ev_' + ev.id] || 0) + 1;
  return res;
}

export function closeYear(state, ctx) {
  const P = state.pendingYear;
  const growth = P.growth / 100;
  state.year = P.year; state.t++;
  state.income *= Math.exp(growth);
  state.incomePath.push(state.income);
  // Exports: base grows with income (pop growth ignored in base, added via pop below), plus ToT, customs, overvaluation; booms sit on top.
  const popGrowth = 0.015;
  const baseX = state.exports - state.booms.reduce((a, b) => a + b.value / (1 + (b.age <= 8 ? A.boom_growth.value : 0.04)), 0);
  const xg = growth + popGrowth + 0.5 * P.dTot + 0.02 * state.reforms.customs.stock - (state.overvalued ? 0.03 : 0) + (state.flags.macroFixed ? 0.02 : 0);
  const boomTotal = state.booms.reduce((a, b) => a + b.value, 0);
  state.exports = Math.max(0, baseX) * Math.exp(xg) + boomTotal;
  state.exportsPath.push(state.exports);
  state.exportsGdp = clamp(state.exportsGdp * Math.exp(xg - growth - popGrowth), 5, 120);
  // Jobs
  const boomJobs = state.booms.reduce((a, b) => a + b.value / 1e6 * (JOBS_PER_MUSD[b.sector] || 5), 0);
  const jobsBase = state.jobsPath[state.jobsPath.length - 1] - (state.flags.lastBoomJobs || 0);
  state.flags.lastBoomJobs = boomJobs;
  state.jobs = jobsBase * Math.exp(A.jobs_elasticity.value * growth) + boomJobs;
  state.jobsPath.push(state.jobs);
  state.pop *= Math.exp(popGrowth);
  // Debt dynamics and inflation
  state.debt = clamp(state.debt * Math.exp(-growth) - 1.0, 5, 200);
  state.inflation = clamp(state.inflation * 0.8 + (state.overvalued ? 3 : 1.5) + (P.breakdown.shocks < -2 ? 5 : 0), 1, 60);
  // Macro reform resolves overvaluation
  if (state.overvalued && state.reforms.macro.stock >= 0.5) { state.overvalued = false; state.flags.macroFixed = true; P.shocks.push({ id: 'macro_fix', ppt: 0, text: 'The currency floats. Exporters cheer, importers riot, and within two years nobody remembers the parallel rate.' }); }
  if (state.flags.macroFixed && state.reforms.macro.stock < 0.2) state.flags.macroFixed = false;
  // Reform stocks: record history, decay if untouched
  for (const l of LEVERS) {
    const r = state.reforms[l];
    if (!r.touched && !state.flags.hold) r.stock = Math.max(0, r.stock - A.reform_decay.value);
    if (r.stock > 0.15) r.years++; else r.years = 0;
    r.history.push(r.stock); r.touched = false;
  }
  state.flags.hold = false;
  // The rest of government keeps going whatever seat you hold. A sibling country is nothing but this.
  const bgStrength = state.role !== 'player' ? 1.0 : state.career.seat === 'minister' ? 0 : ['adviser', 'ipa'].includes(state.career.seat) ? 0.5 : 1.0;
  if (bgStrength > 0) backgroundGovernment(state, ctx, bgStrength);
  // Elections and careers (siblings have no career: they are the default government)
  const careerNotes = state.role === 'player' ? careerStep(state, ctx, P) : [];
  // Political capital & budget regen
  const c = state.career, S = SEATS[c.seat];
  c.pc = clamp(c.pc + S.pcRegen + (growth > 0.04 ? 1 : 0) - (growth < -0.01 ? 1 : 0), 0, 10);
  const taxW = clamp(nz(ctx.country.latest.tax_gdp, 14) / 14, 0.6, 1.4);
  let regen = S.budgetRegen * taxW; if (state.budgetSqueeze > 0) { regen *= 0.5; state.budgetSqueeze--; }
  if (state.flags.donorBudget) { regen += state.flags.donorBudget; state.flags.donorBudget = 0; }
  c.budget = clamp(c.budget + regen, 0, 8);
  c.seatYears++;
  state.flags.aftercare = false; state.flags.scouting = false; state.flags.voice = false;
  // Log
  const entry = { year: state.year, t: state.t, seat: P.seatAtStart || c.seat, choice: state.current ? { id: state.current.option.id, label: state.current.option.label, sector: state.current.sector } : null, growth: P.growth, breakdown: P.breakdown, policyParts: P.pol.parts, policyCapped: P.pol.capped, shocks: P.shocks, events: P.eventEffects, career: careerNotes, income: state.income, exports: state.exports, jobs: state.jobs, regime: { ...state.regime }, summary: '' };
  entry.summary = summarize(state, entry);
  state.log.push(entry);
  state.current = null; state.pendingYear = null;
  if (state.t >= HORIZON) state.ended = true;
  return entry;
}

function backgroundGovernment(state, ctx, strength) {
  // The default minister: the autopilot, with the same budget constraints as a player minister on average.
  const opts = OPTIONS.filter(o => o.seat === 'minister' && o.lever);
  const fake = { ...state, career: { ...state.career, seat: 'minister', pc: 10, budget: 10 }, choices: state.bgChoices || [] };
  const pick = autoChoose(fake, ctx, opts.map(o => ({ ...o, affordable: true })), state.rng.bg);
  if (!pick) return;
  state.bgChoices = [{ id: pick.optionId }];
  const r = state.reforms[OPTIONS_BY_ID[pick.optionId].lever];
  r.stock = Math.min(1, r.stock + A.default_build_rate.value * strength);
  r.touched = true;
  state.flags.bgLever = OPTIONS_BY_ID[pick.optionId].lever;
}

function careerStep(state, ctx, P) {
  const notes = [];
  const c = state.career;
  const rng = state.rng.career;
  const u = { hazard: rng.next(), next: rng.next(), ret: rng.next(), turnover: rng.next(), seatPick: rng.next() };
  // Election?
  let election = false;
  if (state.year >= state.nextElection) {
    election = true; state.elections++;
    state.nextElection = state.year + A.election_cycle_years.value - 1 + Math.floor(u.turnover * 3);
    const voice = nz(ctx.country.latest.wgi_voice, -0.5);
    const pTurn = voice > -0.5 ? 0.35 : 0.10;
    const turnover = u.turnover < pTurn * (P.growth < 0 ? 1.5 : 1);
    state.flags.lastElection = { year: state.year, turnover };
    notes.push({ id: 'election', text: turnover ? 'Election year. The government loses. A new cabinet is sworn in.' : 'Election year. The government holds on.' });
    if (turnover && ['minister', 'adviser'].includes(c.seat)) { leaveSeat(state, 'election'); notes.push({ id: 'left', text: 'The new government does not keep you.' }); return notes; }
    if (turnover) successorRolls(state, 'election');
  }
  if (P.coup === 'success' && !['out', 'funder'].includes(c.seat)) { leaveSeat(state, 'coup'); notes.push({ id: 'left', text: 'The junta dissolves the cabinet. You are out.' }); return notes; }
  const S = SEATS[c.seat];
  if (S.hazard > 0) {
    let h = S.hazard * (election ? 2 : 1) * (P.growth < -1 ? 1.5 : 1) * (c.seatYears === 0 ? 0.5 : 1);
    if (u.hazard < h) { leaveSeat(state, 'reshuffle'); notes.push({ id: 'left', text: c.leftReason === 'reshuffle' ? 'Reshuffle. Your portfolio goes to someone the President owes a favour.' : 'You are out.' }); return notes; }
  }
  if (c.seat === 'out') {
    c.outYears++;
    const p = A.out_of_office_return_p.value + (state.flags.voice ? 0.15 : 0);
    if (u.ret < p) {
      const pool = ['minister', 'adviser', 'ipa'];
      const w = s => (c.everSeats.includes(s) ? 1.3 : 1) * (s === 'minister' ? 0.8 : 1);
      const next = rng.weighted(pool, w);
      enterSeat(state, next, 'called back');
      notes.push({ id: 'seat', text: `The call comes. You are the new ${SEATS[next].long.toLowerCase()}.` });
    }
  }
  return notes;
}

function summarize(state, e) {
  const g = e.growth;
  const bits = [];
  if (e.shocks.find(s => s.id === 'coup')) bits.push('a coup');
  if (e.shocks.find(s => s.id === 'drought')) bits.push('a drought');
  if (e.shocks.find(s => s.id === 'debt')) bits.push('a debt crisis');
  if (e.shocks.find(s => s.id === 'boom')) bits.push('a pioneer firm');
  if (e.shocks.find(s => s.id === 'accel')) bits.push('a growth spurt');
  if (e.shocks.find(s => s.id === 'accel_end')) bits.push('the spurt fading');
  if (e.shocks.find(s => s.id === 'pandemic')) bits.push('a pandemic');
  if (e.shocks.find(s => s.id === 'recession')) bits.push('a global downturn');
  const tone = g > 4 ? 'A very good year' : g > 2 ? 'A good year' : g > 0 ? 'A so-so year' : g > -2 ? 'A poor year' : 'A bad year';
  const gs = `${g >= 0 ? '+' : ''}${g.toFixed(1)}%`;
  return bits.length ? `${tone} (${gs}), with ${bits.join(', ')}.` : `${tone} (${gs}). Nothing much happened, which is most years.`;
}

// ---------- Autopilot ----------
// A reasonable default government: addresses the most-named constraint, prefers continuity, some noise.
export function autoChoose(state, ctx, menu, rng) {
  rng = rng || state.rng.career;
  const aff = menu.filter(o => o.affordable);
  if (!aff.length) return null;
  const L = ctx.country.latest;
  const w = {
    power: 1 + nz(L.es_elec_constraint, 25) / 25 + nz(L.obst_electricity, 5) / 10,
    customs: 0.8 + nz(L.es_customs_constraint, 12) / 15 + nz(L.obst_customs, 3) / 8,
    skills: 0.6 + nz(L.obst_skills, 5) / 10,
    sme: 0.8 + nz(L.obst_finance, 15) / 15,
    macro: state.overvalued ? 2.2 : 0.3,
    anchor: 0.9 + state.prox[state.bestSector],
    sez: 0.5 + (state.booms.length ? 0.6 : 0),
    ipa: 0.8,
  };
  const last = state.choices.length ? state.choices[state.choices.length - 1] : null;
  const score = o => {
    let s = o.lever ? (w[o.lever] || 0.5) : 0.4;
    if (last && last.id === o.id) s *= 1.3; // continuity
    if (o.lever && state.reforms[o.lever].stock > 0.8) s *= 0.5;
    if (o.id === 'f_leave') s = 0.3; if (o.id === 'o_funder') s = 0.35; if (o.id === 'o_wait') s = 0.6;
    return s;
  };
  const pick = rng.weighted(aff, o => Math.pow(score(o), 2));
  return { optionId: pick.id, sector: state.bestSector };
}

// Runs a whole career with a chooser function; used for siblings and counterfactual reruns.
export function runAuto(state, ctx, chooser) {
  while (!state.ended) {
    if (state.role === 'player') {
      const menu = menuFor(state);
      const ch = chooser ? chooser(state, ctx, menu) : autoChoose(state, ctx, menu);
      chooseFocus(state, ch.optionId, ch.sector);
    }
    rollYear(state, ctx);
    if (state.pending) resolveEvent(state, ctx, state.pending.autoChoice != null ? state.pending.autoChoice : 0);
    closeYear(state, ctx);
  }
  return state;
}

// Real history for a sibling in a historical start year, in the same unit.
export function realPath(country, startYear, unit, years = HORIZON) {
  const s = incomeSeries(country, unit);
  const out = [];
  for (let y = startYear; y <= startYear + years; y++) out.push(s && s[y] != null ? s[y] : null);
  return out;
}
