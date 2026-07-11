"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ROLES, PERSONA_COOKIE, type IconKey, type Persona } from "@/lib/auth/personas.ts";

export function Sidebar({
  persona,
  open = false,
  onClose,
}: {
  persona: Persona;
  open?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const role = ROLES[persona.role];

  function switchUser() {
    document.cookie = `${PERSONA_COOKIE}=; path=/; max-age=0; samesite=lax`;
    router.push("/login");
  }

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-40 bg-ink/40 md:hidden" aria-hidden onClick={onClose} />
      ) : null}
      <aside
        id="app-navigation"
        aria-label="Primary navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col bg-brand text-brand-ink transition-transform duration-200 ease-out md:static md:z-auto md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
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
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="ml-auto flex h-11 w-11 items-center justify-center rounded-md text-xl text-brand-ink/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-brand-accent md:hidden"
        >
          <span aria-hidden>×</span>
        </button>
      </div>

      <nav className="mt-2 flex flex-col gap-0.5 px-3">
        {role.nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={onClose}
              className={`group flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors md:min-h-0 ${
                active ? "bg-white/10 font-medium text-white" : "text-brand-ink/70 hover:bg-white/5 hover:text-white"
              } focus-visible:outline-brand-accent`}
            >
              <span
                className={`h-4 w-0.5 rounded-full transition-colors ${active ? "bg-[var(--brand-accent)]" : "bg-transparent"}`}
                aria-hidden
              />
              <Icon name={item.icon} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Persona footer + switch */}
      <div className="mt-auto px-3 py-4">
        <div className="rounded-md bg-white/5 px-3 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-[11px] font-semibold text-white">
              {initials(persona.name)}
            </span>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-xs font-medium text-white">{persona.name}</div>
              <div className="truncate text-[11px] text-brand-ink/60">{role.label}</div>
            </div>
          </div>
          <button
            onClick={switchUser}
            className="mt-2.5 min-h-10 w-full rounded border border-white/15 px-2 py-1.5 text-[11px] font-medium text-brand-ink/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-brand-accent"
          >
            Switch user
          </button>
        </div>
      </div>
      </aside>
    </>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Icon({ name }: { name: IconKey }) {
  const common = { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.5 } as const;
  switch (name) {
    case "grid":
      return (
        <svg {...common}>
          <rect x="1.5" y="1.5" width="5" height="5" rx="1" />
          <rect x="9.5" y="1.5" width="5" height="5" rx="1" />
          <rect x="1.5" y="9.5" width="5" height="5" rx="1" />
          <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
        </svg>
      );
    case "signal":
      return (
        <svg {...common}>
          <path d="M8 1.5v13M3.5 5v9M12.5 5v9" strokeLinecap="round" />
        </svg>
      );
    case "board":
      return (
        <svg {...common}>
          <rect x="1.5" y="1.5" width="13" height="13" rx="1.5" />
          <path d="M6 1.5v13M11 1.5v13" />
        </svg>
      );
    case "agent":
      return (
        <svg {...common}>
          <circle cx="8" cy="5" r="3" />
          <path d="M2.5 14c0-3 2.5-4.5 5.5-4.5s5.5 1.5 5.5 4.5" strokeLinecap="round" />
        </svg>
      );
    case "chart":
      return (
        <svg {...common}>
          <path d="M2 14V2M2 14h12" strokeLinecap="round" />
          <path d="M5 11l3-3 2 2 3-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}
