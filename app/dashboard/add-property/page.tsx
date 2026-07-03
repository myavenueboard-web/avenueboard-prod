"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getOrCreateProfile } from "@/lib/getOrCreateProfile";
import { createActivity } from "@/lib/createActivity";
import { triggerEmailEvent } from "@/lib/email/triggerEmailEvent";

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
  source?: "auto" | "manual";
  manuallyEdited?: boolean;
};

type DocumentAttachment = {
  id: string;
  name: string;
  type?: string;
  size?: number;
};

type PendingLeaseDocument = DocumentAttachment & {
  file: File;
};

type SupabaseLikeError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
  statusCode?: number;
};

const LEASE_DOCUMENT_BUCKET = "lease-documents";

type CreatedPropertyRecord = {
  id: string;
};

type CreatedLeaseRecord = {
  id: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

function isValidOptionalPhone(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return true;

  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

function getDocumentDetails(attachments: Record<string, string>) {
  if (attachments.DocumentDetails) {
    try {
      return JSON.parse(attachments.DocumentDetails) as DocumentAttachment[];
    } catch {
      return [];
    }
  }

  return (attachments.Documents || "")
    .split(",")
    .map((name, index) => name.trim() && { id: `${name}-${index}`, name })
    .filter(Boolean) as DocumentAttachment[];
}

function getNextFirstOfMonthDate() {
  const today = new Date();
  const nextFirst = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  return `${nextFirst.getFullYear()}-${String(
    nextFirst.getMonth() + 1
  ).padStart(2, "0")}-${String(nextFirst.getDate()).padStart(2, "0")}`;
}

function isNewLeaseStartAllowed(value: string) {
  const start = parseLocalDate(value);
  if (!start) return false;

  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const earliestAllowed = new Date(todayStart);
  earliestAllowed.setDate(todayStart.getDate() - 15);

  return start >= earliestAllowed;
}

function parseLocalDate(value: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function createSubmissionId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();

  return `add-property-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function createPendingDocumentId(file: File) {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();

  return `${file.name}-${file.size}-${file.lastModified}-${Date.now()}`;
}

function sanitizeStorageFileName(name: string) {
  const fallbackName = "lease-document";
  const sanitized = (name.trim() || fallbackName)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized || fallbackName;
}

function createLeaseDocumentStoragePath(propertyId: string, file: File) {
  return `${propertyId}/${createPendingDocumentId(file)}-${sanitizeStorageFileName(
    file.name
  )}`;
}

function describeSupabaseError(error: unknown) {
  if (!error) return null;

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === "object") {
    const typedError = error as SupabaseLikeError;

    return {
      message: typedError.message || null,
      code: typedError.code || null,
      details: typedError.details || null,
      hint: typedError.hint || null,
      statusCode: typedError.statusCode || typedError.status || null,
      raw: JSON.stringify(error),
    };
  }

  return {
    message: String(error),
  };
}

function getSupabaseErrorMessage(error: unknown) {
  if (!error) return "Unknown Supabase error";
  if (error instanceof Error) return error.message || "Unknown Supabase error";

  if (typeof error === "object") {
    const typedError = error as SupabaseLikeError;
    return (
      typedError.message ||
      typedError.details ||
      typedError.hint ||
      JSON.stringify(error)
    );
  }

  return String(error);
}

function logLeaseDocumentUploadDebug(
  label: string,
  error: unknown,
  context?: Record<string, unknown>
) {
  if (process.env.NODE_ENV !== "development") return;

  console.error(label, {
    error: describeSupabaseError(error),
    context,
  });
}

function toDocumentAttachment(file: PendingLeaseDocument): DocumentAttachment {
  return {
    id: file.id,
    name: file.name,
    type: file.type,
    size: file.size,
  };
}

async function uploadLeaseDocuments({
  files,
  propertyId,
  leaseId,
  profileId,
}: {
  files: PendingLeaseDocument[];
  propertyId: string;
  leaseId: string;
  profileId: string;
}) {
  for (const fileItem of files) {
    const { data: existingDocument, error: existingDocumentError } =
      await supabase
        .from("lease_documents")
        .select("id")
        .eq("lease_id", leaseId)
        .eq("file_name", fileItem.file.name)
        .eq("file_size", fileItem.file.size)
        .maybeSingle();

    if (existingDocumentError) {
      throw new Error(
        `Document lookup failed for "${fileItem.file.name}" in table "lease_documents": ${getSupabaseErrorMessage(
          existingDocumentError
        )}`
      );
    }

    if (existingDocument) continue;

    const filePath = createLeaseDocumentStoragePath(propertyId, fileItem.file);
    const uploadContext = {
      bucket: LEASE_DOCUMENT_BUCKET,
      filePath,
      originalFileName: fileItem.file.name,
      sanitizedFileName: sanitizeStorageFileName(fileItem.file.name),
      fileType: fileItem.file.type,
      fileSize: fileItem.file.size,
      propertyId,
      leaseId,
      profileId,
    };

    if (!filePath.startsWith(`${propertyId}/`) || filePath.includes("//")) {
      logLeaseDocumentUploadDebug(
        "Lease document upload blocked before storage",
        null,
        {
          ...uploadContext,
          stage: "storage path generation",
        }
      );
      throw new Error(
        `Unable to prepare storage path for "${fileItem.file.name}".`
      );
    }

    const { error: uploadError } = await supabase.storage
      .from(LEASE_DOCUMENT_BUCKET)
      .upload(filePath, fileItem.file);

    if (uploadError) {
      logLeaseDocumentUploadDebug(
        "Lease document storage upload failed",
        uploadError,
        {
          ...uploadContext,
          stage: "storage upload",
          possibleCauses: [
            "missing lease-documents bucket",
            "storage RLS/policy rejected insert",
            "bucket file size or MIME restriction",
            "invalid storage path",
          ],
        }
      );
      throw new Error(
        `Storage upload failed for "${fileItem.file.name}" in bucket "${LEASE_DOCUMENT_BUCKET}": ${getSupabaseErrorMessage(
          uploadError
        )}`
      );
    }

    const { error: insertError } = await supabase
      .from("lease_documents")
      .insert({
        property_id: propertyId,
        lease_id: leaseId,
        file_name: fileItem.file.name,
        file_type: fileItem.file.type || null,
        file_size: fileItem.file.size,
        storage_path: filePath,
        uploaded_by_profile_id: profileId,
      });

    if (insertError) {
      logLeaseDocumentUploadDebug(
        "Lease document metadata insert failed",
        insertError,
        {
          ...uploadContext,
          stage: "lease_documents insert",
          table: "lease_documents",
          insertedColumns: [
            "property_id",
            "lease_id",
            "file_name",
            "file_type",
            "file_size",
            "storage_path",
            "uploaded_by_profile_id",
          ],
          possibleCauses: [
            "missing lease_documents column",
            "lease_documents RLS insert policy",
            "foreign key rejected property_id or lease_id",
            "landlord profile lacks permission for this property",
          ],
        }
      );

      const { error: cleanupError } = await supabase.storage
        .from(LEASE_DOCUMENT_BUCKET)
        .remove([filePath]);

      if (cleanupError) {
        logLeaseDocumentUploadDebug(
          "Lease document storage cleanup failed",
          cleanupError,
          {
            ...uploadContext,
            stage: "storage cleanup after DB insert failure",
          }
        );
      }

      throw new Error(
        `Document record insert failed for "${fileItem.file.name}" in table "lease_documents": ${getSupabaseErrorMessage(
          insertError
        )}`
      );
    }

    try {
      await createActivity({
        profile_id: profileId,
        property_id: propertyId,
        lease_id: leaseId,
        activity_type: "document_uploaded",
        title: "Document uploaded",
        description: fileItem.file.name,
      });
    } catch (activityError) {
      logLeaseDocumentUploadDebug(
        "Lease document activity log failed after upload",
        activityError,
        {
          ...uploadContext,
          stage: "activity log after document upload",
          table: "activity_logs",
        }
      );
    }
  }
}

async function getExistingPropertyForSubmission({
  profileId,
  submissionId,
}: {
  profileId: string;
  submissionId: string;
}) {
  const { data, error } = await supabase
    .from("properties")
    .select("id")
    .eq("owner_profile_id", profileId)
    .eq("creation_submission_id", submissionId)
    .maybeSingle();

  if (error) throw error;

  return data as CreatedPropertyRecord | null;
}

async function createOrReuseProperty({
  profileId,
  submissionId,
  propertyForm,
  existingPropertyId,
}: {
  profileId: string;
  submissionId: string;
  propertyForm: {
    streetAddress: string;
    city: string;
    stateName: string;
    zip: string;
    propertyType: string;
    units: string;
    unitName: string;
    propertyLabel: string;
  };
  existingPropertyId?: string;
}) {
  if (existingPropertyId) {
    const { data, error } = await supabase
      .from("properties")
      .select("id")
      .eq("id", existingPropertyId)
      .eq("owner_profile_id", profileId)
      .single();

    if (error) throw error;
    return data as CreatedPropertyRecord;
  }

  const existing = await getExistingPropertyForSubmission({
    profileId,
    submissionId,
  });

  if (existing) return existing;

  const { data, error } = await supabase
    .from("properties")
    .insert({
      owner_profile_id: profileId,
      creation_submission_id: submissionId,
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
    .select("id")
    .single();

  if (!error && data) return data as CreatedPropertyRecord;

  if ((error as SupabaseLikeError | null)?.code === "23505") {
    const conflictProperty = await getExistingPropertyForSubmission({
      profileId,
      submissionId,
    });

    if (conflictProperty) return conflictProperty;
  }

  throw error;
}

async function createOrReuseLease({
  propertyId,
  leaseForm,
  leaseSetupType,
  paymentTrackingStartDate,
  existingLeaseId,
}: {
  propertyId: string;
  leaseForm: {
    startDate: string;
    endDate: string;
    monthlyRent: string;
    securityDeposit: string;
    rentDueDay: string;
  };
  leaseSetupType: "new" | "existing";
  paymentTrackingStartDate: string;
  existingLeaseId?: string;
}) {
  if (existingLeaseId) {
    const { data, error } = await supabase
      .from("leases")
      .select("id")
      .eq("id", existingLeaseId)
      .eq("property_id", propertyId)
      .single();

    if (error) throw error;
    return data as CreatedLeaseRecord;
  }

  const { data: existingLeases, error: existingLeaseError } = await supabase
    .from("leases")
    .select("id")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (existingLeaseError) throw existingLeaseError;
  if (existingLeases?.[0]) return existingLeases[0] as CreatedLeaseRecord;

  const { data, error } = await supabase
    .from("leases")
    .insert({
      property_id: propertyId,
      start_date: leaseForm.startDate,
      end_date: leaseForm.endDate,
      monthly_rent: Number(leaseForm.monthlyRent),
      security_deposit: leaseForm.securityDeposit
        ? Number(leaseForm.securityDeposit)
        : null,
      rent_due_day: leaseForm.rentDueDay,
      lease_setup_type: leaseSetupType,
      payment_tracking_start_date:
        leaseSetupType === "existing" ? paymentTrackingStartDate : null,
      lease_status: "active",
      payment_status: "bank_pending",
    })
    .select("id")
    .single();

  if (error) throw error;

  return data as CreatedLeaseRecord;
}

const STARTER_PROPERTY_NOTES = [
  {
    note_type: "shared",
    title: "Welcome to AvenueBoard",
    body: "Use shared notes to communicate important information with your resident, such as move-in instructions, maintenance updates, reminders, or lease-related notices.",
  },
  {
    note_type: "private",
    title: "Save reminders, updates, and important property notes.",
    body: "Getting Started • AvenueBoard",
  },
] as const;

function getStarterNoteKind(note: { text?: string | null; note_type?: string | null }) {
  const title = String(note.text || "").split("\n")[0].trim();

  if (note.note_type === "shared" && title === "Welcome to AvenueBoard") {
    return "shared";
  }

  if (
    note.note_type === "private" &&
    (title === "Save reminders, updates, and important property notes." ||
      title === "Welcome to your Property Workspace")
  ) {
    return "private";
  }

  return "";
}

async function ensureStarterPropertyNotes({
  propertyId,
  leaseId,
  profileId,
}: {
  propertyId: string;
  leaseId: string;
  profileId: string;
}) {
  const { data: existingNotes, error: existingNotesError } = await supabase
    .from("property_notes")
    .select("id, text, note_type")
    .eq("property_id", propertyId);

  if (existingNotesError) throw existingNotesError;

  const existingStarterKinds = new Set(
    (existingNotes || []).map((note) => getStarterNoteKind(note)).filter(Boolean)
  );
  const normalNoteCount = (existingNotes || []).filter(
    (note) => !getStarterNoteKind(note)
  ).length;
  const shouldSeedAllStarters = !existingNotes?.length;
  const shouldRepairStarterOnlyProperty =
    Boolean(existingNotes?.length) &&
    normalNoteCount === 0 &&
    existingStarterKinds.size > 0 &&
    existingStarterKinds.size < 2;

  if (!shouldSeedAllStarters && !shouldRepairStarterOnlyProperty) return;

  const now = Date.now();
  const starterNotes = STARTER_PROPERTY_NOTES.filter(
    (note) => !existingStarterKinds.has(note.note_type)
  ).map((note, index) => ({
    property_id: propertyId,
    lease_id: leaseId,
    profile_id: profileId,
    note_type: note.note_type,
    text: `${note.title}\n\n${note.body}`,
    created_by_role: "landlord",
    created_at: new Date(now - index * 1000).toISOString(),
  }));

  const { error } = await supabase.from("property_notes").insert(starterNotes);
  if (error) throw error;
}

export default function AddPropertyPage() {
  const router = useRouter();
  const submitInProgressRef = useRef(false);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [profileId, setProfileId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);
  const [submissionId] = useState(() => createSubmissionId());
  const [createdPropertyId, setCreatedPropertyId] = useState("");
  const [createdLeaseId, setCreatedLeaseId] = useState("");
  const [propertyCreatedEventSent, setPropertyCreatedEventSent] =
    useState(false);
  const [tenantRowsCreated, setTenantRowsCreated] = useState(false);
  const [amountRowsSynced, setAmountRowsSynced] = useState(false);
  const [preferencesCreated, setPreferencesCreated] = useState(false);
  const [tenantValidationAttempted, setTenantValidationAttempted] =
    useState(false);
  const [leaseValidationAttempted, setLeaseValidationAttempted] = useState(0);

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
  const [leaseSetupType, setLeaseSetupType] = useState<"new" | "existing">(
    "new"
  );
  const [leaseSetupConfirmed, setLeaseSetupConfirmed] = useState(false);
  const [paymentTrackingStartDate, setPaymentTrackingStartDate] = useState(
    getNextFirstOfMonthDate()
  );

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
  const [leaseDocumentFiles, setLeaseDocumentFiles] = useState<
    PendingLeaseDocument[]
  >([]);
  const [leaseDocumentError, setLeaseDocumentError] = useState("");

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
    isValidEmail(tenantForm.email) &&
    isValidOptionalPhone(tenantForm.phone);

  const leaseValid =
    leaseForm.startDate.trim() &&
    leaseForm.endDate.trim() &&
    leaseForm.monthlyRent.trim() &&
    leaseForm.rentDueDay.trim() &&
    (leaseSetupType === "new" ? isNewLeaseStartAllowed(leaseForm.startDate) : paymentTrackingStartDate.trim());

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

  const hideBottomContinue = step === 3 && !leaseSetupConfirmed;
  const progress = (step / 4) * 100;

  async function savePropertySetup(connectBankAfterSave = false) {
    if (!profileId || !canContinue || saving || submitInProgressRef.current) {
      return;
    }

    submitInProgressRef.current = true;
    setSaving(true);

    try {
      const property = await createOrReuseProperty({
        profileId,
        submissionId,
        propertyForm,
        existingPropertyId: createdPropertyId,
      });
      setCreatedPropertyId(property.id);

      if (!propertyCreatedEventSent) {
        await triggerEmailEvent({
          trigger: "property_created",
          propertyId: property.id,
        });
        setPropertyCreatedEventSent(true);
      }

      const lease = await createOrReuseLease({
        propertyId: property.id,
        leaseForm,
        leaseSetupType,
        paymentTrackingStartDate,
        existingLeaseId: createdLeaseId,
      });
      setCreatedLeaseId(lease.id);

      await ensureStarterPropertyNotes({
        propertyId: property.id,
        leaseId: lease.id,
        profileId,
      });

      const tenantRows = [
        {
          lease_id: lease.id,
          first_name: tenantForm.firstName.trim(),
          last_name: tenantForm.lastName.trim(),
          email: tenantForm.email.trim(),
          phone: tenantForm.phone.trim() || null,
          tenant_role: "primary",
          invite_status: "not_sent",
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

      const { data: existingTenants, error: existingTenantsError } =
        await supabase
          .from("lease_tenants")
          .select("id")
          .eq("lease_id", lease.id)
          .limit(1);

      if (existingTenantsError) throw existingTenantsError;

      if (!tenantRowsCreated && !existingTenants?.length) {
        const { error: tenantsError } = await supabase
          .from("lease_tenants")
          .insert(tenantRows)
          .select("id");

        if (tenantsError) throw tenantsError;

        setTenantRowsCreated(true);
      } else if (existingTenants?.length) {
        setTenantRowsCreated(true);
      }

      if (!amountRowsSynced) {
        const { error: deleteAmountsError } = await supabase
          .from("lease_amounts")
          .delete()
          .eq("lease_id", lease.id);

        if (deleteAmountsError) throw deleteAmountsError;

        const amountRows = additionalAmounts.map((item) => ({
          lease_id: lease.id,
          amount_type: item.type,
          amount: Number(item.amount),
        }));

        if (amountRows.length > 0) {
          const { error: amountsError } = await supabase
            .from("lease_amounts")
            .insert(amountRows);

          if (amountsError) throw amountsError;
        }

        setAmountRowsSynced(true);
      }

      const now = new Date().toISOString();

      if (!preferencesCreated) {
        const { error: preferencesError } = await supabase
          .from("lease_preferences")
          .upsert(
            {
              lease_id: lease.id,
              notification_email: user?.email || "",
              notification_phone: preferencesForm.phone.trim() || null,
              whatsapp_enabled: preferencesForm.whatsappEnabled,
              sms_enabled: preferencesForm.smsEnabled,
              landlord_absorbs_fee: preferencesForm.landlordAbsorbsFee === true,
              authorized_agreement: preferencesForm.authorizedAgreement,
              terms_agreement: preferencesForm.termsAgreement,
              authorized_agreed_at: preferencesForm.authorizedAgreement
                ? now
                : null,
              terms_agreed_at: preferencesForm.termsAgreement ? now : null,
            },
            { onConflict: "lease_id" }
          );

        if (preferencesError) throw preferencesError;
        setPreferencesCreated(true);
      }

      if (leaseDocumentFiles.length > 0) {
        try {
          await uploadLeaseDocuments({
            files: leaseDocumentFiles,
            propertyId: property.id,
            leaseId: lease.id,
            profileId,
          });
          setLeaseDocumentError("");
        } catch (error) {
          logLeaseDocumentUploadDebug(
            "Lease document upload flow failed",
            error,
            {
              stage: "add property save flow",
              bucket: LEASE_DOCUMENT_BUCKET,
              propertyId: property.id,
              leaseId: lease.id,
              profileId,
              fileCount: leaseDocumentFiles.length,
            }
          );
          setStep(3);
          setLeaseDocumentError(
            error instanceof Error
              ? error.message
              : "Unable to upload lease documents. Please remove the failed file or try again."
          );
          throw error;
        }
      }

      await Promise.allSettled([
        createActivity({
          profile_id: profileId,
          property_id: property.id,
          lease_id: lease.id,
          activity_type: "property_added",
          title: "Property added",
          description: `${propertyForm.propertyLabel.trim()} was added to your board.`,
        }),
        createActivity({
          profile_id: profileId,
          property_id: property.id,
          lease_id: lease.id,
          activity_type: "tenant_added",
          title: "Resident record added",
          description: `${tenantForm.firstName.trim()} ${tenantForm.lastName.trim()} was added as the primary resident.`,
        }),
        createActivity({
          profile_id: profileId,
          property_id: property.id,
          lease_id: lease.id,
          activity_type: "bank_pending",
          title: "Bank setup pending",
          description: "Connect your bank account to activate rent collection.",
        }),
      ]);

      if (connectBankAfterSave) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          alert("Please sign in again before connecting your bank account.");
          return;
        }

        const response = await fetch("/api/stripe/connect-account", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            propertyId: property.id,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.url) {
          alert(data.error || "Unable to start bank setup. Please try again.");
          return;
        }

        window.location.href = data.url;
        return;
      }

      router.push("/dashboard");
    } catch (error) {
      console.error("Property setup save error:", error);
      alert("Something went wrong while saving. Please try again.");
    } finally {
      submitInProgressRef.current = false;
      setSaving(false);
    }
  }

  function handleContinue() {
    if (!canContinue) {
      if (step === 2) setTenantValidationAttempted(true);
      if (step === 3) setLeaseValidationAttempted((attempts) => attempts + 1);
      return;
    }

    if (step < 4) {
      if (step === 2) setTenantValidationAttempted(false);
      if (step === 3) setLeaseValidationAttempted(0);
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

  function addAdditionalAmount(
    type = "One-time fee",
    amount = "",
    options: Pick<AdditionalAmount, "source" | "manuallyEdited"> = {}
  ) {
    setAdditionalAmounts([
      ...additionalAmounts,
      {
        id: Date.now(),
        type,
        amount,
        source: options.source || "manual",
        manuallyEdited: options.manuallyEdited || false,
      },
    ]);
  }

  function updateAdditionalAmount(
    id: number,
    field: "type" | "amount",
    value: string,
    options: Partial<Pick<AdditionalAmount, "source" | "manuallyEdited">> = {}
  ) {
    setAdditionalAmounts((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value, ...options } : item
      )
    );
  }

  function removeAdditionalAmount(id: number) {
    setAdditionalAmounts((prev) => prev.filter((item) => item.id !== id));
  }

  function handleDocumentsUpload(files?: FileList | null) {
    if (!files?.length) return;

    const selectedFiles = Array.from(files).map((file) => ({
      id: createPendingDocumentId(file),
      name: file.name,
      type: file.type || "",
      size: file.size,
      file,
    }));

    setLeaseDocumentError("");
    setLeaseDocumentFiles((prev) => [...prev, ...selectedFiles]);
    setAttachments((prev) => {
      const existing = getDocumentDetails(prev);
      const next = [
        ...existing,
        ...selectedFiles.map((file) => toDocumentAttachment(file)),
      ];

      return {
        ...prev,
        Documents: next.map((file) => file.name).join(", "),
        DocumentDetails: JSON.stringify(next),
      };
    });
  }

  function removeDocumentAttachment(id: string) {
    setLeaseDocumentError("");
    setLeaseDocumentFiles((prev) => prev.filter((file) => file.id !== id));
    setAttachments((prev) => {
      const next = getDocumentDetails(prev).filter((file) => file.id !== id);

      return {
        ...prev,
        Documents: next.map((file) => file.name).join(", "),
        DocumentDetails: JSON.stringify(next),
      };
    });
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-[15px] text-zinc-500">
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
                  validationAttempted={tenantValidationAttempted}
                />
              )}

              {step === 3 && (
                <LeaseStep
                  leaseForm={leaseForm}
                  setLeaseForm={setLeaseForm}
                  leaseSetupType={leaseSetupType}
                  setLeaseSetupType={setLeaseSetupType}
                  leaseSetupConfirmed={leaseSetupConfirmed}
                  setLeaseSetupConfirmed={setLeaseSetupConfirmed}
                  paymentTrackingStartDate={paymentTrackingStartDate}
                  setPaymentTrackingStartDate={setPaymentTrackingStartDate}
                  additionalAmounts={additionalAmounts}
                  addAdditionalAmount={addAdditionalAmount}
                  updateAdditionalAmount={updateAdditionalAmount}
                  removeAdditionalAmount={removeAdditionalAmount}
                  attachments={attachments}
                  documentAttachments={leaseDocumentFiles}
                  documentError={leaseDocumentError}
                  handleDocumentsUpload={handleDocumentsUpload}
                  removeDocumentAttachment={removeDocumentAttachment}
                  validationAttempted={leaseValidationAttempted}
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
  <div className="mx-auto w-full max-w-[1060px] -translate-x-8">
    <div className="mb-7">
      <div className="flex items-center justify-between text-[14px] font-medium text-zinc-500">
        <span>Step {step} of 4</span>
        <span>{step === 4 ? "90%" : `${progress}%`}</span>
      </div>

      <div className="mt-3 h-[10px] overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full bg-[#2563EB] transition-all duration-300"
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

      {!hideBottomContinue && (
      <div className="flex min-w-[440px] items-center gap-3">
        {step === 4 && (
          <button
            type="button"
            onClick={() => savePropertySetup(false)}
            disabled={saving}
            className="h-12 flex-1 rounded-xl border border-zinc-200 bg-white px-6 text-[15px] font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
          >
            {saving ? "Creating property..." : "Set up later"}
          </button>
        )}

        <button
          onClick={step === 4 ? () => savePropertySetup(true) : handleContinue}
          disabled={saving || (step === 3 ? !leaseValid : !canContinue)}
          className={`h-12 flex-1 rounded-xl px-8 text-[15px] font-semibold transition ${
            !saving && (step === 3 ? leaseValid : canContinue)
              ? "bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
              : "cursor-not-allowed bg-zinc-100 text-zinc-400"
          }`}
        >
          {saving
            ? "Creating property..."
            : step === 4
            ? "Connect Bank"
            : "Continue"}
        </button>
      </div>
      )}
    </div>
  </div>
</div>

          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-200 bg-white px-4 pb-4 pt-3 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] sm:px-6 lg:hidden">
          <div className="mx-auto grid w-full max-w-[760px] gap-3">
            <div>
              <div className="flex items-center justify-between text-[14px] text-zinc-500">
                <span>Step {step} of 4</span>
                <span>{step === 4 ? "90%" : `${progress}%`}</span>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-[#2563EB] transition-all duration-300"
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

              {!hideBottomContinue && (
                <button
                  onClick={
                    step === 4 ? () => savePropertySetup(true) : handleContinue
                  }
                  disabled={saving || (step === 3 ? !leaseValid : !canContinue)}
                  className={`h-12 w-full rounded-xl px-6 text-[15px] font-semibold transition ${
                    !saving && (step === 3 ? leaseValid : canContinue)
                      ? "bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
                      : "cursor-not-allowed bg-zinc-100 text-zinc-400"
                  }`}
                >
                  {saving
                    ? "Creating property..."
                    : step === 4
                    ? "Connect Bank"
                    : "Continue"}
                </button>
              )}
            </div>

            {step === 4 && !hideBottomContinue && (
              <button
                type="button"
                onClick={() => savePropertySetup(false)}
                disabled={saving}
                className="h-11 rounded-xl border border-zinc-200 bg-white text-[15px] font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
              >
                {saving ? "Creating property..." : "Set up later"}
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
