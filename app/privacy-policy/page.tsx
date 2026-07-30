import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Privacy Policy | AvenueBoard",
  description:
    "Learn how AvenueBoard collects, uses, shares, and protects personal information.",
  alternates: {
    canonical: "/privacy-policy",
  },
};

export default function PrivacyPolicyPage() {
  redirect("/legal?section=privacy-policy");
}
