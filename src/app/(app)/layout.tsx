import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { PersonaProvider } from "@/components/auth/PersonaProvider";
import { currentPersona } from "@/lib/auth/server.ts";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const persona = await currentPersona();
  if (!persona) redirect("/login");

  return (
    <PersonaProvider persona={persona}>
      <AppShell persona={persona}>{children}</AppShell>
    </PersonaProvider>
  );
}
