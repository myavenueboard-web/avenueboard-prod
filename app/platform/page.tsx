import { Suspense } from "react";
import { PlatformInfoPage } from "@/components/public-pages/PlatformInfoPage";

export default function PlatformPage() {
  return (
    <Suspense fallback={null}>
      <PlatformInfoPage />
    </Suspense>
  );
}
