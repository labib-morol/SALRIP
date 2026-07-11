"use client";

import type { ReactNode } from "react";
import { usePersona } from "@/components/auth/PersonaProvider";
import { ROLES } from "@/lib/auth/personas.ts";

export function PageHeader({
  title,
  description,
  right,
  breadcrumb,
}: {
  title: ReactNode;
  description?: ReactNode;
  right?: ReactNode;
  breadcrumb?: ReactNode;
}) {
  const persona = usePersona();
  const role = ROLES[persona.role];

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
      <div className="mx-auto flex max-w-[1200px] flex-col items-start justify-between gap-3 sm:flex-row sm:items-end sm:gap-6">
        <div className="min-w-0">
          {breadcrumb ? <div className="mb-1.5 text-xs text-muted">{breadcrumb}</div> : null}
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-brand">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand-accent" />
              {role.label} view
            </span>
          </div>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
          <span className="font-medium text-ink-2">{persona.name}</span>
          {right}
        </div>
      </div>
    </header>
  );
}
