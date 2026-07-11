"use client";

import { Activity, BookOpenCheck, ChevronRight, CircleDollarSign, ClipboardCheck, LayoutDashboard, Menu, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

const links = [
  ["/dashboard", "Dashboard", LayoutDashboard],
  ["/liquidity", "Liquidity", CircleDollarSign],
  ["/anomalies", "Anomalies", Activity],
  ["/actions", "Actions", ClipboardCheck],
  ["/evidence", "Evidence", BookOpenCheck],
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return <div className="ops-shell">
    <header className="mobile-header"><Link href="/" className="wordmark">SALRIP</Link><button className="icon-control" aria-label={open ? "Close navigation" : "Open navigation"} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button></header>
    <aside className={`side-nav ${open ? "is-open" : ""}`} aria-label="Primary navigation"><div className="brand-block"><Link href="/" className="wordmark">SALRIP</Link><span>Liquidity &amp; risk intelligence</span></div><nav>{links.map(([href, label, Icon]) => <Link onClick={() => setOpen(false)} key={href} href={href} className={pathname === href ? "active" : ""}><Icon size={17} />{label}<ChevronRight size={14} className="nav-arrow" /></Link>)}</nav><div className="nav-notice"><ShieldCheck size={17}/><div><strong>Synthetic-safe design</strong><p>No funds move through SALRIP.</p></div></div></aside>
    {open && <button className="nav-overlay" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <section className="ops-main"><div className="session-bar"><span className="data-dot"/>Backend dataset required <span className="session-separator">·</span> Decision support only <Link href="/about">Prototype notice</Link></div>{children}</section>
  </div>;
}
