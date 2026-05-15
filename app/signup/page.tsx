import { Suspense } from "react";
import SignupClient from "./SignupClient";

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white text-sm text-zinc-500">
          Loading...
        </div>
      }
    >
      <SignupClient />
    </Suspense>
  );
}