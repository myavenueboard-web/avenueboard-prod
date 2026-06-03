import { supabase } from "@/lib/supabase";
import { triggerEmailEvent } from "@/lib/email/triggerEmailEvent";

export async function getOrCreateProfile() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("User not authenticated");
  }

  const accountType = user.user_metadata?.account_type;

  const { data: existingProfile, error: fetchError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (existingProfile) {
    if (accountType === "landlord") {
      await ensureUserRole(existingProfile.id, "landlord");
    }

    return existingProfile;
  }

  if (fetchError && fetchError.code !== "PGRST116") {
    throw fetchError;
  }

  const { data: newProfile, error: insertError } = await supabase
    .from("profiles")
    .insert({
      user_id: user.id,
      email: user.email || "",
      display_name:
        user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
    })
    .select()
    .single();

  if (insertError) {
    throw insertError;
  }

  if (accountType === "landlord") {
    await ensureUserRole(newProfile.id, "landlord");
    await triggerEmailEvent({ trigger: "landlord_signup" });
  }

  if (accountType === "tenant") {
    await ensureUserRole(newProfile.id, "tenant");
    await triggerEmailEvent({ trigger: "tenant_signup" });
  }

  return newProfile;
}

async function ensureUserRole(profileId: string, role: "landlord" | "tenant") {
  const { error } = await supabase.from("user_roles").upsert(
    {
      profile_id: profileId,
      role,
    },
    {
      onConflict: "profile_id,role",
    }
  );

  if (error) {
    console.warn("User role setup warning:", error.message || error);
  }
}
