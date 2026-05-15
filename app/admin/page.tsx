import Link from "next/link";
import { Building2, FileText, LifeBuoy, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase";

async function getDashboardData() {
  const [profiles, properties, leases, support] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("properties").select("*").order("created_at", { ascending: false }),
    supabase.from("leases").select("*").order("created_at", { ascending: false }),
    supabase.from("support_requests").select("*").order("created_at", { ascending: false }),
  ]);

  const activity = [
    ...(support.data || []).map((x: any) => ({
      type: "Support",
      title: x.subject || "Support request opened",
      subtitle: x.email || "No email",
      date: x.created_at,
      href: `/admin/support/${x.id}`,
      icon: LifeBuoy,
    })),
    ...(properties.data || []).map((x: any) => ({
      type: "Property",
      title: x.property_label || x.street_address || "Property added",
      subtitle: `${x.city || "-"}, ${x.state_name || "-"}`,
      date: x.created_at,
      href: "/admin/audience",
      icon: Building2,
    })),
    ...(leases.data || []).map((x: any) => ({
      type: "Lease",
      title: `${capitalize(x.lease_status || "active")} lease`,
      subtitle: `$${Number(x.monthly_rent || 0).toLocaleString()}/month`,
      date: x.created_at,
      href: "/admin/audience",
      icon: FileText,
    })),
    ...(profiles.data || []).map((x: any) => ({
      type: "Profile",
      title: x.display_name || x.full_name || x.email || "Profile created",
      subtitle: x.email || "No email",
      date: x.created_at,
      href: `/admin/audience/${x.id}`,
      icon: UserRound,
    })),
  ]
    .filter((x) => x.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  return {
    profiles: profiles.data?.length || 0,
    properties: properties.data?.length || 0,
    leases: leases.data?.length || 0,
    support: support.data?.length || 0,
    activity,
  };
}

export default async function AdminPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-[#e7dfe2] bg-white p-7">
        <div className="flex items-center justify-between gap-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#CA6180]">
              AvenueBoard Operations
            </p>

            <h1 className="mt-2 text-[42px] font-semibold leading-none tracking-[-0.04em]">
              Command Center
            </h1>
          </div>

          <p className="max-w-2xl text-sm leading-6 text-neutral-500">
            Internal workspace for support, landlord management, reporting, and
            platform operations.
          </p>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-4">
          <Stat label="Properties" value={data.properties} />
          <Stat label="Profiles" value={data.profiles} />
          <Stat label="Leases" value={data.leases} />
          <Stat label="Support Cases" value={data.support} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-[32px] border border-[#e7dfe2] bg-white p-7">
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">
            Recent Activity
          </h2>

          <p className="mt-2 text-sm text-neutral-500">
            Latest operational events across the platform.
          </p>

          <div className="mt-6 space-y-3">
            {data.activity.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#e7dfe2] py-14 text-center text-sm text-neutral-500">
                No recent activity yet.
              </div>
            ) : (
              data.activity.map((item: any, index: number) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={`${item.type}-${index}`}
                    href={item.href}
                    className="flex items-center justify-between rounded-2xl border border-[#f0e4e8] p-4 transition hover:bg-[#CA6180]/5"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#CA6180]/10 text-[#CA6180]">
                        <Icon size={18} />
                      </div>

                      <div>
                        <p className="font-semibold text-neutral-950">
                          {item.title}
                        </p>
                        <p className="mt-1 text-sm text-neutral-500">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-medium text-[#CA6180]">
                        {item.type}
                      </p>
                      <p className="mt-1 text-xs text-neutral-400">
                        {formatDate(item.date)}
                      </p>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-[32px] border border-[#e7dfe2] bg-white p-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#CA6180]">
            Platform Health
          </p>

          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
            Snapshot
          </h2>

          <div className="mt-6 space-y-4">
            <Health label="Active Properties" value={data.properties} />
            <Health label="Total Profiles" value={data.profiles} />
            <Health label="Support Requests" value={data.support} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-[24px] border border-[#eadde1] bg-[#fbf9fa] p-5">
      <p className="text-sm text-neutral-500">{label}</p>
      <h2 className="mt-3 text-4xl font-semibold tracking-tight">{value}</h2>
    </div>
  );
}

function Health({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[#f0e4e8] bg-[#fbf9fa] px-5 py-4">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}