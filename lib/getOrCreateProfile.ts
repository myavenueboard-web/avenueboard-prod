import { supabase } from "@/lib/supabase";

export async function getOrCreateProfile() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("User not authenticated");
  }

  const { data: existingProfile, error: fetchError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (existingProfile) {
    await ensureUserRole(existingProfile.id, "landlord");
    return existingProfile;
  }

  if (fetchError && fetchError.code !== "PGRST116") {
    throw fetchError;
  }

  const newProfilePayload = {
    user_id: user.id,
    email: user.email || "",
    display_name:
      user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
  };

  const { data: newProfile, error: insertError } = await supabase
    .from("profiles")
    .insert(newProfilePayload)
    .select()
    .single();

  if (insertError) {
    throw insertError;
  }

  await ensureUserRole(newProfile.id, "landlord");

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