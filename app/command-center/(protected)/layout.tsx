import CommandCenterShell from "@/app/command-center/components/CommandCenterShell";
import { requireCommandCenterStaff } from "@/lib/command-center/server";

export default async function CommandCenterProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await requireCommandCenterStaff();

  return <CommandCenterShell staff={staff}>{children}</CommandCenterShell>;
}
