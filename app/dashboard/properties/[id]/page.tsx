"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getOrCreateProfile } from "@/lib/getOrCreateProfile";

type TenantRecord = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  tenant_role: string;
  invite_status: string | null;
};

type PropertyRecord = {
  id: string;
  property_label: string;
  street_address: string;
  city: string;
  state_name: string;
  zip: string;
  property_type: string;
  units: string;
  unit_name: string | null;
  bank_status: string | null;
  status: string | null;
  leases?: {
    id: string;
    start_date: string;
    end_date: string;
    monthly_rent: number;
    security_deposit: number | null;
    rent_due_day: string;
    lease_status: string | null;
    payment_status: string | null;
    lease_tenants?: TenantRecord[];
    lease_documents?: {
      id: string;
      file_name: string;
      file_url: string | null;
      file_type: string | null;
    }[];
  }[];
};

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const propertyId = params.id as string;

  const [property, setProperty] = useState<PropertyRecord | null>(null);
  const [profileId, setProfileId] = useState("");
  const [loading, setLoading] = useState(true);

  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    propertyLabel: "",
    streetAddress: "",
    city: "",
    stateName: "",
    zip: "",
  });

  const [tenantEditOpen, setTenantEditOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantRecord | null>(
    null
  );
  const [savingTenant, setSavingTenant] = useState(false);
  const [tenantForm, setTenantForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  const [noteOpen, setNoteOpen] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);
  const [newNote, setNewNote] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function loadPropertyDashboard() {
      try {
        const { data } = await supabase.auth.getUser();

        if (!data.user) {
          router.push("/login");
          return;
        }

        const profile = await getOrCreateProfile();
        setProfileId(profile.id);

        const { data: propertyData, error: propertyError } = await supabase
          .from("properties")
          .select(
            `
            *,
            leases (
              id,
              start_date,
              end_date,
              monthly_rent,
              security_deposit,
              rent_due_day,
              lease_status,
              payment_status,
              lease_tenants (
                id,
                first_name,
                last_name,
                email,
                phone,
                tenant_role,
                invite_status
              ),
              lease_documents (
                id,
                file_name,
                file_url,
                file_type
              )
            )
          `
          )
          .eq("id", propertyId)
          .eq("owner_profile_id", profile.id)
          .single();

        if (propertyError) {
          console.error("Property detail load error:", propertyError);
          router.push("/dashboard");
          return;
        }

        const loadedProperty = propertyData as PropertyRecord;
        const lease = loadedProperty.leases?.[0];

        setProperty(loadedProperty);

        setEditForm({
          propertyLabel: loadedProperty.property_label || "",
          streetAddress: loadedProperty.street_address || "",
          city: loadedProperty.city || "",
          stateName: loadedProperty.state_name || "",
          zip: loadedProperty.zip || "",
        });

        setNotes([
          `${loadedProperty.property_label} monthly rent is $${Number(
            lease?.monthly_rent || 0
          ).toLocaleString()}. Lease ends on ${formatDate(lease?.end_date)}.`,
        ]);

        if (searchParams.get("edit") === "true") {
          setEditOpen(true);
        }
      } catch (error) {
        console.error("Property dashboard load error:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    if (propertyId) loadPropertyDashboard();
  }, [propertyId, router, searchParams]);

  async function handleSavePropertyEdit() {
    if (!property) return;

    setSavingEdit(true);

    const { error } = await supabase
      .from("properties")
      .update({
        property_label: editForm.propertyLabel.trim(),
        street_address: editForm.streetAddress.trim(),
        city: editForm.city.trim(),
        state_name: editForm.stateName.trim(),
        zip: editForm.zip.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", property.id)
      .eq("owner_profile_id", profileId);

    if (error) {
      console.error("Property update error:", error);
      setSavingEdit(false);
      return;
    }

    setProperty({
      ...property,
      property_label: editForm.propertyLabel.trim(),
      street_address: editForm.streetAddress.trim(),
      city: editForm.city.trim(),
      state_name: editForm.stateName.trim(),
      zip: editForm.zip.trim(),
    });

    setEditOpen(false);
    setSavingEdit(false);
  }

  function openTenantEdit(tenant: TenantRecord) {
    setSelectedTenant(tenant);
    setTenantForm({
      firstName: tenant.first_name || "",
      lastName: tenant.last_name || "",
      email: tenant.email || "",
      phone: tenant.phone || "",
    });
    setTenantEditOpen(true);
  }

  async function handleSaveTenantEdit() {
    if (!selectedTenant || !property) return;

    setSavingTenant(true);

    const { error } = await supabase
      .from("lease_tenants")
      .update({
        first_name: tenantForm.firstName.trim(),
        last_name: tenantForm.lastName.trim(),
        email: tenantForm.email.trim() || null,
        phone: tenantForm.phone.trim() || null,
      })
      .eq("id", selectedTenant.id);

    if (error) {
      console.error("Tenant update error:", error);
      setSavingTenant(false);
      return;
    }

    setProperty({
      ...property,
      leases: property.leases?.map((lease) => ({
        ...lease,
        lease_tenants: lease.lease_tenants?.map((tenant) =>
          tenant.id === selectedTenant.id
            ? {
                ...tenant,
                first_name: tenantForm.firstName.trim(),
                last_name: tenantForm.lastName.trim(),
                email: tenantForm.email.trim() || null,
                phone: tenantForm.phone.trim() || null,
              }
            : tenant
        ),
      })),
    });

    setTenantEditOpen(false);
    setSelectedTenant(null);
    setSavingTenant(false);
  }

  async function handleDeleteProperty() {
    if (!property || deleting) return;

    setDeleting(true);

    try {
      const leaseIds = (property.leases || []).map((lease) => lease.id);

      await supabase
        .from("activity_logs")
        .delete()
        .eq("property_id", property.id);

      await supabase.from("expenses").delete().eq("property_id", property.id);

      if (leaseIds.length > 0) {
        await supabase.from("lease_tenants").delete().in("lease_id", leaseIds);
        await supabase.from("lease_amounts").delete().in("lease_id", leaseIds);
        await supabase
          .from("lease_preferences")
          .delete()
          .in("lease_id", leaseIds);
        await supabase.from("lease_documents").delete().in("lease_id", leaseIds);
        await supabase.from("leases").delete().in("id", leaseIds);
      }

      const { error } = await supabase
        .from("properties")
        .delete()
        .eq("id", property.id)
        .eq("owner_profile_id", profileId);

      if (error) throw error;

      router.push("/dashboard");
    } catch (error) {
      console.error("Property delete error:", error);
      alert("Unable to delete this property. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  function handleSaveNote() {
    if (!newNote.trim()) return;

    setNotes((prev) => [newNote.trim(), ...prev]);
    setNewNote("");
    setNoteOpen(false);
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        Loading property...
      </div>
    );
  }

  if (!property) return null;

  const lease = property.leases?.[0];
  const leaseStatus = getLeaseStatus(lease?.end_date);
  const bankConnected = property.bank_status === "connected";
  const tenants = lease?.lease_tenants || [];
  const documents = lease?.lease_documents || [];

  return (
    <>
      <div className="grid h-full min-h-0 grid-cols-1 gap-4 overflow-y-auto pb-8 lg:grid-cols-[1fr_320px] lg:gap-5 lg:overflow-hidden">
        <div className="min-h-0 space-y-4 lg:overflow-y-auto lg:pr-1">
          <section className="rounded-[26px] border border-zinc-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.035)] sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-[24px] font-semibold tracking-[-0.05em] text-zinc-900 sm:text-[28px]">
                    {property.property_label}
                  </h1>

                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${leaseStatus.badgeClass}`}
                  >
                    {leaseStatus.label}
                  </span>
                </div>

                <p className="mt-2 text-[13px] leading-5 text-zinc-500 sm:text-[14px]">
                  {property.street_address}, {property.city},{" "}
                  {property.state_name} {property.zip}
                </p>
              </div>

              <div className="relative shrink-0">
                <button
                  onClick={() => setActionMenuOpen(!actionMenuOpen)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                >
                  ⋯
                </button>

                {actionMenuOpen && (
                  <div className="absolute right-0 top-12 z-50 w-[180px] rounded-2xl border border-zinc-200 bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
                    <button
                      onClick={() => {
                        setActionMenuOpen(false);
                        setEditOpen(true);
                      }}
                      className="w-full rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      Edit Property
                    </button>

                    <button
                      onClick={() => {
                        setActionMenuOpen(false);
                        setDeleteOpen(true);
                      }}
                      className="w-full rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete Property
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 rounded-[22px] border border-zinc-200 bg-[#FAFAFA] p-4 lg:hidden">
              <p className="text-[13px] text-zinc-500">Upcoming Due</p>

              <div className="mt-2 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[32px] font-semibold tracking-[-0.06em] text-zinc-900">
                    ${Number(lease?.monthly_rent || 0).toLocaleString()}
                  </p>

                  <p className="mt-1 text-[13px] text-zinc-500">
                    Due {lease?.rent_due_day || "—"}
                  </p>
                </div>

                <div className="text-right">
                  <p
                    className={`text-[13px] font-semibold ${
                      bankConnected ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {bankConnected ? "Bank verified" : "Bank pending"}
                  </p>

                  <p className="mt-1 text-[12px] text-zinc-400">
                    Lease ends {formatDateShort(lease?.end_date)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 hidden gap-3 lg:grid xl:grid-cols-4">
              <MetricCard
                label="Monthly Rent"
                value={`$${Number(lease?.monthly_rent || 0).toLocaleString()}`}
                subtext="Per month"
                success
              />

              <MetricCard
                label="Due This Month"
                value={`$${Number(lease?.monthly_rent || 0).toLocaleString()}`}
                subtext={lease?.rent_due_day || "—"}
              />

              <MetricCard
                label="Bank Status"
                value={bankConnected ? "Verified" : "Pending"}
                subtext={bankConnected ? "Ready" : "Action needed"}
                warning={!bankConnected}
                success={bankConnected}
              />

              <MetricCard
                label="Lease Ends"
                value={formatDateShort(lease?.end_date)}
                subtext={leaseStatus.label}
                warning={leaseStatus.label !== "Active"}
              />
            </div>

            {!bankConnected && (
              <div className="mt-4 rounded-[22px] border border-amber-100 bg-amber-50 p-4 lg:mt-5 lg:flex lg:items-center lg:justify-between lg:gap-5">
                <div>
                  <p className="text-[14px] font-semibold text-amber-900">
                    Connect bank account
                  </p>
                  <p className="mt-1 text-[12px] leading-5 text-amber-800">
                    Activate rent collection and allow tenants to complete
                    payment setup.
                  </p>
                </div>

                <button
                  onClick={() =>
                    window.open("https://dashboard.stripe.com/", "_blank")
                  }
                  className="mt-4 h-11 w-full rounded-2xl bg-[#B9476D] px-5 text-[13px] font-semibold text-white hover:bg-[#A93F64] lg:mt-0 lg:w-auto lg:shrink-0"
                >
                  Connect Bank
                </button>
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-[26px] border border-zinc-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.025)]">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-4 sm:px-5">
              <div>
                <h2 className="text-[16px] font-semibold tracking-[-0.03em]">
                  Tenants
                </h2>
                <p className="mt-1 text-[12px] text-zinc-500">
                  {tenants.length} tenant record
                  {tenants.length === 1 ? "" : "s"}
                </p>
              </div>

              {tenants.length > 0 && (
                <button
                  onClick={() => openTenantEdit(tenants[0])}
                  className="rounded-xl border border-zinc-200 px-4 py-2 text-[13px] font-semibold text-[#B9476D] hover:bg-zinc-50"
                >
                  Manage
                </button>
              )}
            </div>

            <div className="grid gap-3 p-4 sm:grid-cols-2">
              {tenants.length > 0 ? (
                tenants.map((tenant) => (
                  <TenantCard
                    key={tenant.id}
                    tenant={tenant}
                    onEdit={() => openTenantEdit(tenant)}
                  />
                ))
              ) : (
                <div className="rounded-2xl bg-[#FAFAFA] px-4 py-5 text-[13px] text-zinc-500 sm:col-span-2">
                  No tenant added.
                </div>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-[26px] border border-zinc-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.025)]">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-4 sm:px-5">
              <div>
                <h2 className="text-[16px] font-semibold tracking-[-0.03em]">
                  Property Documents
                </h2>
                <p className="mt-1 text-[12px] text-zinc-500">
                  Lease agreements and uploads
                </p>
              </div>

              <button className="rounded-xl border border-dashed border-zinc-300 px-4 py-2 text-[13px] font-semibold text-[#B9476D] hover:bg-zinc-50">
                Upload
              </button>
            </div>

            <div className="space-y-2 p-4">
              {documents.length > 0 ? (
                documents.map((doc) => (
                  <button
                    key={doc.id}
                    className="flex w-full items-center justify-between rounded-2xl border border-zinc-200 bg-[#FAFAFA] px-4 py-3 text-left hover:bg-zinc-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-zinc-900">
                        {doc.file_name}
                      </p>

                      <p className="mt-1 text-[12px] text-zinc-500">
                        Uploaded document
                      </p>
                    </div>

                    <span className="text-zinc-400">›</span>
                  </button>
                ))
              ) : (
                <div className="rounded-2xl bg-[#FAFAFA] px-4 py-8 text-center">
                  <p className="text-[14px] font-semibold text-zinc-800">
                    No documents uploaded
                  </p>

                  <p className="mt-2 text-[12px] leading-5 text-zinc-500">
                    Lease agreements and uploads will appear here.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-[26px] border border-zinc-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.025)]">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-4 sm:px-5">
              <div>
                <h2 className="text-[16px] font-semibold tracking-[-0.03em]">
                  Notes
                </h2>
                <p className="mt-1 text-[12px] text-zinc-500">
                  Internal property notes
                </p>
              </div>

              <button
                onClick={() => setNoteOpen(true)}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-[13px] font-semibold text-[#B9476D] hover:bg-zinc-50"
              >
                Add Note
              </button>
            </div>

            <div className="space-y-3 p-4">
              {notes.length === 0 ? (
                <div className="rounded-2xl bg-[#FAFAFA] px-4 py-5 text-[13px] text-zinc-500">
                  No notes yet.
                </div>
              ) : (
                notes.map((note, index) => (
                  <div key={index} className="rounded-2xl bg-[#FFF6EE] p-3">
                    <p className="text-[12px] font-semibold text-zinc-900">
                      {new Date().toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>

                    <p className="mt-2 text-[13px] leading-5 text-zinc-600">
                      {note}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <aside className="hidden min-h-0 flex-col gap-4 lg:flex lg:overflow-hidden">
          <section className="rounded-[24px] border border-zinc-200 bg-[#FBFBFB] p-5">
            <h2 className="text-[16px] font-semibold tracking-[-0.03em]">
              Lease Summary
            </h2>

            <div className="mt-5 grid gap-3">
              <RightInfo
                label="Monthly Rent"
                value={`$${Number(lease?.monthly_rent || 0).toLocaleString()}`}
              />
              <RightInfo label="Due Day" value={lease?.rent_due_day || "—"} />
              <RightInfo
                label="Security Deposit"
                value={
                  lease?.security_deposit
                    ? `$${Number(lease.security_deposit).toLocaleString()}`
                    : "—"
                }
              />
              <RightInfo
                label="Lease Start"
                value={formatDate(lease?.start_date)}
              />
              <RightInfo label="Lease End" value={formatDate(lease?.end_date)} />
              <RightInfo
                label="Status"
                value={leaseStatus.label}
                warning={leaseStatus.label !== "Active"}
              />
            </div>
          </section>

          <section className="rounded-[24px] border border-zinc-200 bg-[#FBFBFB] p-5">
            <h2 className="text-[16px] font-semibold tracking-[-0.03em]">
              Payment Settings
            </h2>

            <p className="mt-2 text-[12px] leading-5 text-zinc-500">
              Manage bank payout and payment setup through Stripe.
            </p>

            <button
              onClick={() =>
                window.open("https://dashboard.stripe.com/", "_blank")
              }
              className="mt-4 h-11 w-full rounded-2xl bg-[#B9476D] text-[14px] font-semibold text-white hover:bg-[#A93F64]"
            >
              Manage Stripe Settings
            </button>
          </section>
        </aside>
      </div>

      {editOpen && (
        <ModalShell
          title="Edit Property"
          subtitle="Update property name and address details."
          onClose={() => setEditOpen(false)}
        >
          <div className="space-y-4">
            <InputField
              label="Property Name"
              value={editForm.propertyLabel}
              onChange={(value) =>
                setEditForm({ ...editForm, propertyLabel: value })
              }
            />

            <InputField
              label="Street Address"
              value={editForm.streetAddress}
              onChange={(value) =>
                setEditForm({ ...editForm, streetAddress: value })
              }
            />

            <div className="grid gap-3 sm:grid-cols-3">
              <InputField
                label="City"
                value={editForm.city}
                onChange={(value) => setEditForm({ ...editForm, city: value })}
              />

              <InputField
                label="State"
                value={editForm.stateName}
                onChange={(value) =>
                  setEditForm({ ...editForm, stateName: value })
                }
              />

              <InputField
                label="ZIP"
                value={editForm.zip}
                onChange={(value) => setEditForm({ ...editForm, zip: value })}
              />
            </div>
          </div>

          <ModalActions
            onCancel={() => setEditOpen(false)}
            onSave={handleSavePropertyEdit}
            saving={savingEdit}
          />
        </ModalShell>
      )}

      {tenantEditOpen && (
        <ModalShell
          title="Edit Tenant"
          subtitle="Update tenant name, email, or phone number."
          onClose={() => setTenantEditOpen(false)}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField
              label="First Name"
              value={tenantForm.firstName}
              onChange={(value) =>
                setTenantForm({ ...tenantForm, firstName: value })
              }
            />

            <InputField
              label="Last Name"
              value={tenantForm.lastName}
              onChange={(value) =>
                setTenantForm({ ...tenantForm, lastName: value })
              }
            />
          </div>

          <div className="mt-4 space-y-4">
            <InputField
              label="Email"
              value={tenantForm.email}
              onChange={(value) =>
                setTenantForm({ ...tenantForm, email: value })
              }
            />

            <InputField
              label="Phone"
              value={tenantForm.phone}
              onChange={(value) =>
                setTenantForm({ ...tenantForm, phone: value })
              }
            />
          </div>

          <ModalActions
            onCancel={() => setTenantEditOpen(false)}
            onSave={handleSaveTenantEdit}
            saving={savingTenant}
          />
        </ModalShell>
      )}

      {noteOpen && (
        <ModalShell
          title="Add Note"
          subtitle="Add an internal note for this property."
          onClose={() => setNoteOpen(false)}
        >
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add property notes..."
            className="min-h-[120px] w-full rounded-2xl border border-zinc-200 bg-[#FAFAFA] p-4 text-[16px] outline-none focus:border-[#B9476D] focus:bg-white focus:ring-4 focus:ring-[#B9476D]/10 sm:text-[14px]"
          />

          <ModalActions
            onCancel={() => setNoteOpen(false)}
            onSave={handleSaveNote}
            saving={false}
          />
        </ModalShell>
      )}

      {deleteOpen && (
        <DeletePropertyModal
          propertyName={property.property_label}
          deleting={deleting}
          onClose={() => {
            if (!deleting) setDeleteOpen(false);
          }}
          onConfirm={handleDeleteProperty}
        />
      )}
    </>
  );
}

function MetricCard({
  label,
  value,
  subtext,
  warning = false,
  success = false,
}: {
  label: string;
  value: string;
  subtext: string;
  warning?: boolean;
  success?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-[#FAFAFA] p-4">
      <p className="text-[12px] text-zinc-500">{label}</p>

      <p
        className={`mt-2 truncate text-[22px] font-semibold tracking-[-0.05em] ${
          warning
            ? "text-amber-600"
            : success
            ? "text-emerald-600"
            : "text-zinc-900"
        }`}
      >
        {value}
      </p>

      <p className="mt-1 truncate text-[12px] text-zinc-500">{subtext}</p>
    </div>
  );
}

function TenantCard({
  tenant,
  onEdit,
}: {
  tenant: TenantRecord;
  onEdit: () => void;
}) {
  const initials = `${tenant.first_name?.charAt(0) || ""}${
    tenant.last_name?.charAt(0) || ""
  }`;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-[#FAFAFA] p-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#B9476D] text-[13px] font-semibold text-white">
        {initials || "T"}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-[14px] font-semibold text-zinc-900">
                {tenant.first_name} {tenant.last_name}
              </p>

              {tenant.tenant_role === "primary" && (
                <span className="rounded-full bg-[#FFF1F5] px-2 py-[3px] text-[9px] font-semibold text-[#B9476D]">
                  Primary
                </span>
              )}
            </div>

            <p className="mt-1 truncate text-[12px] text-zinc-500">
              {tenant.email || "No email"}
            </p>
          </div>

          <button
            onClick={onEdit}
            className="shrink-0 rounded-xl border border-zinc-200 px-3 py-1.5 text-[11px] font-semibold text-[#B9476D] hover:bg-zinc-50"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}

function RightInfo({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-4">
      <p className="text-[13px] text-zinc-500">{label}</p>

      <p
        className={`text-right text-[14px] font-semibold ${
          warning ? "text-amber-600" : "text-zinc-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ModalShell({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/30 backdrop-blur-sm">
      <div className="flex min-h-full items-start justify-center p-3 sm:p-6">
        <div className="w-full max-w-[560px] overflow-hidden rounded-[28px] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.25)]">
          <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 pb-4 pt-5 sm:px-6">
            <div className="min-w-0">
              <h2 className="text-[21px] font-semibold tracking-[-0.04em] text-zinc-900 sm:text-[22px]">
                {title}
              </h2>

              <p className="mt-1 text-[13px] leading-5 text-zinc-500">
                {subtitle}
              </p>
            </div>

            <button
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
            >
              ×
            </button>
          </div>

          <div className="max-h-[72dvh] overflow-y-auto px-5 py-5 sm:px-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalActions({
  onCancel,
  onSave,
  saving,
}: {
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="mt-7 grid gap-3 border-t border-zinc-100 pt-5 sm:flex sm:justify-end">
      <button
        onClick={onCancel}
        className="h-11 w-full rounded-2xl border border-zinc-200 bg-white px-6 text-[14px] font-semibold text-zinc-700 hover:bg-zinc-50 sm:w-auto"
      >
        Cancel
      </button>

      <button
        onClick={onSave}
        disabled={saving}
        className="h-11 w-full rounded-2xl bg-[#B9476D] px-6 text-[14px] font-semibold text-white hover:bg-[#A93F64] disabled:opacity-50 sm:w-auto"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}

function DeletePropertyModal({
  propertyName,
  deleting,
  onClose,
  onConfirm,
}: {
  propertyName: string;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[460px] rounded-[28px] bg-white p-5 shadow-[0_30px_90px_rgba(15,23,42,0.25)] sm:p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-[22px] font-semibold text-red-600">
          !
        </div>

        <h2 className="mt-5 text-[22px] font-semibold tracking-[-0.04em] text-zinc-900">
          Delete property?
        </h2>

        <p className="mt-3 text-[14px] leading-6 text-zinc-500">
          This will permanently delete{" "}
          <span className="font-semibold text-zinc-900">{propertyName}</span>{" "}
          and its related history. This action cannot be undone.
        </p>

        <div className="mt-7 grid gap-3 sm:flex sm:justify-end">
          <button
            onClick={onClose}
            disabled={deleting}
            className="h-11 rounded-2xl border border-zinc-200 bg-white px-6 text-[14px] font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            Go Back
          </button>

          <button
            onClick={onConfirm}
            disabled={deleting}
            className="h-11 rounded-2xl bg-[#B9476D] px-6 text-[14px] font-semibold text-white hover:bg-[#A93F64] disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Confirm Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-[13px] font-medium text-zinc-700">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-[#FAFAFA] px-4 text-[16px] outline-none focus:border-[#B9476D] focus:bg-white focus:ring-4 focus:ring-[#B9476D]/10 sm:text-[14px]"
      />
    </div>
  );
}

function formatDate(date?: string | null) {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateShort(date?: string | null) {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getLeaseStatus(endDate?: string | null) {
  if (!endDate) {
    return {
      label: "Active",
      badgeClass:
        "bg-emerald-50 text-emerald-700 border border-emerald-100",
    };
  }

  const today = new Date();
  const leaseEnd = new Date(endDate);

  today.setHours(0, 0, 0, 0);
  leaseEnd.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil(
    (leaseEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) {
    return {
      label: "Expired",
      badgeClass: "bg-red-50 text-red-700 border border-red-100",
    };
  }

  if (diffDays <= 60) {
    return {
      label: "Ending Soon",
      badgeClass: "bg-amber-50 text-amber-700 border border-amber-100",
    };
  }

  return {
    label: "Active",
    badgeClass:
      "bg-emerald-50 text-emerald-700 border border-emerald-100",
  };
}