import { redirect } from "next/navigation";

export default function PrivacyPreferencesPage() {
  redirect("/legal?section=privacy-preferences");
}
