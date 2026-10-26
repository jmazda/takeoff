// Take-Off data pipeline.
// Fetches World Development Indicators from the World Bank API and writes data/countries.json.
// Every number in the game comes from here or from data/assumptions.json (stated assumptions).
// Run: node tools/build-data.mjs
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('data/countries.json');
const CACHE = path.resolve('tools/.cache');
fs.mkdirSync(CACHE, { recursive: true });

// Indicator code -> { key, source, series? }  (series: keep full time series)
const INDICATORS = {
  'NY.GDP.PCAP.PP.KD': { key: 'gdppc_ppp', series: true },        // GDP pc PPP const 2021 intl $ (1990-)
  'NY.GDP.PCAP.KD':    { key: 'gdppc_usd', series: true },        // GDP pc const 2015 US$ (1960-)
  'SP.POP.TOTL':       { key: 'pop', series: true },
  'NE.EXP.GNFS.ZS':    { key: 'exports_gdp', series: true },
  'TX.VAL.MRCH.CD.WT': { key: 'merch_exports_usd', series: true },
  'TT.PRI.MRCH.XD.WD': { key: 'tot', series: true },               // net barter terms of trade (2015=100)
  'TX.VAL.FUEL.ZS.UN': { key: 'x_fuel' },
  'TX.VAL.MMTL.ZS.UN': { key: 'x_ores' },
  'TX.VAL.MANF.ZS.UN': { key: 'x_manuf' },
  'TX.VAL.AGRI.ZS.UN': { key: 'x_agraw' },
  'TX.VAL.FOOD.ZS.UN': { key: 'x_food' },
  'TX.VAL.TECH.MF.ZS': { key: 'x_hitech' },
  'ST.INT.RCPT.XP.ZS': { key: 'x_tourism' },
  'BX.GSR.CCIS.ZS':    { key: 'x_ict_services' },
  'SL.AGR.EMPL.ZS':    { key: 'emp_agri' },
  'SL.IND.EMPL.ZS':    { key: 'emp_ind' },
  'SL.EMP.WORK.ZS':    { key: 'emp_wage' },
  'SL.EMP.TOTL.SP.ZS': { key: 'emp_pop' },
  'NV.IND.MANF.ZS':    { key: 'manuf_gdp' },
  'EG.ELC.ACCS.ZS':    { key: 'elec_access' },
  'EG.USE.ELEC.KH.PC': { key: 'elec_kwh_pc' },
  'LP.LPI.OVRL.XQ':    { key: 'lpi' },
  'GC.TAX.TOTL.GD.ZS': { key: 'tax_gdp' },
  'DT.DOD.DECT.GN.ZS': { key: 'ext_debt_gni', series: true },
  'FP.CPI.TOTL.ZG':    { key: 'inflation' },
  'NY.GDP.TOTL.RT.ZS': { key: 'rents_total', series: true },
  'NY.GDP.PETR.RT.ZS': { key: 'rents_oil' },
  'NY.GDP.MINR.RT.ZS': { key: 'rents_mineral' },
  'SE.SEC.ENRR':       { key: 'sec_enrol' },
  'BX.KLT.DINV.WD.GD.ZS': { key: 'fdi_gdp' },
  'BX.TRF.PWKR.DT.GD.ZS': { key: 'remit_gdp' },
  // Worldwide Governance Indicators (source 3)
  'GOV_WGI_PV.EST':    { key: 'wgi_stability', source: 3, series: true },
  'GOV_WGI_GE.EST':    { key: 'wgi_effectiveness', source: 3 },
  'GOV_WGI_RL.EST':    { key: 'wgi_rule_of_law', source: 3 },
  'GOV_WGI_CC.EST':    { key: 'wgi_corruption', source: 3 },
  'GOV_WGI_VA.EST':    { key: 'wgi_voice', source: 3 },
  // Enterprise Surveys (source 13)
  'IC.FRM.INFRA.IN2':  { key: 'es_outages_month', source: 13 },
  'IC.FRM.INFRA.IN12': { key: 'es_elec_constraint', source: 13 },
  'IC.FRM.INFRA.IN11': { key: 'es_transport_constraint', source: 13 },
  'IC.FRM.TRD.TR1':    { key: 'es_customs_days_direct', source: 13 },
  'IC.FRM.TRD.TR9':    { key: 'es_customs_constraint', source: 13 },
  'IC.FRM.FIN.FIN16':  { key: 'es_finance_constraint', source: 13 },
  'IC.FRM.CORR.CORR11':{ key: 'es_corruption_constraint', source: 13 },
  'IC.FRM.WRKF.WK10':  { key: 'es_skills_constraint', source: 13 },
  'IC.FRM.INFOR.INFOR2':{ key: 'es_informal_constraint', source: 13 },
  'IC.FRM.OBS.OBST1':  { key: 'obst_finance', source: 13 },
  'IC.FRM.OBS.OBST2':  { key: 'obst_land', source: 13 },
  'IC.FRM.OBS.OBST3':  { key: 'obst_licensing', source: 13 },
  'IC.FRM.OBS.OBST4':  { key: 'obst_corruption', source: 13 },
  'IC.FRM.OBS.OBST5':  { key: 'obst_courts', source: 13 },
  'IC.FRM.OBS.OBST6':  { key: 'obst_crime', source: 13 },
  'IC.FRM.OBS.OBST7':  { key: 'obst_customs', source: 13 },
  'IC.FRM.OBS.OBST8':  { key: 'obst_electricity', source: 13 },
  'IC.FRM.OBS.OBST9':  { key: 'obst_skills', source: 13 },
  'IC.FRM.OBS.OBST10': { key: 'obst_labor_reg', source: 13 },
  'IC.FRM.OBS.OBST11': { key: 'obst_instability', source: 13 },
  'IC.FRM.OBS.OBST12': { key: 'obst_informal', source: 13 },
  'IC.FRM.OBS.OBST13': { key: 'obst_tax_admin', source: 13 },
  'IC.FRM.OBS.OBST14': { key: 'obst_tax_rates', source: 13 },
  'IC.FRM.OBS.OBST15': { key: 'obst_transport', source: 13 },
  // Doing Business archive (source 1), discontinued 2020
  'TRD.ACRS.BRDR.EXPT.BRDR.COMP.HR.DB1619': { key: 'db_export_border_hours', source: 1 },
  'TRD.ACRS.BRDR.EXPT.DURS.DY.DB0615':      { key: 'db_export_days_0615', source: 1 },
};

async function fetchJson(url, name) {
  const f = path.join(CACHE, name + '.json');
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(90000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      fs.writeFileSync(f, JSON.stringify(j));
      return j;
    } catch (e) {
      console.warn('retry', name, e.message);
      await new Promise(res => setTimeout(res, 2000 * (attempt + 1)));
    }
  }
  throw new Error('failed ' + url);
}

async function fetchIndicator(code, source) {
  let all = [];
  for (let page = 1; page <= 5; page++) {
    const src = source ? `&source=${source}` : '';
    const url = `https://api.worldbank.org/v2/country/all/indicator/${code}?format=json&per_page=20000&date=1960:2025&page=${page}${src}`;
    const j = await fetchJson(url, `${code}_${source || 2}_p${page}`);
    if (!j || !j[1]) break;
    all = all.concat(j[1]);
    if (page >= (j[0].pages || 1)) break;
  }
  return all;
}

const meta = await fetchJson('https://api.worldbank.org/v2/country?format=json&per_page=400', 'countries');
const countries = {};
for (const r of meta[1]) {
  if (!['LIC', 'LMC', 'UMC'].includes(r.incomeLevel.id)) continue;
  countries[r.id] = {
    iso3: r.id, name: r.name, income: r.incomeLevel.id, region: r.region.id, regionName: r.region.value,
    capital: r.capitalCity, lat: +r.latitude, lon: +r.longitude, latest: {}, latestYear: {}, series: {},
  };
}

for (const [code, spec] of Object.entries(INDICATORS)) {
  process.stdout.write(`fetching ${code} (${spec.key}) ... `);
  let rows = await fetchIndicator(code, spec.source);
  let n = 0;
  for (const row of rows) {
    const c = countries[row.countryiso3code];
    if (!c || row.value == null) continue;
    const y = +row.date;
    if (spec.series) {
      (c.series[spec.key] ||= {})[y] = +(+row.value).toPrecision(6);
    }
    if (!(spec.key in c.latestYear) || y > c.latestYear[spec.key]) {
      c.latest[spec.key] = +(+row.value).toPrecision(5);
      c.latestYear[spec.key] = y;
    }
    n++;
  }
  console.log(n, 'obs');
}

// Derived per-country stats used as model priors (all from the country's own history).
function growthStats(series, from, to) {
  const g = [];
  for (let y = from + 1; y <= to; y++) {
    if (series[y] && series[y - 1]) g.push(Math.log(series[y] / series[y - 1]));
  }
  if (g.length < 5) return null;
  const mean = g.reduce((a, b) => a + b, 0) / g.length;
  const sd = Math.sqrt(g.reduce((a, b) => a + (b - mean) ** 2, 0) / (g.length - 1));
  return { mean: +mean.toFixed(4), sd: +sd.toFixed(4), n: g.length };
}
function totStats(series) {
  const d = [];
  const ys = Object.keys(series).map(Number).sort();
  for (const y of ys) if (series[y - 1]) d.push(Math.log(series[y] / series[y - 1]));
  if (d.length < 5) return null;
  const sd = Math.sqrt(d.reduce((a, b) => a + b * b, 0) / d.length);
  return { sd: +sd.toFixed(4), n: d.length, changes: d.map(x => +x.toFixed(3)) };
}

for (const c of Object.values(countries)) {
  const s = c.series.gdppc_usd || {};
  c.stats = {
    growth_1990_2023: growthStats(s, 1990, 2023),
    growth_1960_2023: growthStats(s, 1960, 2023),
    tot: c.series.tot ? totStats(c.series.tot) : null,
  };
  // Which start years are available: need GDP pc data for the start year.
  const years = Object.keys(s).map(Number);
  c.firstYear = years.length ? Math.min(...years) : null;
  c.lastYear = years.length ? Math.max(...years) : null;
}

// Drop countries with no usable GDP series at all.
const out = Object.values(countries).filter(c => c.stats.growth_1990_2023 && c.latest.pop);
console.log('countries kept:', out.length, 'of', Object.keys(countries).length);
console.log('dropped:', Object.values(countries).filter(c => !out.includes(c)).map(c => c.name).join(', '));

const bundle = {
  built: new Date().toISOString().slice(0, 10),
  source: 'World Bank World Development Indicators (api.worldbank.org, WDI and WDI Archives), accessed on build date',
  indicators: Object.fromEntries(Object.entries(INDICATORS).map(([k, v]) => [v.key, k])),
  countries: out,
};
fs.writeFileSync(OUT, JSON.stringify(bundle));
console.log('wrote', OUT, (fs.statSync(OUT).size / 1024).toFixed(0), 'KB');
