// Renders the end-screen summary to a PNG (1200x630) for sharing or download.
export async function renderShareImage({ name, startYear, endYear, series, stats, verdict }) {
  const W = 1200, H = 630;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f7f6f2'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#0f766e'; ctx.fillRect(0, 0, W, 10);
  ctx.fillStyle = '#1b1b1f'; ctx.font = '600 22px -apple-system, Helvetica, Arial, sans-serif';
  ctx.fillText('TAKE-OFF', 48, 58);
  ctx.font = '700 44px -apple-system, Helvetica, Arial, sans-serif';
  ctx.fillText(`${name}, ${startYear}–${endYear}`, 48, 110);
  ctx.font = '400 22px -apple-system, Helvetica, Arial, sans-serif'; ctx.fillStyle = '#6b6f76';
  wrap(ctx, verdict, 48, 148, 640, 30);
  // chart
  const cx = 48, cy = 250, cw = 640, ch = 320;
  const all = series.flatMap(s => s.values.filter(v => v != null));
  const lo = Math.log(Math.min(60, ...all)), hi = Math.log(Math.max(140, ...all));
  const x = i => cx + (i / 25) * cw, y = v => cy + ch - ((Math.log(v) - lo) / (hi - lo)) * ch;
  ctx.strokeStyle = '#e4e2dc'; ctx.lineWidth = 1; ctx.fillStyle = '#9aa0a6'; ctx.font = '16px -apple-system, Helvetica, Arial, sans-serif';
  for (const t of [50, 100, 200, 400].filter(t => Math.log(t) >= lo && Math.log(t) <= hi)) { ctx.beginPath(); ctx.moveTo(cx, y(t)); ctx.lineTo(cx + cw, y(t)); ctx.stroke(); ctx.fillText(String(t), cx - 36, y(t) + 5); }
  for (const s of series) {
    ctx.beginPath(); ctx.strokeStyle = s.color; ctx.lineWidth = s.width || 2; ctx.setLineDash(s.dash || []);
    let st = false; s.values.forEach((v, i) => { if (v == null) return; if (!st) { ctx.moveTo(x(i), y(v)); st = true; } else ctx.lineTo(x(i), y(v)); });
    ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.fillStyle = '#9aa0a6'; ctx.fillText(String(startYear), cx, cy + ch + 24); ctx.fillText(String(endYear), cx + cw - 40, cy + ch + 24);
  ctx.fillText('Income per person, start year = 100', cx, cy - 12);
  // stats
  let sy = 250;
  for (const [k, v] of stats) {
    ctx.fillStyle = '#1b1b1f'; ctx.font = '700 40px -apple-system, Helvetica, Arial, sans-serif'; ctx.fillText(v, 760, sy);
    ctx.fillStyle = '#6b6f76'; ctx.font = '400 18px -apple-system, Helvetica, Arial, sans-serif'; ctx.fillText(k, 760, sy + 26);
    sy += 84;
  }
  ctx.fillStyle = '#9aa0a6'; ctx.font = '16px -apple-system, Helvetica, Arial, sans-serif';
  ctx.fillText('25 years in the seat, with real data. Siblings in grey. Play at jmazda.github.io/takeoff', 48, H - 24);
  return new Promise(res => c.toBlob(b => res(b), 'image/png'));
}
function wrap(ctx, text, x, y, maxW, lh) {
  const words = text.split(' '); let line = '';
  for (const w of words) { const t = line + w + ' '; if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, y); line = w + ' '; y += lh; } else line = t; }
  ctx.fillText(line, x, y);
}
export async function shareOrDownload(blob, filename) {
  const file = new File([blob], filename, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Take-Off' }); return 'shared'; } catch (e) { /* fall through */ } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  return 'downloaded';
}
