import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type EndLeaseRequest = {
  propertyId?: string;
  leaseId?: string;
};

const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") || "";
  const [scheme, token] = header.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

function isEndedLeaseStatus(value?: string | null) {
  return ["ended", "inactive", "terminated"].includes(
    String(value || "").toLowerCase()
  );
}

export async function POST(request: Request) {
  const token = getBearerToken(request);

  if (!token) {
    return jsonError("Unauthorized", 401);
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAuth.auth.getUser(token);

  if (userError || !user) {
    return jsonError("Unauthorized", 401);
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    return jsonError("Landlord profile not found", 404);
  }

  let body: EndLeaseRequest;

  try {
    body = (await request.json()) as EndLeaseRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (!body.propertyId || !body.leaseId) {
    return jsonError("Property and lease are required.", 400);
  }

  const { data: property, error: propertyError } = await supabaseAdmin
    .from("properties")
    .select("id, owner_profile_id, property_label")
    .eq("id", body.propertyId)
    .single();

  if (propertyError || !property) {
    return jsonError("Property not found.", 404);
  }

  if (property.owner_profile_id !== profile.id) {
    return jsonError("You do not have access to end this lease.", 403);
  }

  const { data: lease, error: leaseError } = await supabaseAdmin
    .from("leases")
    .select("id, property_id, lease_status")
    .eq("id", body.leaseId)
    .eq("property_id", body.propertyId)
    .single();

  if (leaseError || !lease) {
    return jsonError("Lease not found.", 404);
  }

  const endedAt = new Date().toISOString();

  if (!isEndedLeaseStatus(lease.lease_status)) {
    const { error: updateLeaseError } = await supabaseAdmin
      .from("leases")
      .update({
        lease_status: "ended",
        payment_status: "ended",
        ended_at: endedAt,
        updated_at: endedAt,
      })
      .eq("id", body.leaseId);

    if (updateLeaseError) {
      return jsonError(updateLeaseError.message, 500);
    }

    const futureUnpaidStatuses = [
      "pending",
      "upcoming",
      "future",
      "processing",
    ];

    await supabaseAdmin
      .from("rent_payments")
      .update({ status: "canceled", updated_at: endedAt })
      .eq("lease_id", body.leaseId)
      .in("status", futureUnpaidStatuses);

    await supabaseAdmin
      .from("payment_methods")
      .update({
        autopay_status: "disabled",
        autopay_enrolled: false,
        is_default: false,
        updated_at: endedAt,
      })
      .eq("lease_id", body.leaseId);

    await supabaseAdmin.from("activity_logs").insert({
      property_id: body.propertyId,
      profile_id: profile.id,
      lease_id: body.leaseId,
      activity_type: "lease_ended",
      title: "Lease ended",
      description: `${property.property_label || "Property"} lease was ended.`,
    });
  }

  return NextResponse.json({ ok: true, endedAt });
}
