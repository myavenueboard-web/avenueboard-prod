import { supabase } from "@/lib/supabase";

type LandlordRoleReason =
  | "owned_property_created"
  | "resident_created_landlord_board";

type EnsureLandlordRoleInput = {
  reason: LandlordRoleReason;
  propertyId?: string;
};

export async function ensureLandlordRole(input: EnsureLandlordRoleInput) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    throw new Error("Please sign in again to continue.");
  }

  const response = await fetch("/api/user-roles/landlord", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.message || "Unable to initialize Landlord Board.");
  }

  return body as { ok: true; created: boolean };
}
