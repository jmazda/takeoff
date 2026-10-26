// A simplified sector space. Stands in for the Atlas of Economic Complexity product space, which we
// could not fetch at build time. "Nearby" sectors are derived from the country's real export basket
// (WDI merchandise export composition) by the proximity rules below. Flagged as a simplification in-game.
export const SECTORS = {
  horticulture:        { name: 'Horticulture', short: 'Flowers, fruit & veg', needs: { power: 0.3, customs: 0.8, skills: 0.2, logistics: 0.9 }, near: ['agro_processing'] },
  agro_processing:     { name: 'Agro-processing', short: 'Processed food & drink', needs: { power: 0.6, customs: 0.4, skills: 0.3, logistics: 0.5 }, near: ['horticulture', 'light_manufacturing'] },
  garments:            { name: 'Garments', short: 'Apparel & footwear', needs: { power: 0.6, customs: 0.9, skills: 0.3, logistics: 0.7 }, near: ['light_manufacturing'] },
  light_manufacturing: { name: 'Light manufacturing', short: 'Plastics, packaging, furniture', needs: { power: 0.8, customs: 0.5, skills: 0.4, logistics: 0.5 }, near: ['garments', 'auto_parts', 'agro_processing'] },
  auto_parts:          { name: 'Auto parts', short: 'Wiring harnesses, components', needs: { power: 0.8, customs: 0.8, skills: 0.6, logistics: 0.8 }, near: ['electronics', 'light_manufacturing'] },
  electronics:         { name: 'Electronics assembly', short: 'Phones, boards, devices', needs: { power: 0.9, customs: 0.9, skills: 0.7, logistics: 0.9 }, near: ['auto_parts'] },
  pharma:              { name: 'Pharmaceuticals', short: 'Generics & medical supplies', needs: { power: 0.8, customs: 0.5, skills: 0.9, logistics: 0.5 }, near: ['light_manufacturing'] },
  tourism:             { name: 'Tourism', short: 'Visitors & hospitality', needs: { power: 0.4, customs: 0.2, skills: 0.4, logistics: 0.6 }, near: ['business_services'] },
  ict_services:        { name: 'ICT services', short: 'Software, BPO, call centres', needs: { power: 0.7, customs: 0.1, skills: 0.9, logistics: 0.2 }, near: ['business_services'] },
  business_services:   { name: 'Business services', short: 'Back-office, finance, logistics hubs', needs: { power: 0.5, customs: 0.3, skills: 0.8, logistics: 0.5 }, near: ['ict_services', 'tourism'] },
  mining:              { name: 'Mining', short: 'Ores & metals', needs: { power: 0.7, customs: 0.3, skills: 0.3, logistics: 0.7 }, near: ['commodities'] },
  oil_gas:             { name: 'Oil & gas', short: 'Hydrocarbons', needs: { power: 0.2, customs: 0.2, skills: 0.4, logistics: 0.6 }, near: ['mining'] },
  commodities:         { name: 'Agricultural commodities', short: 'Coffee, cocoa, cotton, grains', needs: { power: 0.2, customs: 0.5, skills: 0.1, logistics: 0.7 }, near: ['agro_processing', 'horticulture'] },
};

// Proximity of each sector to a country given its export basket (0..1). Rules, not Atlas data.
export function sectorProximity(c) {
  const L = c.latest;
  const food = (L.x_food || 0) / 100, agraw = (L.x_agraw || 0) / 100, manuf = (L.x_manuf || 0) / 100;
  const fuel = (L.x_fuel || 0) / 100, ores = (L.x_ores || 0) / 100, hitech = (L.x_hitech || 0) / 100;
  const tour = (L.x_tourism || 0) / 100, ict = (L.x_ict_services || 0) / 100;
  const skills = Math.min(1, (L.sec_enrol || 40) / 90);
  const p = {
    commodities: 0.4 + 0.6 * (food + agraw),
    horticulture: 0.25 + 0.5 * food + 0.2 * (L.lpi ? (L.lpi - 2) / 2 : 0),
    agro_processing: 0.25 + 0.4 * food + 0.3 * manuf,
    garments: 0.2 + 0.5 * manuf + 0.2 * (L.emp_agri > 40 ? 0.5 : 0.2),
    light_manufacturing: 0.15 + 0.6 * manuf,
    auto_parts: 0.05 + 0.5 * manuf * skills,
    electronics: 0.03 + 0.4 * manuf * skills + 0.4 * hitech,
    pharma: 0.05 + 0.3 * manuf * skills,
    tourism: 0.2 + 0.7 * tour,
    ict_services: 0.1 + 0.5 * ict + 0.3 * skills,
    business_services: 0.1 + 0.3 * ict + 0.3 * skills,
    mining: 0.1 + 0.8 * ores + 0.2 * ((L.rents_mineral || 0) / 10),
    oil_gas: 0.05 + 0.8 * fuel + 0.2 * ((L.rents_oil || 0) / 20),
  };
  for (const k in p) p[k] = Math.max(0.02, Math.min(1, p[k]));
  return p;
}

export function exportBasket(c) {
  const L = c.latest;
  const items = [
    ['Food & agriculture', L.x_food], ['Agricultural raw materials', L.x_agraw], ['Manufactures', L.x_manuf],
    ['Fuels', L.x_fuel], ['Ores & metals', L.x_ores],
  ].filter(([, v]) => v != null).map(([k, v]) => ({ name: k, share: v }));
  items.sort((a, b) => b.share - a.share);
  const sum = items.reduce((a, b) => a + b.share, 0);
  // UN merchandise categories exclude non-monetary gold and some unclassified goods; show the gap honestly.
  if (items.length && sum < 85) items.push({ name: 'Other (incl. gold, unclassified)', share: 100 - sum, residual: true });
  return items;
}

export function commodityShare(c) {
  const L = c.latest;
  const known = (L.x_fuel || 0) + (L.x_ores || 0) + (L.x_food || 0) + (L.x_agraw || 0) + (L.x_manuf || 0);
  const residual = L.x_manuf != null ? Math.max(0, 100 - known) : 0; // mostly gold and other primary goods
  const x = ((L.x_fuel || 0) + (L.x_ores || 0) + (L.x_food || 0) + (L.x_agraw || 0) + 0.7 * residual) / 100;
  return Math.max(0.1, Math.min(1, x));
}
