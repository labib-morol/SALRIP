import { cookies } from "next/headers";
import { findPersona, PERSONA_COOKIE, type Persona } from "./personas.ts";

/** The signed-in persona for the current request, or null if none. Server-only. */
export async function currentPersona(): Promise<Persona | null> {
  const store = await cookies();
  return findPersona(store.get(PERSONA_COOKIE)?.value);
}
