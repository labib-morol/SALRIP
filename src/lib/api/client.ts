import type { ActionItem, Anomaly, DashboardPayload, EvidenceEntry, LiquiditySnapshot, Paginated } from "@/domain/types";

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

const baseUrl = process.env.NEXT_PUBLIC_SALRIP_API_URL ?? "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { Accept: "application/json", "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) throw new ApiError(`The backend returned ${response.status}.`, response.status);
  return response.json() as Promise<T>;
}

export const api = {
  dashboard: () => request<DashboardPayload>("/dashboard"),
  liquidity: (query = "") => request<LiquiditySnapshot[]>(`/liquidity${query}`),
  anomalies: (cursor?: string) => request<Paginated<Anomaly>>(`/anomalies${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`),
  actions: () => request<ActionItem[]>("/actions"),
  evidence: () => request<EvidenceEntry[]>("/evidence"),
  acknowledge: (id: string) => request<Anomaly>(`/anomalies/${encodeURIComponent(id)}/acknowledge`, { method: "POST" }),
  updateAction: (id: string, status: ActionItem["status"]) => request<ActionItem>(`/actions/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status }) }),
};
