import { redirect } from "next/navigation";

export default function CookiePolicyPage() {
  redirect("/legal?section=cookie-policy");
}
