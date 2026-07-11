import type { ReactNode } from "react";

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
  return (
    <header className="border-b border-border bg-surface/70 px-8 py-5 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1200px] items-end justify-between gap-6">
        <div>
          {breadcrumb ? <div className="mb-1.5 text-xs text-muted">{breadcrumb}</div> : null}
          <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        </div>
        {right ? <div className="flex items-center gap-2">{right}</div> : null}
      </div>
    </header>
  );
}
