import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type DeleteEmailEventsRequest = {
  propertyId?: string;
  leaseIds?: string[];
  tenantAccessIds?: string[];
};

function logDeleteEmailEvents(
  label: string,
  context?: Record<string, unknown>,
  error?: unknown
) {
  if (process.env.NODE_ENV !== "development") return;

  const payload = { context, error };

  if (error) {
    console.warn(label, payload);
  } else {
    console.info(label, payload);
  }
}

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

  if (!token) return { profileId: null, error: "Unauthorized" };

  const { data, error } = await supabaseAuth.auth.getUser(token);

  if (error || !data.user) {
    return { profileId: null, error: "Unauthorized" };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("user_id", data.user.id)
    .single();

  if (profileError || !profile) {
    return { profileId: null, error: "Profile not found" };
  }

  return { profileId: profile.id as string, error: null };
}

async function deleteEmailEventsByColumn(column: string, values: string[]) {
  if (values.length === 0) return { deleted: 0 };

  const { data, error } = await supabaseAdmin
    .from("email_events")
    .delete()
    .in(column, values)
    .select("id");

  if (error) throw error;

  return { deleted: data?.length || 0 };
}

export async function POST(request: Request) {
  const { profileId, error } = await getAuthedProfile(request);

  if (error || !profileId) {
    return jsonError(error || "Unauthorized", 401);
  }

  let body: DeleteEmailEventsRequest;

  try {
    body = (await request.json()) as DeleteEmailEventsRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (!body.propertyId) {
    return jsonError("Property id is required.", 400);
  }

  const { data: property, error: propertyError } = await supabaseAdmin
    .from("properties")
    .select("id, owner_profile_id")
    .eq("id", body.propertyId)
    .single();

  if (propertyError || !property) {
    return jsonError("Property not found.", 404);
  }

  if (property.owner_profile_id !== profileId) {
    return jsonError("You do not have access to delete this property.", 403);
  }

  const { data: leaseRows, error: leaseError } = await supabaseAdmin
    .from("leases")
    .select("id")
    .eq("property_id", body.propertyId);

  if (leaseError) {
    return jsonError(`Unable to collect leases: ${leaseError.message}`, 500);
  }

  const leaseIds = Array.from(
    new Set([
      ...(body.leaseIds || []),
      ...((leaseRows || []) as Array<{ id: string }>).map((lease) => lease.id),
    ])
  );

  const { data: propertyAccessRows, error: propertyAccessError } =
    await supabaseAdmin
      .from("tenant_access")
      .select("id")
      .eq("property_id", body.propertyId);

  if (propertyAccessError) {
    return jsonError(
      `Unable to collect tenant access: ${propertyAccessError.message}`,
      500
    );
  }

  const tenantAccessIds = new Set<string>(body.tenantAccessIds || []);

  ((propertyAccessRows || []) as Array<{ id: string }>).forEach((access) => {
    tenantAccessIds.add(access.id);
  });

  if (leaseIds.length > 0) {
    const { data: leaseAccessRows, error: leaseAccessError } =
      await supabaseAdmin
        .from("tenant_access")
        .select("id")
        .in("lease_id", leaseIds);

    if (leaseAccessError) {
      return jsonError(
        `Unable to collect lease tenant access: ${leaseAccessError.message}`,
        500
      );
    }

    ((leaseAccessRows || []) as Array<{ id: string }>).forEach((access) => {
      tenantAccessIds.add(access.id);
    });
  }

  logDeleteEmailEvents("Delete property email event cleanup started", {
    propertyId: body.propertyId,
    leaseIds,
    tenantAccessIds: Array.from(tenantAccessIds),
  });

  try {
    const propertyDelete = await deleteEmailEventsByColumn(
      "related_property_id",
      [body.propertyId]
    );
    const leaseDelete = await deleteEmailEventsByColumn(
      "related_lease_id",
      leaseIds
    );
    const tenantAccessDelete = await deleteEmailEventsByColumn(
      "related_tenant_access_id",
      Array.from(tenantAccessIds)
    );

    logDeleteEmailEvents("Delete property email event cleanup completed", {
      propertyId: body.propertyId,
      leaseIds,
      tenantAccessIds: Array.from(tenantAccessIds),
      deleted: {
        related_property_id: propertyDelete.deleted,
        related_lease_id: leaseDelete.deleted,
        related_tenant_access_id: tenantAccessDelete.deleted,
      },
    });

    return NextResponse.json({
      ok: true,
      deleted: {
        related_property_id: propertyDelete.deleted,
        related_lease_id: leaseDelete.deleted,
        related_tenant_access_id: tenantAccessDelete.deleted,
      },
      propertyId: body.propertyId,
      leaseIds,
      tenantAccessIds: Array.from(tenantAccessIds),
    });
  } catch (deleteError) {
    logDeleteEmailEvents(
      "Delete property email event cleanup failed",
      {
        propertyId: body.propertyId,
        leaseIds,
        tenantAccessIds: Array.from(tenantAccessIds),
      },
      deleteError
    );

    const message =
      deleteError instanceof Error
        ? deleteError.message
        : "Unable to delete related email events.";

    return jsonError(message, 500);
  }
}
