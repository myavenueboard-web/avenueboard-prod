import { redirect } from "next/navigation";

export default function AccessibilityPage() {
  redirect("/legal?section=privacy-preferences");
}
