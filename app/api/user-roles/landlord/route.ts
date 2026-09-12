import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ProfileRow = {
  id: string;
  user_id: string;
};

type LandlordRoleReason =
  | "owned_property_created"
  | "resident_created_landlord_board";

const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") || "";
  const [scheme, token] = header.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

async function getAuthedProfile(request: Request) {
  const token = getBearerToken(request);

  if (!token) return { profile: null, error: "Unauthorized" };

  const { data, error } = await supabaseAuth.auth.getUser(token);

  if (error || !data.user) {
    return { profile: null, error: "Unauthorized" };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { profile: null, error: "Profile not found" };
  }

  return { profile: profile as ProfileRow, error: null };
}

async function ownsProperty(profileId: string, propertyId: string) {
  const { data, error } = await supabaseAdmin
    .from("properties")
    .select("id")
    .eq("id", propertyId)
    .eq("owner_profile_id", profileId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data?.id);
}

async function hasResidentRelationship(profileId: string) {
  const [
    { data: tenantRole, error: tenantRoleError },
    { data: tenantAccess, error: tenantAccessError },
  ] = await Promise.all([
    supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("profile_id", profileId)
      .eq("role", "tenant")
      .maybeSingle(),
    supabaseAdmin
      .from("tenant_access")
      .select("id")
      .eq("tenant_profile_id", profileId)
      .eq("invite_status", "accepted")
      .limit(1),
  ]);

  if (tenantRoleError) throw tenantRoleError;
  if (tenantAccessError) throw tenantAccessError;

  return Boolean(tenantRole || tenantAccess?.length);
}

async function upsertLandlordRole(profileId: string) {
  const { data: existingRole, error: existingRoleError } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("profile_id", profileId)
    .eq("role", "landlord")
    .maybeSingle();

  if (existingRoleError) throw existingRoleError;

  if (existingRole?.id) {
    return false;
  }

  const { error: insertError } = await supabaseAdmin.from("user_roles").upsert(
    {
      profile_id: profileId,
      role: "landlord",
    },
    {
      onConflict: "profile_id,role",
    }
  );

  if (insertError) throw insertError;

  return true;
}

export async function POST(request: Request) {
  const { profile, error } = await getAuthedProfile(request);

  if (error || !profile) {
    return jsonError(error || "Unauthorized", 401);
  }

  const body = await request.json().catch(() => null);
  const reason = body?.reason as LandlordRoleReason | undefined;

  try {
    if (reason === "owned_property_created") {
      const propertyId =
        typeof body?.propertyId === "string" ? body.propertyId : "";

      if (!propertyId) {
        return jsonError("Property is required to initialize Landlord Board.");
      }

      const verifiedOwner = await ownsProperty(profile.id, propertyId);

      if (!verifiedOwner) {
        return jsonError("Property ownership could not be verified.", 403);
      }
    } else if (reason === "resident_created_landlord_board") {
      const verifiedResident = await hasResidentRelationship(profile.id);

      if (!verifiedResident) {
        return jsonError(
          "Resident access is required to create a Landlord Board.",
          403
        );
      }
    } else {
      return jsonError("Choose a valid Landlord Board initialization reason.");
    }

    const created = await upsertLandlordRole(profile.id);

    return NextResponse.json({ ok: true, created });
  } catch (roleError) {
    console.error("Landlord role assignment error:", roleError);
    return jsonError("Unable to initialize Landlord Board right now.", 500);
  }
}
