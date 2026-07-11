"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "@/components/shell/Sidebar";
import { ROLES, type Persona } from "@/lib/auth/personas.ts";

export function AppShell({ persona, children }: { persona: Persona; children: ReactNode }) {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const role = ROLES[persona.role];

  return (
    <div className="flex h-dvh overflow-hidden bg-bg">
      <Sidebar persona={persona} open={navigationOpen} onClose={() => setNavigationOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 bg-brand px-3 text-brand-ink md:hidden">
          <button
            type="button"
            aria-label="Open navigation"
            aria-controls="app-navigation"
            aria-expanded={navigationOpen}
            onClick={() => setNavigationOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-md text-brand-ink transition-colors hover:bg-white/10 focus-visible:outline-brand-accent"
          >
            <span aria-hidden className="text-xl leading-none">☰</span>
          </button>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-sm font-semibold">Vault</div>
            <div className="truncate text-[11px] text-brand-ink/75">{role.label} view</div>
          </div>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-[11px] font-semibold text-white">
            {initials(persona.name)}
          </span>
        </header>
        <main id="app-content" className="min-w-0 flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
