// Deterministic, seedable RNG + the distributions the generator needs.
// Everything is reproducible: same seed -> byte-identical datasets.

export class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0;
  }
  /** uniform [0,1) — mulberry32 */
  next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** uniform real in [a,b) */
  uniform(a: number, b: number): number {
    return a + (b - a) * this.next();
  }
  /** uniform integer in [a,b] inclusive */
  int(a: number, b: number): number {
    return Math.floor(this.uniform(a, b + 1));
  }
  pick<T>(arr: readonly T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }
  /** standard normal via Box-Muller */
  normal(mean = 0, sd = 1): number {
    const u1 = Math.max(this.next(), 1e-12);
    const u2 = this.next();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + sd * z;
  }
  /** lognormal parameterised by median (=e^mu) and sigma (log-space sd) */
  lognormal(median: number, sigma: number): number {
    return Math.exp(Math.log(median) + this.normal(0, sigma));
  }
  /** Poisson(lambda) via Knuth — fine for the small lambdas we use */
  poisson(lambda: number): number {
    if (lambda <= 0) return 0;
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= this.next();
    } while (p > L);
    return k - 1;
  }
  /** pick index by weights (need not be normalised) */
  weightedIndex(weights: readonly number[]): number {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = this.next() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return weights.length - 1;
  }
}

/** Derive a stable child seed from a master seed + label (order-independent). */
export function deriveSeed(master: number, label: string): number {
  let h = master >>> 0;
  for (let i = 0; i < label.length; i++) {
    h = Math.imul(h ^ label.charCodeAt(i), 0x01000193) >>> 0;
  }
  return h >>> 0;
}
