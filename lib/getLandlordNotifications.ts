import { supabase } from "@/lib/supabase";

export type LandlordNotification = {
  id: string;
  title: string;
  message: string;
  type: "warning" | "success" | "info";
  created_at: string;
};

type LeaseTenantRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  invite_status: string | null;
};

type LeaseNotificationRow = {
  id: string;
  end_date: string | null;
  lease_tenants?: LeaseTenantRow[] | null;
};

type PropertyNotificationRow = {
  id: string;
  property_label: string | null;
  bank_status: string | null;
  leases?: LeaseNotificationRow[] | null;
};

type ActivityNotificationRow = {
  id: string;
  profile_id: string;
  property_id: string | null;
  activity_type: string | null;
  title: string | null;
  description: string | null;
  created_at: string;
};

export async function getLandlordNotifications(profileId: string) {
  const notifications: LandlordNotification[] = [];

  const { data: properties } = await supabase
    .from("properties")
    .select(`
      id,
      property_label,
      bank_status,
      leases (
        id,
        end_date,
        lease_tenants (
          id,
          first_name,
          last_name,
          tenant_role,
          invite_status
        )
      )
    `)
    .eq("owner_profile_id", profileId)
    .eq("status", "active");

  const propertyRows = (properties || []) as PropertyNotificationRow[];
  const propertyIds = propertyRows.map((property) => property.id);
  const { data: activityLogs } = propertyIds.length
    ? await supabase
        .from("activity_logs")
        .select(
          "id, profile_id, property_id, activity_type, title, description, created_at"
        )
        .in("property_id", propertyIds)
        .neq("profile_id", profileId)
        .order("created_at", { ascending: false })
        .limit(10)
    : { data: [] };
  const activityRows = (activityLogs || []) as ActivityNotificationRow[];

  const today = new Date();

  propertyRows.forEach((property) => {
    const lease = property.leases?.[0];

    if (property.bank_status !== "connected") {
      notifications.push({
        id: `bank-${property.id}`,
        title: "Complete payment setup",
        message: `Set up your bank account for ${property.property_label} to receive rent payments.`,
        type: "warning",
        created_at: new Date().toISOString(),
      });
    }

    if (lease?.end_date) {
      const endDate = new Date(lease.end_date);
      const diffDays = Math.ceil(
        (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays >= 0 && diffDays <= 60) {
        notifications.push({
          id: `lease-ending-${lease.id}`,
          title: "Lease ending soon",
          message: `${property.property_label} lease ends soon. Extend or update the lease term.`,
          type: "warning",
          created_at: new Date().toISOString(),
        });
      }
    }

    const acceptedTenant = lease?.lease_tenants?.find(
      (tenant) => tenant.invite_status === "accepted"
    );

    if (acceptedTenant) {
      notifications.push({
        id: `tenant-accepted-${acceptedTenant.id}`,
        title: "Tenant invite accepted",
        message: `${acceptedTenant.first_name || "Tenant"} ${
          acceptedTenant.last_name || ""
        } accepted the invite for ${property.property_label || "the property"}.`,
        type: "success",
        created_at: new Date().toISOString(),
      });
    }
  });

  activityRows.forEach((activity) => {
    const property = propertyRows.find(
      (item) => item.id === activity.property_id
    );
    const type = String(activity.activity_type || "");

    notifications.push({
      id: `activity-${activity.id}`,
      title:
        type === "note_added" && activity.title === "Shared note added"
          ? "Tenant shared a note"
          : type === "document_uploaded"
          ? "Tenant uploaded a document"
          : activity.title || "Property activity",
      message:
        activity.description ||
        (property?.property_label
          ? `New activity for ${property.property_label}.`
          : "New property activity."),
      type: type.includes("deleted") ? "warning" : "info",
      created_at: activity.created_at,
    });
  });

  return notifications
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 5);
}
