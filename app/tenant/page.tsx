"use client";

import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  CircleDot,
  FileText,
  StickyNote,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getOrCreateProfile } from "@/lib/getOrCreateProfile";

type TenantLease = {
  id: string;
  tenant_access_id: string;
  property_id: string;
  lease_id: string;
  property_label: string;
  street_address: string;
  city: string;
  state_name: string;
  zip: string;
  unit_name: string | null;
  start_date: string | null;
  end_date: string | null;
  monthly_rent: number;
  rent_due_day: string | null;
};

type TenantAccessRow = {
  id: string;
  property_id: string;
  lease_id: string;
};

type TenantPropertyRow = {
  id: string;
  property_label: string | null;
  street_address: string | null;
  city: string | null;
  state_name: string | null;
  zip: string | null;
  unit_name: string | null;
};

type TenantLeaseRow = {
  id: string;
  start_date: string | null;
  end_date: string | null;
  monthly_rent: number | null;
  rent_due_day: string | null;
};

type LeaseDocument = {
  id: string;
  property_id?: string | null;
  lease_id: string;
  file_name: string;
  file_url: string | null;
  file_type: string | null;
  storage_path?: string | null;
  file_size?: number | null;
  uploaded_by_profile_id?: string | null;
  created_at?: string | null;
};

type PropertyNote = {
  id: string;
  property_id: string;
  lease_id: string | null;
  profile_id: string | null;
  note_type: "private" | "shared";
  text: string;
  created_by_role: "landlord" | "tenant";
  created_at: string;
};

type DeleteTarget =
  | {
      type: "note";
      item: PropertyNote;
    }
  | {
      type: "document";
      item: LeaseDocument;
    };

type SupabaseLikeError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
  statusCode?: string | number;
  status?: string | number;
  name?: string;
};

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

function logTenantSupabaseError(
  label: string,
  error: unknown,
  context?: Record<string, unknown>
) {
  console.error(label, {
    error: describeSupabaseError(error),
    context,
  });
}

type PaymentMethod = {
  id: string;
  lease_id: string;
  brand: string | null;
  last4: string | null;
  exp_month: string | null;
  exp_year: string | null;
  is_default: boolean | null;
};

type RentPayment = {
  id: string;
  lease_id: string;
  payment_method_id: string | null;
  amount: number;
  period_label: string | null;
  status: string | null;
  receipt_url: string | null;
  paid_at: string | null;
  created_at: string | null;
};

type ActivityLog = {
  id: string;
  property_id: string | null;
  lease_id: string | null;
  activity_type: string;
  title: string;
  description: string | null;
  created_at: string;
};

type TenantActivityIcon =
  | "payment-success"
  | "payment-pending"
  | "payment-alert"
  | "document"
  | "note"
  | "delete";

type TenantActivity = {
  id: string;
  timestamp: string;
  icon: TenantActivityIcon;
  title: string;
  subtitle: string;
  amount?: string;
  badge?: string;
  badgeClass?: string;
  iconClass: string;
  amountClass?: string;
  propertyId?: string;
  leaseId?: string;
};

type UserInfo = {
  name: string;
  email: string;
};

export default function TenantDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState("");
  const [leases, setLeases] = useState<TenantLease[]>([]);
  const [notes, setNotes] = useState<PropertyNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [documents, setDocuments] = useState<LeaseDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentError, setDocumentError] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [rentPayments, setRentPayments] = useState<RentPayment[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [localActivities, setLocalActivities] = useState<TenantActivity[]>([]);
  const [hasLandlordRole, setHasLandlordRole] = useState(false);
  const [selectedLeaseId, setSelectedLeaseId] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [documentsModalOpen, setDocumentsModalOpen] = useState(false);
  const [activitiesModalOpen, setActivitiesModalOpen] = useState(false);
  const [noteType, setNoteType] = useState<"private" | "shared">("private");
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState("");
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState("");
  const [deletingDocumentId, setDeletingDocumentId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: "Tenant",
    email: "",
  });

  useEffect(() => {
    async function loadTenantDashboard() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        const profile = await getOrCreateProfile();
        setProfileId(profile.id);

        setUserInfo({
          name:
            profile?.display_name ||
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "Tenant",
          email: user.email || profile?.email || "",
        });

        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("profile_id", profile.id);

        setHasLandlordRole(
          (roleData || []).some((item) => item.role === "landlord")
        );

        const { data: accessData, error: accessError } = await supabase
          .from("tenant_access")
          .select("id, property_id, lease_id")
          .eq("tenant_profile_id", profile.id);

        if (accessError) {
          console.error("Tenant access load error:", accessError);
          return;
        }

        const accessRows = (accessData || []) as TenantAccessRow[];

        if (accessRows.length === 0) {
          setLeases([]);
          return;
        }

        const propertyIds = accessRows.map((item) => item.property_id);
        const leaseIds = accessRows.map((item) => item.lease_id);

        const [
          { data: propertyData },
          { data: leaseData },
          { data: docData },
          { data: paymentMethodData },
          { data: rentPaymentData },
        ] = await Promise.all([
          supabase
            .from("properties")
            .select(
              "id, property_label, street_address, city, state_name, zip, unit_name"
            )
            .in("id", propertyIds),

          supabase
            .from("leases")
            .select("id, start_date, end_date, monthly_rent, rent_due_day")
            .in("id", leaseIds),

          supabase
            .from("lease_documents")
            .select(
              "id, property_id, lease_id, file_name, file_url, file_type, storage_path, file_size, uploaded_by_profile_id, created_at"
            )
            .in("lease_id", leaseIds)
            .in("property_id", propertyIds)
            .order("created_at", { ascending: false }),

          supabase
            .from("payment_methods")
            .select("id, lease_id, brand, last4, exp_month, exp_year, is_default")
            .in("lease_id", leaseIds),

          supabase
            .from("rent_payments")
            .select(
              "id, lease_id, payment_method_id, amount, period_label, status, receipt_url, paid_at, created_at"
            )
            .in("lease_id", leaseIds)
            .order("created_at", { ascending: false }),
        ]);

        const propertyMap = new Map(
          ((propertyData || []) as TenantPropertyRow[]).map((property) => [
            property.id,
            property,
          ])
        );

        const leaseMap = new Map(
          ((leaseData || []) as TenantLeaseRow[]).map((lease) => [
            lease.id,
            lease,
          ])
        );

        const normalizedLeases: TenantLease[] = accessRows.map((access) => {
          const property = propertyMap.get(access.property_id);
          const lease = leaseMap.get(access.lease_id);

          return {
            id: access.id,
            tenant_access_id: access.id,
            property_id: access.property_id,
            lease_id: access.lease_id,
            property_label: property?.property_label || "Property",
            street_address: property?.street_address || "",
            city: property?.city || "",
            state_name: property?.state_name || "",
            zip: property?.zip || "",
            unit_name: property?.unit_name || null,
            start_date: lease?.start_date || null,
            end_date: lease?.end_date || null,
            monthly_rent: Number(lease?.monthly_rent || 0),
            rent_due_day: lease?.rent_due_day || null,
          };
        });

        setLeases(normalizedLeases);
        setDocuments((docData || []) as LeaseDocument[]);
        setPaymentMethods((paymentMethodData || []) as PaymentMethod[]);
        setRentPayments((rentPaymentData || []) as RentPayment[]);
        setSelectedLeaseId(normalizedLeases[0]?.lease_id || "");
      } catch (error) {
        console.error("Tenant dashboard error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadTenantDashboard();
  }, [router]);

  const selectedLease =
    leases.find((lease) => lease.lease_id === selectedLeaseId) || leases[0];

  const selectedDocuments = useMemo(() => {
    if (!selectedLease) return [];
    return documents.filter(
      (doc) =>
        doc.lease_id === selectedLease.lease_id &&
        doc.property_id === selectedLease.property_id
    );
  }, [documents, selectedLease]);

  const selectedNotes = useMemo(() => {
    if (!selectedLease || !profileId) return [];

    return notes.filter((note) => {
      const sameLease =
        note.lease_id === selectedLease.lease_id &&
        note.property_id === selectedLease.property_id;

      if (!sameLease) return false;
      if (note.note_type === "shared") return true;

      return note.profile_id === profileId && note.created_by_role === "tenant";
    });
  }, [notes, profileId, selectedLease]);

  const selectedPaymentMethods = useMemo(() => {
    if (!selectedLease) return [];
    return paymentMethods.filter(
      (method) => method.lease_id === selectedLease.lease_id
    );
  }, [paymentMethods, selectedLease]);

  const selectedRentPayments = useMemo(() => {
    if (!selectedLease) return [];
    return rentPayments.filter(
      (payment) => payment.lease_id === selectedLease.lease_id
    );
  }, [rentPayments, selectedLease]);

  const selectedLocalActivities = useMemo(() => {
    if (!selectedLease) return [];

    return localActivities.filter(
      (activity) =>
        activity.leaseId === selectedLease.lease_id &&
        activity.propertyId === selectedLease.property_id
    );
  }, [localActivities, selectedLease]);

  const selectedActivityLogs = useMemo(() => {
    if (!selectedLease) return [];

    return activityLogs.filter(
      (activity) =>
        activity.lease_id === selectedLease.lease_id &&
        activity.property_id === selectedLease.property_id
    );
  }, [activityLogs, selectedLease]);

  const selectedActivities = useMemo(
    () =>
      buildTenantActivities(
        selectedActivityLogs,
        selectedRentPayments,
        selectedDocuments,
        selectedNotes,
        selectedLocalActivities,
        profileId
      ),
    [
      profileId,
      selectedActivityLogs,
      selectedDocuments,
      selectedLocalActivities,
      selectedNotes,
      selectedRentPayments,
    ]
  );

  useEffect(() => {
    if (!profileId) return;

    try {
      const stored = window.localStorage.getItem(getTenantActivityStorageKey(profileId));
      if (!stored) return;

      const parsed = JSON.parse(stored) as TenantActivity[];
      window.setTimeout(() => {
        setLocalActivities(parsed.slice(0, 10));
      }, 0);
    } catch (error) {
      console.error("Tenant activity restore error:", error);
    }
  }, [profileId]);

  useEffect(() => {
    if (!profileId) return;

    try {
      window.localStorage.setItem(
        getTenantActivityStorageKey(profileId),
        JSON.stringify(localActivities.slice(0, 10))
      );
    } catch (error) {
      console.error("Tenant activity persist error:", error);
    }
  }, [localActivities, profileId]);

  async function loadActivitiesForLease(lease: TenantLease) {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("id, property_id, lease_id, activity_type, title, description, created_at")
      .eq("property_id", lease.property_id)
      .eq("lease_id", lease.lease_id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      logTenantSupabaseError("Tenant activity load error", error, {
        stage: "activity_logs select",
        propertyId: lease.property_id,
        leaseId: lease.lease_id,
        possibleCauses: ["activity_logs tenant SELECT RLS policy"],
      });
      return;
    }

    setActivityLogs((prev) => [
      ...prev.filter(
        (activity) =>
          activity.lease_id !== lease.lease_id ||
          activity.property_id !== lease.property_id
      ),
      ...((data || []) as ActivityLog[]),
    ]);
  }

  async function createTenantActivityLog({
    lease,
    activityType,
    title,
    description,
  }: {
    lease: TenantLease;
    activityType: string;
    title: string;
    description?: string;
  }) {
    if (!profileId) return null;

    const { data, error } = await supabase
      .from("activity_logs")
      .insert({
        profile_id: profileId,
        property_id: lease.property_id,
        lease_id: lease.lease_id,
        activity_type: activityType,
        title,
        description: description || null,
      })
      .select("id, property_id, lease_id, activity_type, title, description, created_at")
      .single();

    if (error) {
      logTenantSupabaseError("Tenant activity insert error", error, {
        stage: "activity_logs insert",
        propertyId: lease.property_id,
        leaseId: lease.lease_id,
        profileId,
        activityType,
        possibleCauses: ["activity_logs tenant INSERT RLS policy"],
      });
      return null;
    }

    const insertedActivity = data as ActivityLog;
    setActivityLogs((prev) => [insertedActivity, ...prev].slice(0, 20));
    return insertedActivity;
  }

  function addLocalTenantActivity(activity: TenantActivity) {
    setLocalActivities((prev) => [activity, ...prev].slice(0, 10));
  }

  async function loadNotesForLease(lease: TenantLease, tenantProfileId: string) {
    await Promise.resolve();
    setNotesLoading(true);
    setNoteError("");

    const [privateResult, sharedResult] = await Promise.all([
      supabase
        .from("property_notes")
        .select(
          "id, property_id, lease_id, profile_id, note_type, text, created_by_role, created_at"
        )
        .eq("property_id", lease.property_id)
        .eq("lease_id", lease.lease_id)
        .eq("profile_id", tenantProfileId)
        .eq("created_by_role", "tenant")
        .eq("note_type", "private")
        .order("created_at", { ascending: false }),

      supabase
        .from("property_notes")
        .select(
          "id, property_id, lease_id, profile_id, note_type, text, created_by_role, created_at"
        )
        .eq("property_id", lease.property_id)
        .eq("lease_id", lease.lease_id)
        .eq("note_type", "shared")
        .order("created_at", { ascending: false }),
    ]);

    if (privateResult.error || sharedResult.error) {
      console.error(
        "Tenant notes load error:",
        privateResult.error || sharedResult.error
      );
      setNoteError("Unable to load notes.");
      setNotesLoading(false);
      return;
    }

    const scopedNotes = [
      ...((privateResult.data || []) as PropertyNote[]),
      ...((sharedResult.data || []) as PropertyNote[]),
    ].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setNotes((prev) => [
      ...prev.filter(
        (note) =>
          note.lease_id !== lease.lease_id ||
          note.property_id !== lease.property_id
      ),
      ...scopedNotes,
    ]);
    setNotesLoading(false);
  }

  useEffect(() => {
    if (!selectedLease || !profileId) return;

    async function loadSelectedLeaseData() {
      if (!selectedLease || !profileId) return;
      await Promise.all([
        loadNotesForLease(selectedLease, profileId),
        loadActivitiesForLease(selectedLease),
      ]);
    }

    loadSelectedLeaseData();
  }, [profileId, selectedLease]);

  async function loadDocumentsForLease(lease: TenantLease) {
    setDocumentsLoading(true);
    setDocumentError("");

    const { data, error } = await supabase
      .from("lease_documents")
      .select(
        "id, property_id, lease_id, file_name, file_url, file_type, storage_path, file_size, uploaded_by_profile_id, created_at"
      )
      .eq("property_id", lease.property_id)
      .eq("lease_id", lease.lease_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Tenant documents load error:", error);
      setDocumentError("Unable to load documents.");
      setDocumentsLoading(false);
      return;
    }

    setDocuments((prev) => [
      ...prev.filter(
        (doc) =>
          doc.lease_id !== lease.lease_id || doc.property_id !== lease.property_id
      ),
      ...((data || []) as LeaseDocument[]),
    ]);
    setDocumentsLoading(false);
  }

  async function handleSaveNote() {
    if (!selectedLease || !profileId || savingNote || !newNote.trim()) return;

    setSavingNote(true);
    setNoteError("");

    const { data, error } = await supabase
      .from("property_notes")
      .insert({
        property_id: selectedLease.property_id,
        lease_id: selectedLease.lease_id,
        profile_id: profileId,
        note_type: noteType,
        text: newNote.trim(),
        created_by_role: "tenant",
      })
      .select(
        "id, property_id, lease_id, profile_id, note_type, text, created_by_role, created_at"
      )
      .single();

    if (error) {
      logTenantSupabaseError("Tenant note save error", error, {
        stage: "property_notes insert",
        propertyId: selectedLease.property_id,
        leaseId: selectedLease.lease_id,
        profileId,
        noteType,
        possibleCauses: [
          "missing property_notes column",
          "property_notes RLS insert policy",
          "invalid note_type or created_by_role value",
        ],
      });
      setNoteError("Unable to save note.");
      setSavingNote(false);
      return;
    }

    setNotes((prev) => [data as PropertyNote, ...prev]);
    await createTenantActivityLog({
      lease: selectedLease,
      activityType: "note_added",
      title: noteType === "shared" ? "Shared note added" : "Private note added",
      description: newNote.trim(),
    });
    setNewNote("");
    setNoteType("private");
    setNoteOpen(false);
    setSavingNote(false);
  }

  async function handleDeleteNote(note: PropertyNote) {
    if (
      !selectedLease ||
      !profileId ||
      deletingNoteId ||
      note.profile_id !== profileId ||
      note.created_by_role !== "tenant"
    ) {
      return;
    }

    setDeletingNoteId(note.id);
    setNoteError("");

    const { error } = await supabase
      .from("property_notes")
      .delete()
      .eq("id", note.id)
      .select("id")
      .maybeSingle();

    if (error) {
      logTenantSupabaseError("Tenant note delete error", error, {
        stage: "property_notes delete",
        noteId: note.id,
        propertyId: selectedLease.property_id,
        leaseId: selectedLease.lease_id,
        profileId,
        possibleCauses: [
          "property_notes RLS delete policy",
          "note does not belong to tenant profile",
          "note is not scoped to selected lease/property",
        ],
      });
      setNoteError("Unable to delete note.");
      setDeletingNoteId("");
      return;
    }

    if (!error) {
      const { data: stillExists, error: verifyError } = await supabase
        .from("property_notes")
        .select("id")
        .eq("id", note.id)
        .maybeSingle();

      if (verifyError) {
        logTenantSupabaseError("Tenant note delete verification error", verifyError, {
          stage: "property_notes delete verification",
          noteId: note.id,
          propertyId: selectedLease.property_id,
          leaseId: selectedLease.lease_id,
          profileId,
        });
      }

      if (stillExists) {
        logTenantSupabaseError("Tenant note delete did not persist", null, {
          stage: "property_notes delete verification",
          noteId: note.id,
          propertyId: selectedLease.property_id,
          leaseId: selectedLease.lease_id,
          profileId,
          possibleCauses: [
            "property_notes RLS delete policy did not match",
            "delete filters did not match the row",
          ],
        });
        setNoteError("Unable to delete note.");
        setDeletingNoteId("");
        return;
      }
    }

    const deleteTitle =
      note.note_type === "private" ? "Private note deleted" : "Shared note deleted";
    const insertedActivity = await createTenantActivityLog({
      lease: selectedLease,
      activityType: "note_deleted",
      title: deleteTitle,
      description: truncateActivityText(note.text),
    });

    if (!insertedActivity) {
      addLocalTenantActivity({
        id: `note-delete-${note.id}-${Date.now()}`,
        timestamp: new Date().toISOString(),
        icon: "delete",
        title: deleteTitle,
        subtitle: truncateActivityText(note.text),
        badge: "Tenant",
        badgeClass: "bg-[#FFF1F2] text-[#B9476D]",
        iconClass: "bg-[#FFF1F2] text-[#B9476D] ring-1 ring-[#F8D7DF]",
        amountClass: "text-zinc-500",
        propertyId: selectedLease.property_id,
        leaseId: selectedLease.lease_id,
      });
    }
    setNotes((prev) => prev.filter((item) => item.id !== note.id));
    setDeleteTarget(null);
    setDeletingNoteId("");
  }

  async function handleDocumentUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (uploadingDocument) return;

    if (!file) {
      setDocumentError("Choose a document to upload.");
      return;
    }

    if (!selectedLease?.property_id || !selectedLease?.lease_id) {
      logTenantSupabaseError("Tenant document upload blocked", null, {
        stage: "defensive lease check",
        selectedLease,
        possibleCauses: ["missing selected lease", "missing property_id", "missing lease_id"],
      });
      setDocumentError("Lease access is not ready yet.");
      return;
    }

    if (!profileId) {
      logTenantSupabaseError("Tenant document upload blocked", null, {
        stage: "defensive profile check",
        possibleCauses: ["missing tenant profile", "profile load failed"],
      });
      setDocumentError("Your profile is not ready yet.");
      return;
    }

    const allowedTypes = new Set([
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]);
    const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"];
    const lowerName = file.name.toLowerCase();
    const validExtension = allowedExtensions.some((extension) =>
      lowerName.endsWith(extension)
    );
    const maxFileSize = 10 * 1024 * 1024;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${selectedLease.property_id}/${selectedLease.lease_id}/tenant-${profileId}-${Date.now()}-${safeName}`;

    setDocumentError("");

    if (!file.name.trim() || !safeName.trim()) {
      setDocumentError("This file name cannot be uploaded.");
      return;
    }

    if (!allowedTypes.has(file.type) && !validExtension) {
      setDocumentError("Upload PDF, JPG, PNG, DOC, or DOCX files only.");
      return;
    }

    if (file.size > maxFileSize) {
      setDocumentError("Files must be 10 MB or smaller.");
      return;
    }

    if (
      !filePath ||
      filePath.includes("//") ||
      !filePath.startsWith(`${selectedLease.property_id}/${selectedLease.lease_id}/`)
    ) {
      logTenantSupabaseError("Tenant document upload blocked", null, {
        stage: "defensive storage path check",
        filePath,
        propertyId: selectedLease.property_id,
        leaseId: selectedLease.lease_id,
        profileId,
      });
      setDocumentError("Unable to prepare this upload.");
      return;
    }

    setUploadingDocument(true);
    let uploadedPath: string | null = null;

    try {
      const { error: uploadError } = await supabase.storage
        .from("lease-documents")
        .upload(filePath, file);

      if (uploadError) {
        logTenantSupabaseError("Tenant document upload error", uploadError, {
          stage: "storage upload",
          bucket: "lease-documents",
          filePath,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          propertyId: selectedLease.property_id,
          leaseId: selectedLease.lease_id,
          profileId,
          possibleCauses: [
            "missing lease-documents bucket",
            "storage RLS/policy rejected insert",
            "bucket file size or MIME restriction",
            "invalid storage path",
          ],
        });
        setDocumentError("Unable to upload document.");
        return;
      }

      uploadedPath = filePath;

      const { error: insertError } = await supabase
        .from("lease_documents")
        .insert({
          property_id: selectedLease.property_id,
          lease_id: selectedLease.lease_id,
          file_name: file.name,
          file_type: file.type || null,
          file_size: file.size,
          storage_path: filePath,
          uploaded_by_profile_id: profileId,
        });

      if (insertError) {
        logTenantSupabaseError("Tenant document upload error", insertError, {
          stage: "lease_documents insert",
          table: "lease_documents",
          bucket: "lease-documents",
          filePath,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          propertyId: selectedLease.property_id,
          leaseId: selectedLease.lease_id,
          profileId,
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
            "tenant profile lacks permission for this lease/property",
          ],
        });

        const { error: cleanupError } = await supabase.storage
          .from("lease-documents")
          .remove([filePath]);

        if (cleanupError) {
          logTenantSupabaseError("Tenant document cleanup error", cleanupError, {
            stage: "storage cleanup after DB insert failure",
            bucket: "lease-documents",
            filePath,
            possibleCauses: [
              "storage RLS/policy rejected delete",
              "uploaded object path not found",
            ],
          });
        } else {
          uploadedPath = null;
        }

        setDocumentError("Unable to save document details.");
        return;
      }

      await createTenantActivityLog({
        lease: selectedLease,
        activityType: "document_uploaded",
        title: "Document uploaded",
        description: file.name,
      });
      await loadDocumentsForLease(selectedLease);
    } catch (error) {
      logTenantSupabaseError("Tenant document upload error", error, {
        stage: "unexpected upload exception",
        bucket: "lease-documents",
        uploadedPath,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        propertyId: selectedLease.property_id,
        leaseId: selectedLease.lease_id,
        profileId,
      });
      setDocumentError("Unable to upload document.");
    } finally {
      setUploadingDocument(false);
    }
  }

  async function handleDeleteDocument(doc: LeaseDocument) {
    if (
      !selectedLease ||
      !profileId ||
      deletingDocumentId ||
      doc.uploaded_by_profile_id !== profileId
    ) {
      return;
    }

    if (
      doc.property_id !== selectedLease.property_id ||
      doc.lease_id !== selectedLease.lease_id
    ) {
      setDocumentError("Document is not linked to this lease.");
      return;
    }

    if (!doc.storage_path) {
      setDocumentError("Document file path is missing.");
      return;
    }

    setDeletingDocumentId(doc.id);
    setDocumentError("");

    const { error: dbError } = await supabase
      .from("lease_documents")
      .delete()
      .eq("id", doc.id)
      .select("id")
      .maybeSingle();

    if (dbError) {
      logTenantSupabaseError("Tenant document metadata delete error", dbError, {
        stage: "lease_documents delete",
        table: "lease_documents",
        bucket: "lease-documents",
        storagePath: doc.storage_path,
        documentId: doc.id,
        propertyId: doc.property_id,
        leaseId: doc.lease_id,
        profileId,
        possibleCauses: [
          "lease_documents RLS delete policy",
          "metadata row does not belong to tenant profile",
          "metadata row is not scoped to selected lease/property",
        ],
      });
      setDocumentError("Unable to delete document.");
      setDeletingDocumentId("");
      return;
    }

    const { data: stillExists, error: verifyError } = await supabase
      .from("lease_documents")
      .select("id")
      .eq("id", doc.id)
      .maybeSingle();

    if (verifyError) {
      logTenantSupabaseError("Tenant document delete verification error", verifyError, {
        stage: "lease_documents delete verification",
        documentId: doc.id,
        propertyId: doc.property_id,
        leaseId: doc.lease_id,
        profileId,
      });
    }

    if (stillExists) {
      logTenantSupabaseError("Tenant document delete did not persist", null, {
        stage: "lease_documents delete verification",
        documentId: doc.id,
        propertyId: doc.property_id,
        leaseId: doc.lease_id,
        profileId,
        possibleCauses: [
          "lease_documents RLS delete policy did not match",
          "delete filters did not match the row",
        ],
      });
      setDocumentError("Unable to delete document.");
      setDeletingDocumentId("");
      return;
    }

    const insertedActivity = await createTenantActivityLog({
      lease: selectedLease,
      activityType: "document_deleted",
      title: "Document deleted",
      description: `${doc.file_name} was removed.`,
    });

    if (!insertedActivity) {
      addLocalTenantActivity({
        id: `document-delete-${doc.id}-${Date.now()}`,
        timestamp: new Date().toISOString(),
        icon: "delete",
        title: "Document deleted",
        subtitle: doc.file_name,
        badge: "Tenant",
        badgeClass: "bg-[#FFF1F2] text-[#B9476D]",
        iconClass: "bg-[#FFF1F2] text-[#B9476D] ring-1 ring-[#F8D7DF]",
        amountClass: "text-zinc-500",
        propertyId: selectedLease.property_id,
        leaseId: selectedLease.lease_id,
      });
    }
    setDocuments((prev) => prev.filter((item) => item.id !== doc.id));
    setDeleteTarget(null);

    const { error: storageError } = await supabase.storage
      .from("lease-documents")
      .remove([doc.storage_path]);

    if (storageError) {
      logTenantSupabaseError("Tenant document storage cleanup error", storageError, {
        stage: "storage delete after lease_documents delete",
        bucket: "lease-documents",
        storagePath: doc.storage_path,
        documentId: doc.id,
        propertyId: doc.property_id,
        leaseId: doc.lease_id,
        profileId,
        possibleCauses: [
          "storage RLS/policy rejected delete",
          "stored object path does not exist",
        ],
      });
    }

    setDeletingDocumentId("");
  }

  async function viewDocument(doc: LeaseDocument) {
    if (doc.storage_path) {
      const { data, error } = await supabase.storage
        .from("lease-documents")
        .createSignedUrl(doc.storage_path, 60);

      if (error || !data?.signedUrl) {
        logTenantSupabaseError("Tenant document view error", error, {
          stage: "storage signed URL",
          bucket: "lease-documents",
          storagePath: doc.storage_path,
          documentId: doc.id,
          propertyId: doc.property_id,
          leaseId: doc.lease_id,
          possibleCauses: [
            "missing lease-documents bucket",
            "storage RLS/policy rejected signed URL",
            "stored object path does not exist",
          ],
        });
        setDocumentError("Unable to open document.");
        return;
      }

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (doc.file_url) {
      window.open(doc.file_url, "_blank", "noopener,noreferrer");
    }
  }

  async function downloadDocument(doc: LeaseDocument) {
    if (doc.storage_path) {
      const { data, error } = await supabase.storage
        .from("lease-documents")
        .download(doc.storage_path);

      if (error || !data) {
        logTenantSupabaseError("Tenant document download error", error, {
          stage: "storage download",
          bucket: "lease-documents",
          storagePath: doc.storage_path,
          documentId: doc.id,
          propertyId: doc.property_id,
          leaseId: doc.lease_id,
          possibleCauses: [
            "missing lease-documents bucket",
            "storage RLS/policy rejected download",
            "stored object path does not exist",
          ],
        });
        setDocumentError("Unable to download document.");
        return;
      }

      const url = URL.createObjectURL(data);
      const link = document.createElement("a");

      link.href = url;
      link.download = doc.file_name || "document";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    if (doc.file_url) {
      window.open(doc.file_url, "_blank", "noopener,noreferrer");
    }
  }

  if (loading) {
    return (
      <main className="flex h-screen items-center justify-center bg-white text-sm text-zinc-500">
        Loading tenant portal...
      </main>
    );
  }

  return (
    <main className="h-screen overflow-hidden bg-white font-sans text-[#0F172A]">
      <header className="flex h-[76px] shrink-0 items-center justify-between border-b border-zinc-100 bg-white px-7">
        <div className="flex items-center gap-5">
  <img src="/logo.png" alt="AvenueBoard" className="h-8 w-auto" />

  <div className="h-9 w-px bg-zinc-200" />

  <div>
    <p className="text-[14px] font-semibold tracking-[-0.03em] text-zinc-950">
      Tenant Portal
    </p>
    <p className="mt-0.5 max-w-[360px] truncate text-[12px] font-medium text-zinc-400">

      {selectedLease

        ? `${selectedLease.street_address}${

            selectedLease.unit_name ? `, Unit ${selectedLease.unit_name}` : ""

          }, ${selectedLease.city}, ${selectedLease.state_name} ${selectedLease.zip}`

        : "Property"}

    </p>

  </div>
</div>

        <div className="flex items-center gap-5">
          <button className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-700 hover:bg-zinc-50">
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#B9476D]" />
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 17H9m9-6a6 6 0 0 0-12 0c0 3-.8 4.5-2 6h16c-1.2-1.5-2-3-2-6Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M10 20a2.2 2.2 0 0 0 4 0"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <div className="h-8 w-px bg-zinc-200" />

          <div className="relative">
            <button
              onClick={() => setProfileOpen((value) => !value)}
              className="flex items-center gap-3 rounded-2xl px-2 py-1.5 hover:bg-zinc-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0F172A] text-[13px] font-semibold text-white">
                {getInitials(userInfo.name)}
              </div>

              <div className="hidden text-left sm:block">
                <p className="max-w-[190px] truncate text-[14px] font-semibold text-zinc-950">
                  {userInfo.name}
                </p>
                <p className="text-[12px] text-zinc-500">Tenant</p>
              </div>

              <span className="text-zinc-400">⌄</span>
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-[56px] z-20 w-[260px] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.14)]">
                <div className="border-b border-zinc-100 px-4 py-4">
                  <p className="truncate text-[14px] font-semibold text-zinc-900">
                    {userInfo.name}
                  </p>
                  <p className="mt-1 truncate text-[12px] text-zinc-500">
                    {userInfo.email}
                  </p>
                </div>

                {hasLandlordRole && (
                  <button
                    onClick={() => router.push("/select-mode")}
                    className="flex h-11 w-full items-center px-4 text-[13px] font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Switch mode
                  </button>
                )}

                <button className="flex h-11 w-full items-center px-4 text-[13px] font-medium text-zinc-700 hover:bg-zinc-50">
                  Profile settings
                </button>

                <button className="flex h-11 w-full items-center px-4 text-[13px] font-medium text-zinc-700 hover:bg-zinc-50">
                  Support
                </button>

                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    router.push("/login");
                  }}
                  className="flex h-11 w-full items-center border-t border-zinc-100 px-4 text-[13px] font-semibold text-[#B9476D] hover:bg-zinc-50"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {leases.length === 0 ? (
        <div className="flex h-[calc(100vh-76px)] items-center justify-center px-6 text-center">
          <div>
            <h1 className="text-[30px] font-semibold tracking-[-0.05em]">
              No active lease access
            </h1>
            <p className="mt-3 max-w-[460px] text-[15px] leading-7 text-zinc-500">
              Your landlord invitation has not been connected yet. Open your
              invite email and accept the invitation to access your tenant
              portal.
            </p>
          </div>
        </div>
      ) : (
        
        <div className="grid h-[calc(100vh-76px)] grid-cols-[minmax(0,1fr)_405px] gap-4 overflow-hidden bg-white px-4 py-4">
        <div className="grid min-h-0 grid-rows-[390px_285px_minmax(0,1fr)] gap-4 overflow-hidden">
            <PaymentHero
            lease={selectedLease}
            paymentMethods={selectedPaymentMethods}
            firstName={getFirstName(userInfo.name)}
            />

            <NotesDocumentsCard
                notes={selectedNotes}
                notesLoading={notesLoading}
                noteError={noteError}
                documents={selectedDocuments}
                documentsLoading={documentsLoading}
                documentError={documentError}
                uploadingDocument={uploadingDocument}
                fileInputRef={fileInputRef}
                profileId={profileId}
                deletingNoteId={deletingNoteId}
                deletingDocumentId={deletingDocumentId}
                onAddNote={() => setNoteOpen(true)}
                onViewAllNotes={() => setNotesModalOpen(true)}
                onViewAllDocuments={() => setDocumentsModalOpen(true)}
                onDocumentUpload={handleDocumentUpload}
                onViewDocument={viewDocument}
                onDownloadDocument={downloadDocument}
                onDeleteNote={(note) => setDeleteTarget({ type: "note", item: note })}
                onDeleteDocument={(doc) =>
                  setDeleteTarget({ type: "document", item: doc })
                }
            />

            <RecentActivityCard
              activities={selectedActivities}
              onViewMore={() => setActivitiesModalOpen(true)}
            />
          </div>

          <aside className="grid min-h-0 grid-rows-[430px_minmax(0,1fr)] gap-4 overflow-hidden">
            <PaymentProgressCard
              lease={selectedLease}
              payments={selectedRentPayments}
            />
            <QuickAccessCard />
          </aside>
        </div>
      )}

      {noteOpen && (
  <AddNoteModal
    noteType={noteType}
    setNoteType={setNoteType}
    newNote={newNote}
    setNewNote={setNewNote}
    onClose={() => setNoteOpen(false)}
    onSave={handleSaveNote}
    saving={savingNote}
    error={noteError}
  />
)}

      {deleteTarget && (
        <ConfirmDeleteModal
          title={deleteTarget.type === "note" ? "Delete note?" : "Delete document?"}
          body={
            deleteTarget.type === "note"
              ? "This note will be permanently removed."
              : "This document will be permanently removed."
          }
          deleting={
            deleteTarget.type === "note"
              ? deletingNoteId === deleteTarget.item.id
              : deletingDocumentId === deleteTarget.item.id
          }
          onCancel={() => {
            if (!deletingNoteId && !deletingDocumentId) setDeleteTarget(null);
          }}
          onConfirm={() => {
            if (deleteTarget.type === "note") {
              handleDeleteNote(deleteTarget.item);
              return;
            }

            handleDeleteDocument(deleteTarget.item);
          }}
        />
      )}

      {notesModalOpen && (
        <ViewAllNotesModal
          notes={selectedNotes}
          loading={notesLoading}
          error={noteError}
          profileId={profileId}
          deletingNoteId={deletingNoteId}
          onClose={() => setNotesModalOpen(false)}
          onDeleteNote={(note) => setDeleteTarget({ type: "note", item: note })}
        />
      )}

      {documentsModalOpen && (
        <ViewAllDocumentsModal
          documents={selectedDocuments}
          loading={documentsLoading}
          error={documentError}
          profileId={profileId}
          deletingDocumentId={deletingDocumentId}
          onClose={() => setDocumentsModalOpen(false)}
          onViewDocument={viewDocument}
          onDownloadDocument={downloadDocument}
          onDeleteDocument={(doc) =>
            setDeleteTarget({ type: "document", item: doc })
          }
        />
      )}

      {activitiesModalOpen && (
        <ViewMoreActivitiesModal
          activities={selectedActivities.slice(0, 10)}
          onClose={() => setActivitiesModalOpen(false)}
        />
      )}

    </main>
  );
}

function PaymentHero({
  lease,
  paymentMethods,
  firstName,
}: {
  lease?: TenantLease;
  paymentMethods: PaymentMethod[];
  firstName: string;
}) {
  const defaultMethod =
    paymentMethods.find((method) => method.is_default) || paymentMethods[0];

  return (
    <section className="rounded-[28px] border border-zinc-200 bg-white p-5">
      <div className="grid h-full grid-rows-[150px_minmax(0,1fr)] gap-4">
        <div className="grid grid-cols-[minmax(0,1fr)_310px] items-center gap-6">
          <div>
            <p className="text-[18px] font-medium tracking-[-0.03em] text-slate-800">
              Good afternoon, {firstName}
            </p>

            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
              Total Due
            </p>

            <div className="mt-1 flex items-end gap-8">
              <h1 className="text-[52px] font-[600] leading-none tracking-[-0.075em] text-slate-950">
                ${Number(lease?.monthly_rent || 0).toLocaleString()}
              </h1>

              <div className="mb-1 flex items-center gap-5">
                <div className="h-12 w-px bg-zinc-200" />

                <div>
                  <p className="flex items-center gap-1.5 text-[12px] font-medium text-zinc-500">
                    ⓘ{" "}
                    {defaultMethod
                      ? `${formatBrand(defaultMethod.brand)} •••• ${defaultMethod.last4}`
                      : "Auto-pay not enrolled"}
                  </p>

                  <p className="mt-1 text-[14px] font-semibold text-zinc-900">
                    Due on {formatDueDate(lease?.rent_due_day)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button className="group flex h-[48px] w-full items-center justify-center gap-6 rounded-xl bg-[#0F172A] text-[13px] font-semibold text-white shadow-[0_14px_32px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5">
              Pay Rent
              <span className="transition group-hover:translate-x-1">→</span>
            </button>

            <button className="h-[48px] w-full rounded-xl border border-zinc-300 bg-white text-[13px] font-semibold text-zinc-950 transition hover:bg-zinc-50">
              Setup Autopay
            </button>
          </div>
        </div>

        <div className="grid min-h-0 grid-cols-3 gap-4">
          <AvenuePerksCard />
          <CreditBuildingCard />
          <LeaseStatusCard lease={lease} />
        </div>
      </div>
    </section>
  );
}

function AvenuePerksCard() {
  return (
    <DashboardCard>
      <div className="flex h-full flex-col">
        <div className="flex items-start gap-3">
          <IconBox>✦</IconBox>

          <div>
            <h3 className="text-[15px] font-semibold tracking-[-0.03em]">
              Avenue Perks
            </h3>
            <p className="mt-1 text-[12px] leading-5 text-zinc-500">
              Exclusive benefits for residents.
            </p>
          </div>
        </div>

        <div className="mt-auto">
          <div className="flex items-end gap-2">
            <p className="text-[30px] font-semibold tracking-[-0.06em]">3</p>
            <p className="pb-1 text-[12px] text-zinc-500">
              benefits available
            </p>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <BenefitBubble label="S" className="bg-slate-950 text-white" />
            <BenefitBubble
              label="hulu"
              className="bg-black text-[10px] text-green-400"
            />
            <BenefitBubble
              label="Uber"
              className="bg-slate-950 text-[10px] text-white"
            />
            <BenefitBubble
              label="+3"
              className="bg-zinc-100 text-[10px] text-zinc-700"
            />
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

function CreditBuildingCard() {
  return (
    <DashboardCard>
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-[17px] text-emerald-700">
              ✓
            </div>

            <div>
              <h3 className="text-[15px] font-semibold tracking-[-0.03em]">
                Credit Building
              </h3>
              <p className="mt-1 text-[12px] leading-5 text-zinc-500">
                Build credit with on-time rent.
              </p>
            </div>
          </div>

          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
            Active
          </span>
        </div>

        <div className="mt-auto">
          <p className="text-[12px] text-zinc-500">Reporting to 3 bureaus</p>

          <div className="mt-4 flex items-center justify-between text-[11px] font-bold">
            <span className="text-indigo-700">Experian</span>
            <span className="text-red-700">Equifax</span>
            <span className="text-sky-600">TransUnion</span>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

function LeaseStatusCard({ lease }: { lease?: TenantLease }) {
  const monthsRemaining = getMonthsRemaining(lease?.end_date);

  return (
    <DashboardCard>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-[17px] text-indigo-700">
            ⌂
          </div>

          <div>
            <h3 className="text-[15px] font-semibold tracking-[-0.03em]">
              Lease Status
            </h3>
            <p className="mt-1 text-[12px] text-zinc-500">Active lease</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-[12px] font-semibold text-zinc-900">
            Unit {lease?.unit_name || "—"}
          </p>
          <p className="mt-0.5 max-w-[120px] truncate text-[11px] text-zinc-500">
            {lease?.property_label || "Property"}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-[30px] font-semibold tracking-[-0.06em]">
          {monthsRemaining}
        </p>
        <p className="mt-1 text-[12px] leading-5 text-zinc-500">
          months remaining
        </p>
      </div>

      <div className="mt-3 h-2 rounded-full bg-zinc-100">
        <div className="h-2 w-[46%] rounded-full bg-slate-950" />
      </div>

      <CardFooter label="View lease" />
    </DashboardCard>
  );
}

function NotesDocumentsCard({
  notes,
  notesLoading,
  noteError,
  documents,
  documentsLoading,
  documentError,
  uploadingDocument,
  fileInputRef,
  profileId,
  deletingNoteId,
  deletingDocumentId,
  onAddNote,
  onDocumentUpload,
  onViewDocument,
  onDownloadDocument,
  onDeleteNote,
  onDeleteDocument,
  onViewAllNotes,
  onViewAllDocuments,
}: {
  notes: PropertyNote[];
  notesLoading: boolean;
  noteError: string;
  documents: LeaseDocument[];
  documentsLoading: boolean;
  documentError: string;
  uploadingDocument: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  profileId: string;
  deletingNoteId: string;
  deletingDocumentId: string;
  onAddNote: () => void;
  onDocumentUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onViewDocument: (doc: LeaseDocument) => void;
  onDownloadDocument: (doc: LeaseDocument) => void;
  onDeleteNote: (note: PropertyNote) => void;
  onDeleteDocument: (doc: LeaseDocument) => void;
  onViewAllNotes: () => void;
  onViewAllDocuments: () => void;
}) {
  const visibleDocs = documents.slice(0, 2);
  const visibleNotes = notes.slice(0, 3);

  return (
    <section className="min-h-0 overflow-hidden rounded-[24px] border border-zinc-200 bg-white p-5 shadow-none">
      <div className="grid h-full min-h-0 grid-cols-[minmax(0,0.6fr)_minmax(0,0.4fr)] gap-5">
        <div className="flex min-h-0 flex-col pr-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-[18px] font-semibold tracking-[-0.035em] text-zinc-950">
                Notes
              </h2>

              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[12px] font-semibold text-zinc-500">
                {notes.length}
              </span>

              <button
                onClick={onAddNote}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[12px] font-semibold text-[#B9476D] hover:bg-zinc-50"
              >
                + Add
              </button>
            </div>

            <button
              onClick={onViewAllNotes}
              className="text-[13px] font-semibold text-zinc-950 transition-transform duration-150 active:scale-[0.96]"
            >
              View all notes →
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {notesLoading ? (
              <SectionState
                title="Loading notes"
                subtitle="Preparing your private lease space."
              />
            ) : noteError ? (
              <SectionState title="Notes unavailable" subtitle={noteError} />
            ) : visibleNotes.length > 0 ? (
              visibleNotes.map((note) => {
                const tenantOwned =
                  note.profile_id === profileId &&
                  note.created_by_role === "tenant";

                return (
                  <NotePreview
                    key={note.id}
                    type={
                      note.note_type === "private" ? "Private Note" : "Shared Note"
                    }
                    text={note.text}
                    variant={note.note_type}
                    createdAt={note.created_at}
                    author={note.created_by_role}
                    canDelete={tenantOwned}
                    deleting={deletingNoteId === note.id}
                    onDelete={() => onDeleteNote(note)}
                  />
                );
              })
            ) : (
              <SectionState
                title="No notes yet"
                subtitle="Keep private reminders or share updates here."
              />
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-col border-l border-zinc-100 pl-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-[18px] font-semibold tracking-[-0.035em] text-zinc-950">
                Property Documents
              </h2>

              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[12px] font-semibold text-zinc-500">
                {documents.length}
              </span>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingDocument}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[12px] font-semibold text-[#B9476D] hover:bg-zinc-50 disabled:opacity-60"
              >
                {uploadingDocument ? "Uploading" : "Upload"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={onDocumentUpload}
              />
            </div>

            <button
              onClick={onViewAllDocuments}
              className="text-[13px] font-semibold text-zinc-950 transition-transform duration-150 active:scale-[0.96]"
            >
              View all →
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {documentsLoading ? (
              <SectionState
                title="Loading documents"
                subtitle="Checking your shared lease files."
              />
            ) : documentError ? (
              <SectionState title="Document action needed" subtitle={documentError} />
            ) : visibleDocs.length > 0 ? (
              visibleDocs.map((doc) => {
                const tenantOwned = doc.uploaded_by_profile_id === profileId;

                return (
                  <DocumentTile
                    key={doc.id}
                    doc={doc}
                    canDelete={tenantOwned}
                    deleting={deletingDocumentId === doc.id}
                    onView={() => onViewDocument(doc)}
                    onDownload={() => onDownloadDocument(doc)}
                    onDelete={() => onDeleteDocument(doc)}
                  />
                );
              })
            ) : (
              <SectionState
                title="No documents yet"
                subtitle="Lease files and shared uploads will live here."
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function NotePreview({
  type,
  text,
  variant,
  createdAt,
  author,
  canDelete,
  deleting,
  onDelete,
}: {
  type: string;
  text: string;
  variant: "private" | "shared";
  createdAt?: string | null;
  author?: "landlord" | "tenant";
  canDelete: boolean;
  deleting: boolean;
  onDelete: () => void;
}) {
  const styles =
    variant === "private"
      ? "border-[#FFE1A8] bg-[#FFF8EA]"
      : "border-[#D4E9FF] bg-[#EFF7FF]";

  const badge =
    variant === "private"
      ? "bg-[#FFE8B8] text-[#8A5A00]"
      : "bg-[#DCEEFF] text-[#1D5F9F]";

  return (
    <div className={`group relative min-h-[86px] rounded-2xl border px-4 py-4 ${styles}`}>
      <div className="absolute right-3 top-3 flex items-center gap-2">
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${badge}`}
        >
          {type}
        </span>

        {canDelete ? (
          <button
            onClick={onDelete}
            disabled={deleting}
            aria-label="Delete note"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-zinc-400 opacity-0 transition-all duration-200 hover:bg-white hover:text-red-500 disabled:opacity-50 group-hover:opacity-100"
          >
            {deleting ? (
              <span className="h-3 w-3 animate-spin rounded-full border border-red-500 border-t-transparent" />
            ) : (
              <TrashIcon />
            )}
          </button>
        ) : (
          <span className="h-8 w-8" />
        )}
      </div>

      <p className="min-w-0 pr-40 text-[13px] font-medium leading-5 text-zinc-900">
        {text}
      </p>

      <div className="mt-3">
        <p className="min-w-0 text-[12px] leading-5 text-zinc-500">
          {formatDate(createdAt)} •{" "}
          {author === "landlord" ? "Created by landlord" : "Created by tenant"}
          {variant === "shared" && (
            <>
              {" "}•{" "}
              {author === "landlord" ? "Shared with tenant" : "Shared with landlord"}
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function SectionState({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-200 bg-gradient-to-b from-white to-[#FAFAFA] px-4 py-5">
      <p className="text-[13px] font-medium text-zinc-950">{title}</p>
      <p className="mt-1 text-[12px] leading-5 text-zinc-500">{subtitle}</p>
    </div>
  );
}

function ViewAllNotesModal({
  notes,
  loading,
  error,
  profileId,
  deletingNoteId,
  onClose,
  onDeleteNote,
}: {
  notes: PropertyNote[];
  loading: boolean;
  error: string;
  profileId: string;
  deletingNoteId: string;
  onClose: () => void;
  onDeleteNote: (note: PropertyNote) => void;
}) {
  return (
    <LargeTenantModal
      title="Notes"
      count={notes.length}
      eyebrow="Private reminders and shared lease updates"
      onClose={onClose}
    >
      {loading ? (
        <SectionState
          title="Loading notes"
          subtitle="Preparing your private lease space."
        />
      ) : error ? (
        <SectionState title="Notes unavailable" subtitle={error} />
      ) : notes.length > 0 ? (
        <div className="grid gap-3">
          {notes.map((note) => {
            const tenantOwned =
              note.profile_id === profileId && note.created_by_role === "tenant";

            return (
              <NotePreview
                key={note.id}
                type={
                  note.note_type === "private" ? "Private Note" : "Shared Note"
                }
                text={note.text}
                variant={note.note_type}
                createdAt={note.created_at}
                author={note.created_by_role}
                canDelete={tenantOwned}
                deleting={deletingNoteId === note.id}
                onDelete={() => onDeleteNote(note)}
              />
            );
          })}
        </div>
      ) : (
        <SectionState
          title="No notes yet"
          subtitle="Keep private reminders or share updates here."
        />
      )}
    </LargeTenantModal>
  );
}

function ViewAllDocumentsModal({
  documents,
  loading,
  error,
  profileId,
  deletingDocumentId,
  onClose,
  onViewDocument,
  onDownloadDocument,
  onDeleteDocument,
}: {
  documents: LeaseDocument[];
  loading: boolean;
  error: string;
  profileId: string;
  deletingDocumentId: string;
  onClose: () => void;
  onViewDocument: (doc: LeaseDocument) => void;
  onDownloadDocument: (doc: LeaseDocument) => void;
  onDeleteDocument: (doc: LeaseDocument) => void;
}) {
  return (
    <LargeTenantModal
      title="Property Documents"
      count={documents.length}
      eyebrow="Lease files, shared uploads, and resident documents"
      onClose={onClose}
    >
      {loading ? (
        <SectionState
          title="Loading documents"
          subtitle="Checking your shared lease files."
        />
      ) : error ? (
        <SectionState title="Document action needed" subtitle={error} />
      ) : documents.length > 0 ? (
        <div className="grid gap-3">
          {documents.map((doc) => {
            const tenantOwned = doc.uploaded_by_profile_id === profileId;

            return (
              <DocumentTile
                key={doc.id}
                doc={doc}
                canDelete={tenantOwned}
                deleting={deletingDocumentId === doc.id}
                onView={() => onViewDocument(doc)}
                onDownload={() => onDownloadDocument(doc)}
                onDelete={() => onDeleteDocument(doc)}
              />
            );
          })}
        </div>
      ) : (
        <SectionState
          title="No documents yet"
          subtitle="Lease files and shared uploads will live here."
        />
      )}
    </LargeTenantModal>
  );
}

function ViewMoreActivitiesModal({
  activities,
  onClose,
}: {
  activities: TenantActivity[];
  onClose: () => void;
}) {
  return (
    <LargeTenantModal
      title="Recent Activity"
      count={activities.length}
      eyebrow=""
      onClose={onClose}
    >
      {activities.length > 0 ? (
        <div className="grid gap-3">
          {activities.map((activity) => (
            <ActivityRow key={activity.id} activity={activity} />
          ))}
        </div>
      ) : (
        <SectionState
          title="No recent activity"
          subtitle="Payments, notes, and document updates will appear here."
        />
      )}
    </LargeTenantModal>
  );
}

function LargeTenantModal({
  title,
  count,
  eyebrow,
  onClose,
  children,
}: {
  title: string;
  count: number;
  eyebrow: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center bg-black/30 px-5 py-6 backdrop-blur-sm">
      <div className="flex h-[72vh] w-[min(1120px,92vw)] min-h-[520px] flex-col overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-[0_34px_110px_rgba(15,23,42,0.28)]">
        <div className="flex shrink-0 items-start justify-between gap-6 border-b border-zinc-100 px-7 py-6">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-[25px] font-semibold tracking-[-0.045em] text-zinc-950">
                {title}
              </h2>
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[12px] font-semibold text-zinc-500">
                {count}
              </span>
            </div>
            <p className="mt-1 text-[13px] leading-6 text-zinc-500">{eyebrow}</p>
          </div>

          <button
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[20px] text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-900"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">{children}</div>
      </div>
    </div>
  );
}

function RecentActivityCard({
  activities,
  onViewMore,
}: {
  activities: TenantActivity[];
  onViewMore: () => void;
}) {
  const visibleActivities = activities.slice(0, 4);
  const emptySlots = Math.max(0, 4 - visibleActivities.length);

  return (
    <section className="min-h-0 overflow-hidden rounded-[24px] border border-zinc-200 bg-white p-5 shadow-none">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[16px] font-semibold tracking-[-0.035em]">
            Recent Activity
          </h2>
        </div>

        <button
          onClick={onViewMore}
          className="text-[13px] font-semibold text-zinc-950 transition-transform duration-150 active:scale-[0.96]"
        >
          View more activity →
        </button>
      </div>

      {visibleActivities.length > 0 ? (
        <div className="mt-4 grid grid-cols-4 divide-x divide-zinc-100 rounded-2xl border border-zinc-100 bg-white">
          {visibleActivities.map((activity) => (
            <ActivityMini key={activity.id} activity={activity} />
          ))}
          {Array.from({ length: emptySlots }).map((_, index) => (
            <div key={`empty-activity-${index}`} className="min-h-[96px]" />
          ))}
        </div>
      ) : (
        <div className="mt-4">
          <SectionState
            title="No recent activity"
            subtitle="Payments, notes, and document updates will appear here."
          />
        </div>
      )}
    </section>
  );
}

function PaymentProgressCard({
  lease,
  payments,
}: {
  lease?: TenantLease;
  payments: RentPayment[];
}) {
  const rows = buildPaymentProgress(lease, payments);

  return (
    <section className="min-h-0 overflow-hidden rounded-[24px] border border-zinc-200 bg-white p-5 shadow-none">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
        <h2 className="text-[17px] font-semibold tracking-[-0.035em]">
          Payment Progress
        </h2>

        <select className="h-9 rounded-xl border border-zinc-200 bg-white px-3 text-[12px] font-semibold outline-none">
          <option>2026</option>
        </select>
      </div>

      <div className="mt-5 space-y-6">
        {rows.map((item, index) => (
          <div key={item.month} className="grid grid-cols-[26px_1fr_auto] gap-3">
            <div className="relative flex justify-center">
              {index < rows.length - 1 && (
                <span className="absolute top-7 h-[46px] w-px bg-zinc-200" />
              )}
              <span
                className={`z-10 flex h-7 w-7 items-center justify-center rounded-full border text-[12px] font-semibold ${
                  item.status === "paid"
                    ? "border-slate-950 bg-slate-950 text-white"
                    : item.status === "upcoming"
                    ? "border-slate-950 bg-white text-slate-950"
                    : "border-zinc-300 bg-white text-zinc-400"
                }`}
              >
                {item.status === "paid" ? "✓" : ""}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-semibold text-zinc-950">
                  {item.month}
                </p>

                {item.status === "upcoming" && (
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-semibold text-zinc-600">
                    Upcoming
                  </span>
                )}
              </div>

              <p className="mt-1 text-[12px] text-zinc-500">{item.subtext}</p>
            </div>

            <p
              className={`text-[13px] font-semibold ${
                item.status === "paid" ? "text-emerald-600" : "text-zinc-700"
              }`}
            >
              ${Number(lease?.monthly_rent || 0).toLocaleString()}.00
            </p>
          </div>
        ))}
      </div>

      <button className="mt-5 flex items-center gap-3 text-[13px] font-semibold text-zinc-950">
        View payment history <span>→</span>
      </button>
    </section>
  );
}

function QuickAccessCard() {
  return (
    <section className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-none">
      <h2 className="text-[17px] font-semibold tracking-[-0.035em]">
        Quick Access
      </h2>

      <div className="mt-4 space-y-3">
        <QuickAccessItem
          title="Payment Methods"
          subtitle="Manage cards & bank accounts"
          icon="▣"
        />
        <QuickAccessItem
          title="Lease Details"
          subtitle="View your lease information"
          icon="⧉"
        />
        <QuickAccessItem
          title="Contact Support"
          subtitle="Get help from our team"
          icon="◉"
        />
      </div>
    </section>
  );
}

function DashboardCard({ children }: { children: React.ReactNode }) {
  return (
    <section className="min-h-0 overflow-hidden rounded-[22px] border border-zinc-200 bg-gradient-to-b from-white to-[#FAFAFA] p-4 shadow-none">
      {children}
    </section>
  );
}

function IconBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-[17px]">
      {children}
    </div>
  );
}

function CardFooter({ label }: { label: string }) {
  return (
    <div className="mt-3">
      <button className="flex w-full items-center justify-between text-[12px] font-semibold text-zinc-950">
        {label}
        <span className="text-zinc-500">›</span>
      </button>
    </div>
  );
}

function BenefitBubble({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span
      className={`flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-semibold ${className}`}
    >
      {label}
    </span>
  );
}

function DocumentTile({
  doc,
  canDelete,
  deleting,
  onView,
  onDownload,
  onDelete,
}: {
  doc: LeaseDocument;
  canDelete: boolean;
  deleting: boolean;
  onView: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-[11px] font-semibold uppercase text-zinc-600">
          {getFileLabel(doc.file_name, doc.file_type)}
        </div>

        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold text-zinc-950">
            {doc.file_name}
          </p>
          <p className="mt-1 truncate text-[11px] text-zinc-500">
            {formatDate(doc.created_at)}
            {doc.file_size ? ` · ${formatFileSize(doc.file_size)}` : ""}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={onView}
          className="text-[12px] font-semibold text-zinc-600 hover:text-zinc-950"
        >
          View
        </button>
        <span className="text-zinc-300">/</span>
        <button
          onClick={onDownload}
          className="text-[12px] font-semibold text-zinc-600 hover:text-zinc-950"
        >
          Download
        </button>
        {canDelete && (
          <>
            <span className="text-zinc-300">/</span>
            <button
              onClick={onDelete}
              disabled={deleting}
              aria-label="Delete document"
              className="text-[12px] font-semibold text-zinc-600 hover:text-[#B9476D] disabled:opacity-50"
            >
              {deleting ? "Deleting" : "Delete"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ActivityIcon({
  activity,
  size,
}: {
  activity: TenantActivity;
  size: "sm" | "md";
}) {
  const Icon =
    activity.icon === "payment-success"
      ? CheckCircle2
      : activity.icon === "payment-alert"
      ? AlertCircle
      : activity.icon === "payment-pending"
      ? CircleDot
      : activity.icon === "document"
      ? FileText
      : activity.icon === "delete"
      ? Trash2
      : StickyNote;

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full ${
        size === "sm" ? "h-8 w-8" : "h-10 w-10"
      } ${activity.iconClass}`}
    >
      <Icon
        size={size === "sm" ? 15 : 17}
        strokeWidth={2.15}
        aria-hidden="true"
      />
    </span>
  );
}

function ActivityMini({ activity }: { activity: TenantActivity }) {
  return (
    <div className="min-h-[96px] px-5 py-5">
      <div className="flex items-start gap-3">
        <ActivityIcon activity={activity} size="sm" />

        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold text-zinc-950">
            {activity.title}
          </p>
          <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-zinc-500">
            {activity.subtitle}
          </p>

          {activity.amount && (
            <p
              className={`mt-1 text-[11px] font-semibold ${
                activity.amountClass || "text-zinc-600"
              }`}
            >
              {activity.amount}
            </p>
          )}

          {activity.badge && (
            <span
              className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                activity.badgeClass || "bg-zinc-100 text-zinc-600"
              }`}
            >
              {activity.badge}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityRow({ activity }: { activity: TenantActivity }) {
  return (
    <div className="flex items-center justify-between gap-5 rounded-2xl border border-zinc-200 bg-white px-4 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <ActivityIcon activity={activity} size="md" />

        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-[13px] font-semibold text-zinc-950">
              {activity.title}
            </p>
            {activity.badge && (
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                  activity.badgeClass || "bg-zinc-100 text-zinc-600"
                }`}
              >
                {activity.badge}
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-[12px] text-zinc-500">
            {activity.subtitle}
          </p>
        </div>
      </div>

      <div className="shrink-0 text-right">
        {activity.amount && (
          <p
            className={`text-[12px] font-semibold ${
              activity.amountClass || "text-zinc-700"
            }`}
          >
            {activity.amount}
          </p>
        )}
        <p className="mt-1 text-[11px] text-zinc-500">
          {formatDate(activity.timestamp)}
        </p>
      </div>
    </div>
  );
}

function QuickAccessItem({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle: string;
  icon: string;
}) {
  return (
    <button className="flex w-full items-center justify-between rounded-2xl px-1 py-1 text-left">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-[15px]">
          {icon}
        </span>

        <div>
          <p className="text-[13px] font-semibold text-zinc-950">{title}</p>
          <p className="mt-0.5 text-[11px] text-zinc-500">{subtitle}</p>
        </div>
      </div>

      <span className="text-zinc-400">›</span>
    </button>
  );
}

function mapActivityLogToTenantActivity(activity: ActivityLog): TenantActivity {
  const type = activity.activity_type;
  const description = activity.description || activity.title;
  const isDelete = type.includes("deleted") || type.includes("delete");
  const isDocument = type.includes("document");
  const isNote = type.includes("note");
  const isPayment = type.includes("payment") || type.includes("bank");
  const isAlert =
    type.includes("pending") ||
    type.includes("request") ||
    type.includes("failed") ||
    type.includes("late");

  const icon: TenantActivityIcon = isDelete
    ? "delete"
    : isDocument
    ? "document"
    : isNote
    ? "note"
    : isPayment && !isAlert
    ? "payment-success"
    : isPayment
    ? "payment-pending"
    : "note";

  const iconClass = isDelete
    ? "bg-[#FFF1F2] text-[#B9476D] ring-1 ring-[#F8D7DF]"
    : isDocument
    ? "bg-[#F4F4F5] text-zinc-700 ring-1 ring-zinc-200"
    : isNote
    ? "bg-[#DCEEFF] text-[#1D5F9F] ring-1 ring-[#BFE0FF]"
    : isAlert
    ? "bg-white text-slate-950 ring-1 ring-slate-950/15"
    : "bg-slate-950 text-white ring-1 ring-slate-950/10";

  return {
    id: `activity-log-${activity.id}`,
    timestamp: activity.created_at,
    icon,
    title: activity.title,
    subtitle: truncateActivityText(description),
    badge: isDelete ? "Tenant" : undefined,
    badgeClass: isDelete ? "bg-[#FFF1F2] text-[#B9476D]" : undefined,
    iconClass,
    amountClass: "text-zinc-500",
    propertyId: activity.property_id || undefined,
    leaseId: activity.lease_id || undefined,
  };
}

function getActivityDedupeKey(activity: TenantActivity) {
  return `${activity.title.toLowerCase()}::${activity.subtitle.toLowerCase()}`;
}

function buildTenantActivities(
  activityLogs: ActivityLog[],
  payments: RentPayment[],
  documents: LeaseDocument[],
  notes: PropertyNote[],
  localActivities: TenantActivity[],
  profileId: string
) {
  const logActivities = activityLogs.map(mapActivityLogToTenantActivity);
  const logKeys = new Set(
    logActivities.map((activity) => getActivityDedupeKey(activity))
  );

  const paymentActivities: TenantActivity[] = payments
    .map((payment): TenantActivity | null => {
      const timestamp = payment.paid_at || payment.created_at;
      if (!timestamp) return null;

      const status = String(payment.status || "").toLowerCase();
      const isPaid = ["paid", "succeeded", "complete", "completed"].includes(status);
      const isFailed = ["failed", "declined", "canceled", "cancelled"].includes(status);

      return {
        id: `payment-${payment.id}`,
        timestamp,
        icon: isPaid
          ? "payment-success"
          : isFailed
          ? "payment-alert"
          : "payment-pending",
        title: isPaid
          ? "Rent payment received"
          : isFailed
          ? "Rent payment issue"
          : "Rent payment updated",
        subtitle: payment.period_label || "Rent activity",
        amount: formatCurrency(payment.amount),
        badge: !isPaid && !isFailed && status ? formatActivityStatus(status) : undefined,
        badgeClass: "bg-zinc-100 text-zinc-600",
        iconClass: isPaid
          ? "bg-slate-950 text-white ring-1 ring-slate-950/10"
          : isFailed
          ? "bg-[#FFF1F2] text-[#B9476D] ring-1 ring-[#F8D7DF]"
          : "bg-white text-slate-950 ring-1 ring-slate-950/15",
        amountClass: isPaid
          ? "text-emerald-600"
          : isFailed
          ? "text-[#B9476D]"
          : "text-zinc-600",
      };
    })
    .filter((activity): activity is TenantActivity => Boolean(activity));

  const documentActivities: TenantActivity[] = documents
    .map((doc): TenantActivity | null => {
      if (!doc.created_at) return null;

      const tenantOwned = doc.uploaded_by_profile_id === profileId;

      return {
        id: `document-${doc.id}`,
        timestamp: doc.created_at,
        icon: "document",
        title: tenantOwned ? "Document uploaded" : "Document shared",
        subtitle: doc.file_name,
        amount: formatDate(doc.created_at),
        iconClass: "bg-[#F4F4F5] text-zinc-700 ring-1 ring-zinc-200",
        amountClass: "text-zinc-500",
      };
    })
    .filter((activity): activity is TenantActivity => {
      if (!activity) return false;
      return !logKeys.has(getActivityDedupeKey(activity));
    });

  const noteActivities: TenantActivity[] = notes
    .map((note): TenantActivity | null => {
      if (!note.created_at) return null;

      return {
        id: `note-${note.id}`,
        timestamp: note.created_at,
        icon: "note",
        title:
          note.note_type === "private" ? "Private note added" : "Shared note added",
        subtitle: truncateActivityText(note.text),
        badge: note.created_by_role === "landlord" ? "Landlord" : "Tenant",
        badgeClass: "bg-zinc-100 text-zinc-600",
        iconClass:
          note.note_type === "private"
            ? "bg-[#FFF3D5] text-[#8A5A00] ring-1 ring-[#F3D184]"
            : "bg-[#DCEEFF] text-[#1D5F9F] ring-1 ring-[#BFE0FF]",
        amountClass: "text-zinc-500",
      };
    })
    .filter((activity): activity is TenantActivity => {
      if (!activity) return false;
      return !logKeys.has(getActivityDedupeKey(activity));
    });

  const combinedActivities = [
    ...logActivities,
    ...localActivities,
    ...paymentActivities,
    ...documentActivities,
    ...noteActivities,
  ].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const seen = new Set<string>();

  return combinedActivities
    .filter((activity) => {
      const key = getActivityDedupeKey(activity);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}

function buildPaymentProgress(lease?: TenantLease, payments: RentPayment[] = []) {
  const rent = Number(lease?.monthly_rent || 0);
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), 1);

  return [0, 1, 2, 3].map((offset) => {
    const date = new Date(base.getFullYear(), base.getMonth() + offset - 1, 1);
    const month = date.toLocaleDateString("en-US", { month: "long" });

    const paidPayment = payments.find((payment) =>
      String(payment.period_label || "")
        .toLowerCase()
        .includes(month.toLowerCase())
    );

    const status = paidPayment ? "paid" : offset === 1 ? "upcoming" : "future";

    return {
      month,
      amount: rent,
      status,
      subtext:
        status === "paid" ? `Paid on ${month} 1` : `Due on ${month} 1`,
    };
  });
}

function formatDueDate(rentDueDay?: string | null) {
  const day = String(rentDueDay || "1st of the Month").match(/\d+/)?.[0] || "1";
  return `June ${day}, 2026`;
}

function formatDate(date?: string | null) {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getFileLabel(fileName?: string | null, fileType?: string | null) {
  const extension = fileName?.split(".").pop()?.toUpperCase();

  if (extension) return extension.slice(0, 4);
  if (fileType?.includes("pdf")) return "PDF";
  if (fileType?.includes("image")) return "IMG";
  if (fileType?.includes("word")) return "DOC";

  return "FILE";
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCurrency(amount?: number | null) {
  return `$${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatActivityStatus(status: string) {
  return status
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function truncateActivityText(text: string) {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (normalized.length <= 90) return normalized;
  return `${normalized.slice(0, 87)}...`;
}

function getTenantActivityStorageKey(profileId: string) {
  return `avenueboard:tenant-activity:${profileId}`;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getFirstName(name: string) {
  return name.split(" ").filter(Boolean)[0] || "there";
}

function formatBrand(brand?: string | null) {
  if (!brand) return "Payment Method";
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

function getMonthsRemaining(endDate?: string | null) {
  if (!endDate) return 0;

  const end = new Date(endDate);
  const today = new Date();

  const months =
    (end.getFullYear() - today.getFullYear()) * 12 +
    (end.getMonth() - today.getMonth());

  return Math.max(months, 0);
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 4h6m-8 5h10m-9 0 .6 10.2A2 2 0 0 0 10.6 21h2.8a2 2 0 0 0 2-1.8L16 9M10 9v8m4-8v8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ConfirmDeleteModal({
  title,
  body,
  deleting,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[440px] rounded-[28px] bg-white p-6 shadow-[0_30px_100px_rgba(15,23,42,0.25)]">
        <div className="flex items-start justify-between gap-5">
          <div>
            <h2 className="text-[22px] font-semibold tracking-[-0.04em]">
              {title}
            </h2>
            <p className="mt-2 text-[13px] leading-6 text-zinc-500">{body}</p>
          </div>

          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <div className="mt-7 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="h-11 rounded-2xl border border-zinc-200 bg-white px-6 text-[14px] font-semibold text-zinc-700 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            disabled={deleting}
            className="h-11 rounded-2xl bg-[#B9476D] px-6 text-[14px] font-semibold text-white disabled:opacity-60"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddNoteModal({
  noteType,
  setNoteType,
  newNote,
  setNewNote,
  onClose,
  onSave,
  saving,
  error,
}: {
  noteType: "private" | "shared";
  setNoteType: (value: "private" | "shared") => void;
  newNote: string;
  setNewNote: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  error: string;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[560px] rounded-[28px] bg-white p-6 shadow-[0_30px_100px_rgba(15,23,42,0.25)]">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[22px] font-semibold tracking-[-0.04em]">
              Add Note
            </h2>
            <p className="mt-1 text-[13px] text-zinc-500">
              Save a private note or share an update with your landlord.
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-500"
          >
            ×
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={() => setNoteType("private")}
            className={`h-[64px] rounded-2xl border text-[14px] font-semibold ${
              noteType === "private"
                ? "border-[#E7BD64] bg-[#FFF8EA] text-[#8A5A00]"
                : "border-zinc-200 bg-white text-zinc-600"
            }`}
          >
            Private Note
          </button>

          <button
            onClick={() => setNoteType("shared")}
            className={`h-[64px] rounded-2xl border text-[14px] font-semibold ${
              noteType === "shared"
                ? "border-[#B9D8FF] bg-[#EFF7FF] text-[#1D5F9F]"
                : "border-zinc-200 bg-white text-zinc-600"
            }`}
          >
            Shared Note
          </button>
        </div>

        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Write your note..."
          className="mt-5 min-h-[150px] w-full rounded-[22px] border border-zinc-200 bg-[#FAFAFA] p-4 text-[14px] leading-6 outline-none focus:border-[#B9476D] focus:bg-white focus:ring-4 focus:ring-[#B9476D]/10"
        />

        {error && (
          <p className="mt-3 rounded-2xl bg-[#FFF7FA] px-4 py-3 text-[13px] font-medium text-[#9F3D5F]">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="h-11 rounded-2xl border border-zinc-200 bg-white px-6 text-[14px] font-semibold text-zinc-700"
          >
            Cancel
          </button>

          <button
            onClick={onSave}
            disabled={saving || !newNote.trim()}
            className="h-11 rounded-2xl bg-[#B9476D] px-6 text-[14px] font-semibold text-white"
          >
            {saving ? "Saving..." : "Save Note"}
          </button>
        </div>
      </div>
    </div>
  );
}
