import { supabase } from "@/lib/supabase";

export type LandlordNotification = {
  id: string;
  title: string;
  message: string;
  type: "warning" | "success" | "info";
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

  const today = new Date();

  (properties || []).forEach((property: any) => {
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
      (tenant: any) => tenant.invite_status === "accepted"
    );

    if (acceptedTenant) {
      notifications.push({
        id: `tenant-accepted-${acceptedTenant.id}`,
        title: "Tenant invite accepted",
        message: `${acceptedTenant.first_name} ${acceptedTenant.last_name} accepted the invite for ${property.property_label}.`,
        type: "success",
        created_at: new Date().toISOString(),
      });
    }
  });

  return notifications.slice(0, 5);
}