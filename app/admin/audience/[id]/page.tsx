"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Mail,
  Phone,
  Shield,
  Building2,
  LifeBuoy,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

export default function AudienceProfilePage() {
  const params = useParams();
  const id = params.id as string;

  const [profile, setProfile] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [support, setSupport] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRecord() {
      setLoading(true);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      setProfile(profileData);

      if (!profileData) {
        setLoading(false);
        return;
      }

      const { data: ownedProperties } = await supabase
        .from("properties")
        .select("*")
        .eq("owner_profile_id", id);

      setProperties(ownedProperties || []);

      const { data: leaseTenantLinks } = await supabase
        .from("lease_tenants")
        .select("*")
        .eq("profile_id", id);

      const tenantLeaseIds =
        leaseTenantLinks?.map((item) => item.lease_id).filter(Boolean) || [];

      let leaseRecords: any[] = [];

      if (tenantLeaseIds.length > 0) {
        const { data: tenantLeases } = await supabase
          .from("leases")
          .select("*")
          .in("id", tenantLeaseIds);

        leaseRecords = [...leaseRecords, ...(tenantLeases || [])];
      }

      const ownedPropertyIds =
        ownedProperties?.map((property) => property.id).filter(Boolean) || [];

      if (ownedPropertyIds.length > 0) {
        const { data: ownerLeases } = await supabase
          .from("leases")
          .select("*")
          .in("property_id", ownedPropertyIds);

        leaseRecords = [...leaseRecords, ...(ownerLeases || [])];
      }

      const uniqueLeases = Array.from(
        new Map(leaseRecords.map((lease) => [lease.id, lease])).values()
      );

      setLeases(uniqueLeases);

      const { data: supportData } = await supabase
        .from("support_requests")
        .select("*")
        .order("created_at", { ascending: false });

      const filteredSupport =
        supportData?.filter((item) => {
          const record = JSON.stringify(item).toLowerCase();
          const email = profileData.email?.toLowerCase() || "";
          return record.includes(id.toLowerCase()) || record.includes(email);
        }) || [];

      setSupport(filteredSupport);

      setLoading(false);
    }

    if (id) loadRecord();
  }, [id]);

  if (loading) {
    return (
      <div className="rounded-[28px] border border-[#e7dfe2] bg-white p-8 text-sm text-neutral-500">
        Loading profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-[28px] border border-[#e7dfe2] bg-white p-8">
        <h1 className="text-2xl font-semibold">Profile not found</h1>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-[#e7dfe2] bg-white px-7 py-5">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#CA6180]">
              Profile Record
            </p>

            <h1 className="mt-2 text-[34px] font-semibold tracking-[-0.04em]">
              {profile.full_name ||
                profile.name ||
                profile.email ||
                "Unknown Profile"}
            </h1>

            <div className="mt-5 flex flex-wrap gap-3">
              <InfoPill icon={Mail} value={profile.email || "No email"} />
              <InfoPill icon={Phone} value={profile.phone || "No phone"} />
              <InfoPill
                icon={Shield}
                value={profile.role || profile.user_type || "profile"}
              />
            </div>
          </div>

          <Link
            href={`/admin/support/new?email=${encodeURIComponent(
              profile.email || ""
            )}`}
            className="rounded-2xl bg-[#CA6180] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
          >
            Open Support Case
          </Link>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-6">
          <PropertiesWithLeasesSection properties={properties} leases={leases} />
        </div>

        <div className="space-y-6">
          <SupportSection support={support} />

          <div className="rounded-[28px] border border-[#e7dfe2] bg-white p-6">
            <h2 className="mb-4 text-xl font-semibold">Profile Information</h2>

            <div className="space-y-3 text-sm">
              {Object.entries(profile).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-start justify-between gap-4 border-b border-[#f4ecef] pb-3"
                >
                  <p className="font-medium capitalize text-neutral-500">
                    {key.replaceAll("_", " ")}
                  </p>

                  <p className="max-w-[260px] break-words text-right text-neutral-900">
                    {String(value || "-")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoPill({
  icon: Icon,
  value,
}: {
  icon: any;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-[#f8f5f6] px-4 py-2 text-sm capitalize">
      <Icon size={16} className="text-[#CA6180]" />
      {value}
    </div>
  );
}

function PropertiesWithLeasesSection({
  properties,
  leases,
}: {
  properties: any[];
  leases: any[];
}) {
  return (
    <div className="rounded-[28px] border border-[#e7dfe2] bg-white p-6">
      <div className="mb-5 flex items-center gap-3">
        <Building2 size={20} className="text-[#CA6180]" />
        <h2 className="text-xl font-semibold">Linked Properties & Leases</h2>
      </div>

      {properties.length === 0 ? (
        <p className="text-sm text-neutral-500">No properties linked.</p>
      ) : (
        <div className="space-y-3">
          {properties.map((property: any) => {
            const propertyLeases = leases.filter(
              (lease) => lease.property_id === property.id
            );

            return (
              <div
                key={property.id}
                className="rounded-2xl border border-[#f0e4e8] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">
                      {property.property_label ||
                        property.street_address ||
                        "Unnamed Property"}
                    </p>

                    <p className="mt-1 text-sm text-neutral-500">
                      {property.city || "-"}, {property.state_name || "-"}
                    </p>
                  </div>

                  <span className="rounded-full bg-[#f8f5f6] px-3 py-1 text-xs font-medium capitalize text-neutral-600">
                    {property.status || "active"}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  {propertyLeases.length === 0 ? (
                    <p className="text-sm text-neutral-400">
                      No lease linked to this property.
                    </p>
                  ) : (
                    propertyLeases.map((lease: any) => (
                      <div
                        key={lease.id}
                        className="flex items-center justify-between rounded-xl bg-[#f8f5f6] px-4 py-3 text-sm"
                      >
                        <div>
                          <p className="font-medium capitalize text-neutral-900">
                            {lease.lease_status || "Active"} Lease
                          </p>

                          <p className="mt-1 text-neutral-500">
                            ${lease.monthly_rent}/month
                          </p>
                        </div>

                        <div className="text-right text-xs text-neutral-500">
                          <p>{lease.payment_status || "payment status"}</p>
                          <p className="mt-1">
                            Due day {lease.rent_due_day || "-"}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SupportSection({ support }: { support: any[] }) {
  return (
    <div className="rounded-[28px] border border-[#e7dfe2] bg-white p-6">
      <div className="mb-5 flex items-center gap-3">
        <LifeBuoy size={20} className="text-[#CA6180]" />
        <h2 className="text-xl font-semibold">Support History</h2>
      </div>

      {support.length === 0 ? (
        <p className="text-sm text-neutral-500">No support history found.</p>
      ) : (
        <div className="space-y-3">
          {support.map((item: any) => (
            <div
              key={item.id}
              className="rounded-2xl border border-[#f0e4e8] p-4"
            >
              <p className="font-semibold">
                {item.subject || item.title || "Support Request"}
              </p>

              <p className="mt-1 text-sm text-neutral-500">
                {item.status || item.issue_type || "Open"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}