import { AppShell } from "@/components/nav/AppShell";

export default function OperationsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
