import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getWorkspaceDestination,
  isWorkspaceType,
  type WorkspaceType,
} from "@/lib/workspaceTypes";

type ProfileRow = {
  id: string;
  user_id: string;
};

type WorkspacePreferenceRow = {
  user_id: string;
  primary_workspace_type: WorkspaceType;
  onboarding_completed: boolean;
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

async function getAuthedUserContext(request: Request) {
  const token = getBearerToken(request);

  if (!token) return { userId: null, profile: null, error: "Unauthorized" };

  const { data, error } = await supabaseAuth.auth.getUser(token);

  if (error || !data.user) {
    return { userId: null, profile: null, error: "Unauthorized" };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (profileError) {
    return {
      userId: null,
      profile: null,
      error: "Unable to load your profile.",
    };
  }

  return {
    userId: data.user.id,
    profile: profile ? (profile as ProfileRow) : null,
    error: null,
  };
}

async function getWorkspacePreference(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_workspace_preferences")
    .select("user_id, primary_workspace_type, onboarding_completed")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as WorkspacePreferenceRow | null;
}

async function inferWorkspaceType(profileId: string | null) {
  if (!profileId) return null;

  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("profile_id", profileId);

  const roleList = ((roles || []) as { role: string }[]).map(
    (item) => item.role
  );

  const recognizedRoles = roleList.filter((role) =>
    ["landlord", "property_manager", "tenant", "resident"].includes(role)
  );
  const uniqueRecognizedRoles = Array.from(new Set(recognizedRoles));

  if (uniqueRecognizedRoles.length !== 1) {
    return null;
  }

  const [role] = uniqueRecognizedRoles;

  if (role === "landlord") {
    return "self_managing_landlord";
  }

  if (role === "property_manager") {
    // TODO: Create this role only from a verified organization or management
    // relationship workflow. Workspace preference alone must not grant it.
    return "property_manager";
  }

  if (role === "tenant" || role === "resident") {
    return "resident";
  }

  return null;
}

async function completeWorkspaceSelection(
  userId: string,
  workspaceType: WorkspaceType
) {
  const now = new Date().toISOString();

  const { error: insertError } = await supabaseAdmin
    .from("user_workspace_preferences")
    .insert({
      user_id: userId,
      primary_workspace_type: workspaceType,
      onboarding_completed: true,
      workspace_type_selected_at: now,
    });

  if (insertError) {
    throw insertError;
  }
}

function buildStatus(workspaceType: WorkspaceType | null, completed: boolean) {
  const destination = workspaceType
    ? getWorkspaceDestination(workspaceType)
    : "/onboarding/workspace";

  return {
    completed,
    requiresOnboarding: !completed || !workspaceType,
    primaryWorkspaceType: workspaceType,
    destination,
  };
}

export async function GET(request: Request) {
  const { userId, profile, error } = await getAuthedUserContext(request);

  if (error || !userId) {
    return jsonError(error || "Unauthorized", 401);
  }

  const preference = await getWorkspacePreference(userId);

  if (preference?.onboarding_completed && preference.primary_workspace_type) {
    return NextResponse.json(
      buildStatus(preference.primary_workspace_type, true)
    );
  }

  const inferredWorkspaceType = await inferWorkspaceType(profile?.id || null);

  if (inferredWorkspaceType) {
    try {
      await completeWorkspaceSelection(userId, inferredWorkspaceType);
    } catch (selectionError) {
      console.error("Workspace onboarding inference save error:", selectionError);
      return jsonError("Unable to save your workspace type right now.", 500);
    }

    return NextResponse.json(buildStatus(inferredWorkspaceType, true));
  }

  return NextResponse.json(buildStatus(null, false));
}

export async function POST(request: Request) {
  const { userId, error } = await getAuthedUserContext(request);

  if (error || !userId) {
    return jsonError(error || "Unauthorized", 401);
  }

  const body = await request.json().catch(() => null);
  const workspaceType = body?.workspaceType;

  if (!isWorkspaceType(workspaceType)) {
    return jsonError("Choose a valid workspace type.");
  }

  const existingPreference = await getWorkspacePreference(userId);

  if (
    existingPreference?.onboarding_completed &&
    existingPreference.primary_workspace_type
  ) {
    return NextResponse.json(
      buildStatus(existingPreference.primary_workspace_type, true)
    );
  }

  try {
    await completeWorkspaceSelection(userId, workspaceType);
  } catch (selectionError) {
    console.error("Workspace onboarding save error:", selectionError);
    return jsonError("Unable to save your workspace type right now.", 500);
  }

  return NextResponse.json(buildStatus(workspaceType, true));
}
