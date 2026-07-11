import { AlertTriangle, RefreshCw } from "lucide-react";

export function LoadingState({ label = "Loading operational context" }: { label?: string }) {
  return <section className="state-card" aria-busy="true"><span className="loader" /><div><strong>{label}</strong><p>Retrieving the latest backend dataset.</p></div></section>;
}

export function ApiUnavailable({ onRetry, message }: { onRetry: () => void; message?: string }) {
  return <section className="state-card state-error" role="alert"><AlertTriangle size={20} /><div><strong>We couldn&apos;t reach the corridor feed.</strong><p>{message ?? "Connect NEXT_PUBLIC_SALRIP_API_URL to the backend service, then refresh to retry."}</p><button className="button secondary" onClick={onRetry}><RefreshCw size={15} />Retry connection</button></div></section>;
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <section className="state-card state-empty"><div><strong>{title}</strong><p>{detail}</p></div></section>;
}
