import { redirect } from "next/navigation";

type PlatformPageProps = {
  searchParams?: Promise<{
    category?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PlatformPage({ searchParams }: PlatformPageProps) {
  const params = await searchParams;
  const category = firstParam(params?.category);

  if (category === "pricing") {
    redirect("/pricing");
  }

  if (category === "avenue-perks") {
    redirect("/avenue-perks");
  }

  if (category === "credit-building") {
    redirect("/credit-building");
  }

  if (
    category === "landlord-dashboard" ||
    category === "resident-dashboard" ||
    category === "ava-support"
  ) {
    redirect("/#rental-properties");
  }

  redirect("/");
}
