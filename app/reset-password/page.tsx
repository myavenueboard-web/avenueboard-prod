import { Suspense } from "react";
import ResetPasswordClient from "./ResetPasswordClient";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white text-sm text-zinc-500">
          Loading...
        </div>
      }
    >
      <ResetPasswordClient />
    </Suspense>
  );
}