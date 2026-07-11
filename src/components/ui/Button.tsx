import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand text-brand-ink border border-brand hover:bg-brand-hover disabled:opacity-50",
  secondary:
    "bg-surface text-ink border border-border-strong hover:bg-surface-2 disabled:opacity-50",
  ghost: "bg-transparent text-muted border border-transparent hover:bg-surface-2 disabled:opacity-40",
  danger:
    "bg-surface text-[var(--sev-high)] border border-[var(--sev-high)] hover:bg-[var(--sev-high-soft)] disabled:opacity-50",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
};

export function Button({
  children,
  variant = "secondary",
  size = "md",
  loading = false,
  className = "",
  ...rest
}: {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {loading ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
      {children}
    </button>
  );
}
