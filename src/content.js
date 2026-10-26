// Stories: forced-decision events, fictional firm names, pause questions, glossary.
// Event odds come from the country's conditions and the player's reform stock. Stories are modelled on
// public export-boom cases (Bangladesh garments, Ethiopia flowers, Kenya horticulture, Costa Rica electronics,
// Morocco auto parts, Mauritius and Dominican Republic zones, Vietnam electronics). Firms are fictional.
import { SECTORS } from './sectors.js';
import { takeSeat, SEATS } from './model.js';
import { A } from './assumptions.js';

const FIRMS = {
  horticulture: ['Meridian Blooms', 'Highland Fresh', 'Verdant Exports', 'Kestrel Produce'],
  agro_processing: ['Savanna Foods', 'Rivermill', 'Golden Harvest Processing', 'Orchard & Vine'],
  garments: ['Sunrise Knitwear', 'Nordline Apparel', 'Lotus Garments', 'Atlas Textiles'],
  light_manufacturing: ['Polymer Works', 'Castellan Furniture', 'Bright Packaging', 'Ironwood Industries'],
  auto_parts: ['Harness Tech', 'Axle & Spring', 'Delta Wiring', 'Corvus Components'],
  electronics: ['Quanta Assembly', 'Nimbus Devices', 'Circuit Line', 'Halcyon Electronics'],
  pharma: ['Veritas Generics', 'Clearwater Pharma', 'Aurora Labs'],
  tourism: ['Azure Resorts', 'Trailhead Lodges', 'Coral Bay Hotels'],
  ict_services: ['Beacon BPO', 'Cloudline Services', 'Signal Software'],
  business_services: ['Harbour Back-Office', 'Keystone Shared Services'],
  mining: ['Granite Ridge Minerals', 'Cobalt Crest', 'Northstar Mining'],
  oil_gas: ['Sable Energy', 'Meridian Petroleum'],
  commodities: ['Equator Commodities', 'Terra Trading'],
};
export function firmName(sector, state) {
  const list = FIRMS[sector] || ['Pioneer Co'];
  const used = new Set(state.booms.map(b => b.firm));
  const free = list.filter(f => !used.has(f));
  return (free.length ? free : list)[state.rng.event.int((free.length ? free : list).length)];
}

const sectorName = s => SECTORS[s].name.toLowerCase();

// Each event: { id, title, text, options: [{label, pc, budget, resolve(state, ctx, rng) -> {text, ppt}}], autoChoice, pause? }
export const EVENTS = [
  {
    id: 'call',
    odds: s => (s.career.seat === 'funder' ? A.funder_call_p.value : 0),
    build: (s) => {
      const seat = s.rng.event.pick(['minister', 'adviser', 'ipa']);
      return {
        title: 'The call comes',
        text: `The President's office calls. They want you as ${SEATS[seat].long.toLowerCase()}, starting next month. Your foundation grants will carry on without you, mostly.`,
        options: [
          { label: 'Take it', pc: 0, budget: 0, resolve: (st) => { takeSeat(st, seat, 'called from the foundation'); return { text: `You take the job. Your first briefing is forty pages long and three years out of date.` }; } },
          { label: 'Stay at the foundation', pc: 0, budget: 0, resolve: (st) => { st.career.pc = Math.min(10, st.career.pc + 1); return { text: 'You stay. They appoint someone else, who calls you for advice twice and then stops.' }; } },
        ],
        autoChoice: 0,
      };
    },
  },
  {
    id: 'pioneer',
    odds: s => (s.career.seat === 'out' ? 0 : 0.06 + 0.25 * s.reforms.anchor.stock + (s.flags.scouting ? 0.25 : 0) + 0.1 * s.reforms.ipa.stock) * (s.booms.find(b => !b.faded && b.sector === s.bestSector) ? 0.3 : 1),
    build: (s) => {
      const sector = s.current && s.current.sector ? s.current.sector : s.bestSector;
      const firm = firmName(sector, s);
      return {
        title: 'A pioneer firm is scouting',
        text: `${firm}, a mid-sized ${sectorName(sector)} exporter, is comparing you with two other countries. They want to meet you this week, and they want to know who will fix their power connection.`,
        options: [
          { label: 'Roll out the red carpet', pc: 2, budget: 1, resolve: (st, ctx, rng) => land(st, ctx, rng, sector, firm, 0.5) },
          { label: 'Treat them like any investor', pc: 0, budget: 0, resolve: (st, ctx, rng) => land(st, ctx, rng, sector, firm, 0.25) },
          { label: 'Decline the meeting', pc: 0, budget: 0, resolve: (st) => { st.career.pc = Math.min(10, st.career.pc + 1); return { text: `${firm} goes elsewhere. You saved the week for the budget speech.` }; } },
        ],
        autoChoice: 1, pause: 'pioneer',
      };
    },
  },
  {
    id: 'tax_deal',
    odds: s => (s.career.seat === 'out' || s.career.seat === 'funder' ? 0 : s.booms.find(b => !b.faded) ? 0.18 : 0.04),
    build: (s) => {
      const b = s.booms.find(x => !x.faded);
      const sector = b ? b.sector : s.bestSector;
      const firm = b ? b.firm : firmName(sector, s);
      return {
        title: 'An investor wants a deal nobody else gets',
        text: `${firm} will double its ${sectorName(sector)} plant if it gets a ten-year tax holiday and its own customs officer. Nobody else has either. Their lawyer says a neighbouring country has already offered both.`,
        options: [
          { label: 'Give them the deal', pc: 1, budget: 1, resolve: (st) => { if (b) { b.value *= 1.4; b.followers++; } st.reforms.anchor.constituency = true; st.flags.taxDeals = (st.flags.taxDeals || 0) + 1; st.career.pc = Math.max(0, st.career.pc - 1); return { text: `${firm} expands. The newspapers call it a sweetheart deal. Three other firms ask for the same.`, ppt: 0.2 }; } },
          { label: 'Offer what everyone gets, faster', pc: 1, budget: 0, resolve: (st, ctx, rng) => { if (rng.chance(0.5)) { if (b) b.value *= 1.2; return { text: `${firm} grumbles, then expands anyway. The fast lane you promised becomes a thing other firms use.`, ppt: 0.1 }; } return { text: `${firm} shelves the expansion for now. It is still here.` }; } },
          { label: 'Refuse', pc: 0, budget: 0, resolve: (st, ctx, rng) => { if (b && rng.chance(0.35)) { b.faded = true; return { text: `${firm} moves its expansion to the neighbour. The plant here shrinks over the next two years.` }; } return { text: `${firm} stays. The expansion goes to the neighbour, the plant here stays as it is.` }; } },
        ],
        autoChoice: 1, pause: 'taxdeal',
      };
    },
  },
  {
    id: 'utility',
    odds: s => (s.reforms.power.stock > 0.3 && ['minister', 'adviser'].includes(s.career.seat) ? 0.14 : 0),
    build: () => ({
      title: 'The utility cannot pay its bills',
      text: 'The power utility owes the independent producers six months of payments. They will stop supplying by March. Tariffs have not moved since the last election.',
      options: [
        { label: 'Pay the arrears from the budget', pc: 0, budget: 3, resolve: (st) => { st.debt += 3; return { text: 'The lights stay on. The hole in the budget is now somebody else\'s problem.' }; } },
        { label: 'Raise tariffs', pc: 3, budget: 0, resolve: (st) => { st.reforms.power.stock = Math.min(1, st.reforms.power.stock + 0.15); st.reforms.power.constituency = true; return { text: 'Tariffs go up 30%. Two weeks of protests, then the utility starts paying its bills on time for the first time in a decade.', ppt: -0.2 }; } },
        { label: 'Let them sort it out', pc: 0, budget: 0, resolve: (st) => { st.reforms.power.stock = Math.max(0, st.reforms.power.stock - 0.3); return { text: 'Load-shedding returns. Firms buy generators. Your power reform quietly unwinds.', ppt: -0.3 }; } },
      ],
      autoChoice: 0,
    }),
  },
  {
    id: 'windfall',
    odds: s => (s.pendingYear && s.pendingYear.dTot > 0.08 && s.commodityShare > 0.4 && ['minister', 'adviser'].includes(s.career.seat) ? 0.6 : 0),
    build: () => ({
      title: 'A windfall',
      text: 'Commodity prices are up. Revenue is coming in far above forecast. The President wants to announce something before the recess. The central bank governor wants to save it.',
      options: [
        { label: 'Save it in a stabilisation fund', pc: 2, budget: 0, resolve: (st) => { st.debt = Math.max(5, st.debt - 8); st.flags.fund = true; return { text: 'The fund is set up. Nobody thanks you. Three years from now, somebody will.' }; } },
        { label: 'Spend it', pc: 0, budget: 0, resolve: (st) => { st.career.pc = Math.min(10, st.career.pc + 2); st.career.budget = Math.min(8, st.career.budget + 3); st.debt += 5; return { text: 'Public-sector wages rise and new roads are announced. You are briefly popular.', ppt: 0.5 }; } },
      ],
      autoChoice: 1,
    }),
  },
  {
    id: 'vanity',
    odds: s => (['minister', 'adviser'].includes(s.career.seat) ? 0.08 : 0),
    build: () => ({
      title: 'The President has a project',
      text: 'A new international airport, in the President\'s home region, where the existing one handles four flights a day. Your ministry is asked to find the money and to say it is for exports.',
      options: [
        { label: 'Back it', pc: 0, budget: 2, resolve: (st) => { st.career.pc = Math.min(10, st.career.pc + 2); st.debt += 4; return { text: 'Ground is broken. You are now a trusted member of the inner circle, which is where the budget went.' }; } },
        { label: 'Resist, politely', pc: 2, budget: 0, resolve: (st, ctx, rng) => { if (rng.chance(0.3)) { st.flags.presidentSour = true; return { text: 'The airport goes ahead with the Transport Ministry\'s money. The President remembers your memo.' }; } return { text: 'The project is "phased". You kept the budget and, for now, your seat.' }; } },
      ],
      autoChoice: 0,
    }),
  },
  {
    id: 'exit_threat',
    odds: s => (s.booms.find(b => !b.faded && SECTORS[b.sector].needs.power > 0.5) && s.reforms.power.stock < 0.5 && s.career.seat !== 'out' ? 0.2 : 0),
    build: (s) => {
      const b = s.booms.find(x => !x.faded && SECTORS[x.sector].needs.power > 0.5);
      return {
        title: `${b.firm} threatens to leave`,
        text: `${b.firm} lost eleven production days to outages last quarter. Head office is asking why the plant is here at all. Their country manager wants a dedicated feeder, or a date.`,
        options: [
          { label: 'Fund their feeder line', pc: 1, budget: 2, resolve: () => { b.value *= 1.1; return { text: 'The feeder is built in eight months. Three other firms move next door to share it.' }; } },
          { label: 'Promise a date', pc: 1, budget: 0, resolve: (st, ctx, rng) => rng.chance(0.5) ? { text: 'They believe you. The date slips, but the plant stays.' } : (b.faded = true, { text: 'The date slips twice. Head office moves the next line to the neighbouring country.' }) },
          { label: 'They are bluffing', pc: 0, budget: 0, resolve: (st, ctx, rng) => rng.chance(0.7) ? (b.faded = true, { text: 'They were not bluffing.' }) : { text: 'They were bluffing. This time.' } },
        ],
        autoChoice: 1,
      };
    },
  },
  {
    id: 'donor',
    odds: s => (['minister', 'adviser', 'ipa'].includes(s.career.seat) ? 0.1 : 0),
    build: () => ({
      title: 'A donor offers a program',
      text: 'A development partner offers a five-year skills program worth real money, with its own logo, its own steering committee and its own idea of which sector matters.',
      options: [
        { label: 'Take it', pc: 0, budget: 0, resolve: (st) => { st.reforms.skills.stock = Math.min(1, st.reforms.skills.stock + 0.2); st.career.budget = Math.min(8, st.career.budget + 1); return { text: 'The program launches. It trains people for a sector you did not pick. Some of them get jobs anyway.' }; } },
        { label: 'Take it, on your terms', pc: 2, budget: 0, resolve: (st, ctx, rng) => rng.chance(0.6) ? (st.reforms.skills.stock = Math.min(1, st.reforms.skills.stock + 0.25), { text: 'Eighteen months of negotiation, then a program that fits your plan.' }) : { text: 'The donor takes the program to the neighbouring country, where the paperwork is easier.' } },
        { label: 'Decline', pc: 0, budget: 0, resolve: () => ({ text: 'You decline. The steering committee meets without you, in the neighbouring country.' }) },
      ],
      autoChoice: 0,
    }),
  },
  {
    id: 'turf',
    odds: s => (s.career.seat === 'minister' && (s.reforms.sez.stock > 0.3 || s.reforms.customs.stock > 0.3) ? 0.1 : 0),
    build: (s) => {
      const lever = s.reforms.sez.stock > s.reforms.customs.stock ? 'sez' : 'customs';
      const thing = lever === 'sez' ? 'the zone authority' : 'the single-window project';
      return {
        title: 'A rival wants your project',
        text: `The Finance Minister proposes moving ${thing} under their ministry "for coherence". The President is minded to agree. You can fight it, at a cost, or let it go.`,
        options: [
          { label: 'Fight it', pc: 2, budget: 0, resolve: (st) => { st.reforms[lever].constituency = true; return { text: `You win, this round. ${thing[0].toUpperCase() + thing.slice(1)} stays with you, and now has a few more friends.` }; } },
          { label: 'Let it go', pc: 0, budget: 0, resolve: (st) => { st.reforms[lever].stock = Math.max(0, st.reforms[lever].stock - 0.2); st.career.pc = Math.min(10, st.career.pc + 1); return { text: `${thing[0].toUpperCase() + thing.slice(1)} moves. It loses a year to the handover, and the staff who knew how it worked.` }; } },
        ],
        autoChoice: 1,
      };
    },
  },
];

function land(st, ctx, rng, sector, firm, base) {
  const r = st.reforms;
  const S = SECTORS[sector];
  const ready = 1 - 0.5 * (S.needs.power * (1 - r.power.stock) + S.needs.customs * (1 - r.customs.stock)) / (S.needs.power + S.needs.customs + 1e-9);
  const p = base * (0.4 + st.prox[sector]) * Math.max(0.4, ready) * (1 + 0.5 * r.sez.stock);
  if (rng.chance(Math.min(0.85, p))) {
    st.booms.push({ sector, firm, value: st.exports * 0.012, age: 0, faded: false, landedYear: st.year + 1, byYou: true, followers: 0 });
    r.anchor.constituency = true;
    return { text: `${firm} signs. The first ${sectorName(sector)} plant breaks ground next year. Everyone who said no to the meeting now says they were for it all along.` };
  }
  return { text: `${firm} picks the other country. Their note mentions the port and the power. You keep the contact.` };
}

export function pickEvent(state, ctx) {
  const rng = state.rng.event;
  const u1 = rng.next(), u2 = rng.next();
  const live = EVENTS.map(e => ({ e, p: e.odds(state) })).filter(x => x.p > 0);
  const total = live.reduce((a, x) => a + x.p, 0);
  if (u1 > Math.min(0.5, total)) return null;
  let r = u2 * total;
  for (const x of live) { r -= x.p; if (r <= 0) { const ev = x.e.build(state); return { id: x.e.id, ...ev }; } }
  return null;
}

// The five career moments. `when` returns true once; the UI records that it fired.
export const PAUSES = [
  { id: 'first_seat', title: 'First week in a seat', q: 'You can fix one thing this year. What, and why that one?', when: s => s.t === 0 && s.career.seat !== 'out' },
  { id: 'first_reshuffle', title: 'Your first reshuffle', q: 'Your successor can undo one reform. Which loss would hurt most?', when: s => s.career.reshuffles >= 1 },
  { id: 'pioneer', title: 'A pioneer firm decides', q: 'It wants a tax deal nobody else gets. What\'s your line?', when: s => s.flags.ev_tax_deal >= 1 },
  { id: 'election', title: 'An election', q: 'Your best reform has no voters behind it yet. Do you defend it or park it?', when: s => s.elections >= 1 && s.t > 1 },
  { id: 'year25', title: 'Year 25', q: 'What would you tell yourself in year one?', when: s => s.ended },
];

export const GLOSSARY = {
  'political capital': 'The goodwill and favours you can spend before people stop returning your calls. Refills slowly; a bad year drains it.',
  'budget': 'Discretionary money your seat controls this year, in notional units. Refills with tax capacity; halves in a debt crisis.',
  'terms of trade': 'The price of what you export divided by the price of what you import. For commodity exporters it swings a lot and you do not control it.',
  'SEZ': 'Special economic zone: fenced land with its own power, customs and rules. Most never fill. The ones that work had an anchor firm first.',
  'anchor investor': 'The first serious foreign firm in a sector. If it stays and grows, others follow because now the country is "a place that does this".',
  'growth acceleration': 'A sustained jump in growth of 2+ points lasting 8 years or more (Hausmann, Pritchett & Rodrik). About one chance in four per decade. Most fade.',
  'Enterprise Surveys': 'World Bank firm surveys asking managers what blocks them most. Used here for the constraints list and the power and customs numbers.',
  'PPP': 'Purchasing power parity: income adjusted for local prices, so $1 buys roughly the same everywhere.',
  'product space': 'A map of which exports sit near which, from the Atlas of Economic Complexity. This game uses a simplified version built from the export basket.',
  'overvalued': 'The official exchange rate makes exports look expensive. A gap opens with the parallel market. Fixing it is right and unpopular.',
  'delivery unit': 'A small team in the President\'s office that nags ministries against targets. Works while the President cares.',
  'TVET': 'Technical and vocational education and training.',
  'WGI': 'Worldwide Governance Indicators: World Bank composite scores from -2.5 to +2.5 for stability, effectiveness, voice, rule of law and corruption.',
  'reform stock': 'How built a reform is, from 0 to 100%. Grows when you work on it, decays when nobody does, and can be reversed by a successor.',
  'constituency': 'Firms or voters who now depend on a reform. Successors reverse reforms with a constituency much less often.',
};
