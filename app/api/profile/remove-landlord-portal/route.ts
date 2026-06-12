import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ProfileRow = {
  id: string;
  user_id: string;
};

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
    .single();

  if (profileError || !profile) {
    return { profile: null, error: "Profile not found" };
  }

  return {
    profile: profile as ProfileRow,
    userMetadata: data.user.user_metadata || {},
    error: null,
  };
}

export async function POST(request: Request) {
  const { profile, userMetadata, error } = await getAuthedProfile(request);

  if (error || !profile) {
    return jsonError(error || "Unauthorized", 401);
  }

  const [
    { data: roles, error: rolesError },
    { count: tenantAccessCount, error: tenantAccessError },
    { count: activePropertyCount, error: activePropertyError },
  ] = await Promise.all([
    supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("profile_id", profile.id),
    supabaseAdmin
      .from("tenant_access")
      .select("id", { count: "exact", head: true })
      .eq("tenant_profile_id", profile.id)
      .eq("invite_status", "accepted"),
    supabaseAdmin
      .from("properties")
      .select("id", { count: "exact", head: true })
      .eq("owner_profile_id", profile.id)
      .eq("status", "active"),
  ]);

  if (rolesError) return jsonError("Unable to verify account roles.", 500);
  if (tenantAccessError) return jsonError("Unable to verify tenant portal access.", 500);
  if (activePropertyError) return jsonError("Unable to verify property ownership.", 500);

  const roleList = (roles || []).map((item) => item.role);
  const hasLandlordRole = roleList.includes("landlord");
  const hasTenantRole = roleList.includes("tenant");
  const hasTenantAccess = (tenantAccessCount || 0) > 0;

  if (!hasLandlordRole) {
    return jsonError("Landlord portal is already removed.", 409);
  }

  if (!hasTenantRole && !hasTenantAccess) {
    return jsonError(
      "You need another active portal before removing landlord access.",
      409
    );
  }

  if ((activePropertyCount || 0) > 0) {
    return jsonError(
      "This landlord portal owns active properties. Transfer or archive those properties before removing landlord access.",
      409
    );
  }

  const { error: deleteError } = await supabaseAdmin
    .from("user_roles")
    .delete()
    .eq("profile_id", profile.id)
    .eq("role", "landlord");

  if (deleteError) {
    return jsonError("Unable to remove landlord portal. Please try again.", 500);
  }

  const { count: remainingLandlordRoles, error: verifyError } =
    await supabaseAdmin
      .from("user_roles")
      .select("role", { count: "exact", head: true })
      .eq("profile_id", profile.id)
      .eq("role", "landlord");

  if (verifyError) {
    return jsonError("Unable to verify landlord portal removal.", 500);
  }

  if ((remainingLandlordRoles || 0) > 0) {
    return jsonError("Unable to remove landlord portal. Please try again.", 409);
  }

  const { error: metadataError } =
    await supabaseAdmin.auth.admin.updateUserById(profile.user_id, {
      user_metadata: {
        ...(userMetadata || {}),
        account_type: "tenant",
        landlord_portal_removed: true,
      },
    });

  if (metadataError) {
    return jsonError("Landlord portal was removed, but account state could not be refreshed.", 500);
  }

  return NextResponse.json({ ok: true });
}
