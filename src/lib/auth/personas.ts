// Persona-based access for the prototype. There is deliberately NO password/
// credential collection (a hard guardrail: no PINs, OTPs, or secrets). A persona
// is a named demo user with a role; picking one on /login sets a cookie and the
// whole console re-scopes. This models §5's six stakeholders as four console
// roles (Customers aren't console users; the Financial Service Provider is a
// provider-scoped variant of the coordinator view).

export type Role = "agent" | "coordinator" | "analyst" | "management";

export type IconKey = "grid" | "signal" | "board" | "agent" | "chart";

export interface NavItem {
  href: string;
  label: string;
  icon: IconKey;
}

export interface RoleDef {
  role: Role;
  /** Short role label shown in chrome. */
  label: string;
  /** One-line description of what this role does. */
  blurb: string;
  /** Where this role lands after sign-in. */
  home: string;
  nav: NavItem[];
  /** May promote an alert into a case. */
  canPromote: boolean;
  /** How much of the case workflow this role may drive. */
  caseActions: "full" | "review" | "none";
}

export const ROLES: Record<Role, RoleDef> = {
  agent: {
    role: "agent",
    label: "Super Agent",
    blurb: "Sees only their own float, shared cash, and alerts.",
    home: "/my-operation",
    nav: [
      { href: "/my-operation", label: "My Operation", icon: "agent" },
      { href: "/alerts", label: "My Alerts", icon: "signal" },
    ],
    canPromote: false,
    caseActions: "none",
  },
  coordinator: {
    role: "coordinator",
    label: "Ops Coordinator",
    blurb: "Coordinates the response across the fleet.",
    home: "/dashboard",
    nav: [
      { href: "/dashboard", label: "Dashboard", icon: "grid" },
      { href: "/alerts", label: "Alerts", icon: "signal" },
      { href: "/cases", label: "Case Board", icon: "board" },
    ],
    canPromote: true,
    caseActions: "full",
  },
  analyst: {
    role: "analyst",
    label: "Risk & Compliance",
    blurb: "Reviews evidence and escalates — never the final call.",
    home: "/alerts",
    nav: [
      { href: "/alerts", label: "Review Queue", icon: "signal" },
      { href: "/cases", label: "Case Board", icon: "board" },
    ],
    canPromote: true,
    caseActions: "review",
  },
  management: {
    role: "management",
    label: "Management",
    blurb: "Area-level risk, recurring problems, and readiness.",
    home: "/management",
    nav: [
      { href: "/management", label: "Area Overview", icon: "chart" },
      { href: "/alerts", label: "Alerts", icon: "signal" },
    ],
    canPromote: false,
    caseActions: "none",
  },
};

export interface Persona {
  id: string;
  name: string;
  role: Role;
  /** Contextual subtitle, e.g. "Super Agent · Khulna". */
  title: string;
  /** Present only for the agent role — the single agent they operate. */
  agentId?: string;
  area?: string;
}

/** Named demo users. The agent is bound to AGT-003, which carries a live
 *  reduced-confidence stale-feed alert, so the scoped view has something real. */
export const PERSONAS: Persona[] = [
  { id: "rahim", name: "Rahim Uddin", role: "agent", title: "Super Agent · Khulna", agentId: "AGT-003", area: "Khulna" },
  { id: "nadia", name: "Nadia Islam", role: "coordinator", title: "Operations Coordinator" },
  { id: "tanvir", name: "Tanvir Ahmed", role: "analyst", title: "Risk & Compliance Analyst" },
  { id: "sadia", name: "Sadia Karim", role: "management", title: "Regional Manager" },
];

export const PERSONA_COOKIE = "vault_persona";

export function findPersona(id: string | undefined | null): Persona | null {
  if (!id) return null;
  return PERSONAS.find((p) => p.id === id) ?? null;
}
