# Take-Off

A free browser game: live one economic reformer's 25-year career in a real low- or middle-income country, with real data. Modelled on [1 in 8 Billion](https://1in8b.life/en/). Your choices matter, but less than you think.

## Run it

It is a static site. Serve the folder over HTTP (fetch is blocked on `file://`):

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765. The published version is at https://jmazda.github.io/takeoff/. There is no build step, no login and no server; saved careers live in `localStorage`.

Debug shortcuts: `?country=KEN&year=2000&seed=anything` starts a specific country, start year and seed. The app object is on `window.__takeoff`.

## Rebuild the data

```bash
node tools/build-data.mjs
```

Fetches the World Bank API (WDI, Enterprise Surveys, Worldwide Governance Indicators, Doing Business archive) for every current low- and middle-income country and writes `data/countries.json`. Responses are cached in `tools/.cache`; delete it to refetch.

## Check the base rates

```bash
node tools/calibrate.mjs 400
```

Runs 400 careers headlessly with three choosers (a persistent "thoughtful" strategy, the in-game autopilot, and random) and prints: mean growth, how often accelerations, coups, debt crises and take-offs happen, median tenure, and how often each chooser beats the sibling countries. The brief's target is that thoughtful beats siblings slightly more often than random, not by a lot.

## Where things are

| Path | What |
| --- | --- |
| `index.html`, `styles.css` | The app shell and the calm, mobile-first styling |
| `src/app.js` | Screens, the year loop, fast-forward and auto, modals, saving, end screen, luck-vs-skill reruns |
| `src/model.js` | The simulation: growth equation, shocks, regimes, reforms, booms, seats, successors, autopilot |
| `src/assumptions.js` | Every judgement call, with value, note and source. The methods page renders it |
| `src/content.js` | Events (forced decisions), fictional firm names, the five pauses, glossary |
| `src/data.js` | Country draw, starting hand, sibling selection, income units |
| `src/sectors.js` | Simplified sector space standing in for the Atlas product space |
| `src/chart.js`, `src/share.js` | Canvas line chart and the shareable PNG |
| `methods.html` | Public methods page, rendered live from the assumptions table |
| `tools/build-data.mjs` | Data pipeline |
| `tools/calibrate.mjs` | Headless calibration harness |

## How the model works, briefly

Each year, growth per person = country prior + mild convergence + regime (growth spurt or collapse) + capped reform effects + explicit shocks + noise. The prior is the country's own growth history shrunk toward the LMIC mean. Reforms are stocks that grow when worked on, decay when not, and can be reversed by successors; their effects are convex and capped, so persistence helps and scattering does not. Policy mostly shifts odds: of a spurt starting, of it lasting, of an anchor firm landing. Siblings are four real countries with a similar income at the start year; in historical starts they follow their real paths, in recent starts they are simulated with a default government, which is also what runs your country whenever you are not the minister.

## Decisions taken on the brief's open questions

- **Global shocks in historical years**: both. A setting on the home screen, default "real history" (1982, 1998, 2009, 2015, 2020 on their real dates); country-level shocks always roll at base rates. Beyond the data horizon, global shocks roll at random.
- **How much skill matters**: tuned so a thoughtful player wins clearly but not always. Current calibration (500 runs): a thoughtful player beats the median sibling about 56% of the time versus 50% for random choices, and beats all four about 31% versus 26%; 20% of careers produce a take-off (over 3.5% a year for 25 years). Random cannot fall much below 50% because the country runs itself with a default government whenever the player is not the minister. The dials are `player_build_rate`, `default_build_rate`, `policy_cap_ppt` and `effect_convexity` in `src/assumptions.js`.
- **Historical start years in v1**: 1985 and 2000, where the country has data, plus the latest year (2024 or 2025).
- **Model review**: the methods page lists every assumption with its source so a reviewer can go line by line. The calibration harness prints what the assumptions imply.
- **Name**: the build uses Take-Off throughout; it is a one-line change.

## Known gaps, flagged in-game

- No Atlas product space (rule-based sector map from the export basket instead).
- No cabinet tenure dataset (stated hazard rates, to calibrate against WhoGov).
- No coup dataset download (the Powell & Thyne URL refused the build machine); a stated base rate scaled by WGI stability.
- No Export Boom Atlas wiring yet; event stories are modelled on public cases with fictional firms.
- Enterprise Survey and governance numbers are the latest available even in historical starts, and the game says so.
