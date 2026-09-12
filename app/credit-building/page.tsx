import { redirect } from "next/navigation";
import { ENABLE_CREDIT_BUILDING } from "@/lib/phaseOneFeatures";

export default function CreditBuildingPage() {
  if (!ENABLE_CREDIT_BUILDING) redirect("/");

  redirect("/member-benefits?section=credit-building");
}
