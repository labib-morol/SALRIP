import type { Provider } from "./types.ts";

export const PROVIDERS: Provider[] = ["bKash", "Nagad"];

/** Master seed — change to regenerate a fresh but still-reproducible world. */
export const MASTER_SEED = 20260711;

/** 14 days of history so per-agent, per-hour baselines are stable (grilling: Q2). */
export const SIM_DAYS = 14;
export const SIM_START = new Date("2026-06-01T00:00:00+06:00"); // Asia/Dhaka

/** Baseline agent count. Scenario datasets use a subset (see scenarios.ts). */
export const AGENT_COUNT = 20;

export const AREAS = ["Dhaka-Gulshan", "Dhaka-Mirpur", "Chattogram", "Sylhet", "Khulna"];

/**
 * Relative transaction intensity by hour-of-day (0..23). Mobile-money agents are
 * quiet overnight, ramp mid-morning, peak late afternoon / evening. Poisson
 * arrivals are drawn against baseVolume * (weight / sum(weights)) per hour, so a
 * velocity detector sees realistic bursty-but-legit counts and won't fire on noise.
 */
export const HOUR_WEIGHTS: number[] = [
  0.2, 0.1, 0.1, 0.1, 0.2, 0.5, // 00-05
  1.0, 1.8, 2.6, 3.2, 3.4, 3.2, // 06-11
  2.8, 2.6, 2.8, 3.2, 3.6, 3.8, // 12-17
  3.4, 2.8, 2.0, 1.2, 0.7, 0.3, // 18-23
];

/** Per-agent normal daily transaction volume is drawn from this band, per provider. */
export const DAILY_VOLUME_MIN = 24;
export const DAILY_VOLUME_MAX = 46;

/** Normal amount distribution (BDT): lognormal -> naturally HIGH coefficient of variation. */
export const AMOUNT_MEDIAN = 2500;
export const AMOUNT_SIGMA = 0.62; // CV ~= sqrt(exp(sigma^2)-1) ~= 0.67

/** Customer pool per agent — large pool -> high counterparty diversity in normal traffic. */
export const CUSTOMER_POOL = 260;

/** Opening e-float band per agent+provider (also the daily rebalance target). */
export const OPENING_FLOAT_MIN = 180_000;
export const OPENING_FLOAT_MAX = 420_000;

/**
 * Opening PHYSICAL cash band per agent (a SINGLE shared pool — every provider's
 * cash-out draws from it). Also the daily restock target. Comfortably above
 * normal short-window cash-out demand so healthy agents never look short.
 */
export const OPENING_CASH_MIN = 250_000;
export const OPENING_CASH_MAX = 500_000;

export const STATUS_FAIL_RATE = 0.03;
export const STATUS_PENDING_RATE = 0.015;

/**
 * DOCUMENTED DETECTION ASSUMPTIONS (grilling conclusions, section 9).
 * The generator does not run detection, but it guarantees injected anomalies sit
 * on the correct side of these boundaries, and legit datasets sit on the other.
 */
export const THRESHOLDS = {
  velocityWindowMin: 15, // rolling window for velocity
  amountCvLow: 0.15, // below this = "suspiciously near-identical amounts"
  concentrationMaxCustomers: 3, // <= this many unique customers ...
  concentrationMinTx: 8, // ... with >= this many tx in a window = concentrated
};

export const ANALYSTS = ["analyst.rahman", "analyst.akter", "analyst.hossain", "analyst.begum"];
