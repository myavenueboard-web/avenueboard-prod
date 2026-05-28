"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getOrCreateProfile } from "@/lib/getOrCreateProfile";
import { createActivity } from "@/lib/createActivity";

import StepIndicator from "../../components/add-property/StepIndicator";
import PropertyStep from "../../components/add-property/PropertyStep";
import TenantStep from "../../components/add-property/TenantStep";
import LeaseStep from "../../components/add-property/LeaseStep";
import PreferencesStep from "../../components/add-property/PreferencesStep";
import AddTenantModal from "../../components/add-property/AddTenantModal";

type UserProfile = {
  name: string;
  email: string;
};

type AdditionalTenant = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

type AdditionalAmount = {
  id: number;
  type: string;
  amount: string;
};

export default function AddPropertyPage() {
  const router = useRouter();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [profileId, setProfileId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);

  const [additionalModalOpen, setAdditionalModalOpen] = useState(false);
  const [additionalFirstName, setAdditionalFirstName] = useState("");
  const [additionalLastName, setAdditionalLastName] = useState("");
  const [additionalEmail, setAdditionalEmail] = useState("");
  const [additionalPhone, setAdditionalPhone] = useState("");

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
    authorizedAgreement: false,
    termsAgreement: false,
  });

  const [additionalTenants, setAdditionalTenants] = useState<AdditionalTenant[]>(
    []
  );

  const [additionalAmounts, setAdditionalAmounts] = useState<AdditionalAmount[]>(
    []
  );

  const [attachments, setAttachments] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data } = await supabase.auth.getUser();

        if (!data.user) {
          router.push("/login");
          return;
        }

        const profile = await getOrCreateProfile();

        const resolvedName =
          profile.display_name || data.user.email?.split("@")[0] || "User";

        setProfileId(profile.id);

        setUser({
          name: resolvedName,
          email: profile.email || data.user.email || "",
        });
      } catch (error) {
        console.error("Add property profile load error:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router]);

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

  async function savePropertySetup(connectBankAfterSave = false) {
    if (!profileId || !canContinue || saving) return;

    setSaving(true);

    try {
      const { data: property, error: propertyError } = await supabase
        .from("properties")
        .insert({
          owner_profile_id: profileId,
          street_address: propertyForm.streetAddress.trim(),
          city: propertyForm.city.trim(),
          state_name: propertyForm.stateName.trim(),
          zip: propertyForm.zip.trim(),
          property_type: propertyForm.propertyType,
          units: propertyForm.units,
          unit_name: propertyForm.unitName.trim() || null,
          property_label: propertyForm.propertyLabel.trim(),
          bank_status: "pending",
          status: "active",
        })
        .select()
        .single();

      if (propertyError) throw propertyError;

      const { data: lease, error: leaseError } = await supabase
        .from("leases")
        .insert({
          property_id: property.id,
          start_date: leaseForm.startDate,
          end_date: leaseForm.endDate,
          monthly_rent: Number(leaseForm.monthlyRent),
          security_deposit: leaseForm.securityDeposit
            ? Number(leaseForm.securityDeposit)
            : null,
          rent_due_day: leaseForm.rentDueDay,
          lease_status: "active",
          payment_status: "bank_pending",
        })
        .select()
        .single();

      if (leaseError) throw leaseError;

      const tenantRows = [
        {
          lease_id: lease.id,
          first_name: tenantForm.firstName.trim(),
          last_name: tenantForm.lastName.trim(),
          email: tenantForm.email.trim(),
          phone: tenantForm.phone.trim() || null,
          tenant_role: "primary",
          invite_status: "pending",
        },
        ...additionalTenants.map((tenant) => ({
          lease_id: lease.id,
          first_name: tenant.firstName.trim(),
          last_name: tenant.lastName.trim(),
          email: tenant.email.trim() || null,
          phone: tenant.phone.trim() || null,
          tenant_role: "secondary",
          invite_status: "not_sent",
        })),
      ];

      const { data: createdTenants, error: tenantsError } = await supabase
        .from("lease_tenants")
        .insert(tenantRows)
        .select("id, email, first_name, last_name, tenant_role, invite_token");

      if (tenantsError) throw tenantsError;

      const tenantInvites = (createdTenants || [])
        .filter((tenant) => tenant.email && tenant.tenant_role === "primary")
        .map((tenant) => ({
          id: tenant.id,
          email: tenant.email as string,
          name:
            `${tenant.first_name || ""} ${tenant.last_name || ""}`.trim() ||
            "Tenant",
          inviteLink: `${window.location.origin}/tenant/accept-invite?token=${tenant.invite_token}`,
        }));

      if (tenantInvites.length > 0) {
        const inviteResults = await Promise.allSettled(
          tenantInvites.map((tenant) =>
            supabase.functions.invoke("resend-email", {
              body: {
                tenantEmail: tenant.email,
                tenantName: tenant.name,
                propertyName: propertyForm.propertyLabel.trim(),
                inviteLink: tenant.inviteLink,
              },
            })
          )
        );

        inviteResults.forEach((result, index) => {
          if (result.status === "rejected") {
            console.warn(
              "Tenant invite email failed:",
              tenantInvites[index]?.email,
              result.reason
            );
          } else if (result.value.error) {
            console.warn(
              "Tenant invite email warning:",
              tenantInvites[index]?.email,
              result.value.error
            );
          }
        });

        await supabase
          .from("lease_tenants")
          .update({
            invite_status: "sent",
            invite_sent_at: new Date().toISOString(),
          })
          .in(
            "id",
            tenantInvites.map((tenant) => tenant.id)
          );
      }

      if (additionalAmounts.length > 0) {
        const amountRows = additionalAmounts.map((item) => ({
          lease_id: lease.id,
          amount_type: item.type,
          amount: Number(item.amount),
        }));

        const { error: amountsError } = await supabase
          .from("lease_amounts")
          .insert(amountRows);

        if (amountsError) throw amountsError;
      }

      const now = new Date().toISOString();

      const { error: preferencesError } = await supabase
        .from("lease_preferences")
        .insert({
          lease_id: lease.id,
          notification_email: user?.email || "",
          notification_phone: preferencesForm.phone.trim() || null,
          whatsapp_enabled: preferencesForm.whatsappEnabled,
          sms_enabled: preferencesForm.smsEnabled,
          landlord_absorbs_fee: preferencesForm.landlordAbsorbsFee,
          authorized_agreement: preferencesForm.authorizedAgreement,
          terms_agreement: preferencesForm.termsAgreement,
          authorized_agreed_at: preferencesForm.authorizedAgreement
            ? now
            : null,
          terms_agreed_at: preferencesForm.termsAgreement ? now : null,
        });

      if (preferencesError) throw preferencesError;

      if (attachments.Documents) {
        const documentRows = attachments.Documents.split(",")
          .map((name) => name.trim())
          .filter(Boolean)
          .map((name) => ({
            lease_id: lease.id,
            file_name: name,
            file_url: null,
            file_type: null,
          }));

        if (documentRows.length > 0) {
          const { error: documentsError } = await supabase
            .from("lease_documents")
            .insert(documentRows);

          if (documentsError) throw documentsError;
        }
      }

      await createActivity({
        profile_id: profileId,
        property_id: property.id,
        lease_id: lease.id,
        activity_type: "property_added",
        title: "Property added",
        description: `${propertyForm.propertyLabel.trim()} was added to your dashboard.`,
      });

      await createActivity({
        profile_id: profileId,
        property_id: property.id,
        lease_id: lease.id,
        activity_type: "tenant_added",
        title: "Tenant record added",
        description: `${tenantForm.firstName.trim()} ${tenantForm.lastName.trim()} was added as the primary tenant.`,
      });

      await createActivity({
        profile_id: profileId,
        property_id: property.id,
        lease_id: lease.id,
        activity_type: "bank_pending",
        title: "Bank setup pending",
        description: "Connect your bank account to activate rent collection.",
      });

      router.push("/dashboard");
    } catch (error) {
      console.error("Property setup save error:", error);
      alert("Something went wrong while saving. Please try again.");
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

    savePropertySetup(true);
  }

  function handleBack() {
    if (step > 1) setStep(step - 1);
    else router.push("/dashboard");
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
        Loading...
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
                  loginEmail={user?.email || ""}
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

      <div className="flex min-w-[440px] items-center gap-3">
        {step === 4 && (
          <button
            type="button"
            onClick={() => savePropertySetup(false)}
            disabled={saving}
            className="h-12 flex-1 rounded-2xl border border-zinc-200 bg-white px-6 text-[14px] font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Set up later"}
          </button>
        )}

        <button
          onClick={step === 4 ? () => savePropertySetup(true) : handleContinue}
          disabled={!canContinue || saving}
          className={`h-12 flex-1 rounded-2xl px-8 text-[15px] font-semibold transition ${
            canContinue && !saving
              ? "bg-[#B9476D] text-white hover:bg-[#A93F64]"
              : "cursor-not-allowed bg-zinc-100 text-zinc-400"
          }`}
        >
          {saving ? "Saving..." : step === 4 ? "Connect Bank" : "Continue"}
        </button>
      </div>
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
                onClick={
                  step === 4 ? () => savePropertySetup(true) : handleContinue
                }
                disabled={!canContinue || saving}
                className={`h-12 w-full rounded-2xl px-6 text-[15px] font-semibold transition ${
                  canContinue && !saving
                    ? "bg-[#B9476D] text-white hover:bg-[#A93F64]"
                    : "cursor-not-allowed bg-zinc-100 text-zinc-400"
                }`}
              >
                {saving
                  ? "Saving..."
                  : step === 4
                  ? "Connect Bank"
                  : "Continue"}
              </button>
            </div>

            {step === 4 && (
              <button
                type="button"
                onClick={() => savePropertySetup(false)}
                disabled={saving}
                className="h-11 rounded-2xl border border-zinc-200 bg-white text-[14px] font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Set up later"}
              </button>
            )}
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