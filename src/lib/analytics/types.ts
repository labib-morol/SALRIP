// Domain + detector types for the analytics engine. Mirrors the generated
// dataset schema (scripts/datagen) so data/ files load directly.

export type Provider = "bKash" | "Nagad";
export type TxType = "CASH_IN" | "CASH_OUT";
export type TxStatus = "SUCCESS" | "FAILED" | "PENDING";

export interface Transaction {
  txId: string;
  agentId: string;
  provider: Provider;
  customerId: string;
  timestamp: string;
  type: TxType;
  amount: number;
  status: TxStatus;
}

export interface Balance {
  agentId: string;
  provider: Provider;
  timestamp: string;
  openingBalance: number;
  currentBalance: number;
}

export interface Label {
  scenario: string;
  shouldAlert: boolean;
  anomalyType: "none" | "liquidity_drain" | "fraud_burst" | "stale_feed";
  targetAgentId?: string;
  targetProvider?: Provider;
  windowStart?: string;
  windowEnd?: string;
  tripsSignals: string[];
  rationale: string;
}

export interface Dataset {
  scenario: string;
  transactions: Transaction[];
  balances: Balance[];
  label: Label;
}

export type AlertType = "FRAUD_BURST" | "LIQUIDITY_DRAIN" | "STALE_FEED";

export interface DetectionAlert {
  type: AlertType;
  agentId: string;
  provider: Provider;
  severity: "LOW" | "MEDIUM" | "HIGH";
  windowStart: string;
  windowEnd: string;
  evidence: Record<string, number | string | boolean>;
}
