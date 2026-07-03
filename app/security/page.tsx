import { redirect } from "next/navigation";

export default function SecurityPage() {
  redirect("/legal?section=security");
}
