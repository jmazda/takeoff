// Loads data/countries.json and turns it into what the game needs: a draw, a starting hand, siblings.
import { sectorProximity, exportBasket, SECTORS, commodityShare } from './sectors.js';

export const HISTORICAL_YEARS = [1985, 2000];

let DB = null;
export async function loadData(url = 'data/countries.json') {
  if (DB) return DB;
  const r = await fetch(url);
  const raw = await r.json();
  DB = indexData(raw);
  return DB;
}
export function indexData(raw) {
  const byIso = {};
  for (const c of raw.countries) byIso[c.iso3] = c;
  // Pooled LMIC statistics used for shrinkage priors (all from data).
  const means = raw.countries.map(c => c.stats.growth_1990_2023.mean);
  const sds = raw.countries.map(c => c.stats.growth_1990_2023.sd);
  const pooled = {
    meanGrowth: avg(means), sdGrowth: avg(sds),
    medianIncomePPP: median(raw.countries.map(c => c.latest.gdppc_ppp).filter(Boolean)),
    medianIncomeUSD: median(raw.countries.map(c => c.latest.gdppc_usd).filter(Boolean)),
    medianTotSd: median(raw.countries.map(c => c.stats.tot && c.stats.tot.sd).filter(Boolean)),
  };
  return { ...raw, byIso, pooled };
}
const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
function median(a) { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; }

// Value of a series at or just before a year.
export function at(series, year, back = 3) {
  if (!series) return null;
  for (let y = year; y >= year - back; y--) if (series[y] != null) return series[y];
  return null;
}

export function recentStartYear(c) { return c.lastYear; }
export function availableStartYears(c) {
  const ys = [c.lastYear];
  for (const y of HISTORICAL_YEARS) if (c.series.gdppc_usd[y]) ys.push(y);
  return ys;
}

// Income measure: PPP where the series covers the start year, else constant 2015 US$.
export function incomeAt(c, year) {
  const ppp = at(c.series.gdppc_ppp, year, 1);
  if (ppp) return { value: ppp, unit: 'ppp', label: 'GDP per capita, PPP (2021 international $)' };
  return { value: at(c.series.gdppc_usd, year, 1), unit: 'usd', label: 'GDP per capita (constant 2015 US$)' };
}
export function incomeSeries(c, unit) { return unit === 'ppp' ? c.series.gdppc_ppp : c.series.gdppc_usd; }

export function drawCountry(db, rng, settings) {
  const pool = db.countries.filter(c => c.stats.growth_1990_2023 && c.latest.pop > 300000);
  const eraPool = settings.era === 'historical' ? pool.filter(c => availableStartYears(c).length > 1) : pool;
  const c = settings.weighting === 'pop' ? rng.weighted(eraPool, x => Math.sqrt(x.latest.pop)) : rng.pick(eraPool);
  const years = availableStartYears(c);
  let startYear;
  if (settings.era === 'recent') startYear = years[0];
  else if (settings.era === 'historical') startYear = rng.pick(years.slice(1));
  else startYear = rng.chance(0.5) ? years[0] : rng.pick(years.slice(1).length ? years.slice(1) : years);
  return { country: c, startYear };
}

// Four real countries that started the same year at a similar income.
export function pickSiblings(db, c, startYear, rng) {
  const me = incomeAt(c, startYear);
  const cands = db.countries.filter(s => s.iso3 !== c.iso3 && s.latest.pop > 300000).map(s => {
    const inc = incomeAt(s, startYear);
    if (!inc.value || inc.unit !== me.unit) return null;
    const gap = Math.abs(Math.log(inc.value / me.value));
    return { s, gap };
  }).filter(Boolean).filter(x => x.gap < 0.5).sort((a, b) => a.gap - b.gap);
  const top = cands.slice(0, 12);
  const out = [];
  while (out.length < 4 && top.length) { const i = rng.int(top.length); out.push(top.splice(i, 1)[0].s); }
  return out;
}

const OBST_LABELS = {
  obst_finance: 'Access to finance', obst_land: 'Access to land', obst_licensing: 'Licensing & permits', obst_corruption: 'Corruption',
  obst_courts: 'Courts', obst_crime: 'Crime & disorder', obst_customs: 'Customs & trade rules', obst_electricity: 'Electricity',
  obst_skills: 'Educated workforce', obst_labor_reg: 'Labour regulation', obst_instability: 'Political instability',
  obst_informal: 'Informal competitors', obst_tax_admin: 'Tax administration', obst_tax_rates: 'Tax rates', obst_transport: 'Transport',
};
export const OBST_TO_LEVER = {
  obst_electricity: 'power', obst_customs: 'customs', obst_transport: 'customs', obst_skills: 'skills', obst_finance: 'sme',
  obst_informal: 'sme', obst_licensing: 'sme', obst_tax_admin: 'macro', obst_tax_rates: 'macro', obst_instability: null,
  obst_corruption: null, obst_courts: null, obst_crime: null, obst_land: 'sez', obst_labor_reg: null,
};

export function topConstraints(c) {
  const L = c.latest;
  const rows = Object.keys(OBST_LABELS).filter(k => L[k] != null).map(k => ({ key: k, label: OBST_LABELS[k], share: L[k], lever: OBST_TO_LEVER[k] }));
  rows.sort((a, b) => b.share - a.share);
  return { rows: rows.slice(0, 5), year: c.latestYear.obst_electricity || null };
}

export function politicalSetting(c) {
  const L = c.latest;
  const s = L.wgi_stability, v = L.wgi_voice, g = L.wgi_effectiveness;
  const stab = s == null ? 'unknown' : s < -1.2 ? 'volatile' : s < -0.4 ? 'uneasy' : s < 0.4 ? 'steady' : 'calm';
  const voice = v == null ? 'unknown' : v < -1.0 ? 'elections are mostly a formality' : v < -0.2 ? 'competitive but constrained politics' : 'competitive elections';
  const state = g == null ? 'unknown' : g < -1.0 ? 'a thin civil service' : g < -0.3 ? 'a patchy civil service' : g < 0.3 ? 'a workable civil service' : 'a capable civil service';
  return { stab, voice, state, scores: { stability: s, voice: v, effectiveness: g, corruption: L.wgi_corruption, ruleOfLaw: L.wgi_rule_of_law }, year: c.latestYear.wgi_stability };
}

export function startingHand(c, startYear) {
  const L = c.latest;
  const inc = incomeAt(c, startYear);
  const prox = sectorProximity(c);
  const nearby = Object.entries(prox).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, p]) => ({ id: k, name: SECTORS[k].name, short: SECTORS[k].short, proximity: p }));
  return {
    income: inc, pop: at(c.series.pop, startYear) || L.pop,
    exportsGdp: at(c.series.exports_gdp, startYear) || L.exports_gdp,
    basket: exportBasket(c), basketYear: c.latestYear.x_manuf,
    commodityShare: commodityShare(c), nearby,
    power: { access: L.elec_access, outages: L.es_outages_month, outageLoss: L.es_outage_loss, constraint: L.es_elec_constraint, kwh: L.elec_kwh_pc, year: c.latestYear.es_outages_month },
    trade: { customsDays: L.es_customs_days_direct, borderHours: L.db_export_border_hours, lpi: L.lpi, constraint: L.es_customs_constraint, year: c.latestYear.es_customs_days_direct, lpiYear: c.latestYear.lpi, dbYear: c.latestYear.db_export_border_hours },
    constraints: topConstraints(c), politics: politicalSetting(c),
    macro: { debt: at(c.series.ext_debt_gni, startYear) || L.ext_debt_gni, inflation: L.inflation, tax: L.tax_gdp, rents: at(c.series.rents_total, startYear) || L.rents_total },
    labour: { agri: L.emp_agri, industry: L.emp_ind, wage: L.emp_wage, empPop: L.emp_pop, secEnrol: L.sec_enrol },
    history: c.stats, firstYear: c.firstYear,
  };
}
