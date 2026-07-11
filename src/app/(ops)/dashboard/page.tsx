"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, CircleAlert, Clock3, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api/client";
import type { LiquiditySnapshot } from "@/domain/types";
import { ApiUnavailable, EmptyState, LoadingState } from "@/components/ui/States";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function DashboardPage() {
  const query = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard });
  return <PageFrame eyebrow="Operations overview" title="The corridor picture, before it deteriorates" detail="Provider telemetry is read independently. SALRIP presents coordinated context without moving, merging, or controlling funds.">{query.isLoading ? <LoadingState /> : query.isError ? <ApiUnavailable onRetry={() => query.refetch()} /> : query.data ? <Dashboard data={query.data} /> : null}</PageFrame>;
}

function Dashboard({ data }: { data: Awaited<ReturnType<typeof api.dashboard>> }) {
  const corridors = [...new Set(data.snapshots.map((snapshot) => snapshot.corridor))].slice(0, 8);
  const providers = [...new Set(data.snapshots.map((snapshot) => snapshot.providerId))];
  const openActions = data.actions.filter((item) => !["done", "skipped"].includes(item.status)).slice(0, 5);
  return <div className="page-stack"><section className="health-strip">{corridors.length ? corridors.map((corridor) => { const rows = data.snapshots.filter((snapshot) => snapshot.corridor === corridor); const healthy = rows.every((row) => row.healthy); const total = rows.reduce((sum, row) => sum + row.floatUsd, 0); return <Link className={`health-tile ${healthy ? "healthy" : "at-risk"}`} href={`/liquidity?corridor=${encodeURIComponent(corridor)}`} key={corridor}><span>{corridor}</span><strong>{money.format(total)}</strong><small>{healthy ? "Within corridor band" : "Review provider pressure"}</small><ArrowUpRight size={15}/></Link>; }) : <EmptyState title="No corridor snapshots yet." detail="Connect the dashboard endpoint to populate the health strip." />}</section>
    <section className="dashboard-grid-v2"><article className="data-panel matrix-panel"><PanelHeading label="Float & pending" title="Liquidity matrix" link="/liquidity" /><p className="panel-copy">Available float / pending in flight. Each cell represents a provider-specific corridor position.</p><LiquidityMatrix providers={providers} corridors={corridors} snapshots={data.snapshots} /></article><article className="data-panel action-rail"><PanelHeading label="Today’s queue" title="Open actions" link="/actions" />{openActions.length ? <div className="action-list">{openActions.map((action) => <Link href="/actions" key={action.id} className="action-preview"><span className={`status-dot ${action.status}`} /><div><strong>{action.title}</strong><p>{action.rationale}</p></div><ArrowUpRight size={14}/></Link>)}</div> : <EmptyState title="The action queue is empty." detail="New items appear here when an anomaly exceeds the configured threshold." />}</article></section>
    <section className="data-panel heatmap-panel"><PanelHeading label="Anomaly telemetry" title="24-hour provider heatmap" link="/anomalies" /><p className="panel-copy">Colour intensity reflects the count and severity of backend-provided signals. Open an anomaly for the full evidence trail.</p><div className="heatmap" role="img" aria-label="Provider anomaly intensity heatmap">{providers.map((provider) => { const items = data.anomalies.filter((anomaly) => anomaly.providerId === provider); return <div className="heatmap-row" key={provider}><strong>{provider}</strong>{Array.from({ length: 12 }, (_, index) => { const value = items[(index + items.length) % Math.max(items.length, 1)]?.score ?? 0; return <span key={index} className={value >= 75 ? "critical" : value >= 45 ? "warn" : value ? "info" : "clear"} title={value ? `Signal score ${value}` : "No reported signal"} />; })}</div>; })}</div><div className="heatmap-key"><span><i className="clear"/>clear</span><span><i className="info"/>info</span><span><i className="warn"/>review</span><span><i className="critical"/>critical</span></div></section>
  </div>;
}

function LiquidityMatrix({ providers, corridors, snapshots }: { providers: readonly string[]; corridors: readonly string[]; snapshots: LiquiditySnapshot[] }) {
  if (!providers.length || !corridors.length) return <EmptyState title="No liquidity snapshots received." detail="The matrix will render when the backend returns provider and corridor telemetry." />;
  return <div className="matrix-scroll"><table className="liquidity-matrix"><thead><tr><th>Provider</th>{corridors.map((corridor) => <th key={corridor}>{corridor}</th>)}</tr></thead><tbody>{providers.map((provider) => <tr key={provider}><th>{provider}</th>{corridors.map((corridor) => { const entry = snapshots.find((snapshot) => snapshot.providerId === provider && snapshot.corridor === corridor); return <td className={entry?.healthy ? "" : "needs-review"} key={corridor}>{entry ? <Link href={`/liquidity?provider=${encodeURIComponent(provider)}&corridor=${encodeURIComponent(corridor)}`}><strong>{money.format(entry.floatUsd)}</strong><span>{money.format(entry.pendingUsd)} pending</span></Link> : <span className="empty-cell">—</span>}</td>; })}</tr>)}</tbody></table></div>;
}

export function PageFrame({ eyebrow, title, detail, children }: { eyebrow: string; title: string; detail: string; children: React.ReactNode }) { return <main className="page-frame"><header className="page-intro"><p>{eyebrow}</p><h1>{title}</h1><span>{detail}</span></header>{children}</main>; }
function PanelHeading({ label, title, link }: { label: string; title: string; link: string }) { return <header className="panel-heading-v2"><div><p>{label}</p><h2>{title}</h2></div><Link href={link} aria-label={`View ${title}`}><ArrowUpRight size={17}/></Link></header>; }
