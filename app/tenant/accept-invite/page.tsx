import { Suspense } from "react";
import AcceptInviteClient from "./AcceptInviteClient";

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white text-sm text-zinc-500">
          Loading...
        </div>
      }
    >
      <AcceptInviteClient />
    </Suspense>
  );
}