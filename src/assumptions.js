// Every judgement call in the model lives here, with a value, a one-line note and a source.
// The methods page renders this table directly. "assumption" means a number we chose; "data" means
// it is computed from the World Bank series at run time. Change a value here and the game changes.
export const A = {
  // --- Growth engine ---
  prior_weight_country: { value: 0.6, unit: 'share', note: 'Weight on the country\'s own historical growth mean; the rest goes to the pooled LMIC mean (shrinkage prior).', source: 'Assumption. Easterly, Kremer, Pritchett & Summers (1993) show country growth rates are weakly persistent, so we shrink toward the pool.' },
  noise_share_of_sd: { value: 0.6, unit: 'share', note: 'Idiosyncratic noise sd as a share of the country\'s own historical growth sd. The rest of the variance comes from explicit shocks and regimes.', source: 'Assumption.' },
  convergence_rate: { value: 0.004, unit: 'per log-unit', note: 'Growth bonus per log-unit of income below the LMIC median (mild conditional convergence).', source: 'Assumption, on the low side of Barro-style estimates (~2%/yr unconditional beta) because much of that is absorbed by the country prior.' },
  shock_offset_ppt: { value: 0.7, unit: 'ppt/yr', note: 'Added back to the growth prior because the historical mean already contains the average drag of droughts, coups, crises and collapses that the model draws explicitly. Set to the simulated mean of those draws (tools/calibrate.mjs).', source: 'Calibration, not data.' },
  effect_convexity: { value: 2.5, unit: 'exponent', note: 'Reform effects scale with stock^2.5: half a reform delivers under a fifth of the effect. Rewards persistence over scattering.', source: 'Assumption. Threshold effects in infrastructure and trade facilitation are well documented; the exponent is a judgement call.' },
  policy_cap_ppt: { value: 2.0, unit: 'ppt/yr', note: 'Hard cap on the total growth effect of all reforms in a year. This is the "skill helps a little" dial.', source: 'Assumption. Compare: Rodrik (2005) on the modest, uncertain growth payoff from standard reform packages.' },

  // --- Growth accelerations and collapses (regimes) ---
  accel_start_p: { value: 0.028, unit: 'per year', note: 'Annual probability that a growth acceleration starts, with no help from policy.', source: 'Hausmann, Pritchett & Rodrik (2005): roughly a 25% chance of an acceleration starting in any given decade.' },
  accel_boost_ppt: { value: 3.0, unit: 'ppt/yr', note: 'Extra per-capita growth while an acceleration lasts.', source: 'HPR (2005) define an acceleration as a 2+ ppt increase; episodes average ~3.5% faster growth than before.' },
  accel_continue_p: { value: 0.88, unit: 'per year', note: 'Annual survival probability of an acceleration, giving a median run of about 5-6 years and a 36% chance of reaching 8 years.', source: 'Assumption calibrated to HPR (2005) and Pritchett, Sen, Kar & Raihan (2016): most episodes are not sustained.' },
  accel_policy_bonus_max: { value: 0.06, unit: 'per year', note: 'Maximum extra start-probability from a coherent, persistent reform stock (doubles the base rate at most).', source: 'Assumption. HPR (2005) find reforms predict sustained, not sudden, accelerations.' },
  accel_persistence_bonus_max: { value: 0.08, unit: 'per year', note: 'Maximum extra survival probability from reforms with a constituency and a diversified export base.', source: 'Assumption, in the spirit of HPR (2005) and Hausmann, Hwang & Rodrik (2007) on export sophistication and sustained growth.' },
  collapse_start_p: { value: 0.02, unit: 'per year', note: 'Annual probability of a growth collapse starting, before debt and instability adders.', source: 'Assumption. Pritchett et al (2016) find deceleration episodes about as common as accelerations.' },
  collapse_ppt: { value: -4.0, unit: 'ppt/yr', note: 'Growth hit while a collapse lasts.', source: 'Assumption; HPR (2005) decelerations average about 3-5 ppt.' },
  collapse_continue_p: { value: 0.7, unit: 'per year', note: 'Annual persistence of a collapse (median ~2 years).', source: 'Assumption.' },

  // --- Shocks ---
  tot_elasticity: { value: 0.2, unit: 'ppt per 1% ToT change at full commodity exposure', note: 'Growth effect = elasticity x change in terms of trade x commodity share of exports.', source: 'Deaton & Miller (1995), Collier & Goderis (2012): commodity price booms raise short-run growth in exporters.' },
  drought_base_p: { value: 0.08, unit: 'per year', note: 'Base annual drought probability, scaled by the share of employment in agriculture (floor 3%, cap 20%).', source: 'Assumption. EM-DAT records a major drought roughly every 10-15 years in agrarian LICs.' },
  drought_ppt: { value: -1.5, unit: 'ppt', note: 'Growth hit from a drought at full agricultural exposure (employment in agriculture of 40%+).', source: 'Assumption; Dell, Jones & Olken (2012) find a 1C warmer year cuts growth ~1.3 ppt in poor countries.' },
  coup_base_p: { value: 0.012, unit: 'per year', note: 'Coup attempt probability at a WGI political-stability score of 0, scaled by exp(-score), floor 0.2%, cap 6%. Half of attempts succeed.', source: 'Powell & Thyne (2011) global coup dataset: about 490 attempts 1950-2023, half successful; rates fell sharply after 1990. Dataset could not be fetched at build time, so this is a stated calibration, not a per-country rate.' },
  coup_ppt: { value: -2.0, unit: 'ppt', note: 'Growth hit in a coup year (half as much the year after).', source: 'Assumption; Meyersson (2016) finds coups in democracies cut growth by 1-1.3 ppt per year for a decade.' },
  conflict_base_p: { value: 0.012, unit: 'per year', note: 'Onset probability of internal conflict at stability 0, scaled like coups. Ends with 30%/yr probability.', source: 'Assumption, loosely from UCDP onset rates.' },
  conflict_ppt: { value: -2.5, unit: 'ppt/yr', note: 'Growth hit while conflict lasts.', source: 'Collier (1999): civil war cuts growth ~2.2 ppt per year.' },
  debt_crisis_base_p: { value: 0.008, unit: 'per year', note: 'Base debt-crisis probability, plus 2 ppt per 10 points of external debt above 50% of GNI, plus 2 ppt if inflation exceeds 20%, plus 1 ppt if the currency is overvalued.', source: 'Assumption, in the spirit of Reinhart & Rogoff (2009) thresholds.' },
  debt_crisis_ppt: { value: -3.0, unit: 'ppt', note: 'Growth hit for two years; budget halved for three years.', source: 'Assumption.' },
  global_recession_random_p: { value: 0.08, unit: 'per year', note: 'Used only when global shocks are set to random. Real history mode uses the actual years.', source: 'Count of global recessions and EM crises 1970-2025 (1975, 1982, 1991, 1998, 2001, 2009, 2015, 2020).' },
  global_recession_ppt: { value: -1.5, unit: 'ppt', note: 'Hit scaled by 0.5 + exports/GDP.', source: 'Assumption; IMF WEO: EM growth fell ~3-4 ppt in 2009.' },
  pandemic_ppt: { value: -5.0, unit: 'ppt', note: '2020-style hit; in random mode 1%/yr.', source: 'WDI: LMIC per-capita GDP fell ~4-5% in 2020.' },
  election_cycle_years: { value: 5, unit: 'years', note: 'Elections every 5 years (4-6 at random). Government turnover 35% where WGI voice & accountability > -0.5, else 10%.', source: 'Assumption. Most constitutions use 4-5 year terms; turnover from Hyde & Marinov NELDA-style summaries.' },

  // --- Seats and careers ---
  tenure_hazard_minister: { value: 0.30, unit: 'per year', note: 'Annual probability a minister is reshuffled out (median tenure ~2 years). Doubles in election years, 1.5x after a bad year.', source: 'Assumption to be calibrated against WhoGov (Nyrup & Bramwell 2020); average cabinet tenure in LMICs is about 2-3 years.' },
  tenure_hazard_adviser: { value: 0.22, unit: 'per year', note: 'Presidential adviser or delivery unit head.', source: 'Assumption (delivery units typically survive 3-4 years; see Institute for Government).' },
  tenure_hazard_ipa: { value: 0.20, unit: 'per year', note: 'Investment promotion agency head.', source: 'Assumption; IPA heads are often political appointees, turnover similar to ministers but lagged.' },
  out_of_office_return_p: { value: 0.40, unit: 'per year', note: 'Chance per year of being offered a new seat while out of office.', source: 'Assumption.' },
  successor_keep_base: { value: 0.45, unit: 'probability', note: 'Base probability a successor keeps a reform, +8 ppt per year it has run (max +30), +25 ppt if it has a constituency, -15 ppt if controversial (exchange-rate, SEZ tax deals, bespoke investor deals).', source: 'Assumption. See Andrews, Pritchett & Woolcock (2017) on reforms that build authorization vs isomorphic mimicry.' },
  player_build_rate: { value: 0.5, unit: 'stock/yr', note: 'Reform stock a focused reformer adds per year at full seat strength (minister). The default government adds default_build_rate. This is the gap between a reformer who chose one thing and a ministry that does a bit of everything.', source: 'Assumption; the main skill dial together with policy_cap_ppt and effect_convexity.' },
  default_build_rate: { value: 0.11, unit: 'stock/yr', note: 'Reform stock the default government (siblings, and your country when you are not the minister) adds per year to the lever it happens to pick.', source: 'Assumption; the other half of the skill dial.' },
  reform_decay: { value: 0.08, unit: 'per year', note: 'Reform stock lost each year it is not actively maintained.', source: 'Assumption.' },

  // --- Lever effects (growth ppt at full reform stock, before the cap) ---
  effect_power: { value: 0.8, unit: 'ppt', note: 'Reliable power. Scaled by how much firms name electricity as a constraint; 2-year lag.', source: 'Assumption; Enterprise Surveys show outages cost 2-10% of sales in affected firms.' },
  effect_customs: { value: 0.5, unit: 'ppt', note: 'Trade facilitation. Scaled by customs constraint and exports/GDP; 1-year lag.', source: 'Assumption; Djankov, Freund & Pham (2010): each day of export delay cuts trade ~1%.' },
  effect_macro: { value: 0.5, unit: 'ppt', note: 'Exchange-rate and macro reform. Large effect only when the currency is overvalued (parallel-market gap state); otherwise small. High political cost.', source: 'Easterly (2005), Rodrik (2008) on overvaluation and growth.' },
  effect_skills: { value: 0.4, unit: 'ppt', note: 'Skills and TVET. 4-year lag.', source: 'Assumption; returns to training are real but slow.' },
  effect_sme: { value: 0.10, unit: 'ppt', note: 'Broad SME programs. Deliberately small: evidence of growth effects is weak.', source: 'McKenzie (2017) review: most SME support programs show small or no measurable effects.' },
  effect_sez: { value: 0.0, unit: 'ppt direct', note: 'SEZs have no direct growth effect. They raise the chance an anchor investor arrives and the export payoff if one does. Roughly one zone in three attracts meaningful investment.', source: 'Farole (2011), Frick, Rodriguez-Pose & Wong (2019): most zones underperform.' },
  anchor_base_p: { value: 0.15, unit: 'per year', note: 'Chance an anchor investor lands in a targeted sector when actively courted, times sector proximity, times readiness (power, customs, zone).', source: 'Assumption; Growth Teams Export Boom Atlas cases show pioneers arrive after years of courting, if at all.' },
  boom_growth: { value: 0.25, unit: 'per year', note: 'Export growth of a new sector boom for its first 8 years, from a seed of 1% of exports.', source: 'Export Boom Atlas: successful booms typically grow 20-30%/yr for a decade from a tiny base.' },
  boom_fade_p: { value: 0.10, unit: 'per year', note: 'Chance per year a boom fades (preference loss, wage rise, a competitor, a firm leaving).', source: 'Assumption; roughly half of booms last beyond 7 years.' },

  // --- Jobs ---
  jobs_elasticity: { value: 0.4, unit: 'elasticity', note: 'Growth of wage employment (beyond population growth) per unit of per-capita GDP growth, before sector booms are added.', source: 'Assumption; ILO employment elasticities for developing countries cluster around 0.3-0.7, lower for per-capita growth.' },
  funder_call_p: { value: 0.2, unit: 'per year', note: 'Chance per year that a funder is offered a government seat.', source: 'Assumption.' },
  working_age_share: { value: 0.62, unit: 'share', note: 'Share of population aged 15+ used to convert employment ratios to headcounts.', source: 'UN WPP: LMIC median ~60-65%.' },
};

// Jobs per US$1 million of exports, by sector (assumptions, order of magnitude).
export const JOBS_PER_MUSD = {
  garments: 30, horticulture: 25, agro_processing: 12, light_manufacturing: 10, electronics: 6, auto_parts: 5,
  tourism: 18, ict_services: 8, business_services: 10, mining: 1.5, oil_gas: 0.3, commodities: 3, pharma: 4,
};

export const GLOBAL_SHOCK_YEARS = {
  recessions: [1975, 1982, 1991, 1998, 2001, 2009, 2015],
  pandemic: [2020],
  commodity_crash: [1986, 1998, 2009, 2015, 2020],
  commodity_boom: [1974, 1979, 2005, 2006, 2007, 2008, 2010, 2011, 2021, 2022],
};
