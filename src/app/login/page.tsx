"use client";

import { useRouter } from "next/navigation";
import { PERSONAS, ROLES, PERSONA_COOKIE, type Persona } from "@/lib/auth/personas.ts";

export default function LoginPage() {
  const router = useRouter();

  function choose(p: Persona) {
    // eslint-disable-next-line react-hooks/immutability -- selecting a demo persona intentionally writes the scoped cookie.
    document.cookie = `${PERSONA_COOKIE}=${p.id}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
    router.push(ROLES[p.role].home);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6 py-16">
      <div className="w-full max-w-[520px]">
        <div className="mb-8 flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-md text-sm font-bold"
            style={{ background: "var(--brand-accent)", color: "var(--brand)" }}
          >
            V
          </div>
          <div className="leading-tight">
            <div className="text-base font-semibold tracking-tight text-ink">Vault</div>
            <div className="text-xs text-muted">Super Agent Liquidity &amp; Risk Intelligence</div>
          </div>
        </div>

        <h1 className="text-lg font-semibold text-ink">Continue as…</h1>
        <p className="mt-1 text-sm text-muted">
          Each role sees a different slice of the operation. No password — this is a demo console over
          synthetic data.
        </p>

        <ul className="mt-6 divide-y divide-border overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
          {PERSONAS.map((p) => {
            const role = ROLES[p.role];
            return (
              <li key={p.id}>
                <button
                  type="button"
                  aria-label={`Continue as ${p.name}, ${role.label}`}
                  onClick={() => choose(p)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-2"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-brand-ink">
                    {initials(p.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-ink">{p.name}</span>
                      <span className="rounded-full border border-border-strong px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                        {role.label}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-xs text-muted sm:truncate">
                      {p.title} · {role.blurb}
                    </span>
                    <span className="mt-1 block text-[11px] font-medium text-brand">
                      Opens {landingLabel(role.home)}
                    </span>
                  </span>
                  <span aria-hidden className="text-muted-2">
                    →
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <p className="mt-5 text-[11px] leading-relaxed text-muted-2">
          Roles are for demonstrating scoped views and coordination boundaries only. The prototype never moves,
          merges, or controls funds, and never makes a final risk determination.
        </p>
      </div>
    </div>
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

function landingLabel(home: string): string {
  return {
    "/my-operation": "My Operation",
    "/dashboard": "Portfolio Overview",
    "/alerts": "Review Queue",
    "/management": "Area Overview",
  }[home] ?? "the role workspace";
}
