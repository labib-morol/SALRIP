// Shared schema for the Super Agent simulation datasets.

export type Provider = "bKash" | "Nagad";
export type TxType = "CASH_IN" | "CASH_OUT";
export type TxStatus = "SUCCESS" | "FAILED" | "PENDING";

export interface Transaction {
  txId: string;
  agentId: string;
  provider: Provider;
  customerId: string; // added per grilling: needed for counterparty-concentration
  timestamp: string; // ISO 8601
  type: TxType;
  amount: number; // BDT
  status: TxStatus;
}

/** Balance snapshot for an agent+provider at a point in time. */
export interface Balance {
  agentId: string;
  provider: Provider;
  timestamp: string; // ISO 8601
  openingBalance: number; // e-float at start of that day
  currentBalance: number; // e-float at snapshot time
}

export interface Alert {
  alertId: string;
  type: "LIQUIDITY_DRAIN" | "FRAUD_BURST" | "STALE_FEED";
  agentId: string;
  provider: Provider;
  severity: "LOW" | "MEDIUM" | "HIGH";
  detectedAt: string;
  windowStart: string;
  windowEnd: string;
  evidence: Record<string, unknown>;
}

export interface Case {
  caseId: string;
  alertId: string;
  assignedTo: string;
  status: "NEW" | "ASSIGNED" | "IN_PROGRESS" | "CLOSED";
  createdAt: string;
  slaDueAt: string;
}

/**
 * Ground truth for one dataset. This is what makes recall / false-positive-rate
 * measurable: every injected anomaly is labelled, and every dataset states
 * whether a correct detector SHOULD raise an alert on it.
 */
export interface Label {
  scenario: string;
  shouldAlert: boolean;
  anomalyType: "none" | "liquidity_drain" | "fraud_burst" | "stale_feed";
  targetAgentId?: string;
  targetProvider?: Provider;
  windowStart?: string;
  windowEnd?: string;
  /** Which detection signals this dataset is expected to trip (design assumption). */
  tripsSignals: string[];
  rationale: string;
}

export interface DatasetBundle {
  scenario: string;
  transactions: Transaction[];
  balances: Balance[];
  alerts?: Alert[];
  cases?: Case[];
  label: Label;
}
