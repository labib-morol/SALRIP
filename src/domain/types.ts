export type ProviderId = string & { readonly __brand: "ProviderId" };
export type CorridorId = string & { readonly __brand: "CorridorId" };
export type AgentId = string & { readonly __brand: "AgentId" };

export type Corridor =
  | "NGN↔USD"
  | "INR↔USD"
  | "PHP↔USD"
  | "BDT↔USD"
  | "KES↔USD"
  | "GHS↔USD"
  | "ZAR↔USD"
  | "PKR↔USD";

export interface LiquiditySnapshot {
  providerId: ProviderId;
  corridor: Corridor;
  ts: string;
  floatUsd: number;
  pendingUsd: number;
  slaP95Ms: number;
  errorRate: number;
  healthy: boolean;
}

export type AnomalyKind =
  | "float_drain"
  | "latency_spike"
  | "error_storm"
  | "rate_outlier"
  | "webhook_anomaly"
  | "corridor_dry"
  | "auth_failures"
  | "unusual_pair";

export interface Anomaly {
  id: string;
  kind: AnomalyKind;
  providerId: ProviderId;
  corridor: Corridor;
  openedAt: string;
  closedAt?: string;
  severity: "info" | "warn" | "critical";
  score: number;
  signals: Record<string, number>;
  suggestedActions: readonly string[];
  acknowledgedBy?: AgentId;
  acknowledgedAt?: string;
}

export interface ActionItem {
  id: string;
  anomalyId?: string;
  title: string;
  rationale: string;
  assignee?: AgentId;
  status: "open" | "in_progress" | "blocked" | "done" | "skipped";
  dueAt: string;
  decisionLogId?: string;
}

export interface EvidenceEntry {
  index: number;
  ts: string;
  agent: AgentId;
  action: "acknowledge" | "reassign" | "export" | "note" | "escalate";
  refType: "anomaly" | "action" | "corridor";
  refId: string;
  note?: string;
  prevHash: string;
  hash: string;
}

export interface DashboardPayload {
  snapshots: LiquiditySnapshot[];
  anomalies: Anomaly[];
  actions: ActionItem[];
  generatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  nextCursor?: string;
}
