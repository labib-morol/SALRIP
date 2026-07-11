import { redirect } from "next/navigation";
import { currentPersona } from "@/lib/auth/server.ts";
import { ROLES } from "@/lib/auth/personas.ts";

export default async function Home() {
  const persona = await currentPersona();
  redirect(persona ? ROLES[persona.role].home : "/login");
}
