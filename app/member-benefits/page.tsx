import { redirect } from "next/navigation";
import PerksPage from "../perks/page";
import { ENABLE_AVENUE_PERKS, ENABLE_CREDIT_BUILDING } from "@/lib/phaseOneFeatures";

export default function MemberBenefitsPage() {
  if (!ENABLE_AVENUE_PERKS && !ENABLE_CREDIT_BUILDING) {
    redirect("/");
  }

  return <PerksPage />;
}
