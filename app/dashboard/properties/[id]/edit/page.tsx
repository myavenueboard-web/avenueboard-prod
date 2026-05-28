"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getOrCreateProfile } from "@/lib/getOrCreateProfile";
import { createActivity } from "@/lib/createActivity";

import StepIndicator from "@/app/components/add-property/StepIndicator";
import PropertyStep from "@/app/components/add-property/PropertyStep";
import TenantStep from "@/app/components/add-property/TenantStep";
import LeaseStep from "@/app/components/add-property/LeaseStep";
import PreferencesStep from "@/app/components/add-property/PreferencesStep";
import AddTenantModal from "@/app/components/add-property/AddTenantModal";

type AdditionalTenant = {
  id: number;
  existingId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

type AdditionalAmount = {
  id: number;
  existingId?: string;
  type: string;
  amount: string;
};

export default function EditPropertyPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const propertyId = params.id as string;
  const requestedStep = Number(searchParams.get("step") || "1");

  const [profileId, setProfileId] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [leaseId, setLeaseId] = useState("");
  const [primaryTenantId, setPrimaryTenantId] = useState("");
  const [preferenceId, setPreferenceId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [step, setStep] = useState(
    requestedStep >= 1 && requestedStep <= 4 ? requestedStep : 1
  );

  const [additionalModalOpen, setAdditionalModalOpen] = useState(false);
  const [additionalFirstName, setAdditionalFirstName] = useState("");
  const [additionalLastName, setAdditionalLastName] = useState("");
  const [additionalEmail, setAdditionalEmail] = useState("");
  const [additionalPhone, setAdditionalPhone] = useState("");
  const [deletedTenantIds, setDeletedTenantIds] = useState<string[]>([]);

  const [propertyForm, setPropertyForm] = useState({
    streetAddress: "",
    city: "",
    stateName: "",
    zip: "",
    propertyType: "Apartment",
    units: "1 Unit",
    unitName: "",
    propertyLabel: "",
  });

  const [tenantForm, setTenantForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  const [originalPrimaryEmail, setOriginalPrimaryEmail] = useState("");

  const [leaseForm, setLeaseForm] = useState({
    startDate: "",
    endDate: "",
    monthlyRent: "",
    securityDeposit: "",
    rentDueDay: "1st of the Month",
  });

  const [preferencesForm, setPreferencesForm] = useState({
    phone: "",
    whatsappEnabled: false,
    smsEnabled: false,
    landlordAbsorbsFee: false,
    authorizedAgreement: true,
    termsAgreement: true,
  });

  const [additionalTenants, setAdditionalTenants] = useState<AdditionalTenant[]>(
    []
  );

  const [additionalAmounts, setAdditionalAmounts] = useState<AdditionalAmount[]>(
    []
  );

  const [attachments, setAttachments] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadEditData() {
      try {
        const { data } = await supabase.auth.getUser();

        if (!data.user) {
          router.push("/login");
          return;
        }

        const profile = await getOrCreateProfile();
        setProfileId(profile.id);

        setLoginEmail(profile.email || data.user.email || "");

        const { data: propertyData, error } = await supabase
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
              lease_tenants (
                id,
                first_name,
                last_name,
                email,
                phone,
                tenant_role
              ),
              lease_amounts (
                id,
                amount_type,
                amount
              ),
              lease_preferences (
                id,
                notification_phone,
                whatsapp_enabled,
                sms_enabled,
                landlord_absorbs_fee,
                authorized_agreement,
                terms_agreement
              )
            )
          `
          )
          .eq("id", propertyId)
          .eq("owner_profile_id", profile.id)
          .single();

        if (error || !propertyData) {
          console.error("Edit property load error:", error);
          router.push("/dashboard");
          return;
        }

        const lease = propertyData.leases?.[0];
        const tenants = lease?.lease_tenants || [];
        const primaryTenant = tenants.find(
          (tenant: any) => tenant.tenant_role === "primary"
        );
        const secondaryTenants = tenants.filter(
          (tenant: any) => tenant.tenant_role !== "primary"
        );

        setLeaseId(lease?.id || "");
        setPrimaryTenantId(primaryTenant?.id || "");
        setOriginalPrimaryEmail(primaryTenant?.email || "");

        setPropertyForm({
          streetAddress: propertyData.street_address || "",
          city: propertyData.city || "",
          stateName: propertyData.state_name || "",
          zip: propertyData.zip || "",
          propertyType: propertyData.property_type || "Apartment",
          units: propertyData.units || "1 Unit",
          unitName: propertyData.unit_name || "",
          propertyLabel: propertyData.property_label || "",
        });

        setTenantForm({
          firstName: primaryTenant?.first_name || "",
          lastName: primaryTenant?.last_name || "",
          email: primaryTenant?.email || "",
          phone: primaryTenant?.phone || "",
        });

        setAdditionalTenants(
          secondaryTenants.map((tenant: any) => ({
            id: Date.now() + Math.floor(Math.random() * 100000),
            existingId: tenant.id,
            firstName: tenant.first_name || "",
            lastName: tenant.last_name || "",
            email: tenant.email || "",
            phone: tenant.phone || "",
          }))
        );

        setLeaseForm({
          startDate: lease?.start_date || "",
          endDate: lease?.end_date || "",
          monthlyRent: lease?.monthly_rent ? String(lease.monthly_rent) : "",
          securityDeposit: lease?.security_deposit
            ? String(lease.security_deposit)
            : "",
          rentDueDay: lease?.rent_due_day || "1st of the Month",
        });

        setAdditionalAmounts(
          (lease?.lease_amounts || []).map((item: any) => ({
            id: Date.now() + Math.floor(Math.random() * 100000),
            existingId: item.id,
            type: item.amount_type || "",
            amount: item.amount ? String(item.amount) : "",
          }))
        );

        const preference = lease?.lease_preferences?.[0];

        if (preference) {
          setPreferenceId(preference.id);

          setPreferencesForm({
            phone: preference.notification_phone || "",
            whatsappEnabled: !!preference.whatsapp_enabled,
            smsEnabled: !!preference.sms_enabled,
            landlordAbsorbsFee: !!preference.landlord_absorbs_fee,
            authorizedAgreement: !!preference.authorized_agreement,
            termsAgreement: !!preference.terms_agreement,
          });
        }
      } catch (error) {
        console.error("Edit page error:", error);
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    }

    if (propertyId) loadEditData();
  }, [propertyId, router]);

  const propertyValid =
    propertyForm.streetAddress.trim() &&
    propertyForm.city.trim() &&
    propertyForm.stateName.trim() &&
    propertyForm.zip.trim() &&
    propertyForm.propertyLabel.trim();

  const tenantValid =
    tenantForm.firstName.trim() &&
    tenantForm.lastName.trim() &&
    tenantForm.email.trim().includes("@");

  const leaseValid =
    leaseForm.startDate.trim() &&
    leaseForm.endDate.trim() &&
    leaseForm.monthlyRent.trim() &&
    leaseForm.rentDueDay.trim();

  const phoneRequired =
    preferencesForm.whatsappEnabled || preferencesForm.smsEnabled;

  const phoneDigits = preferencesForm.phone.replace(/\D/g, "");

  const phoneValid =
    !preferencesForm.phone.trim() ||
    (phoneDigits.length >= 10 && phoneDigits.length <= 15);

  const preferencesValid =
    preferencesForm.authorizedAgreement &&
    preferencesForm.termsAgreement &&
    phoneValid &&
    (!phoneRequired || phoneDigits.length >= 10);

  const additionalAmountsValid = additionalAmounts.every(
    (item) => item.type.trim() && item.amount.trim() && Number(item.amount) > 0
  );

  const canContinue =
    step === 1
      ? propertyValid
      : step === 2
      ? tenantValid
      : step === 3
      ? leaseValid && additionalAmountsValid
      : step === 4
      ? preferencesValid
      : true;

  const progress = (step / 4) * 100;

  async function saveEdit() {
    if (!profileId || !leaseId || !canContinue || saving) return;

    setSaving(true);

    try {
      const { error: propertyError } = await supabase
        .from("properties")
        .update({
          street_address: propertyForm.streetAddress.trim(),
          city: propertyForm.city.trim(),
          state_name: propertyForm.stateName.trim(),
          zip: propertyForm.zip.trim(),
          property_type: propertyForm.propertyType,
          units: propertyForm.units,
          unit_name: propertyForm.unitName.trim() || null,
          property_label: propertyForm.propertyLabel.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", propertyId)
        .eq("owner_profile_id", profileId);

      if (propertyError) throw propertyError;

      const { error: leaseError } = await supabase
        .from("leases")
        .update({
          start_date: leaseForm.startDate,
          end_date: leaseForm.endDate,
          monthly_rent: Number(leaseForm.monthlyRent),
          security_deposit: leaseForm.securityDeposit
            ? Number(leaseForm.securityDeposit)
            : null,
          rent_due_day: leaseForm.rentDueDay,
        })
        .eq("id", leaseId);

      if (leaseError) throw leaseError;

      const primaryEmailChanged =
        originalPrimaryEmail &&
        tenantForm.email.trim().toLowerCase() !==
          originalPrimaryEmail.trim().toLowerCase();

      if (primaryTenantId) {
        const primaryTenantUpdate: any = {
        first_name: tenantForm.firstName.trim(),
        last_name: tenantForm.lastName.trim(),
        email: tenantForm.email.trim(),
        phone: tenantForm.phone.trim() || null,
        };

    if (primaryEmailChanged) {
    primaryTenantUpdate.invite_status = "pending";
    primaryTenantUpdate.invite_sent_at = null;
    }

    const { error: primaryTenantError } = await supabase
     .from("lease_tenants")
     .update(primaryTenantUpdate)
    .eq("id", primaryTenantId);

    if (primaryTenantError) throw primaryTenantError;
      }

      if (deletedTenantIds.length > 0) {
  const { error: deleteTenantError } = await supabase
    .from("lease_tenants")
    .delete()
    .in("id", deletedTenantIds);

  if (deleteTenantError) throw deleteTenantError;
}

      for (const tenant of additionalTenants) {
        if (tenant.existingId) {
          const { error } = await supabase
            .from("lease_tenants")
            .update({
              first_name: tenant.firstName.trim(),
              last_name: tenant.lastName.trim(),
              email: tenant.email.trim() || null,
              phone: tenant.phone.trim() || null,
            })
            .eq("id", tenant.existingId);

          if (error) throw error;
        } else {
          const { error } = await supabase.from("lease_tenants").insert({
            lease_id: leaseId,
            first_name: tenant.firstName.trim(),
            last_name: tenant.lastName.trim(),
            email: tenant.email.trim() || null,
            phone: tenant.phone.trim() || null,
            tenant_role: "secondary",
            invite_status: "not_sent",
          });

          if (error) throw error;
        }
      }

      await supabase.from("lease_amounts").delete().eq("lease_id", leaseId);

      if (additionalAmounts.length > 0) {
        const { error: amountError } = await supabase
          .from("lease_amounts")
          .insert(
            additionalAmounts.map((item) => ({
              lease_id: leaseId,
              amount_type: item.type,
              amount: Number(item.amount),
            }))
          );

        if (amountError) throw amountError;
      }

      if (preferenceId) {
        const { error: preferenceError } = await supabase
          .from("lease_preferences")
          .update({
            notification_phone: preferencesForm.phone.trim() || null,
            whatsapp_enabled: preferencesForm.whatsappEnabled,
            sms_enabled: preferencesForm.smsEnabled,
            landlord_absorbs_fee: preferencesForm.landlordAbsorbsFee,
            authorized_agreement: preferencesForm.authorizedAgreement,
            terms_agreement: preferencesForm.termsAgreement,
          })
          .eq("id", preferenceId);

        if (preferenceError) throw preferenceError;
      } else {
  const now = new Date().toISOString();

  const { error: preferenceInsertError } = await supabase
    .from("lease_preferences")
    .upsert(
      {
        lease_id: leaseId,
        notification_email: loginEmail,
        notification_phone: preferencesForm.phone.trim() || null,
        whatsapp_enabled: preferencesForm.whatsappEnabled,
        sms_enabled: preferencesForm.smsEnabled,
        landlord_absorbs_fee: preferencesForm.landlordAbsorbsFee,
        authorized_agreement: preferencesForm.authorizedAgreement,
        terms_agreement: preferencesForm.termsAgreement,
        authorized_agreed_at: preferencesForm.authorizedAgreement ? now : null,
        terms_agreed_at: preferencesForm.termsAgreement ? now : null,
      },
      { onConflict: "lease_id" }
    );

  if (preferenceInsertError) throw preferenceInsertError;
}

      await createActivity({
        profile_id: profileId,
        property_id: propertyId,
        lease_id: leaseId,
        activity_type: "property_updated",
        title: "Property updated",
        description: `${propertyForm.propertyLabel.trim()} details were updated.`,
      });

      router.push(`/dashboard/properties/${propertyId}`);
    } catch (error: any) {
  console.error("Full edit save error:", JSON.stringify(error, null, 2));
  console.error("Error message:", error?.message);
  console.error("Error details:", error?.details);
  console.error("Error hint:", error?.hint);
  console.error("Error code:", error?.code);

  alert(
    error?.message ||
      error?.details ||
      "Unable to save updates. Please try again."
  );
} finally {
  setSaving(false);
}
  }

  function handleContinue() {
    if (!canContinue) return;

    if (step < 4) {
      setStep(step + 1);
      return;
    }

    saveEdit();
  }

  function handleBack() {
    if (step > 1) {
      setStep(step - 1);
      return;
    }

    router.push(`/dashboard/properties/${propertyId}`);
  }

  function addAdditionalTenant() {
    if (!additionalFirstName.trim() || !additionalLastName.trim()) return;

    setAdditionalTenants([
      ...additionalTenants,
      {
        id: Date.now(),
        firstName: additionalFirstName.trim(),
        lastName: additionalLastName.trim(),
        email: additionalEmail.trim(),
        phone: additionalPhone.trim(),
      },
    ]);

    setAdditionalFirstName("");
    setAdditionalLastName("");
    setAdditionalEmail("");
    setAdditionalPhone("");
    setAdditionalModalOpen(false);
  }

  function removeAdditionalTenant(id: number) {
  const tenantToRemove = additionalTenants.find((tenant) => tenant.id === id);

  if (tenantToRemove?.existingId) {
    setDeletedTenantIds((prev) => [...prev, tenantToRemove.existingId!]);
  }

  setAdditionalTenants((prev) => prev.filter((tenant) => tenant.id !== id));
}

  function addAdditionalAmount() {
    setAdditionalAmounts([
      ...additionalAmounts,
      {
        id: Date.now(),
        type: "Late Fee",
        amount: "",
      },
    ]);
  }

  function updateAdditionalAmount(
    id: number,
    field: "type" | "amount",
    value: string
  ) {
    setAdditionalAmounts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }

  function removeAdditionalAmount(id: number) {
    setAdditionalAmounts((prev) => prev.filter((item) => item.id !== id));
  }

  function handleDocumentsUpload(files?: FileList | null) {
    if (!files?.length) return;

    setAttachments({
      Documents: Array.from(files)
        .map((file) => file.name)
        .join(", "),
    });
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        Loading edit page...
      </div>
    );
  }

  return (
    <>
      <div className="relative flex h-full min-h-0 flex-col pt-6 sm:pt-8 lg:pt-10">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[260px] sm:px-6 lg:px-0 lg:pr-6 lg:pb-[260px]">
          <div className="mx-auto w-full max-w-[900px]">
            <StepIndicator
              step={step}
              propertyValid={!!propertyValid}
              tenantValid={!!tenantValid}
              leaseValid={!!leaseValid}
            />

            <div className="mt-4 scale-[1.01] lg:mt-5">
              {step === 1 && (
                <PropertyStep
                  propertyForm={propertyForm}
                  setPropertyForm={setPropertyForm}
                />
              )}

              {step === 2 && (
                <TenantStep
                  tenantForm={tenantForm}
                  setTenantForm={setTenantForm}
                  additionalTenants={additionalTenants}
                  removeAdditionalTenant={removeAdditionalTenant}
                  openAdditionalTenantModal={() => setAdditionalModalOpen(true)}
                />
              )}

              {step === 3 && (
                <LeaseStep
                  leaseForm={leaseForm}
                  setLeaseForm={setLeaseForm}
                  additionalAmounts={additionalAmounts}
                  addAdditionalAmount={addAdditionalAmount}
                  updateAdditionalAmount={updateAdditionalAmount}
                  removeAdditionalAmount={removeAdditionalAmount}
                  attachments={attachments}
                  handleDocumentsUpload={handleDocumentsUpload}
                />
              )}

              {step === 4 && (
                <PreferencesStep
                  loginEmail={loginEmail}
                  preferencesForm={preferencesForm}
                  setPreferencesForm={setPreferencesForm}
                />
              )}
            </div>

            <div className="fixed bottom-[22px] left-[285px] right-0 z-20 hidden bg-white px-8 pb-6 pt-5 lg:block">
              <div className="mx-auto w-full max-w-[900px]">
                <div className="mb-7">
                  <div className="flex items-center justify-between text-[13px] font-medium text-zinc-500">
                    <span>Step {step} of 4</span>
                    <span>{step === 4 ? "90%" : `${progress}%`}</span>
                  </div>

                  <div className="mt-3 h-[10px] overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-full rounded-full bg-[#B9476D] transition-all duration-300"
                      style={{ width: step === 4 ? "90%" : `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-8">
                  <button
                    onClick={handleBack}
                    disabled={saving}
                    className="flex items-center gap-2 text-[15px] font-medium text-zinc-500 transition hover:text-zinc-900 disabled:opacity-50"
                  >
                    <span className="text-[18px]">←</span>
                    {step === 1 ? "Cancel" : "Back"}
                  </button>

                  <button
                    onClick={handleContinue}
                    disabled={!canContinue || saving}
                    className={`h-12 min-w-[280px] rounded-2xl px-8 text-[15px] font-semibold transition ${
                      canContinue && !saving
                        ? "bg-[#B9476D] text-white hover:bg-[#A93F64]"
                        : "cursor-not-allowed bg-zinc-100 text-zinc-400"
                    }`}
                  >
                    {saving ? "Saving..." : step === 4 ? "Save Updates" : "Continue"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-200 bg-white px-4 pb-4 pt-3 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] sm:px-6 lg:hidden">
          <div className="mx-auto grid w-full max-w-[760px] gap-3">
            <div>
              <div className="flex items-center justify-between text-[13px] text-zinc-500">
                <span>Step {step} of 4</span>
                <span>{step === 4 ? "90%" : `${progress}%`}</span>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-[#B9476D] transition-all duration-300"
                  style={{ width: step === 4 ? "90%" : `${progress}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-[0.3fr_0.7fr] items-center gap-4">
              <button
                onClick={handleBack}
                disabled={saving}
                className="flex shrink-0 items-center gap-2 px-1 text-[15px] font-medium text-zinc-500 transition hover:text-zinc-900 disabled:opacity-50"
              >
                <span className="text-[18px]">←</span>
                {step === 1 ? "Cancel" : "Back"}
              </button>

              <button
                onClick={handleContinue}
                disabled={!canContinue || saving}
                className={`h-12 w-full rounded-2xl px-6 text-[15px] font-semibold transition ${
                  canContinue && !saving
                    ? "bg-[#B9476D] text-white hover:bg-[#A93F64]"
                    : "cursor-not-allowed bg-zinc-100 text-zinc-400"
                }`}
              >
                {saving ? "Saving..." : step === 4 ? "Save Updates" : "Continue"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {additionalModalOpen && (
        <AddTenantModal
          additionalFirstName={additionalFirstName}
          additionalLastName={additionalLastName}
          additionalEmail={additionalEmail}
          additionalPhone={additionalPhone}
          setAdditionalFirstName={setAdditionalFirstName}
          setAdditionalLastName={setAdditionalLastName}
          setAdditionalEmail={setAdditionalEmail}
          setAdditionalPhone={setAdditionalPhone}
          onClose={() => setAdditionalModalOpen(false)}
          onAdd={addAdditionalTenant}
        />
      )}
    </>
  );
}