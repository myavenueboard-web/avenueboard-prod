import { redirect } from "next/navigation";

export default function TermsOfServicePage() {
  redirect("/legal?section=terms-of-service");
}
