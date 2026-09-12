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

  return newProfile;
}
