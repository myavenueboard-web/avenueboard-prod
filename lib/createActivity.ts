import { supabase } from "@/lib/supabase";

type CreateActivityPayload = {
  profile_id: string;
  property_id?: string | null;
  lease_id?: string | null;
  activity_type: string;
  title: string;
  description?: string;
};

export async function createActivity(payload: CreateActivityPayload) {
  const { error } = await supabase.from("activity_logs").insert({
    profile_id: payload.profile_id,
    property_id: payload.property_id || null,
    lease_id: payload.lease_id || null,
    activity_type: payload.activity_type,
    title: payload.title,
    description: payload.description || null,
  });

  if (error) {
    console.error("Activity log insert error:", error);
  }
}