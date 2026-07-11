"use client";

import { useMemo, useState } from "react";

type Provider = "bKash" | "Nagad" | "Rocket" | "Cash";
type Severity = "Critical" | "High" | "Medium";
type Status = "Open" | "Assigned" | "Acknowledged" | "Escalated" | "Resolved";

type Alert = {
  id: string;
  provider: Provider;
  type: string;
  severity: Severity;
  confidence: number;
  area: string;
  time: string;
  title: string;
  english: string;
  bangla: string;
  qualityIssue?: string;
  owner?: string;
  status: Status;
  evidence: { label: string; value: string; note: string }[];
};

const alerts: Alert[] = [
  {
    id: "ALT-2407",
    provider: "Nagad",
    type: "Liquidity pressure",
    severity: "Critical",
    confidence: 82,
    area: "Zindabazar",
    time: "12 min ago",
    title: "Nagad balance may be insufficient in ~4 hours",
    english: "Cash-out demand is rising faster than the available Nagad e-money balance. Review the outlet and coordinate an approved refill path before service is disrupted.",
    bangla: "ক্যাশ-আউটের চাহিদা নাগদ ই-মানি ব্যালেন্সের চেয়ে দ্রুত বাড়ছে। সেবা ব্যাহত হওয়ার আগে আউটলেটটি পর্যালোচনা করুন এবং অনুমোদিত রিফিল প্রক্রিয়া সমন্বয় করুন।",
    owner: "S. Rahman",
    status: "Assigned",
    evidence: [
      { label: "30-min cash-out volume", value: "৳ 68,400", note: "47% above the 7-day pattern" },
      { label: "Current Nagad balance", value: "৳ 42,180", note: "Provider-specific balance — not transferable" },
      { label: "Forecast", value: "~4 hours", note: "Based on the last 90 minutes of demand" },
    ],
  },
  {
    id: "ALT-2406",
    provider: "bKash",
    type: "Unusual activity",
    severity: "High",
    confidence: 72,
    area: "Ambarkhana",
    time: "56 min ago",
    title: "Repeated cash-out amounts need human review",
    english: "Six cash-out transactions with nearly identical amounts were observed in twelve minutes. This may reflect normal demand; review the evidence before taking any action.",
    bangla: "বারো মিনিটে প্রায় একই অঙ্কের ছয়টি ক্যাশ-আউট লেনদেন দেখা গেছে। এটি স্বাভাবিক চাহিদাও হতে পারে; কোনো পদক্ষেপ নেওয়ার আগে প্রমাণ পর্যালোচনা করুন।",
    owner: "M. Islam",
    status: "Acknowledged",
    evidence: [
      { label: "Similar transactions", value: "6 in 12 min", note: "Amounts between ৳ 4,950 and ৳ 5,000" },
      { label: "Accounts involved", value: "4 simulated IDs", note: "No customer identity is displayed" },
      { label: "Baseline comparison", value: "+3.1σ", note: "Compared with the same weekday hour" },
    ],
  },
  {
    id: "ALT-2405",
    provider: "Rocket",
    type: "Data inconsistency",
    severity: "Medium",
    confidence: 46,
    area: "Zindabazar",
    time: "2 hr ago",
    title: "Reported Rocket balance differs from calculated value",
    english: "The latest reported balance is ৳1,240 BDT away from the calculated transaction balance. The provider feed is delayed, so this alert has reduced confidence.",
    bangla: "সর্বশেষ রিপোর্টকৃত ব্যালেন্স হিসাবকৃত লেনদেন ব্যালেন্স থেকে ৳১,২৪০ ভিন্ন। প্রোভাইডার ফিড বিলম্বিত হওয়ায় এই সতর্কতার আস্থা কম।",
    qualityIssue: "Provider feed is 27 minutes stale; calculated and reported balances conflict.",
    owner: "T. Hasan",
    status: "Escalated",
    evidence: [
      { label: "Reported balance", value: "৳ 96,540", note: "Last provider update: 27 min ago" },
      { label: "Calculated balance", value: "৳ 95,300", note: "Derived from received simulated transactions" },
      { label: "Difference", value: "৳ 1,240", note: "Data-quality check triggered" },
    ],
  },
  {
    id: "ALT-2404",
    provider: "Cash",
    type: "Liquidity pressure",
    severity: "High",
    confidence: 84,
    area: "Zindabazar",
    time: "2 hr ago",
    title: "Physical cash reserve may run low by 5:20 PM",
    english: "Current cash-out trends indicate shared physical cash may become constrained. Provider balances remain separate and this alert does not suggest any conversion between them.",
    bangla: "বর্তমান ক্যাশ-আউট প্রবণতা অনুযায়ী শেয়ার করা ভৌত নগদ অর্থ সীমিত হতে পারে। প্রোভাইডারের ব্যালেন্স আলাদা রয়েছে এবং এই সতর্কতা তাদের মধ্যে কোনো রূপান্তরের পরামর্শ দেয় না।",
    owner: "S. Rahman",
    status: "Open",
    evidence: [
      { label: "Physical cash", value: "৳ 78,400", note: "Shared cash drawer only" },
      { label: "Projected outflow", value: "৳ 15,600 / hr", note: "Demand estimate, medium volatility" },
      { label: "Threshold", value: "৳ 18,000", note: "Operational reserve threshold" },
    ],
  },
  {
    id: "ALT-2403",
    provider: "Nagad",
    type: "Unusual activity",
    severity: "Medium",
    confidence: 58,
    area: "Amberkhana",
    time: "3 hr ago",
    title: "One account made 6 cash-ins within 30 minutes",
    english: "A repeated cash-in pattern was observed from one simulated account. It has been surfaced for review only; no conclusion is made about the activity.",
    bangla: "একটি সিমুলেটেড অ্যাকাউন্ট থেকে বারবার ক্যাশ-ইন প্যাটার্ন দেখা গেছে। এটি কেবল পর্যালোচনার জন্য দেখানো হয়েছে; কার্যক্রম সম্পর্কে কোনো সিদ্ধান্ত দেওয়া হয়নি।",
    status: "Resolved",
    owner: "M. Islam",
    evidence: [
      { label: "Cash-ins", value: "6", note: "Within 30 minutes" },
      { label: "Total value", value: "৳ 24,000", note: "Synthetic test data" },
      { label: "Review result", value: "Routine activity", note: "Resolved after human review" },
    ],
  },
];

const stages: Status[] = ["Open", "Assigned", "Acknowledged", "Escalated", "Resolved"];

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    dashboard: "M3 13h7V3H3v10Zm0 8h7v-5H3v5Zm11 0h7V11h-7v10Zm0-18v5h7V3h-7Z",
    alert: "M12 3 2.8 19h18.4L12 3Zm1 12h-2V9h2v6Zm0 3h-2v-2h2v2Z",
    board: "M4 5h4v14H4V5Zm6 0h4v14h-4V5Zm6 0h4v14h-4V5Z",
    shield: "M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm5 10.5c-1.2 1.6-3 2.8-5 3.4-2-.6-3.8-1.8-5-3.4v-1c0-2 3.3-3.1 5-3.1s5 1.1 5 3.1v1Z",
    chevron: "m9 18 6-6-6-6",
    arrow: "M5 12h12m-5-5 5 5-5 5",
    clock: "M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    database: "M4 6c0 1.1 3.6 2 8 2s8-.9 8-2-3.6-2-8-2-8 .9-8 2Zm0 0v6c0 1.1 3.6 2 8 2s8-.9 8-2V6m-16 6v6c0 1.1 3.6 2 8 2s8-.9 8-2v-6",
    close: "M6 6l12 12M18 6 6 18",
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>;
}

function ProviderPill({ provider }: { provider: Provider }) {
  return <span className={`provider-pill ${provider.toLowerCase()}`}>{provider === "Cash" ? "Physical cash" : provider}</span>;
}

function SeverityPill({ severity }: { severity: Severity }) {
  return <span className={`severity ${severity.toLowerCase()}`}>{severity}</span>;
}

export default function Home() {
  const [screen, setScreen] = useState<"dashboard" | "alerts" | "board">("dashboard");
  const [activeAlert, setActiveAlert] = useState<Alert | null>(null);
  const [providerFilter, setProviderFilter] = useState("All providers");
  const [areaFilter, setAreaFilter] = useState("All areas");
  const [timeFilter, setTimeFilter] = useState("Last 24 hours");
  const [caseAlerts, setCaseAlerts] = useState(alerts);

  const visibleAlerts = useMemo(() => alerts.filter((alert) =>
    (providerFilter === "All providers" || alert.provider === providerFilter) &&
    (areaFilter === "All areas" || alert.area === areaFilter)
  ), [providerFilter, areaFilter]);

  function advanceCase(id: string) {
    setCaseAlerts((current) => current.map((alert) => {
      if (alert.id !== id) return alert;
      const next = stages[Math.min(stages.indexOf(alert.status) + 1, stages.length - 1)];
      return { ...alert, status: next, owner: alert.owner ?? "Operations queue" };
    }));
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><Icon name="shield" size={17} /></span><span><strong>Super Agent</strong><small>Liquidity &amp; Risk</small></span></div>
        <nav aria-label="Main navigation">
          {([ ["dashboard", "Dashboard", "dashboard"], ["alerts", "Alerts", "alert"], ["board", "Case board", "board"] ] as const).map(([id, label, icon]) => (
            <button key={id} className={`nav-button ${screen === id ? "active" : ""}`} onClick={() => setScreen(id)}><Icon name={icon} size={16} />{label}</button>
          ))}
        </nav>
        <div className="side-footer"><label>Provider scope<select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)}><option>All providers</option><option>bKash</option><option>Nagad</option><option>Rocket</option><option>Cash</option></select></label><label>Alert language<select><option>English + বাংলা</option><option>English</option><option>বাংলা</option></select></label></div>
      </aside>

      <section className="workspace">
        <header className="topbar"><div><p className="eyebrow">Zindabazar outlet · simulated operational view</p><h1>{screen === "dashboard" ? "Liquidity overview" : screen === "alerts" ? "Alert centre" : "Case coordination"}</h1></div><div className="live-status"><span></span> Mock data · 12:08 PM</div></header>
        {screen === "dashboard" && <Dashboard onAlert={(alert) => setActiveAlert(alert)} onViewAlerts={() => setScreen("alerts")} />}
        {screen === "alerts" && <AlertsView alerts={visibleAlerts} timeFilter={timeFilter} setTimeFilter={setTimeFilter} areaFilter={areaFilter} setAreaFilter={setAreaFilter} onAlert={setActiveAlert} />}
        {screen === "board" && <Board alerts={caseAlerts} onAdvance={advanceCase} onAlert={setActiveAlert} />}
      </section>
      {activeAlert && <AlertDetail alert={activeAlert} onClose={() => setActiveAlert(null)} onBoard={() => { setActiveAlert(null); setScreen("board"); }} />}
    </main>
  );
}

function Dashboard({ onAlert, onViewAlerts }: { onAlert: (alert: Alert) => void; onViewAlerts: () => void }) {
  return <div className="content dashboard-content">
    <div className="boundary-note"><Icon name="shield" size={16} /><span><strong>Provider boundary protected.</strong> Physical cash is shared; each provider&apos;s e-money stays separate.</span></div>
    <section className="metrics-grid">
      <article className="metric-card cash-card"><span className="metric-label"><i />Physical cash</span><strong>৳ 78,400</strong><p>Shared cash drawer</p><div className="metric-foot"><span className="safe-dot" />Stable for ~5 hours</div></article>
      <article className="metric-card bkash-card"><span className="metric-label"><i />bKash e-money</span><strong>৳ 148,320</strong><p>Separate provider balance</p><div className="forecast"><span style={{ width: "38%" }} /></div><div className="metric-foot"><b>Low pressure</b><span>~8 hrs to shortage</span></div></article>
      <article className="metric-card nagad-card"><span className="metric-label"><i />Nagad e-money</span><strong>৳ 42,180</strong><p>Separate provider balance</p><div className="forecast critical"><span style={{ width: "79%" }} /></div><div className="metric-foot"><b>Critical</b><span>~4 hrs · 82% confidence</span></div></article>
      <article className="metric-card rocket-card"><span className="metric-label"><i />Rocket e-money</span><strong>৳ 96,540</strong><p>Data delayed by 27 min</p><div className="forecast rocket"><span style={{ width: "51%" }} /></div><div className="metric-foot reduced"><b>Reduced confidence</b><span>Data quality issue</span></div></article>
    </section>
    <section className="dashboard-grid">
      <article className="panel balance-panel"><div className="panel-heading"><div><p className="eyebrow">Last 24 hours</p><h2>Balance movement</h2></div><button className="icon-button" aria-label="Balance chart options">•••</button></div><p className="panel-subtitle">Separate provider balances are never merged into a single balance.</p><BalanceChart /><div className="chart-legend"><span><i className="legend-cash" />Physical cash</span><span><i className="legend-bkash" />bKash</span><span><i className="legend-nagad" />Nagad</span><span><i className="legend-rocket" />Rocket</span></div></article>
      <article className="panel priority-panel"><div className="panel-heading"><div><p className="eyebrow">Needs attention</p><h2>Priority alerts</h2></div><button className="text-button" onClick={onViewAlerts}>View all <Icon name="arrow" size={14} /></button></div><div className="priority-list">{alerts.slice(0, 4).map((alert) => <button className="priority-alert" key={alert.id} onClick={() => onAlert(alert)}><div><SeverityPill severity={alert.severity} /><ProviderPill provider={alert.provider} /></div><strong>{alert.title}</strong><footer><span>{alert.type}</span><span>{alert.confidence}% confidence</span></footer></button>)}</div></article>
    </section>
    <section className="panel action-panel"><div><p className="eyebrow">Recommended next step</p><h2>Confirm Nagad refill route with the assigned field officer</h2><p>No financial action is executed by this platform. This is a human decision-support recommendation.</p></div><button onClick={onViewAlerts}>Review evidence <Icon name="arrow" size={16} /></button></section>
  </div>;
}

function BalanceChart() {
  return <div className="chart-wrap"><div className="chart-axis"><span>200k</span><span>150k</span><span>100k</span><span>50k</span><span>0</span></div><svg className="balance-chart" viewBox="0 0 800 250" preserveAspectRatio="none" role="img" aria-label="24 hour balance trend chart"><defs><linearGradient id="gB" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#e22170" stopOpacity=".18"/><stop offset="1" stopColor="#e22170" stopOpacity="0"/></linearGradient><linearGradient id="gN" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#f47a20" stopOpacity=".16"/><stop offset="1" stopColor="#f47a20" stopOpacity="0"/></linearGradient></defs><g className="grid"><path d="M0 25H800M0 75H800M0 125H800M0 175H800M0 225H800" /></g><path fill="url(#gB)" d="M0 40 C130 51 210 71 340 69 S560 54 800 86 V225 H0Z"/><path fill="url(#gN)" d="M0 97 C130 108 230 123 340 148 S570 179 800 198 V225 H0Z"/><path className="line bkash-line" d="M0 40 C130 51 210 71 340 69 S560 54 800 86"/><path className="line nagad-line" d="M0 97 C130 108 230 123 340 148 S570 179 800 198"/><path className="line cash-line" d="M0 130 C125 115 250 147 356 132 S600 144 800 155"/><path className="line rocket-line" d="M0 121 C145 110 245 112 360 116 S610 126 800 121"/></svg><div className="chart-hours"><span>13:00</span><span>17:00</span><span>21:00</span><span>01:00</span><span>05:00</span><span>09:00</span><span>12:00</span></div></div>;
}

function AlertsView({ alerts, timeFilter, setTimeFilter, areaFilter, setAreaFilter, onAlert }: { alerts: Alert[]; timeFilter: string; setTimeFilter: (v: string) => void; areaFilter: string; setAreaFilter: (v: string) => void; onAlert: (a: Alert) => void }) {
  return <div className="content alerts-content"><div className="filter-bar"><label>Area<select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}><option>All areas</option><option>Zindabazar</option><option>Ambarkhana</option><option>Amberkhana</option></select></label><label>Time<select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}><option>Last 24 hours</option><option>Last 6 hours</option><option>Last 7 days</option></select></label><p><Icon name="database" size={15} /> {alerts.length} simulated alerts</p></div><div className="panel table-panel"><div className="table-head"><span>Alert</span><span>Provider</span><span>Severity &amp; confidence</span><span>Area</span><span>Created</span><span /></div>{alerts.map((alert) => <button className="alert-row" key={alert.id} onClick={() => onAlert(alert)}><div className="alert-description"><strong>{alert.title}</strong><span>{alert.type} · {alert.id}</span></div><ProviderPill provider={alert.provider} /><div className="alert-confidence"><SeverityPill severity={alert.severity} /><span>{alert.confidence}% {alert.qualityIssue ? "reduced" : "confidence"}</span></div><span>{alert.area}</span><span>{alert.time}</span><Icon name="chevron" size={17} /></button>)}</div></div>;
}

function Board({ alerts, onAdvance, onAlert }: { alerts: Alert[]; onAdvance: (id: string) => void; onAlert: (a: Alert) => void }) {
  return <div className="content board-content"><div className="board-intro"><div><p className="eyebrow">Human review workflow</p><h2>Route, own, acknowledge, escalate, resolve</h2></div><p>Progressing a card records operational ownership only. It does not initiate any financial action.</p></div><div className="kanban">{stages.map((stage) => <section className="kanban-column" key={stage}><header><span>{stage}</span><b>{alerts.filter((a) => a.status === stage).length}</b></header><div className="case-stack">{alerts.filter((a) => a.status === stage).map((alert) => <article className="case-card" key={alert.id}><div><ProviderPill provider={alert.provider} /><SeverityPill severity={alert.severity} /></div><button className="case-title" onClick={() => onAlert(alert)}>{alert.title}</button><p><span>Owner</span>{alert.owner ?? "Unassigned"}</p><p><span>Updated</span>{alert.time}</p>{stage !== "Resolved" && <button className="advance-button" onClick={() => onAdvance(alert.id)}>Move to {stages[stages.indexOf(stage) + 1]} <Icon name="arrow" size={14} /></button>}</article>)}</div></section>)}</div></div>;
}

function AlertDetail({ alert, onClose, onBoard }: { alert: Alert; onClose: () => void; onBoard: () => void }) {
  return <div className="modal-backdrop" role="presentation"><section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="alert-title"><header><div><div className="modal-tags"><ProviderPill provider={alert.provider} /><SeverityPill severity={alert.severity} /></div><h2 id="alert-title">{alert.title}</h2><p>{alert.id} · Raised {alert.time} · {alert.area}</p></div><button className="close-button" onClick={onClose} aria-label="Close alert detail"><Icon name="close" /></button></header>{alert.qualityIssue && <div className="quality-warning"><Icon name="alert" size={19} /><div><strong>Reduced confidence — data quality issue</strong><p>{alert.qualityIssue}</p></div></div>}<section className="confidence-strip"><div><span>Model confidence</span><strong>{alert.confidence}%</strong></div><div className="confidence-track"><span style={{ width: `${alert.confidence}%` }} /></div><p>{alert.qualityIssue ? "Interpret with care while the feed is delayed." : "Evidence available for human review."}</p></section><div className="detail-grid"><section><p className="eyebrow">Why this was surfaced</p><h3>English explanation</h3><p>{alert.english}</p><h3 className="bangla-heading">বাংলা ব্যাখ্যা</h3><p className="bangla">{alert.bangla}</p></section><section className="owner-box"><p className="eyebrow">Case ownership</p><h3>{alert.owner ?? "Unassigned"}</h3><p>{alert.status} · human review required</p><button onClick={onBoard}>Open case board <Icon name="arrow" size={15} /></button></section></div><section className="evidence-section"><div className="section-title"><div><p className="eyebrow">Traceable, simulated inputs</p><h3>Evidence behind this alert</h3></div><span className="advisory">Advisory only</span></div><div className="evidence-grid">{alert.evidence.map((item) => <article key={item.label}><span>{item.label}</span><strong>{item.value}</strong><p>{item.note}</p></article>)}</div></section><footer className="detail-footer"><p><Icon name="shield" size={15} /> No fraud conclusion or automated financial action is made.</p><button onClick={onClose}>Close detail</button></footer></section></div>;
}
