"use client";

import { createContext, useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ROLES, type Persona, type Role } from "@/lib/auth/personas.ts";

const PersonaCtx = createContext<Persona | null>(null);

export function PersonaProvider({ persona, children }: { persona: Persona; children: React.ReactNode }) {
  return <PersonaCtx value={persona}>{children}</PersonaCtx>;
}

export function usePersona(): Persona {
  const p = useContext(PersonaCtx);
  if (!p) throw new Error("usePersona must be used within a PersonaProvider");
  return p;
}

/**
 * Redirect to the persona's own home if their role isn't allowed on this page.
 * Returns the persona so callers can use it directly.
 */
export function useRoleGuard(allowed: Role[]): Persona {
  const persona = usePersona();
  const router = useRouter();
  useEffect(() => {
    if (!allowed.includes(persona.role)) router.replace(ROLES[persona.role].home);
  }, [persona.role, allowed, router]);
  return persona;
}
