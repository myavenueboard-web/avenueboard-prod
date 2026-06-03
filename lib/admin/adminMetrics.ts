import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export type AdminCount = {
  value: number | null;
  error?: string;
};

export type AdminRecord = Record<string, unknown>;

export type AdminOverviewData = {
  counts: {
    landlords: AdminCount;
    tenants: AdminCount;
    profiles: AdminCount;
    userRoles: AdminCount;
    properties: AdminCount;
    leases: AdminCount;
    leaseTenants: AdminCount;
    tenantAccess: AdminCount;
    activeTenantAccess: AdminCount;
    leaseDocuments: AdminCount;
    propertyNotes: AdminCount;
    activityLogs: AdminCount;
    supportRequests: AdminCount;
    openSupport: AdminCount;
    emailsSent: AdminCount;
    emailsFailed: AdminCount;
    emailsPending: AdminCount;
    emailsSkipped: AdminCount;
    paymentsTotal: AdminCount;
    paymentsSuccessful: AdminCount;
    paymentsPending: AdminCount;
    paymentsFailed: AdminCount;
  };
  rentUnderManagement: AdminCount;
  recent: {
    support: AdminRecord[];
    emailEvents: AdminRecord[];
    activityLogs: AdminRecord[];
    payments: AdminRecord[];
    profiles: AdminRecord[];
    properties: AdminRecord[];
    leases: AdminRecord[];
  };
};

const unavailable: AdminCount = { value: null, error: "Unavailable" };

export async function countRows(table: string): Promise<AdminCount> {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error) return { ...unavailable, error: error.message };
  return { value: count || 0 };
}

export async function countBy(
  table: string,
  column: string,
  value: string
): Promise<AdminCount> {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(column, value);

  if (error) return { ...unavailable, error: error.message };
  return { value: count || 0 };
}

export async function countIn(
  table: string,
  column: string,
  values: string[]
): Promise<AdminCount> {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .in(column, values);

  if (error) return { ...unavailable, error: error.message };
  return { value: count || 0 };
}

export async function recentRows(
  table: string,
  columns = "*",
  limit = 8
): Promise<AdminRecord[]> {
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data || []) as unknown as AdminRecord[];
}

export async function getRentUnderManagement(): Promise<AdminCount> {
  const { data, error } = await supabase
    .from("leases")
    .select("monthly_rent, lease_status")
    .eq("lease_status", "active")
    .limit(10000);

  if (error) return { ...unavailable, error: error.message };

  const total = (data || []).reduce(
    (sum, lease) => sum + Number(lease.monthly_rent || 0),
    0
  );

  return { value: total };
}

export async function getActiveTenantAccessCount(): Promise<AdminCount> {
  const { data, error } = await supabase
    .from("tenant_access")
    .select("status, invite_status")
    .limit(10000);

  if (error) return { ...unavailable, error: error.message };

  return {
    value: (data || []).filter(
      (row) => row.status === "accepted" || row.invite_status === "accepted"
    ).length,
  };
}

export async function getAdminOverviewData(): Promise<AdminOverviewData> {
  const [
    landlords,
    tenants,
    profiles,
    userRoles,
    properties,
    leases,
    leaseTenants,
    tenantAccess,
    activeTenantAccess,
    leaseDocuments,
    propertyNotes,
    activityLogs,
    supportRequests,
    openSupport,
    emailsSent,
    emailsFailed,
    emailsPending,
    emailsSkipped,
    paymentsTotal,
    paymentsSuccessful,
    paymentsPending,
    paymentsFailed,
    rentUnderManagement,
    recentSupport,
    recentEmailEvents,
    recentActivityLogs,
    recentPayments,
    recentProfiles,
    recentProperties,
    recentLeases,
  ] = await Promise.all([
    countBy("user_roles", "role", "landlord"),
    countBy("user_roles", "role", "tenant"),
    countRows("profiles"),
    countRows("user_roles"),
    countRows("properties"),
    countRows("leases"),
    countRows("lease_tenants"),
    countRows("tenant_access"),
    getActiveTenantAccessCount(),
    countRows("lease_documents"),
    countRows("property_notes"),
    countRows("activity_logs"),
    countRows("support_requests"),
    countIn("support_requests", "status", ["open", "unassigned", "in_progress", "waiting_customer"]),
    countBy("email_events", "status", "sent"),
    countBy("email_events", "status", "failed"),
    countBy("email_events", "status", "pending"),
    countBy("email_events", "status", "skipped"),
    countRows("rent_payments"),
    countBy("rent_payments", "status", "paid"),
    countBy("rent_payments", "status", "pending"),
    countIn("rent_payments", "status", ["failed", "canceled", "cancelled"]),
    getRentUnderManagement(),
    recentRows("support_requests", "id, subject, title, email, status, priority, created_at", 6),
    recentRows("email_events", "id, event_type, recipient_email, status, sent_at, failed_at, error_message, provider_message_id, created_at, related_property_id, related_lease_id", 8),
    recentRows("activity_logs", "id, activity_type, title, description, created_at, property_id, lease_id", 8),
    recentRows("rent_payments", "id, lease_id, amount, status, period_label, receipt_url, paid_at, created_at", 8),
    recentRows("profiles", "id, email, full_name, display_name, role, user_type, created_at", 6),
    recentRows("properties", "id, property_label, street_address, city, state_name, created_at", 6),
    recentRows("leases", "id, property_id, monthly_rent, lease_status, payment_status, created_at", 6),
  ]);

  return {
    counts: {
      landlords,
      tenants,
      profiles,
      userRoles,
      properties,
      leases,
      leaseTenants,
      tenantAccess,
      activeTenantAccess,
      leaseDocuments,
      propertyNotes,
      activityLogs,
      supportRequests,
      openSupport,
      emailsSent,
      emailsFailed,
      emailsPending,
      emailsSkipped,
      paymentsTotal,
      paymentsSuccessful,
      paymentsPending,
      paymentsFailed,
    },
    rentUnderManagement,
    recent: {
      support: recentSupport,
      emailEvents: recentEmailEvents,
      activityLogs: recentActivityLogs,
      payments: recentPayments,
      profiles: recentProfiles,
      properties: recentProperties,
      leases: recentLeases,
    },
  };
}

export function formatCount(count: AdminCount): string {
  if (count.value === null) return "Unavailable";
  return count.value.toLocaleString();
}

export function formatCurrencyCount(count: AdminCount): string {
  if (count.value === null) return "Unavailable";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(count.value);
}

export function formatDateTime(value: unknown): string {
  if (!value || typeof value !== "string") return "-";
  return new Date(value).toLocaleString();
}

export function readable(value: unknown, fallback = "-"): string {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value).replaceAll("_", " ");
}
