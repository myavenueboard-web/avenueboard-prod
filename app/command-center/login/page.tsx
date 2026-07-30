import { Suspense } from "react";
import CommandCenterLoginClient from "@/app/command-center/components/CommandCenterLoginClient";

export default function CommandCenterLoginPage() {
  return (
    <Suspense fallback={null}>
      <CommandCenterLoginClient />
    </Suspense>
  );
}
