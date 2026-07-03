import { Suspense } from "react";
import { LegalTrustPage } from "@/components/public-pages/LegalTrustPage";

export default function LegalPage() {
  return (
    <Suspense fallback={null}>
      <LegalTrustPage />
    </Suspense>
  );
}
