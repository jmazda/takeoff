// Small canvas line chart: income index (start year = 100), you vs siblings vs an optional reference.
export function drawChart(canvas, { series, startYear, horizon = 25, log = true, labels = true }) {
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || 320, cssH = canvas.clientHeight || 180;
  canvas.width = cssW * dpr; canvas.height = cssH * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const css = getComputedStyle(document.documentElement);
  const col = n => css.getPropertyValue(n).trim();
  const padL = 34, padR = 12, padT = 10, padB = 22;
  const W = cssW - padL - padR, H = cssH - padT - padB;
  const all = series.flatMap(s => s.values.filter(v => v != null));
  let lo = Math.min(60, ...all), hi = Math.max(140, ...all);
  if (log) { lo = Math.log(lo); hi = Math.log(hi); }
  const x = i => padL + (i / horizon) * W;
  const y = v => padT + H - (((log ? Math.log(v) : v) - lo) / (hi - lo)) * H;
  ctx.clearRect(0, 0, cssW, cssH);
  // grid
  ctx.strokeStyle = col('--line'); ctx.lineWidth = 1; ctx.fillStyle = col('--muted'); ctx.font = '11px ' + col('--font');
  const ticks = log ? [50, 75, 100, 150, 200, 300, 400, 600].filter(t => Math.log(t) >= lo && Math.log(t) <= hi) : [50, 100, 150, 200, 300, 400].filter(t => t >= lo && t <= hi);
  for (const t of ticks) { ctx.beginPath(); ctx.moveTo(padL, y(t)); ctx.lineTo(padL + W, y(t)); ctx.stroke(); ctx.textAlign = 'right'; ctx.fillText(String(t), padL - 5, y(t) + 4); }
  ctx.textAlign = 'center';
  for (const yr of [0, 5, 10, 15, 20, 25]) if (yr <= horizon) ctx.fillText(String(startYear + yr), x(yr), cssH - 6);
  // lines
  for (const s of series) {
    ctx.beginPath(); ctx.strokeStyle = s.color; ctx.lineWidth = s.width || 1.5; ctx.setLineDash(s.dash || []);
    let started = false;
    s.values.forEach((v, i) => { if (v == null) return; if (!started) { ctx.moveTo(x(i), y(v)); started = true; } else ctx.lineTo(x(i), y(v)); });
    ctx.stroke(); ctx.setLineDash([]);
    if (labels && s.label) {
      const li = s.values.map((v, i) => v != null ? i : -1).filter(i => i >= 0).pop();
      if (li != null) { ctx.fillStyle = s.color; ctx.font = (s.bold ? '600 ' : '') + '11px ' + col('--font'); ctx.textAlign = li > horizon * 0.8 ? 'right' : 'left'; ctx.fillText(s.label, x(li) + (li > horizon * 0.8 ? -4 : 4), y(s.values[li]) - 4); }
    }
  }
}
export function indexPath(path, base) { return path.map(v => v == null ? null : 100 * v / base); }
