// Seeded random number generator (mulberry32). Separate streams let us replay
// "same shocks, different choices" and "same choices, different shocks".
export class RNG {
  constructor(seed) { this.s = seed >>> 0; }
  next() {
    let t = (this.s += 0x6D2B79F5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  chance(p) { return this.next() < p; }
  normal(mean = 0, sd = 1) {
    const u = 1 - this.next(), v = this.next();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  weighted(items, weightFn) {
    const w = items.map(weightFn); const total = w.reduce((a, b) => a + b, 0);
    let r = this.next() * total;
    for (let i = 0; i < items.length; i++) { r -= w[i]; if (r <= 0) return items[i]; }
    return items[items.length - 1];
  }
  int(n) { return Math.floor(this.next() * n); }
  fork() { return new RNG(Math.floor(this.next() * 4294967295)); }
}
export function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
