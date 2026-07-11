"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: GridIcon },
  { href: "/alerts", label: "Alerts", icon: SignalIcon },
  { href: "/cases", label: "Case Board", icon: BoardIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex w-60 shrink-0 flex-col bg-brand text-brand-ink">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold"
          style={{ background: "var(--brand-accent)", color: "var(--brand)" }}
        >
          V
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">Vault</div>
          <div className="text-[11px] text-brand-ink/60">Super Agent Ops</div>
        </div>
      </div>

      <nav className="mt-2 flex flex-col gap-0.5 px-3">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-white/10 font-medium text-white"
                  : "text-brand-ink/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span
                className={`h-4 w-0.5 rounded-full transition-colors ${active ? "bg-[var(--brand-accent)]" : "bg-transparent"}`}
                aria-hidden
              />
              <Icon />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-5 py-4 text-[11px] leading-relaxed text-brand-ink/45">
        <div className="mb-2 h-px bg-white/10" />
        Monitoring bKash &amp; Nagad float, shared cash, and case coordination.
      </div>
    </aside>
  );
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1.5" y="1.5" width="5" height="5" rx="1" />
      <rect x="9.5" y="1.5" width="5" height="5" rx="1" />
      <rect x="1.5" y="9.5" width="5" height="5" rx="1" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
    </svg>
  );
}
function SignalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 1.5v13M3.5 5v9M12.5 5v9" strokeLinecap="round" />
    </svg>
  );
}
function BoardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1.5" y="1.5" width="13" height="13" rx="1.5" />
      <path d="M6 1.5v13M11 1.5v13" />
    </svg>
  );
}
